require('dotenv').config();
require('dns').setDefaultResultOrder('ipv4first');
require('net').setDefaultAutoSelectFamily(false);
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const User = require('./models/User');
const t = require('./locales');
const path = require('path');
const express = require('express');
const crypto = require('crypto');
const Registration = require('./models/Registration');
const Match = require('./models/Match');
const LeagueConfig = require('./models/LeagueConfig');
const FX = require('./fixtures');
const EFL = require('./webapp/league-data');
const SHOP = require('./webapp/shop-data');
const Trophy = require('./models/Trophy');
const Rule = require('./models/Rule');
const CupPrice = require('./models/CupPrice');
const ChatMessage = require('./models/ChatMessage');
const https = require('https');
const TopUp = require('./models/TopUp');
const SeasonState = require('./models/Season');
const seasonEngine = require('./lib/season');
const cupLogic = require('./lib/cup');
const registerSeasonRoutes = require('./lib/season-api');
const Cup = require('./models/Cup');
const registerAdminExtra = require('./lib/admin-extra');
const createAlerter = require('./lib/alerts');
const makeLimiters = require('./lib/security');
const { logCoins, dailyStatus, claimDaily, referralInfo, captureReferral, payReferral, adjustCoins } = require('./lib/economy');
const CoinLog = require('./models/CoinLog');
const payments = require('./lib/payments');
const LeagueHelper = require('./models/LeagueHelper');
const { trackActivity } = registerAdminExtra;
const mountDeadlines = require('./lib/deadlines');
const DL = mountDeadlines;   // stamp / stampSeq / decide / clampDays
// ——— FA Cup API ———

const bot = new Telegraf(process.env.BOT_TOKEN);
const MINI_APP_URL = process.env.MINI_APP_URL; // HTTPS bo'lishi shart
// Adminlar: .env dagi ADMIN_IDS=123456,789012 (Telegram ID lar, vergul bilan)
const ADMINS = (process.env.ADMIN_IDS || '').split(',').map((s) => Number(s.trim())).filter(Boolean);

const langKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("O'zbekcha", 'lang_uz')],
  [Markup.button.callback('English', 'lang_en')],
  [Markup.button.callback('Русский', 'lang_ru')],
]);

// "Kirish" va "Umumiy qoidalar" ilovani to'g'ridan-to'g'ri ochadi (?open=rules — Qoidalar sahifasi)
const mainKeyboard = (lang) =>
  Markup.inlineKeyboard([
    [Markup.button.webApp(t[lang].enter, `${MINI_APP_URL}?lang=${lang}`)],
    [Markup.button.webApp(t[lang].rules, `${MINI_APP_URL}?lang=${lang}&open=rules`)],
  ]);

bot.start(async (ctx) => {
  const { id, first_name, username } = ctx.from;
  const isNew = !(await User.exists({ telegramId: id }));
  await User.findOneAndUpdate(
    { telegramId: id },
    { firstName: first_name, username },
    { upsert: true, new: true }
  );
  if (isNew) await captureReferral(id, ctx.startPayload).catch(() => {});   // t.me/bot?start=ref_<id> — do'st taklifi
  // Turnirga taklif havolasi: t.me/<bot>?start=t_KOD → to'g'ridan-to'g'ri turnirga qo'shilish oynasini ochadi
  const m = /^t_([A-Za-z0-9]{4,12})$/.exec(ctx.startPayload || '');
  if (m && UT_LOCKED && !ADMINS.includes(id)) {
    const u0 = await User.findOne({ telegramId: id }).lean(), l0 = u0?.lang || 'uz';
    await ctx.reply({ uz: "🔒 Norasmiy turnirlar vaqtincha yopiq. Tez orada qaytadi.", en: '🔒 Unofficial tournaments are temporarily closed. Coming back soon.', ru: '🔒 Неофициальные турниры временно закрыты. Скоро вернутся.' }[l0]);
    return ctx.reply({ uz: 'Tilni tanlang / Choose a language / Выберите язык:' }.uz, langKeyboard);
  }
  if (m) {
    const u = await User.findOne({ telegramId: id }).lean(), lang = u?.lang || 'uz';
    return ctx.reply('🏆', Markup.inlineKeyboard([[Markup.button.webApp(t[lang].open, `${MINI_APP_URL}?lang=${lang}&open=join/${m[1].toUpperCase()}`)]]));
  }
  await ctx.reply('Tilni tanlang / Choose a language / Выберите язык:', langKeyboard);
});

// /admin — faqat adminlar uchun: Admin panelni ochadigan tugma
bot.command('admin', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id)) return;
  await ctx.reply('🛠 Admin panel', Markup.inlineKeyboard([[Markup.button.webApp('🛠 Admin panel', `${MINI_APP_URL}?lang=uz&open=admin`)]]));
});

bot.action(/^lang_(uz|en|ru)$/, async (ctx) => {
  const lang = ctx.match[1];
  await User.updateOne({ telegramId: ctx.from.id }, { lang });
  await ctx.answerCbQuery();
  await ctx.editMessageText(t[lang].langChanged, mainKeyboard(lang));
});

// Mini app fayllarini (webapp/) HTTPS domen orqali beradi
const app = express();
app.use(express.json({ limit: '8mb' })); // Coins chek rasmi (base64) uchun
// Kubok sahifasi skripti lib/ ichida turadi — brauzerga /cup-page.js sifatida beriladi
app.get('/cup-page.js', (req, res) => res.sendFile(path.join(__dirname, 'lib', 'cup-page.js')));
app.use(express.static(path.join(__dirname, 'webapp')));
// Serverni proxy (Render, Railway, Nginx) orqasida ishlatsangiz .env da TRUST_PROXY=1 qo'ying — aks holda IP limit noto'g'ri ishlaydi
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
const limits = makeLimiters({ tgUser });   // tgUser pastda e'lon qilingan (function declaration)
app.use('/api', limits.global);

// Telegram initData imzosini tekshiradi va foydalanuvchini qaytaradi
function tgUser(req) {
  const p = new URLSearchParams(req.get('x-init-data') || '');
  const hash = p.get('hash');
  p.delete('hash');
  const str = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  const calc = crypto.createHmac('sha256', secret).update(str).digest('hex');
  if (!hash || hash.length !== calc.length || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(calc))) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 86400) return null;
  try { return JSON.parse(p.get('user')); } catch { return null; }
}
const season = EFL.season;
// Yoqilgan kosmetika: frame (ramka) · bg (karta foni: oddiy fonlar) · pbg (butun ekran foni: futbolchi fonlari). Eski ma'lumot: bg ichida futbolchi bo'lsa — pbg deb olinadi
const eqOf = (me) => {
  const e = me?.equipped || {}, it = e.bg && SHOP.itemOf('bg', e.bg);
  return { frame: e.frame || null, bg: it && !it.player ? e.bg : null, pbg: e.pbg || (it?.player ? e.bg : null) };
};
const rankSort = (a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;

// Eski ma'lumot: equipped.bg ichida futbolchi foni turgan bo'lsa, uni pbg ga ko'chiradi (aks holda oddiy fon yoqilganda futbolchi foni o'chib ketardi)
async function migrateEq(id) {
  const e = (await User.findOne({ telegramId: id }).select('equipped').lean())?.equipped, it = e?.bg && SHOP.itemOf('bg', e.bg);
  if (it?.player) await User.updateOne({ telegramId: id }, { $set: { 'equipped.pbg': e.pbg || e.bg, 'equipped.bg': null } });
}
// Ilovani ochgan har bir foydalanuvchining ismi/username/avatari saqlanadi (jadvalda klub egasi ko'rinishi uchun)
const touchUser = (u) => User.updateOne({ telegramId: u.id }, { $set: { firstName: u.first_name || '', username: u.username || '', photoUrl: u.photo_url || '', lastSeen: new Date(), blocked: false } }, { upsert: true }).then(() => trackActivity(u.id)).catch(() => {});
// Async marshrutlarda xato chiqsa server qulab tushmasligi uchun
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => { alert('API ' + req.method + ' ' + req.path, e); res.status(500).json({ error: 'fail' }); });
const adminOnly = (req, res, next) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  if (!ADMINS.includes(u.id)) return res.status(403).json({ error: 'forbidden' });
  req.admin = u; next();
};
// Yordamchi admin: katta admin (ADMINS) hammasini, yordamchi faqat o'ziga biriktirilgan ligani boshqaradi
const staffOnly = async (req, res, next) => {
  try {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    req.admin = u;
    req.superAdmin = ADMINS.includes(u.id);
    if (req.superAdmin) return next();
    req.helperLeagues = (await LeagueHelper.find({ telegramId: u.id }).lean()).map((h) => h.league);
    if (!req.helperLeagues.length) return res.status(403).json({ error: 'forbidden' });
    next();
  } catch (e) { next(e); }
};
const canLeague = (req, league) => {
  if (req.superAdmin) return true;
  const hl = req.helperLeagues || [];
  if (hl.includes(league)) return true;
  const f = cupLogic.FAMILIES[league] || cupLogic.familyOfKey(league);
  if (f && (hl.includes(f.l1) || hl.includes(f.l2))) return true;
  return false;
};
const leagueOf = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(EFL.byId, id) ? EFL.byId[id] : null);
const goal = (v) => Number.isInteger(v) && v >= 0 && v <= 99;
const validId = (id) => mongoose.isValidObjectId(id);
// Tur qulfi: ochiq turda natija kiritish/tasdiqlash/bahslash mumkin. roundsLocked=false bo'lsa cheklov yo'q (eski ligalar)
const roundOpen = (cfg, round) => !cfg?.roundsLocked || (cfg.openRounds || []).includes(round);
// Admin panel uchun: jami turlar, samarali ochiq turlar (eski ligada hammasi ochiq)
const lockInfo = (c, total) => {
  const all = Array.from({ length: total }, (_, i) => i + 1);
  return { roundCount: total, roundsLocked: !!c?.roundsLocked, openRounds: c?.roundsLocked ? (c.openRounds || []) : all };
};
// Yopiq tur bo'lsa 409 roundLocked qaytaradi va true qaytaradi
const roundGate = async (res, league, round) => {
  if (!leagueOf(league)) return false;
  const cfg = await LeagueConfig.findOne({ season, league }).select('roundsLocked openRounds').lean();
  if (roundOpen(cfg, round)) return false;
  res.status(409).json({ error: 'roundLocked' });
  return true;
};

// ——— Bot xabarlari (o'yinchining tilida) ———
const MSG = {
  reported: {
    uz: (who, a, b) => `⚽ ${who} o'yin hisobini kiritdi: siz ${a}:${b} ${who}.\nTo'g'ri bo'lsa — tasdiqlang, noto'g'ri bo'lsa — «Yolg'on» ni bosing.`,
    en: (who, a, b) => `⚽ ${who} entered the score: you ${a}:${b} ${who}.\nConfirm it if it is correct, or press “Fake” if it is wrong.`,
    ru: (who, a, b) => `⚽ ${who} ввёл счёт: вы ${a}:${b} ${who}.\nЕсли верно — подтвердите, если нет — нажмите «Ложь».`,
  },
  confirmed: {
    uz: (who, a, b) => `✅ ${who} hisobni tasdiqladi: ${a}:${b}. Natija jadvalga o'tdi.`,
    en: (who, a, b) => `✅ ${who} confirmed the score: ${a}:${b}. The result is in the table.`,
    ru: (who, a, b) => `✅ ${who} подтвердил счёт: ${a}:${b}. Результат попал в таблицу.`,
  },
  rejected: {
    uz: (who) => `❌ ${who} hisobni yolg'on deb belgiladi. Kiritilgan hisob bekor qilindi — natijani admin keyinroq kiritadi.`,
    en: (who) => `❌ ${who} marked the score as fake. The entered score was cancelled — the admin will enter the result later.`,
    ru: (who) => `❌ ${who} отметил счёт как ложный. Введённый счёт отменён — результат позже внесёт админ.`,
  },
  adminSet: {
    uz: (who, a, b) => `🛠 Admin natijani kiritdi: siz ${a}:${b} ${who}.`,
    en: (who, a, b) => `🛠 The admin entered the result: you ${a}:${b} ${who}.`,
    ru: (who, a, b) => `🛠 Админ внёс результат: вы ${a}:${b} ${who}.`,
  },
  removed: {
    uz: (lg) => `ℹ️ Siz admin tomonidan ligadan chiqarildingiz (${lg}).`,
    en: (lg) => `ℹ️ You were removed from the league by the admin (${lg}).`,
    ru: (lg) => `ℹ️ Админ исключил вас из лиги (${lg}).`,
  },
  added: {
    uz: (lg, club) => `✅ Siz admin tomonidan ${lg} ligasiga qo'shildingiz (${club}).`,
    en: (lg, club) => `✅ The admin added you to ${lg} (${club}).`,
    ru: (lg, club) => `✅ Админ добавил вас в лигу ${lg} (${club}).`,
  },
  roundStart: {
    uz: (lg, r, opp, dl) => `🟢 ${lg}: ${r}-tur boshlandi!\nRaqibingiz: ${opp}\nDedlayn: ${dl} (Toshkent vaqti)`,
    en: (lg, r, opp, dl) => `🟢 ${lg}: round ${r} has started!\nYour opponent: ${opp}\nDeadline: ${dl} (Tashkent time)`,
    ru: (lg, r, opp, dl) => `🟢 ${lg}: начался ${r}-й тур!\nСоперник: ${opp}\nДедлайн: ${dl} (по Ташкенту)`,
  },
  remindPlay: {
    uz: (lg, r, opp, dl) => `⏰ ${lg}, ${r}-tur: dedlaynga 3 soat qoldi${dl ? ` (${dl})` : ''}.${opp ? `\nRaqib: ${opp}.` : ''}\nO'yinni o'ynab hisobni kiriting, aks holda texnik mag'lubiyat berilishi mumkin.`,
    en: (lg, r, opp, dl) => `⏰ ${lg}, round ${r}: 3 hours left until the deadline${dl ? ` (${dl})` : ''}.${opp ? `\nOpponent: ${opp}.` : ''}\nPlay and enter the score, or a technical defeat may be given.`,
    ru: (lg, r, opp, dl) => `⏰ ${lg}, ${r}-й тур: до дедлайна 3 часа${dl ? ` (${dl})` : ''}.${opp ? `\nСоперник: ${opp}.` : ''}\nСыграйте и введите счёт, иначе может быть засчитано техническое поражение.`,
  },
  remindConfirm: {
    uz: (lg, r, opp) => `⏰ ${lg}, ${r}-tur: dedlaynga 3 soat qoldi.${opp ? `\n${opp} hisob kiritgan.` : ''} Iltimos, tasdiqlang yoki «Yolg'on» ni bosing.`,
    en: (lg, r, opp) => `⏰ ${lg}, round ${r}: 3 hours left.${opp ? `\n${opp} entered the score.` : ''} Please confirm it or press “Fake”.`,
    ru: (lg, r, opp) => `⏰ ${lg}, ${r}-й тур: осталось 3 часа.${opp ? `\n${opp} ввёл счёт.` : ''} Подтвердите его или нажмите «Ложь».`,
  },
  overdue: {
    uz: (lg, r, opp, h) => `⛔ ${lg}, ${r}-tur: dedlayn o'tdi, hisob kiritilmagan (${opp}).\nYana ${h} soat muhlat: o'yinni tugatib hisob kiriting yoki raqib bilan chat orqali bog'laning. Aks holda faol bo'lmagan tomonga texnik mag'lubiyat beriladi.`,
    en: (lg, r, opp, h) => `⛔ ${lg}, round ${r}: the deadline has passed and no score was entered (${opp}).\n${h} more hours: finish the game and enter the score, or contact your opponent in the match chat. Otherwise the inactive side gets a technical defeat.`,
    ru: (lg, r, opp, h) => `⛔ ${lg}, ${r}-й тур: дедлайн прошёл, счёт не введён (${opp}).\nЕщё ${h} ч: сыграйте и введите счёт или свяжитесь с соперником в чате матча. Иначе неактивной стороне засчитают техническое поражение.`,
  },
  techWin: {
    uz: (lg, r, opp) => `🏆 ${lg}, ${r}-tur: ${opp} o'yinga kelmadi — sizga 3:0 texnik g'alaba berildi.`,
    en: (lg, r, opp) => `🏆 ${lg}, round ${r}: ${opp} did not show up — you were awarded a 3:0 technical win.`,
    ru: (lg, r, opp) => `🏆 ${lg}, ${r}-й тур: ${opp} не явился — вам засчитана техническая победа 3:0.`,
  },
  techLoss: {
    uz: (lg, r, opp) => `⛔ ${lg}, ${r}-tur: dedlaynda o'yinda qatnashmadingiz (${opp}) — 0:3 texnik mag'lubiyat. Xato bo'lsa, «Muammoli holatlar» orqali adminga yozing.`,
    en: (lg, r, opp) => `⛔ ${lg}, round ${r}: you did not take part by the deadline (${opp}) — 0:3 technical defeat. If this is a mistake, write to the admin via “Problems”.`,
    ru: (lg, r, opp) => `⛔ ${lg}, ${r}-й тур: вы не участвовали до дедлайна (${opp}) — техническое поражение 0:3. Если это ошибка, напишите админу через «Проблемы».`,
  },
  voided: {
    uz: (lg, r, opp) => `ℹ️ ${lg}, ${r}-tur: ${opp} bilan o'yin ikkala tomon ham qatnashmagani uchun bekor qilindi.`,
    en: (lg, r, opp) => `ℹ️ ${lg}, round ${r}: the game with ${opp} was cancelled because neither side took part.`,
    ru: (lg, r, opp) => `ℹ️ ${lg}, ${r}-й тур: матч с ${opp} отменён, так как никто не участвовал.`,
  },
  toAdmin: {
    uz: (lg, r, opp) => `⚠️ ${lg}, ${r}-tur: ${opp} bilan o'yin dedlaynda hal bo'lmadi — natijani admin kiritadi. Isbot bo'lsa «Muammoli holatlar» orqali yuboring.`,
    en: (lg, r, opp) => `⚠️ ${lg}, round ${r}: the game with ${opp} was not settled by the deadline — the admin will enter the result. Send proof via “Problems” if you have any.`,
    ru: (lg, r, opp) => `⚠️ ${lg}, ${r}-й тур: матч с ${opp} не решён к дедлайну — результат внесёт админ. Если есть доказательства, отправьте через «Проблемы».`,
  },
  drawn: {
    uz: (lg) => `🎲 ${lg}: qura o'tkazildi! O'yinlaringiz: Me → klubingiz → Mening o'yinlarim.`,
    en: (lg) => `🎲 ${lg}: the draw is done! Your games: Me → your club → My games.`,
    ru: (lg) => `🎲 ${lg}: жеребьёвка проведена! Ваши игры: Я → ваш клуб → Мои игры.`,
  },
};
async function notify(telegramId, key, ...args) {
  try {
    const owner = await User.findOne({ telegramId }).lean();
    const lang = owner?.lang || 'uz';
    const kb = Markup.inlineKeyboard([[Markup.button.webApp(t[lang].open, `${MINI_APP_URL}?lang=${lang}&open=games`)]]);
    await bot.telegram.sendMessage(telegramId, MSG[key][lang](...args), kb);
  } catch (_) { /* foydalanuvchi botni bloklagan bo'lishi mumkin */ }
}
const notifyAdmins = (text) => Promise.all(ADMINS.map((id) => bot.telegram.sendMessage(id, text, Markup.inlineKeyboard([[Markup.button.webApp('🛠 Admin panel', `${MINI_APP_URL}?lang=uz&open=admin`)]])).catch(() => {})));
const alert = createAlerter(notifyAdmins);   // xatolar adminlarga Telegramda (bir xil xato 10 daqiqada bir marta)

// "Klub (@username)" ko'rinishidagi nom
async function whoIs(leagueId, id) {
  let [reg, usr] = await Promise.all([Registration.findOne({ season, league: leagueId, telegramId: id }).lean(), User.findOne({ telegramId: id }).lean()]);
  if (!reg) reg = await Registration.findOne({ season, telegramId: id }).lean();
  const nm = usr?.username ? '@' + usr.username : usr?.firstName || String(id);
  return reg ? `${EFL.clubName(reg.league, reg.club)} (${nm})` : nm;
}
// O'yinlarga klub va ism qo'shib admin panelga tayyorlaydi
async function decorate(ms) {
  if (!ms.length) return [];
  const ids = [...new Set(ms.flatMap((m) => [m.home, m.away]))];
  const [regs, users] = await Promise.all([Registration.find({ season, telegramId: { $in: ids } }).lean(), User.find({ telegramId: { $in: ids } }).lean()]);
  const reg = new Map(regs.map((r) => [r.telegramId, r]));
  const nm = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || '']));
  const side = (id) => { const r = reg.get(id); return { id, club: r ? EFL.clubName(r.league, r.club) : '—', user: nm.get(id) || String(id) }; };
  const chatAgg = await ChatMessage.aggregate([{ $match: { kind: 'match', key: { $in: ms.map((m) => String(m._id)) } } }, { $group: { _id: '$key', n: { $sum: 1 } } }]);
  const chatN = new Map(chatAgg.map((x) => [x._id, x.n]));
  return ms.map((m) => ({
    proofs: (m.proofs || []).map((p) => ({ by: nm.get(p.by) || String(p.by), text: p.text || '', fileId: p.fileId || '', hg: p.hg ?? null, ag: p.ag ?? null, at: p.at })),
    chat: chatN.get(String(m._id)) || 0,
    deadline: m.deadline || null, auto: m.auto?.kind || null,
    id: String(m._id), matchNo: m.matchNo || null, league: m.league, leagueName: EFL.byId[m.league]?.name || m.league, round: m.round, status: m.status,
        home: side(m.home), away: side(m.away), hg: m.hg, ag: m.ag,
    claim: m.claim?.hg != null ? { hg: m.claim.hg, ag: m.claim.ag, by: m.claim.by } : null,
  }));
}

// Jadvalni tasdiqlangan o'yinlardan qayta hisoblaydi (ishtirokchi chiqarilsa/almashsa ham to'g'ri qoladi)
async function recalc(leagueId) {
  const [regs, ms] = await Promise.all([Registration.find({ season, league: leagueId }).lean(), Match.find({ season, league: leagueId, status: 'confirmed' }).lean()]);
  if (!regs.length) return;
  const st = FX.computeStats(ms), zero = { pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  await Registration.bulkWrite(regs.map((r) => ({ updateOne: { filter: { _id: r._id }, update: { $set: st.get(r.telegramId) || zero } } })));
}

// Qura: ishtirokchilarni aralashtirib, o'yinlar jadvalini tuzadi
async function performDraw(leagueId, rounds, roundDays) {
  let lock;
  try {
    lock = await LeagueConfig.findOneAndUpdate({ season, league: leagueId, drawnAt: null }, { $set: { drawnAt: new Date(), roundsLocked: true, openRounds: [], rounds: rounds === 1 ? 1 : 2, ...(DL.clampDays(roundDays) ? { roundDays: DL.clampDays(roundDays) } : {}) } }, { upsert: true, new: true });
  } catch (e) { if (e.code === 11000) return { error: 'drawn' }; throw e; }
  const unlock = () => LeagueConfig.updateOne({ _id: lock._id }, { $set: { drawnAt: null } });
  const regs = await Registration.find({ season, league: leagueId }).lean();
  if (regs.length < 2) { await unlock(); return { error: 'few' }; }
  try {
    const fx = FX.roundRobin(FX.shuffle(regs.map((r) => r.telegramId)), lock.rounds === 2);
    await Match.insertMany(DL.stamp(fx, new Date(), lock.roundDays || 7).map((m, idx) => ({ ...m, league: leagueId, season, matchNo: idx + 1 })));
    await LeagueConfig.updateOne({ _id: lock._id }, { $set: { drawAt: null } });
    regs.forEach((r) => notify(r.telegramId, 'drawn', EFL.byId[leagueId].name));
    return { ok: true, matches: fx.length };
  } catch (e) { await Match.deleteMany({ season, league: leagueId }); await unlock(); throw e; }
}

// Barcha ligalar: o'yinchilar soni, band klublar va foydalanuvchining o'z ro'yxati (bitta so'rovda)
app.get('/api/leagues', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  touchUser(u);
  const regs = await Registration.find({ season }).lean();
  const mine = regs.find((r) => r.telegramId === u.id);
  const closedSet = new Set((await LeagueConfig.find({ season, closed: true }).select('league').lean()).map((c) => c.league));
  res.json({
    season,
    calendar: await seasonEngine.calendar(),   // ← qo'shildi
    mine: mine ? { league: mine.league, club: mine.club } : null,
    leagues: EFL.LEAGUES.map((l) => {
      const rs = regs.filter((r) => r.league === l.id);
      const live = rs.filter((r) => !r.vacant);   // bo'sh qolgan klub band emas — uni boshqa odam olishi mumkin
      return { id: l.id, max: l.max, players: live.length, taken: live.map((r) => r.club), closed: closedSet.has(l.id) };
    }),
  });
});

// Klub o'yinlari (bekor qilinganlardan tashqari), tur bo'yicha — hisob kiritish/tasdiqlash uchun
async function gamesOf(uid, league, regs) {
  const ms = await Match.find({ season, league, status: { $ne: 'cancelled' }, $or: [{ home: uid }, { away: uid }] }).sort({ round: 1 }).lean();
  const oppId = (m) => (m.home === uid ? m.away : m.home);
  const users = await User.find({ telegramId: { $in: ms.map(oppId) } }).lean();
  const uname = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || '']));
  const clubOf = new Map(regs.map((r) => [r.telegramId, r.club]));
  const utg = new Map(users.map((x) => [x.telegramId, x.username || '']));
  const cfg = await LeagueConfig.findOne({ season, league }).select('roundsLocked openRounds').lean();
  const unreadAgg = ms.length ? await ChatMessage.aggregate([{ $match: { kind: 'match', key: { $in: ms.map((m) => String(m._id)) }, readBy: { $ne: uid } } }, { $group: { _id: '$key', n: { $sum: 1 } } }]) : [];
  const unread = new Map(unreadAgg.map((x) => [x._id, x.n]));
  return ms.map((m) => {
    const mine = m.home === uid, hasScore = m.hg != null && m.ag != null;
    return {
      id: String(m._id), matchNo: m.matchNo || null, round: m.round, status: m.status, byMe: m.reportedBy === uid, locked: !roundOpen(cfg, m.round), isHome: mine, deadline: m.deadline || null,
      oppClub: clubOf.get(oppId(m)) || '', oppTg: utg.get(oppId(m)) || '', unread: unread.get(String(m._id)) || 0,
      proofs: (m.proofs || []).length, iProved: (m.proofs || []).some((p) => p.by === uid),
      claimScore: m.claim?.hg != null ? `${mine ? m.claim.hg : m.claim.ag}:${mine ? m.claim.ag : m.claim.hg}` : null,
      opponent: clubOf.has(oppId(m)) ? EFL.clubName(league, clubOf.get(oppId(m))) : '', user: uname.get(oppId(m)) || '',
      score: hasScore ? `${mine ? m.hg : m.ag}:${mine ? m.ag : m.hg}` : null, // men:raqib
    };
  });
}

// Me bo'limi: foydalanuvchining klublari (o'rni, statistikasi, auksion holati, o'yinlari) va kolleksiya
app.get('/api/profile', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const mine = await Registration.find({ season, telegramId: u.id }).lean();
  const clubs = [];
  for (const r of mine) {
    const regs = (await Registration.find({ season, league: r.league }).lean()).sort(rankSort);
    clubs.push({
      league: r.league, club: r.club, pos: regs.findIndex((x) => x.telegramId === u.id && x.club === r.club) + 1,
      w: r.w, d: r.d, l: r.l, pts: r.pts, auction: r.auction?.price ? { price: r.auction.price } : null,
      games: await gamesOf(u.id, r.league, regs),
    });
  }
  const [trs, me] = await Promise.all([Trophy.find({ telegramId: u.id, status: { $in: ['owned', 'selling'] } }).sort({ createdAt: -1 }).lean(), User.findOne({ telegramId: u.id }).lean()]);
  const collection = [
    ...trs.map((x) => ({ kind: 'trophy', cup: x.league, season: x.season, selling: x.status === 'selling' })),
    ...(me?.cosmetics || []).map((id) => ({ kind: 'item', id })),
  ];
  const supportUnread = await ChatMessage.countDocuments({ kind: 'support', key: String(u.id), admin: true, readBy: { $ne: u.id } });
  res.json({ clubs, collection, equipped: eqOf(me), supportUnread, favPlayer: me?.favPlayer || null });
}));

// Klublarim belgisi uchun: har bir klub bo'yicha o'qilmagan chat xabarlari (raqib yozganlari). Yengil — tez-tez so'raladi
app.get('/api/unread', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const regs = await Registration.find({ season, telegramId: u.id }).select('league club').lean();
  if (!regs.length) return res.json({ total: 0, clubs: {} });
  const ms = await Match.find({ season, league: { $in: regs.map((r) => r.league) }, status: { $ne: 'cancelled' }, $or: [{ home: u.id }, { away: u.id }] }).select('_id league').lean();
  const leagueOf = new Map(ms.map((m) => [String(m._id), m.league]));
  const agg = ms.length ? await ChatMessage.aggregate([{ $match: { kind: 'match', key: { $in: [...leagueOf.keys()] }, readBy: { $ne: u.id } } }, { $group: { _id: '$key', n: { $sum: 1 } } }]) : [];
  const byLeague = {};
  agg.forEach((x) => { const lg = leagueOf.get(x._id); if (lg) byLeague[lg] = (byLeague[lg] || 0) + x.n; });
  const clubs = {};
  let total = 0;
  regs.forEach((r) => { const n = byLeague[r.league] || 0; clubs[r.league + '|' + r.club] = n; total += n; });
  res.json({ total, clubs });
}));

// Boshqa ishtirokchi profili (faqat ko'rish): reyting jadvalidagi klub bo'yicha egasi topiladi (Telegram ID oshkor qilinmaydi)
app.get('/api/profile/view', ah(async (req, res) => {
  if (!tgUser(req)) return res.status(401).json({ error: 'auth' });
  const league = String(req.query.league || ''), club = String(req.query.club || '');
  if (!EFL.byId[league]) return res.status(400).json({ error: 'fail' });
  const reg = await Registration.findOne({ season, league, club }).lean();
  if (!reg) return res.status(404).json({ error: 'gone' });
  const [usr, trs, mine] = await Promise.all([User.findOne({ telegramId: reg.telegramId }).lean(), Trophy.find({ telegramId: reg.telegramId, status: { $in: ['owned', 'selling'] } }).sort({ createdAt: -1 }).lean(), Registration.find({ season, telegramId: reg.telegramId }).lean()]);
  const clubs = [];
  for (const r of mine) {
    const regs = (await Registration.find({ season, league: r.league }).lean()).sort(rankSort);
    clubs.push({ league: r.league, club: r.club, pos: regs.findIndex((x) => x.telegramId === r.telegramId) + 1 });
  }
  res.json({
    name: usr?.firstName || '', username: usr?.username || '', tgId: reg.telegramId > 0 ? reg.telegramId : 0, photo: usr?.photoUrl || '', equipped: eqOf(usr),
    collection: [...trs.map((x) => ({ kind: 'trophy', cup: x.league, season: x.season })), ...(usr?.cosmetics || []).map((id) => ({ kind: 'item', id }))],
    clubs,
  });
}));

// Live: hozirgi tur. Liga: ochiq turlar ichida eng kichik tur, unda hali o'ynalmagan o'yin bor (yoki oxirgi tur).
// Kubok (FA Cup / Copa del Rey): 1-7 turlardagi hozirgi bosqich. Supercup (Community Shield / Supercopa): kubokning 8-turi. Tur ichidagi barcha o'yinlar (o'ynalgan ham) qaytadi.
const LIVE_MAP = {
  'premier-league': { db: 'premier-league', kind: 'league' }, championship: { db: 'championship', kind: 'league' }, 'fa-cup': { db: 'fa-cup', kind: 'cup' }, 'community-shield': { db: 'fa-cup', kind: 'shield' },
  laliga: { db: 'laliga', kind: 'league' }, 'laliga-2': { db: 'laliga-2', kind: 'league' }, 'copa-del-rey': { db: 'copa-del-rey', kind: 'cup' }, supercopa: { db: 'copa-del-rey', kind: 'shield' },
};
app.get('/api/live/:id', ah(async (req, res) => {
  if (!tgUser(req)) return res.status(401).json({ error: 'auth' });
  const cfgL = LIVE_MAP[req.params.id] || (EFL.byId[req.params.id] ? { db: req.params.id, kind: 'league' } : null);
  if (!cfgL) return res.status(404).json({ error: 'fail' });
  const all = await Match.find({ season, league: cfgL.db, status: { $ne: 'cancelled' } }).sort({ round: 1, _id: 1 }).lean();
  let pool;
  if (cfgL.kind === 'shield') pool = all.filter((m) => m.round === 8);
  else if (cfgL.kind === 'cup') pool = all.filter((m) => m.round < 8);
  else { const cfg = await LeagueConfig.findOne({ season, league: cfgL.db }).select('roundsLocked openRounds').lean(); pool = all.filter((m) => roundOpen(cfg, m.round)); }
  const unfinished = (m) => ['scheduled', 'pending', 'disputed'].includes(m.status);
  const rounds = [...new Set(pool.map((m) => m.round))].sort((a, b) => a - b);
  const cur = rounds.find((r) => pool.some((m) => m.round === r && unfinished(m))) ?? rounds[rounds.length - 1];
  const targetMatches = cfgL.kind === 'shield' || cfgL.kind === 'cup' ? pool : all;
  const ids = [...new Set(targetMatches.flatMap((m) => [m.home, m.away]))];
  const [regs, users] = await Promise.all([Registration.find({ season, telegramId: { $in: ids } }).lean(), User.find({ telegramId: { $in: ids } }).lean()]);
  const reg = new Map();
  regs.forEach((r) => { if (!reg.has(r.telegramId) || r.league === cfgL.db) reg.set(r.telegramId, r); });
  const usr = new Map(users.map((x) => [x.telegramId, x]));
  const side = (tid) => { const u = usr.get(tid), r = reg.get(tid); return { user: u?.username ? '@' + u.username : u?.firstName || (tid < 0 ? '' : String(tid)), club: r ? EFL.clubName(r.league, r.club) : '', clubId: r?.club || '', league: r?.league || cfgL.db }; };
  res.json({ ok: true, round: cur ?? null, rounds: [...new Set(targetMatches.map((m) => m.round))].sort((a, b) => a - b), rows: targetMatches.map((m) => ({ id: String(m._id), round: m.round, status: m.status, deadline: m.deadline, score: m.hg != null && m.ag != null ? `${m.hg} : ${m.ag}` : null, home: side(m.home), away: side(m.away) })) });
}));
app.get('/api/rankings/:league', async (req, res) => {
  if (!tgUser(req)) return res.status(401).json({ error: 'auth' });
  const league = req.params.league;
  if (!EFL.byId[league]) return res.status(404).json({ error: 'fail' });
  const [regs, played] = await Promise.all([
    Registration.find({ season, league }).lean(),
    Match.find({ season, league, status: 'confirmed' }).select('home away hg ag round').sort({ round: 1, _id: 1 }).lean(),
  ]);
  const users = await User.find({ telegramId: { $in: regs.map((r) => r.telegramId) } }).lean();
  const names = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || '']));
  // Oxirgi 5 o'yin shakli: W (g'alaba) / D (durang) / L (mag'lubiyat), eskisidan yangisiga
  const formOf = new Map();
  const pushForm = (id, c) => { const a = formOf.get(id) || []; a.push(c); formOf.set(id, a); };
  played.forEach((m) => { const h = m.hg > m.ag ? 'W' : m.hg < m.ag ? 'L' : 'D'; pushForm(m.home, h); pushForm(m.away, h === 'W' ? 'L' : h === 'L' ? 'W' : 'D'); });
  const rows = regs
    .map((r) => ({ club: r.club, user: names.get(r.telegramId) || (r.vacant ? "bo'sh" : ''), vacant: !!r.vacant, pts: r.pts, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, gd: r.gf - r.ga, form: (formOf.get(r.telegramId) || []).slice(-5) }))
    .sort(rankSort)
    .map((r, i) => ({ pos: i + 1, ...r }));
  res.json({ league, rows });
});

app.post('/api/leagues/:league/register', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  {
    // Bo'sh qolgan klubni egallash: ro'yxat oynasi yopiq bo'lsa ham mumkin, o'yinlar va natijalar o'tadi
    const lg0 = EFL.byId[req.params.league], club0 = req.body?.club;
    if (lg0 && club0 && await Registration.exists({ season, league: lg0.id, club: club0, vacant: true })) {
      if (await LeagueConfig.exists({ season, league: lg0.id, closed: true })) return res.status(409).json({ error: 'closed' });
      await touchUser(u);
      if (await Registration.exists({ season, telegramId: u.id })) return res.status(409).json({ error: 'already' });
      const took = await takeOverVacant(lg0.id, club0, u.id);
      if (!took) return res.status(409).json({ error: 'taken' });
      await recalc(lg0.id);
      return res.json({ ok: true });
    }
  }
   // ⬇️⬇️ QO'SHILDI: mavsum oynasi — ro'yxat faqat "registration" fazasida ochiq
  const gate = await seasonEngine.registrationGate();
  if (!gate.ok) return res.status(409).json({ error: gate.error, calendar: gate.calendar });
  const league = EFL.byId[req.params.league], club = req.body?.club;
  if (!league || !league.clubs.some((c) => c.id === club)) return res.status(400).json({ error: 'fail' });
  if (await LeagueConfig.exists({ season, league: league.id, closed: true })) return res.status(409).json({ error: 'closed' });   // admin yopib qo'ygan liga
  await touchUser(u);
  if (await Registration.exists({ season, telegramId: u.id })) return res.status(409).json({ error: 'already' });
  if ((await Registration.countDocuments({ season, league: league.id })) >= league.max) return res.status(409).json({ error: 'full' });
  try {
    await Registration.create({ league: league.id, season, telegramId: u.id, club });
    await payReferral(u.id).then(notifyReferrer).catch((e) => alert('referal', e));
    res.json({ ok: true });
  } catch (e) {
    // 11000: klub band yoki foydalanuvchi allaqachon yozilgan (parallel so'rov)
    const dup = e.code === 11000;
    res.status(dup ? 409 : 500).json({ error: dup ? (/telegramId/.test(e.message) ? 'already' : 'taken') : 'fail' });
  }
});

// Bo'sh qolgan klubni (egasi voz kechgan) yangi egasiga o'tkazish: jadvaldagi ochkolar, o'yinlar, natijalar va chat o'z holicha qoladi
async function takeOverVacant(leagueId, club, newId) {
  const v = await Registration.findOneAndUpdate({ season, league: leagueId, club, vacant: true }, { $set: { telegramId: newId }, $unset: { vacant: 1, auction: 1 } }, { new: false }).lean();
  if (!v) return null;
  const old = v.telegramId, base = { season, league: leagueId };
  await Promise.all([
    Match.updateMany({ ...base, home: old }, { $set: { home: newId } }),
    Match.updateMany({ ...base, away: old }, { $set: { away: newId } }),
    Match.updateMany({ ...base, reportedBy: old }, { $set: { reportedBy: newId } }),
  ]);
  const keys = (await Match.find({ ...base, $or: [{ home: newId }, { away: newId }] }).select('_id').lean()).map((m) => String(m._id));
  if (keys.length) {
    await ChatMessage.updateMany({ kind: 'match', key: { $in: keys }, from: old }, { $set: { from: newId } });
    await ChatMessage.updateMany({ kind: 'match', key: { $in: keys }, readBy: old }, { $addToSet: { readBy: newId } });
    await ChatMessage.updateMany({ kind: 'match', key: { $in: keys }, readBy: old }, { $pull: { readBy: old } });
  }
  return v;
}

// Klubni bo'sh qoldirish (egasi voz kechsa yoki admin chiqarsa): ochko, o'yin, natija va chat saqlanadi, egasi o'rniga texnik (manfiy) raqam qo'yiladi
async function vacateClub(leagueId, tid, club) {
  const vid = -(Date.now() * 1000 + Math.floor(Math.random() * 1000));
  const q = { season, league: leagueId, telegramId: tid, ...(club ? { club } : {}) };
  const r = await Registration.findOneAndUpdate(q, { $set: { telegramId: vid, vacant: true }, $unset: { auction: 1 } }, { new: true }).lean();
  if (!r) return null;
  const base = { season, league: leagueId };
  await Promise.all([
    Match.updateMany({ ...base, home: tid }, { $set: { home: vid } }),
    Match.updateMany({ ...base, away: tid }, { $set: { away: vid } }),
    Match.updateMany({ ...base, reportedBy: tid }, { $set: { reportedBy: vid } }),
  ]);
  const keys = (await Match.find({ ...base, $or: [{ home: vid }, { away: vid }] }).select('_id').lean()).map((m) => String(m._id));
  if (keys.length) await ChatMessage.updateMany({ kind: 'match', key: { $in: keys }, from: tid }, { $set: { from: vid } });
  return r;
}

// "Klubdan hoziroq voz kechaman": klub egasidan olinadi va yana ro'yxatdan o'tish ro'yxatiga qaytadi
app.post('/api/leave', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const { league, club } = req.body || {};
  if (!(await vacateClub(league, u.id, club))) return res.status(404).json({ error: 'fail' });
  res.json({ ok: true });
});

// Klubni auksionga qo'yish (narx bilan) va auksiondan olish
app.post('/api/auction', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const { league, club } = req.body || {};
  const price = Math.floor(Number(req.body?.price));
  if (!(price >= 1 && price <= 1e9)) return res.status(400).json({ error: 'badPrice' });
  const r = await Registration.findOneAndUpdate({ season, telegramId: u.id, league, club }, { auction: { price, at: new Date() } }, { new: true }).lean();
  if (!r) return res.status(404).json({ error: 'fail' });
  res.json({ ok: true });
});
app.post('/api/auction/cancel', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const { league, club } = req.body || {};
  const r = await Registration.findOneAndUpdate({ season, telegramId: u.id, league, club }, { $unset: { auction: 1 } }, { new: true }).lean();
  if (!r) return res.status(404).json({ error: 'fail' });
  res.json({ ok: true });
});
// Auksion bid qilish (taklif berish)
app.post('/api/auction/bid', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const { league, club, bid } = req.body || {};
  const amount = Math.floor(Number(bid));
  if (!(amount >= 1 && amount <= 1e9)) return res.status(400).json({ error: 'badPrice' });
  
  // Auksion lotini topamiz
  const lot = await Registration.findOne({ season, league, club, 'auction.price': { $gt: 0 } }).lean();
  if (!lot) return res.status(404).json({ error: 'gone' });
  if (lot.telegramId === u.id) return res.status(400).json({ error: 'ownClub' });
  if (amount <= (lot.auction.currentBid || lot.auction.price)) return res.status(400).json({ error: 'lowBid' });
  
  // Auksion vaqti tekshiruv
  const cfg = await LeagueConfig.findOne({ season, league: 'auction' }).lean();
  const aEnd = cfg?.auctionEnd ? new Date(cfg.auctionEnd) : null;
  if (aEnd && aEnd < new Date()) return res.status(409).json({ error: 'aucClosed' });
  
  // Eski bid qilganning coinlarini qaytaramiz
  const prevBidder = lot.auction.bidder;
  const prevBid = lot.auction.currentBid || 0;
  if (prevBidder && prevBidder !== u.id && prevBid > 0) {
    await User.updateOne({ telegramId: prevBidder }, { $inc: { coins: prevBid } });
  }
  
  // Yangi bidder coinlarini ayiramiz
  const me = await User.findOne({ telegramId: u.id }).lean();
  if (!me || me.coins < amount) return res.status(400).json({ error: 'noCoins' });
  await User.updateOne({ telegramId: u.id }, { $inc: { coins: -amount } });
  
  // Bidni yangilaymiz
  await Registration.updateOne(
    { season, league, club },
    { $set: { 'auction.currentBid': amount, 'auction.bidder': u.id, 'auction.bidAt': new Date() } }
  );
  
  res.json({ ok: true, coins: me.coins - amount });
});

// Auksion holatini tekshirish va yakunlash (admin yoki cron tomonidan)
app.post('/api/admin/auction/config', staffOnly, ah(async (req, res) => {
  const { auctionEnd } = req.body || {};
  await LeagueConfig.findOneAndUpdate(
    { season, league: 'auction' },
    { $set: { auctionEnd: auctionEnd ? new Date(auctionEnd) : null } },
    { upsert: true }
  );
  res.json({ ok: true });
}));

app.get('/api/admin/auction/config', staffOnly, ah(async (req, res) => {
  const cfg = await LeagueConfig.findOne({ season, league: 'auction' }).lean();
  res.json({ ok: true, auctionEnd: cfg?.auctionEnd || null });
}));

// Auksionni yakunlash: oxirgi bidder ga klub o'tkazish
app.post('/api/admin/auction/finalize', staffOnly, ah(async (req, res) => {
  const lots = await Registration.find({ season, 'auction.bidder': { $exists: true }, 'auction.currentBid': { $gt: 0 } }).lean();
  let done = 0;
  for (const lot of lots) {
    const bidder = lot.auction.bidder;
    const bid = lot.auction.currentBid;
    if (!bidder || !bid) continue;
    // Klubi bo'sh qilish (eski egadan)
    await Registration.findOneAndUpdate(
      { season, telegramId: lot.telegramId, league: lot.league, club: lot.club },
      { $set: { telegramId: bidder, vacant: false }, $unset: { auction: 1 } },
      { new: true }
    );
    // Eski egaga coinlar ketmaydi (u auksionga qo'ydi = klub sotdi)
    done++;
  }
  res.json({ ok: true, done });
}));

// Do'kon -> Auksion: hamma lotlar (yangilari birinchi)
app.get('/api/auctions', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const regs = await Registration.find({ season, 'auction.price': { $gt: 0 } }).sort({ 'auction.at': -1 }).lean();
  const users = await User.find({ telegramId: { $in: regs.map((r) => r.telegramId) } }).lean();
  const names = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || '']));
  res.json({ lots: regs.map((r) => ({ league: r.league, club: r.club, price: r.auction.price, games: r.w + r.d + r.l, mine: r.telegramId === u.id, user: names.get(r.telegramId) || '' })) });
});
// ——— Do'kon: Coins, kosmetika, kubok sotish (Sell) ———
// To'lov karta raqami FAQAT .env dan olinadi (kodda saqlanmaydi). PAY_CARD bo'lmasa Coins to'lovi o'chiriladi.
const PAY_CARD = (process.env.PAY_CARD || '').replace(/\D/g, ''), PAY_HOLDER = process.env.PAY_HOLDER || '';
if (!PAY_CARD) console.warn("⚠️ PAY_CARD .env da yo'q — Coins to'lovi ishlamaydi");
const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const cardFmt = (d) => d.replace(/(.{4})/g, '$1 ').trim();
const luhn = (d) => { let s = 0; for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } s += n; } return s % 10 === 0; };
const who = (u) => (u.username ? '@' + u.username : u.first_name || String(u.id));
const adminKb = (okData, noData, okText = '✅ Tasdiqlash', noText = '❌ Rad etish') => Markup.inlineKeyboard([[Markup.button.callback(okText, okData), Markup.button.callback(noText, noData)]]);

// Foydalanuvchiga uning tilida xabar (texts: { uz, en, ru })
async function say(telegramId, texts, open = 'shop') {
  try {
    const owner = await User.findOne({ telegramId }).lean(), lang = owner?.lang || 'uz';
    await bot.telegram.sendMessage(telegramId, texts[lang] || texts.uz, Markup.inlineKeyboard([[Markup.button.webApp(t[lang].open, `${MINI_APP_URL}?lang=${lang}&open=${open}`)]]));
  } catch (_) { /* bot bloklangan bo'lishi mumkin */ }
}
// Adminlarning hammasiga yuboradi; kamida bittasiga yetsa true
async function toAdmins(send) {
  const rs = await Promise.allSettled(ADMINS.map((id) => send(id)));
  return rs.some((r) => r.status === 'fulfilled');
}

// ——— Isbot rasmlari va chat uchun yordamchilar ———
// base64 data-URL -> Buffer. Rasm yo'q: null; noto'g'ri: false
function decodeImage(img) {
  const s = String(img || '');
  if (!s) return null;
  const cut = s.indexOf(',');
  if (cut < 0 || !/^data:image\/(jpeg|png|webp);base64$/.test(s.slice(0, cut))) return false;
  const buf = Buffer.from(s.slice(cut + 1), 'base64');
  return buf.length < 1000 || buf.length > 5 * 1024 * 1024 ? false : buf;
}
// Adminlarga matn (+ ixtiyoriy rasm) yuboradi; { ok, fileId } — fileId keyin admin panelda rasmni ko'rsatish uchun saqlanadi
async function sendToAdmins(text, buf) { return sendToIds(ADMINS, text, buf); }
// Natija skrinshotlari: PROOF_CHAT_ID (kanal/guruh) berilsa — o'sha yerga, bo'lmasa adminlarga (ovozsiz)
const sendResultShot = (text, buf) => sendToIds(process.env.PROOF_CHAT_ID ? [Number(process.env.PROOF_CHAT_ID)] : ADMINS, text, buf, true);
async function sendToIds(ids, text, buf, silent = false) {
  if (!ids.length) return { ok: true, fileId: '' };
  const kb = Markup.inlineKeyboard([[Markup.button.webApp('🛠 Admin panel', `${MINI_APP_URL}?lang=uz&open=admin`)]]);
  let fileId = '';
  const rs = await Promise.allSettled(ids.map(async (id) => {
    if (!buf) return bot.telegram.sendMessage(id, text.slice(0, 4000), kb);
    const m = await bot.telegram.sendPhoto(id, fileId || { source: buf }, { caption: text.slice(0, 1000), disable_notification: silent, ...kb });
    if (!fileId) fileId = m.photo?.[m.photo.length - 1]?.file_id || '';
  }));
  return { ok: rs.some((r) => r.status === 'fulfilled'), fileId };
}
// «Muammoli holatlar»: ligada yordamchi admin bo'lsa — birinchi tayinlangani, bo'lmasa — katta adminlar
const supportLeague = (x) => (leagueOf(String(x || '')) ? String(x) : '');
const leagueQ = (league) => (league ? league : { $in: ['', null] });   // eski xabarlarda league maydoni yo'q
async function supportTarget(league) {
  const h = league ? await LeagueHelper.findOne({ league }).sort({ addedAt: 1 }).lean() : null;
  if (!h) return { helper: null, name: '' };
  return { helper: h.telegramId, name: tgName(await User.findOne({ telegramId: h.telegramId }).lean()) || 'Yordamchi admin' };
}
async function sendSupport(league, text, buf) {
  const { helper } = await supportTarget(league);
  if (helper) { const r = await sendToIds([helper], text, buf); if (r.ok) return r; }   // yordamchi bloklagan bo'lsa — katta adminlarga
  return sendToIds(ADMINS, text, buf);
}
// Murojaatni ko'rish/javob berish huquqi: katta admin hammasini, yordamchi faqat o'z ligasini
const supportOk = (req, league) => req.superAdmin || (!!league && (req.helperLeagues || []).includes(league));
const leagueNameOf = (id) => leagueOf(id)?.name || '';
const tgName = (x) => (x?.username ? '@' + x.username : x?.firstName || '');

// Foydalanuvchi ligasidagi yordamchi admin yoki asosiy admin ma'lumotlari (Telegram chat ochish uchun)
app.get('/api/league-admin', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const league = String(req.query.league || '');
  let targetUser = null;
  if (league) {
    const h = await LeagueHelper.findOne({ league }).sort({ addedAt: 1 }).lean();
    if (h) {
      targetUser = await User.findOne({ telegramId: h.telegramId }).lean();
      if (targetUser) {
        return res.json({
          ok: true,
          type: 'helper',
          telegramId: targetUser.telegramId,
          username: targetUser.username || null,
          name: targetUser.firstName || 'Yordamchi admin'
        });
      }
    }
  }
  // Yordamchi admin bo'lmasa — asosiy admin
  if (ADMINS.length > 0) {
    targetUser = await User.findOne({ telegramId: ADMINS[0] }).lean();
  }
  const defaultUsername = (process.env.ADMIN_USERNAME || 'botiroff_06').replace(/^@/, '');
  res.json({
    ok: true,
    type: 'main',
    telegramId: targetUser?.telegramId || ADMINS[0] || null,
    username: targetUser?.username || defaultUsername,
    name: targetUser?.firstName || 'Admin'
  });
}));
// Do'st ligaga yozilgach taklif qilgan odamga xabar
const notifyReferrer = (p) => p && say(p.refId, {
  uz: `🎉 Do'stingiz ligaga yozildi: sizga +${p.amount} Coins qo'shildi!`,
  en: `🎉 Your friend joined a league: +${p.amount} Coins added to your balance!`,
  ru: `🎉 Ваш друг записался в лигу: +${p.amount} Coins на ваш баланс!`,
}, 'shop');

app.get('/api/shop', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const [me, trs, cps] = await Promise.all([User.findOne({ telegramId: u.id }).lean(), Trophy.find({ telegramId: u.id, status: { $ne: 'sold' } }).sort({ createdAt: -1 }).lean(), CupPrice.find().lean()]);
  const cup = new Map(cps.map((x) => [x.league, x.price]));
  res.json({
    coins: me?.coins || 0, owned: me?.cosmetics || [], equipped: eqOf(me),
    card: PAY_CARD, holder: PAY_HOLDER,
    daily: dailyStatus(me), ref: referralInfo(me, u.id, await botName()), pay: payments.enabled,
    cupPrices: cps.filter((x) => x.price > 0).map((x) => ({ league: x.league, price: x.price })),
    trophies: trs.map((x) => ({ id: String(x._id), league: x.league, season: x.season, status: x.status, price: (x.status === 'selling' && x.sell?.price) || cup.get(x.league) || 0 })),
  });
}));

// Coins sotib olish — avtomatik: Payme yoki Click to'lov havolasi (to'lov tasdiqlangach Coins o'zi qo'shiladi)
app.post('/api/shop/pay', limits.topup, ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const pack = SHOP.PACKS.find((p) => p.id === req.body?.pack), prov = req.body?.provider;
  if (!pack || !['payme', 'click'].includes(prov) || !payments.enabled[prov]) return res.status(400).json({ error: 'fail' });
  const since = new Date(Date.now() - 12 * 3600e3);
  if ((await TopUp.countDocuments({ telegramId: u.id, provider: prov, status: 'pending', createdAt: { $gt: since } })) >= 3) return res.status(429).json({ error: 'tooMany' });
  const tu = await TopUp.create({ telegramId: u.id, coins: pack.coins, amount: pack.uzs, provider: prov });
  res.json({ ok: true, url: payments.linkFor(prov, tu, `${MINI_APP_URL}?open=shop`) });
}));

// Coins sotib olish: kartaga o'tkazib, chek rasmini yuboradi -> adminga boradi -> admin tasdiqlasa Coins qo'shiladi
app.post('/api/shop/topup', limits.topup, ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const pack = SHOP.PACKS.find((p) => p.id === req.body?.pack), img = String(req.body?.image || ''), cut = img.indexOf(',');
  if (!pack || cut < 0 || !/^data:image\/(jpeg|png|webp);base64$/.test(img.slice(0, cut))) return res.status(400).json({ error: 'fail' });
  const buf = Buffer.from(img.slice(cut + 1), 'base64');
  if (buf.length < 1000 || buf.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'badImage' });
  if (!ADMINS.length || !PAY_CARD) return res.status(503).json({ error: 'fail' });
  if ((await TopUp.countDocuments({ telegramId: u.id, status: 'pending', provider: { $nin: ['payme', 'click'] } })) >= 3) return res.status(429).json({ error: 'tooMany' });
  // Chek firibgarligi: bir xil rasm (sha256) ikki marta ishlatilmaydi
  const imageHash = crypto.createHash('sha256').update(buf).digest('hex');
  if (await TopUp.exists({ imageHash })) return res.status(409).json({ error: 'duplicate' });
  let tu;
  try { tu = await TopUp.create({ telegramId: u.id, coins: pack.coins, amount: pack.uzs, imageHash }); }
  catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'duplicate' }); throw e; }   // parallel so'rov
  const caption = `💰 Coins to'ldirish\n👤 ${who(u)} (id ${u.id})\n🪙 ${money(pack.coins)} Coins · ${money(pack.uzs)} UZS\n\nChekni tekshiring va tasdiqlang.`;
  const sent = await toAdmins((id) => bot.telegram.sendPhoto(id, { source: buf }, { caption, ...adminKb('tu_ok_' + tu._id, 'tu_no_' + tu._id) }));
  if (!sent) { await TopUp.deleteOne({ _id: tu._id }); return res.status(502).json({ error: 'fail' }); }
  res.json({ ok: true });
}));

// Kosmetika sotib olish (Coins evaziga) va profilda yoqish
app.post('/api/shop/buy', limits.money, ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const item = SHOP.findItem(req.body?.id);
  if (!item) return res.status(400).json({ error: 'fail' });
  await migrateEq(u.id);
  const r = await User.findOneAndUpdate(
    { telegramId: u.id, coins: { $gte: item.price }, cosmetics: { $ne: item.id } },
    { $inc: { coins: -item.price }, $addToSet: { cosmetics: item.id }, $set: { ['equipped.' + (item.kind === 'bg' && item.player ? 'pbg' : item.kind)]: item.id } }, { new: true }).lean();
  if (!r) { const me = await User.findOne({ telegramId: u.id }).lean(); return res.status(409).json({ error: me?.cosmetics?.includes(item.id) ? 'owned' : 'noCoins' }); }
  await logCoins(u.id, -item.price, 'buy', item.id);
  res.json({ ok: true, coins: r.coins });
}));
app.post('/api/shop/equip', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const { kind, id } = req.body || {};
  await migrateEq(u.id);
  if (kind !== 'frame' && kind !== 'bg' && kind !== 'pbg') return res.status(400).json({ error: 'fail' });
  const it = id && SHOP.itemOf(kind === 'frame' ? 'frame' : 'bg', id);
  if (id && !(it && (await User.exists({ telegramId: u.id, cosmetics: id })))) return res.status(400).json({ error: 'fail' });
  const slot = kind === 'frame' ? 'frame' : (it ? (it.player ? 'pbg' : 'bg') : kind);   // futbolchi fonlari pbg ga, oddiylari bg ga tushadi
  await User.updateOne({ telegramId: u.id }, { $set: { ['equipped.' + slot]: id || null } });
  res.json({ ok: true });
}));

// Do'kon -> Sell: kubokni adminga sotish. Foydalanuvchi karta raqamini yuboradi, u adminga boradi, 24 soat ichida pul tashlanadi.
app.post('/api/shop/sell', limits.money, ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const card = String(req.body?.card || '').replace(/\D/g, ''), tid = req.body?.trophy;
  if (!validId(tid)) return res.status(400).json({ error: 'fail' });
  if (card.length !== 16 || !luhn(card)) return res.status(400).json({ error: 'badCard' });
  if (!ADMINS.length) return res.status(503).json({ error: 'fail' });
  const t0 = await Trophy.findOne({ _id: tid, telegramId: u.id, status: 'owned' }).lean();
  if (!t0) return res.status(409).json({ error: 'gone' });
  const price = (await CupPrice.findOne({ league: t0.league }).lean())?.price || 0;   // admin belgilagan narx; belgilanmagan bo'lsa sotib bo'lmaydi
  if (!price) return res.status(409).json({ error: 'noPrice' });
  const tr = await Trophy.findOneAndUpdate({ _id: tid, telegramId: u.id, status: 'owned' }, { $set: { status: 'selling', 'sell.cardLast4': card.slice(-4), 'sell.price': price, 'sell.at': new Date() } }, { new: true }).lean();
  if (!tr) return res.status(409).json({ error: 'gone' });
  const text = `💸 Kubok sotish so'rovi\n🏆 ${EFL.trophyName(tr.league)} (mavsum ${tr.season})\n💰 Narx: ${money(price)} UZS\n👤 ${who(u)} (id ${u.id})\n💳 Karta: ${cardFmt(card)}\n\nPulni 24 soat ichida o'tkazib bering. O'tkazgach «To'lab berildi» ni bosing — kubok foydalanuvchi ro'yxatidan o'chiriladi.`;
  const sent = await toAdmins((id) => bot.telegram.sendMessage(id, text, adminKb('sl_ok_' + tr._id, 'sl_no_' + tr._id, "✅ To'lab berildi", '❌ Rad etish')));
  if (!sent) { await Trophy.updateOne({ _id: tr._id }, { $set: { status: 'owned' }, $unset: { sell: 1 } }); return res.status(502).json({ error: 'fail' }); }
  res.json({ ok: true });
}));

// Admin: kubok (FA Cup / Copa del Rey) yoki supercup (Community Shield / Supercopa) g'olibiga kubok topshirish
app.post('/api/admin/cup/award', adminOnly, ah(async (req, res) => {
  const f = cupLogic.FAMILIES[req.body?.cup], kind = req.body?.kind === 'shield' ? 'shield' : 'cup';
  if (!f) return res.status(400).json({ error: 'fail' });
  let tid = 0;
  if (kind === 'cup') tid = (await cupLogic.winners(season, 'final', f.id))[0] || 0;
  else {
    const d = await Cup.findOne({ season, cup: f.shieldKey, stage: 'shield' }).lean();
    if (d?.winners?.length) tid = d.winners[0];
    else {
      const m = await Match.findOne({ season, league: f.id, round: 8, status: 'confirmed' }).lean();
      if (m && m.hg != null && m.ag != null && m.hg !== m.ag) tid = m.hg > m.ag ? m.home : m.away;
    }
  }
  if (!tid || tid < 0) return res.status(409).json({ error: 'nowinner' });
  const id = kind === 'cup' ? f.id : f.shieldId, name = EFL.trophyName(id);
  if (await Trophy.exists({ season, league: id, telegramId: tid })) return res.status(409).json({ error: 'already' });
  await Trophy.create({ telegramId: tid, league: id, season });
  say(tid, {
    uz: `🏆 Tabriklaymiz! Siz ${name} kubogini yutdingiz. Me → Kolleksiya. Sotmoqchi bo'lsangiz: Do'kon → Sell.`,
    en: `🏆 Congratulations! You won the ${name} trophy. Me → Collection. To sell it: Shop → Sell.`,
    ru: `🏆 Поздравляем! Вы выиграли кубок ${name}. Я → Коллекция. Чтобы продать: Магазин → Sell.`,
  }, 'me');
  res.json({ ok: true, winner: tid });
}));

// Admin: ligada g'olib bo'lgan ishtirokchiga kubok topshirish
app.post('/api/admin/league/:id/award', adminOnly, ah(async (req, res) => {
  const league = EFL.byId[req.params.id], tid = Number(req.body?.telegramId);
  if (!league || !tid) return res.status(400).json({ error: 'fail' });
  if (!(await Registration.exists({ season, league: league.id, telegramId: tid }))) return res.status(404).json({ error: 'gone' });
  if (await Trophy.exists({ season, league: league.id, telegramId: tid })) return res.status(409).json({ error: 'already' });
  await Trophy.create({ telegramId: tid, league: league.id, season });
  say(tid, {
    uz: `🏆 Tabriklaymiz! Siz ${league.name} kubogini yutdingiz. Me → Kolleksiya. Sotmoqchi bo'lsangiz: Do'kon → Sell.`,
    en: `🏆 Congratulations! You won the ${league.name} trophy. Me → Collection. To sell it: Shop → Sell.`,
    ru: `🏆 Поздравляем! Вы выиграли кубок ${league.name}. Я → Коллекция. Чтобы продать: Магазин → Sell.`,
  }, 'me');
  res.json({ ok: true });
}));

// Admin tugmalari (bot ichida): Coins to'lovini tasdiqlash / rad etish
const adminCb = (fn) => async (ctx) => {
  if (!ADMINS.includes(ctx.from.id)) return ctx.answerCbQuery('⛔');
  try { await fn(ctx, ctx.match[1] === 'ok', ctx.match[2]); } catch (e) { console.error(e); await ctx.answerCbQuery('Xatolik').catch(() => {}); }
};
const markDone = async (ctx, line) => {
  const m = ctx.callbackQuery.message, tag = `\n\n${line} — ${ctx.from.username ? '@' + ctx.from.username : ctx.from.first_name}`;
  if (m.photo) await ctx.editMessageCaption((m.caption || '') + tag).catch(() => {});
  else await ctx.editMessageText((m.text || '') + tag).catch(() => {});
};
bot.action(/^tu_(ok|no)_([a-f0-9]{24})$/, adminCb(async (ctx, ok, id) => {
  const tu = await TopUp.findOneAndUpdate({ _id: id, status: 'pending' }, { $set: { status: ok ? 'approved' : 'rejected', doneAt: new Date() } }, { new: true }).lean();
  if (!tu) return ctx.answerCbQuery("Allaqachon ko'rib chiqilgan");
  if (ok) {
    try { await User.updateOne({ telegramId: tu.telegramId }, { $inc: { coins: tu.coins } }, { upsert: true }); await logCoins(tu.telegramId, tu.coins, 'topup', String(tu._id), ctx.from.id); }
    catch (e) { await TopUp.updateOne({ _id: id }, { $set: { status: 'pending' }, $unset: { doneAt: 1 } }); throw e; }
  }
  await ctx.answerCbQuery(ok ? '✅' : '❌');
  await markDone(ctx, ok ? '✅ Tasdiqlandi' : '❌ Rad etildi');
  say(tu.telegramId, ok
    ? { uz: `✅ To'lov tasdiqlandi: hisobingizga ${money(tu.coins)} Coins qo'shildi.`, en: `✅ Payment confirmed: ${money(tu.coins)} Coins were added to your balance.`, ru: `✅ Оплата подтверждена: на баланс добавлено ${money(tu.coins)} Coins.` }
    : { uz: "❌ To'lov tasdiqlanmadi. Chek noto'g'ri bo'lsa, admin bilan bog'laning.", en: '❌ The payment was not confirmed. If the receipt is correct, contact the admin.', ru: '❌ Оплата не подтверждена. Если чек верный, свяжитесь с админом.' });
}));
// Kubok sotish: «To'lab berildi» -> kubok ro'yxatdan chiqadi; «Rad etish» -> kubok qaytadi
bot.action(/^sl_(ok|no)_([a-f0-9]{24})$/, adminCb(async (ctx, ok, id) => {
  const upd = ok ? { $set: { status: 'sold', 'sell.paidAt': new Date() } } : { $set: { status: 'owned' }, $unset: { sell: 1 } };
  const tr = await Trophy.findOneAndUpdate({ _id: id, status: 'selling' }, upd, { new: true }).lean();
  if (!tr) return ctx.answerCbQuery("Allaqachon ko'rib chiqilgan");
  await ctx.answerCbQuery(ok ? '✅' : '❌');
  await markDone(ctx, ok ? "✅ To'lab berildi" : '❌ Rad etildi');
  const name = EFL.trophyName(tr.league);
  say(tr.telegramId, ok
    ? { uz: `✅ ${name} kubogi uchun ${money(tr.sell?.price || 0)} UZS kartangizga o'tkazildi. Kubok ro'yxatingizdan chiqarildi.`, en: `✅ ${money(tr.sell?.price || 0)} UZS for the ${name} trophy was sent to your card. The trophy was removed from your list.`, ru: `✅ ${money(tr.sell?.price || 0)} UZS за кубок ${name} переведены на вашу карту. Кубок удалён из вашего списка.` }
    : { uz: `❌ ${name} kubogini sotish so'rovi rad etildi. Kubok ro'yxatingizda qoldi.`, en: `❌ The request to sell the ${name} trophy was declined. The trophy stays in your list.`, ru: `❌ Заявка на продажу кубка ${name} отклонена. Кубок остался в вашем списке.` }, 'me');
}));

// ——— O'yin hisobi: biri kiritadi, raqib tasdiqlaydi yoki "Yolg'on" deydi ———
app.post('/api/matches/:id/report', limits.chat, ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const my = req.body?.my, opp = req.body?.opp, id = req.params.id;
  if (!validId(id) || !goal(my) || !goal(opp)) return res.status(400).json({ error: 'badScore' });
  const m0 = await Match.findOne({ _id: id, season, $or: [{ home: u.id }, { away: u.id }] }).lean();
  if (!m0) return res.status(404).json({ error: 'gone' });
  if (await roundGate(res, m0.league, m0.round)) return;

  // ⬇️⬇️ FA Cup: tur ochilmaguncha / dedlayn o'tgach hisob kiritib bo'lmaydi
  if (cupLogic.FAMILIES[m0.league]) {
    const fm = cupLogic.fam(m0.league);
    const meta = cupLogic.stagesOf(fm.id).find((s) => s.round === m0.round);
    const stageKey = m0.round === 8 ? 'shield' : (meta?.stage || '');
    const d = await Cup.findOne({ season, cup: { $in: [fm.id, fm.shieldKey] }, $or: [{ round: m0.round }, { stage: stageKey }] }).lean();
    if (!d || !d.startedAt) return res.status(409).json({ error: 'notstarted' });
    if (d.deadline && new Date(d.deadline) < new Date()) return res.status(409).json({ error: 'deadline' });
  }
  // ⬆️⬆️

  // Natija kiritishda skrinshot majburiy
  const shot = decodeImage(req.body?.image);
  if (shot === false) return res.status(400).json({ error: 'badImage' });
  if (!shot) return res.status(400).json({ error: 'needShot' });
  const isHome = m0.home === u.id;
  const [wa, wb] = await Promise.all([whoIs(m0.league, m0.home), whoIs(m0.league, m0.away)]);
  const sentShot = await sendResultShot(`📸 Natija skrinshoti — ${EFL.trophyName(m0.league)}, ${m0.round}-tur\n${wa} — ${wb}\nHisob: ${isHome ? my : opp}:${isHome ? opp : my} (kiritdi: ${await whoIs(m0.league, u.id)})`, shot);
  if (!sentShot.ok) return res.status(502).json({ error: 'fail' });
  // Hisob kiritish mumkin: hali kiritilmagan, yoki o'zi kiritgan va raqib hali tasdiqlamagan (tuzatish)
  const m = await Match.findOneAndUpdate(
    { _id: id, season, $or: [{ status: 'scheduled' }, { status: 'pending', reportedBy: u.id }] },
    { $set: { hg: isHome ? my : opp, ag: isHome ? opp : my, status: 'pending', reportedBy: u.id, claim: null, updatedAt: new Date() }, $push: { proofs: { by: u.id, text: '', fileId: sentShot.fileId, hg: isHome ? my : opp, ag: isHome ? opp : my, at: new Date() } } },
    { new: true }
  ).lean();
  if (!m) return res.status(409).json({ error: 'gone' });
  notify(isHome ? m.away : m.home, 'reported', await whoIs(m.league, u.id), opp, my); // raqib nuqtai nazaridan: u : men
  res.json({ ok: true });
}));

app.post('/api/matches/:id/confirm', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
  const pre = await Match.findOne({ _id: req.params.id, season }).select('league round').lean();
  if (pre && await roundGate(res, pre.league, pre.round)) return;
  // Faqat raqib (hisobni kiritmagan tomon) tasdiqlay oladi — skrinshot ixtiyoriy
  const shot = decodeImage(req.body?.image);
  if (shot === false) return res.status(400).json({ error: 'badImage' });
  const cur = await Match.findOne({ _id: req.params.id, season, status: 'pending', reportedBy: { $ne: u.id }, $or: [{ home: u.id }, { away: u.id }] }).lean();
  if (!cur) return res.status(409).json({ error: 'gone' });
  let fileId = '';
  if (shot) {
    const [ca, cb] = await Promise.all([whoIs(cur.league, cur.home), whoIs(cur.league, cur.away)]);
    const sentShot = await sendResultShot(`📸 Tasdiqlash skrinshoti — ${EFL.trophyName(cur.league)}, ${cur.round}-tur\n${ca} — ${cb}\nHisob: ${cur.hg}:${cur.ag} (tasdiqladi: ${await whoIs(cur.league, u.id)})`, shot);
    if (sentShot.ok) fileId = sentShot.fileId;
  }
  const setQuery = { status: 'confirmed', confirmedBy: 'player', updatedAt: new Date() };
  const updateDoc = fileId
    ? { $set: setQuery, $push: { proofs: { by: u.id, text: '', fileId, hg: cur.hg, ag: cur.ag, at: new Date() } } }
    : { $set: setQuery };
  const m = await Match.findOneAndUpdate(
    { _id: req.params.id, season, status: 'pending', reportedBy: { $ne: u.id }, $or: [{ home: u.id }, { away: u.id }] },
    updateDoc,
    { new: true }
  ).lean();
  if (!m) return res.status(409).json({ error: 'gone' });
  await recalc(m.league); // jadvalga avtomatik o'tadi
  const rep = m.reportedBy === m.home;
  notify(m.reportedBy, 'confirmed', await whoIs(m.league, u.id), rep ? m.hg : m.ag, rep ? m.ag : m.hg);
  res.json({ ok: true });
}));

// Raqib hisobni «Yolg'on» deydi: isbot (skrinshot va/yoki izoh) majburiy. Hisob bekor bo'ladi, isbot adminga boradi
app.post('/api/matches/:id/dispute', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
  const text = String(req.body?.text || '').trim().slice(0, 600), buf = decodeImage(req.body?.image);
  if (buf === false) return res.status(400).json({ error: 'badImage' });
  if (!buf && text.length < 3) return res.status(400).json({ error: 'needProof' });
  const old = await Match.findOne({ _id: req.params.id, season, status: 'pending', reportedBy: { $ne: u.id }, $or: [{ home: u.id }, { away: u.id }] }).lean();
  if (!old) return res.status(409).json({ error: 'gone' });
  if (await roundGate(res, old.league, old.round)) return;
  const isHome = old.home === u.id, my = req.body?.my, opp = req.body?.opp, real = goal(my) && goal(opp);
  const proof = { by: u.id, text, fileId: '', hg: real ? (isHome ? my : opp) : null, ag: real ? (isHome ? opp : my) : null, at: new Date() };
  const [a, b] = await Promise.all([whoIs(old.league, old.home), whoIs(old.league, old.away)]);
  const cap = `⚠️ Bahsli o'yin — ${EFL.byId[old.league].name}, ${old.round}-tur\n${a} — ${b}\nKiritilgan hisob: ${old.hg}:${old.ag} («Yolg'on» deb belgilandi)\n${real ? `Raqib aytgan hisob: ${proof.hg}:${proof.ag}\n` : ''}${text ? `💬 Izoh: ${text}\n` : ''}${buf ? '📎 Skrinshot ilova qilingan\n' : ''}Natijani admin panelda kiriting.`;
  const sent = await sendToAdmins(cap, buf);
  if (!sent.ok) return res.status(502).json({ error: 'fail' });
  proof.fileId = sent.fileId;
  // Hisob bekor: jadvalga o'tmaydi, admin kiritadi. Kiritilgan hisob va isbot faqat admin ma'lumoti uchun saqlanadi.
  const m = await Match.findOneAndUpdate(
    { _id: old._id, status: 'pending', hg: old.hg, ag: old.ag, reportedBy: old.reportedBy },
    { $set: { status: 'disputed', claim: { hg: old.hg, ag: old.ag, by: old.reportedBy }, hg: null, ag: null, reportedBy: null, updatedAt: new Date() }, $push: { proofs: proof } },
    { new: true }
  ).lean();
  if (!m) return res.status(409).json({ error: 'gone' });
  notify(old.reportedBy, 'rejected', await whoIs(m.league, u.id));
  res.json({ ok: true });
}));

// Bahsli o'yin: ikkala o'yinchi ham qo'shimcha isbot (skrinshot/izoh) yubora oladi
app.post('/api/matches/:id/proof', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
  const text = String(req.body?.text || '').trim().slice(0, 600), buf = decodeImage(req.body?.image);
  if (buf === false) return res.status(400).json({ error: 'badImage' });
  if (!buf && text.length < 3) return res.status(400).json({ error: 'needProof' });
  const m0 = await Match.findOne({ _id: req.params.id, season, status: 'disputed', $or: [{ home: u.id }, { away: u.id }] }).lean();
  if (!m0) return res.status(409).json({ error: 'gone' });
  if (await roundGate(res, m0.league, m0.round)) return;
  if ((m0.proofs || []).filter((p) => p.by === u.id).length >= 4) return res.status(429).json({ error: 'tooMany' });
  const [a, b] = await Promise.all([whoIs(m0.league, m0.home), whoIs(m0.league, m0.away)]);
  const cap = `📎 Qo'shimcha isbot — ${EFL.byId[m0.league].name}, ${m0.round}-tur\n${a} — ${b}\n👤 ${await whoIs(m0.league, u.id)}\n${text ? `💬 ${text}` : ''}`;
  const sent = await sendToAdmins(cap, buf);
  if (!sent.ok) return res.status(502).json({ error: 'fail' });
  await Match.updateOne({ _id: m0._id, status: 'disputed' }, { $push: { proofs: { by: u.id, text, fileId: sent.fileId, hg: null, ag: null, at: new Date() } }, $set: { updatedAt: new Date() } });
  res.json({ ok: true });
}));

// ——— O'yin chati (raqiblar orasida) ———
async function chatMatch(req, res) {
  const u = tgUser(req);
  if (!u) { res.status(401).json({ error: 'auth' }); return null; }
  if (!validId(req.params.id)) { res.status(400).json({ error: 'fail' }); return null; }
  const m = await Match.findOne({ _id: req.params.id, season, status: { $ne: 'cancelled' }, $or: [{ home: u.id }, { away: u.id }] }).lean();
  if (!m) { res.status(404).json({ error: 'gone' }); return null; }
  return { u, m, oppId: m.home === u.id ? m.away : m.home };
}

// Onlayn holati va «yozyapti...» (xotirada: bitta server jarayoni uchun yetarli)
const typingMap = new Map();
const isTyping = (key, uid) => Date.now() - (typingMap.get(key + '|' + uid) || 0) < 4000;
const touchPresence = (uid) => User.updateOne({ telegramId: uid, $or: [{ lastSeen: null }, { lastSeen: { $lt: new Date(Date.now() - 60000) } }] }, { $set: { lastSeen: new Date() } }).catch(() => {});
app.post('/api/matches/:id/typing', ah(async (req, res) => {
  const c = await chatMatch(req, res); if (!c) return;
  typingMap.set(String(c.m._id) + '|' + c.u.id, Date.now());
  touchPresence(c.u.id);
  res.json({ ok: true });
}));
app.get('/api/matches/:id/chat', ah(async (req, res) => {
  const c = await chatMatch(req, res); if (!c) return;
  const key = String(c.m._id);
  touchPresence(c.u.id);
  await ChatMessage.updateMany({ kind: 'match', key, readBy: { $ne: c.u.id } }, { $addToSet: { readBy: c.u.id } });
  const [list, opp] = await Promise.all([
    ChatMessage.find({ kind: 'match', key }).sort({ at: -1 }).limit(100).lean(),
    User.findOne({ telegramId: c.oppId }).lean(),
  ]);
  res.json({
    messages: list.reverse().map((x) => ({
      id: String(x._id), mine: x.from === c.u.id, type: x.type,
      text: x.text, fileId: x.fileId || '', at: x.at, read: (x.readBy || []).includes(c.oppId),
    })),
    opp: {
      name: opp?.firstName || '', username: opp?.username || '',
      photo: opp?.photoUrl || '', lastSeen: opp?.lastSeen || null, typing: isTyping(key, c.oppId),
    },
  });
}));

app.post('/api/matches/:id/chat', limits.chat, ah(async (req, res) => {
  const c = await chatMatch(req, res); if (!c) return;
  const key = String(c.m._id), type = req.body?.type === 'room' ? 'room' : 'text';
  const text = String(req.body?.text || '').trim().slice(0, 500);
  const buf = decodeImage(req.body?.image);
  if (buf === false) return res.status(400).json({ error: 'badImage' });
  if (!text && !buf) return res.status(400).json({ error: 'badText' });
  if (type === 'room' && !/^[A-Za-z0-9\-]{3,24}$/.test(text)) return res.status(400).json({ error: 'badText' });

  const last = await ChatMessage.findOne({ kind: 'match', key, from: c.u.id }).sort({ at: -1 }).lean();
  if (last && Date.now() - last.at < 700) return res.status(429).json({ error: 'fast' });

  // Rasm bo'lsa — raqibga bot orqali yuborib, fileId ni saqlaymiz
  let fileId = '';
  if (buf) {
    try {
      const sent = await bot.telegram.sendPhoto(c.oppId, { source: buf }, { caption: text.slice(0, 200) || '📎 Rasm' });
      fileId = sent.photo?.[sent.photo.length - 1]?.file_id || '';
    } catch (_) { /* raqib botni bloklagan bo'lishi mumkin */ }
  }

  // Raqibga bot orqali xabar faqat u hali o'qimagan birinchi matnli xabar uchun boradi (spam bo'lmasin)
  const first = !(await ChatMessage.exists({ kind: 'match', key, from: c.u.id, readBy: { $ne: c.oppId } }));
  await ChatMessage.create({ kind: 'match', key, from: c.u.id, type, text, fileId, readBy: [c.u.id] });

  if (first && !buf) {
    const who = await whoIs(c.m.league, c.u.id), shown = type === 'room' ? `🎮 ${text}` : text.slice(0, 120);
    say(c.oppId, { uz: `💬 ${who}: ${shown}`, en: `💬 ${who}: ${shown}`, ru: `💬 ${who}: ${shown}` }, 'chat/' + key);
  }
  res.json({ ok: true, fileId });
}));

// ——— «Muammoli holatlar»: foydalanuvchi ↔ admin chati ———
app.get('/api/support', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const key = String(u.id), league = supportLeague(req.query.league);
  await ChatMessage.updateMany({ kind: 'support', key, league: leagueQ(league), admin: true, readBy: { $ne: u.id } }, { $addToSet: { readBy: u.id } });
  const list = await ChatMessage.find({ kind: 'support', key, league: leagueQ(league) }).sort({ at: -1 }).limit(100).lean();
  const tgt = await supportTarget(league);
  res.json({ peer: { name: tgt.name }, messages: list.reverse().map((x) => ({ id: String(x._id), mine: !x.admin, text: x.text, fileId: x.fileId, at: x.at })) });
}));
app.post('/api/support', limits.chat, ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const text = String(req.body?.text || '').trim().slice(0, 800), buf = decodeImage(req.body?.image);
  if (buf === false) return res.status(400).json({ error: 'badImage' });
  if (!buf && !text) return res.status(400).json({ error: 'badText' });
  const key = String(u.id), hour = new Date(Date.now() - 3600 * 1000), league = supportLeague(req.body?.league);
  const [last, cnt] = await Promise.all([ChatMessage.findOne({ kind: 'support', key, admin: false }).sort({ at: -1 }).lean(), ChatMessage.countDocuments({ kind: 'support', key, admin: false, at: { $gt: hour } })]);
  if ((last && Date.now() - last.at < 1500) || cnt >= 30) return res.status(429).json({ error: 'fast' });
  await touchUser(u);
  const lname = leagueNameOf(league);
  const sent = await sendSupport(league, `🆘 Muammoli holat (murojaat)${lname ? `\n🏆 ${lname}` : ''}\n👤 ${who(u)} (id ${u.id})\n${text ? `💬 ${text}\n` : ''}${buf ? '📎 Skrinshot ilova qilingan\n' : ''}\nJavob: Admin panel → Xabarlar`, buf);
  if (!sent.ok) return res.status(502).json({ error: 'fail' });
  await ChatMessage.create({ kind: 'support', key, league, from: u.id, admin: false, text, fileId: sent.fileId, readBy: [u.id] });
  res.json({ ok: true });
}));

// Yordamchi admin o'z ligasidagi murojaat/isbot skrinshotini ko'ra oladi
async function helperCanSee(uid, fid) {
  const rows = await Promise.all([
    ChatMessage.findOne({ kind: 'support', fileId: fid }).select('league').lean(),
    Match.findOne({ 'proofs.fileId': fid }).select('league').lean(),
  ]);
  const lgs = rows.filter(Boolean).map((x) => x.league).filter(Boolean);
  return lgs.length > 0 && !!(await LeagueHelper.exists({ telegramId: uid, league: { $in: lgs } }));
}
// Telegram serveridagi rasmni (isbot / murojaat skrinshoti) ilovaga uzatadi. Faqat adminlar yoki rasm egasi ko'ra oladi
app.get('/api/file/:fid', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const fid = String(req.params.fid);
  if (!/^[\w\-]{20,250}$/.test(fid)) return res.status(400).json({ error: 'fail' });
    const ok = ADMINS.includes(u.id)
    || (await ChatMessage.exists({ kind: 'support', key: String(u.id), fileId: fid }))
    || (await helperCanSee(u.id, fid))
    || (await Match.exists({ 'proofs.fileId': fid, $or: [{ home: u.id }, { away: u.id }] }))
    || (await Match.exists({
         _id: { $in: (await ChatMessage.find({ kind: 'match', fileId: fid }).select('key').lean()).map((x) => x.key) },
         $or: [{ home: u.id }, { away: u.id }],
       }));
  if (!ok) return res.status(403).json({ error: 'forbidden' });
  const link = await bot.telegram.getFileLink(fid);
  https.get(String(link.href || link), (r) => {
    res.set('Content-Type', r.headers['content-type'] || 'image/jpeg'); res.set('Cache-Control', 'private, max-age=86400');
    r.pipe(res);
  }).on('error', () => res.status(502).end());
}));

// Kunlik bonus: Toshkent vaqti bo'yicha kuniga bir marta; ketma-ket kunlar uchun ko'proq Coins
app.post('/api/daily/claim', limits.money, ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const r = await claimDaily(u.id);
  if (!r.ok) return res.status(409).json({ error: r.error, streak: r.streak || 0 });
  res.json(r);
}));

// Admin: Coins audit logi (ixtiyoriy telegramId bo'yicha filtr)
app.get('/api/admin/coins/log', adminOnly, ah(async (req, res) => {
  const tid = Number(req.query.telegramId) || null;
  const rows = await CoinLog.find(tid ? { telegramId: tid } : {}).sort({ at: -1 }).limit(200).lean();
  res.json({ rows: rows.map((x) => ({ id: String(x._id), telegramId: x.telegramId, delta: x.delta, reason: x.reason, ref: x.ref, actor: x.actor, note: x.note, at: x.at })) });
}));

// Admin: Coins qo'lda o'zgartirish (delta: + yoki -) yoki tasdiqlangan to'lovni qaytarib olish (topupId). Sabab majburiy.
app.post('/api/admin/coins/adjust', adminOnly, ah(async (req, res) => {
  const r = await adjustCoins({
    telegramId: Number(req.body?.telegramId), delta: Number(req.body?.delta),
    reason: req.body?.reason, topupId: req.body?.topupId || null, actor: req.admin.id,
  });
  if (!r.ok) return res.status(400).json({ error: r.error });
  const sign = r.delta > 0 ? '+' : '';
  say(r.telegramId, {
    uz: `ℹ️ Coins balansingiz o'zgardi: ${sign}${money(r.delta)} Coins. Sabab: ${r.reason}`,
    en: `ℹ️ Your Coins balance changed: ${sign}${money(r.delta)} Coins. Reason: ${r.reason}`,
    ru: `ℹ️ Баланс Coins изменён: ${sign}${money(r.delta)} Coins. Причина: ${r.reason}`,
  }, 'shop');
  res.json({ ok: true, coins: r.coins, delta: r.delta });
}));

// ——— Admin ———
// ——— Umumiy qoidalar: hamma o'qiydi, faqat katta admin qo'shadi/tahrirlaydi/o'chiradi ———
app.get('/api/rules', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const rows = await Rule.find({}).sort({ order: 1, createdAt: 1 }).lean();
  res.json({ canEdit: ADMINS.includes(u.id), rules: rows.map((r) => ({ id: String(r._id), title: r.title, text: r.text })) });
}));
const cleanRule = (b) => ({ title: String(b?.title || '').trim().slice(0, 80), text: String(b?.text || '').trim().slice(0, 8000) });
app.post('/api/admin/rules', adminOnly, ah(async (req, res) => {
  const d = cleanRule(req.body);
  if (!d.title) return res.status(400).json({ error: 'noTitle' });
  if (!d.text) return res.status(400).json({ error: 'noText' });
  const last = await Rule.findOne({}).sort({ order: -1 }).select('order').lean();
  const r = await Rule.create({ ...d, order: (last?.order || 0) + 1, by: req.admin.id });
  res.json({ ok: true, id: String(r._id) });
}));
app.post('/api/admin/rules/:id', adminOnly, ah(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
  const d = cleanRule(req.body);
  if (!d.title) return res.status(400).json({ error: 'noTitle' });
  if (!d.text) return res.status(400).json({ error: 'noText' });
  const r = await Rule.findByIdAndUpdate(req.params.id, { $set: { ...d, updatedAt: new Date() } });
  res.json(r ? { ok: true } : { error: 'gone' });
}));
app.post('/api/admin/rules/:id/delete', adminOnly, ah(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
  await Rule.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
}));

app.get('/api/me', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  // Ilova ochilganda ism/username/avatarni yangilab qo'yamiz va yoqilgan fonni qaytaramiz
  await touchUser(u);
  await migrateEq(u.id);
  const me = await User.findOne({ telegramId: u.id }).lean();
  res.json({ admin: ADMINS.includes(u.id) || !!(await LeagueHelper.exists({ telegramId: u.id })), bg: eqOf(me).pbg });
}));

// Ligalar: ishtirokchilar, qura vaqti/holati, o'yinlar soni
// Admin: har bir liga kubogining narxi (UZS). 0 yoki bo'sh — narx yo'q, sotib bo'lmaydi
app.get('/api/admin/cup-prices', adminOnly, ah(async (req, res) => {
  const cps = await CupPrice.find().lean(), cup = new Map(cps.map((x) => [x.league, x.price]));
  res.json({ cups: [...EFL.LEAGUES.map((l) => ({ id: l.id, name: l.name, group: l.group, price: cup.get(l.id) || 0 })), ...EFL.TROPHY_CUP_IDS.map((id) => ({ id, name: EFL.trophyName(id), group: 'cup', price: cup.get(id) || 0 }))] });
}));
app.post('/api/admin/cup-prices', adminOnly, ah(async (req, res) => {
  const league = String(req.body?.league || ''), price = Number(req.body?.price || 0);
  if ((!EFL.byId[league] && !EFL.TROPHY_CUP_IDS.includes(league)) || !Number.isInteger(price) || price < 0 || price > 1e9) return res.status(400).json({ error: 'badPrice' });
  if (price === 0) await CupPrice.deleteOne({ league });
  else await CupPrice.updateOne({ league }, { $set: { price, updatedAt: new Date() } }, { upsert: true });
  res.json({ ok: true, price });
}));

// Admin: o'yin chatini ko'rish (bahsli holatlarda isbot sifatida)
app.get('/api/admin/matches/:id/chat', staffOnly, ah(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
  const m = await Match.findOne({ _id: req.params.id, season }).lean();
  if (!m) return res.status(404).json({ error: 'gone' });
  if (!canLeague(req, m.league)) return res.status(403).json({ error: 'forbidden' });
  const list = await ChatMessage.find({ kind: 'match', key: String(m._id) }).sort({ at: -1 }).limit(100).lean();
  const users = await User.find({ telegramId: { $in: [m.home, m.away] } }).lean(), nm = new Map(users.map((x) => [x.telegramId, tgName(x)]));
  res.json({ messages: list.reverse().map((x) => ({ id: String(x._id), by: nm.get(x.from) || String(x.from), side: x.from === m.home ? 'home' : 'away', type: x.type, text: x.text, at: x.at })) });
}));

// Admin: «Muammoli holatlar» murojaatlari
app.get('/api/admin/support', staffOnly, ah(async (req, res) => {
  const scope = req.superAdmin ? {} : { league: { $in: req.helperLeagues } };
  const agg = await ChatMessage.aggregate([
    { $match: { kind: 'support', ...scope } }, { $sort: { at: -1 } },
    { $group: { _id: { key: '$key', league: { $ifNull: ['$league', ''] } }, last: { $first: '$$ROOT' }, unread: { $sum: { $cond: [{ $and: [{ $eq: ['$admin', false] }, { $eq: ['$adminRead', false] }] }, 1, 0] } } } },
    { $sort: { 'last.at': -1 } }, { $limit: 60 },
  ]);
  const users = await User.find({ telegramId: { $in: agg.map((g) => Number(g._id.key)) } }).lean(), nm = new Map(users.map((x) => [x.telegramId, tgName(x)]));
  res.json({ threads: agg.map((g) => ({ uid: g._id.key, league: g._id.league, leagueName: leagueNameOf(g._id.league), name: nm.get(Number(g._id.key)) || g._id.key, text: g.last.text || (g.last.fileId ? '📎 Rasm' : ''), at: g.last.at, unread: g.unread, fromAdmin: !!g.last.admin })) });
}));
app.get('/api/admin/support/:uid', staffOnly, ah(async (req, res) => {
  const uid = Number(req.params.uid), league = supportLeague(req.query.league);
  if (!Number.isInteger(uid)) return res.status(400).json({ error: 'fail' });
  if (!supportOk(req, league)) return res.status(403).json({ error: 'forbidden' });
  await ChatMessage.updateMany({ kind: 'support', key: String(uid), league: leagueQ(league), admin: false, adminRead: false }, { $set: { adminRead: true } });
  const [list, usr] = await Promise.all([ChatMessage.find({ kind: 'support', key: String(uid), league: leagueQ(league) }).sort({ at: -1 }).limit(100).lean(), User.findOne({ telegramId: uid }).lean()]);
  res.json({ user: { name: usr?.firstName || '', username: usr?.username || '' }, messages: list.reverse().map((x) => ({ id: String(x._id), mine: x.admin, text: x.text, fileId: x.fileId, at: x.at })) });
}));
app.post('/api/admin/support/:uid', staffOnly, ah(async (req, res) => {
  const uid = Number(req.params.uid), text = String(req.body?.text || '').trim().slice(0, 800), league = supportLeague(req.body?.league);
  if (!Number.isInteger(uid) || !text) return res.status(400).json({ error: 'badText' });
  if (!supportOk(req, league)) return res.status(403).json({ error: 'forbidden' });
  await ChatMessage.create({ kind: 'support', key: String(uid), league, from: req.admin.id, admin: true, text, adminRead: true, readBy: [] });
  say(uid, { uz: `📩 Admin javobi:\n${text}`, en: `📩 Admin reply:\n${text}`, ru: `📩 Ответ админа:\n${text}` }, 'support');
  res.json({ ok: true });
}));

app.get('/api/admin/overview', staffOnly, ah(async (req, res) => {
  const [regs, cfgs, maxRounds, groups, dls] = await Promise.all([
    Registration.find({ season }).select('league').lean(),
    LeagueConfig.find({ season }).lean(),
    Match.aggregate([{ $match: { season } }, { $group: { _id: '$league', max: { $max: '$round' } } }]),
    Match.aggregate([{ $match: { season, status: { $ne: 'cancelled' } } }, { $group: { _id: { league: '$league', status: '$status' }, n: { $sum: 1 } } }]),
    Match.aggregate([{ $match: { season, status: { $in: ['scheduled', 'pending', 'disputed'] }, deadline: { $ne: null } } }, { $group: { _id: { league: '$league', round: '$round' }, d: { $min: '$deadline' } } }]),
  ]);
  const cfg = new Map(cfgs.map((c) => [c.league, c]));
  const roundMax = new Map(maxRounds.map((x) => [x._id, x.max]));
  const dlMap = {}; dls.forEach((x) => { (dlMap[x._id.league] ||= {})[x._id.round] = x.d; });
  const cnt = {};
  groups.forEach((g) => { const c = (cnt[g._id.league] ||= { total: 0, confirmed: 0, action: 0 }); c.total += g.n; if (g._id.status === 'confirmed') c.confirmed += g.n; if (g._id.status === 'pending' || g._id.status === 'disputed') c.action += g.n; });
  const leagues = EFL.LEAGUES.map((l) => {
    const c = cfg.get(l.id), n = cnt[l.id] || { total: 0, confirmed: 0, action: 0 };
    return { id: l.id, name: l.name, group: l.group, max: l.max, closed: !!c?.closed, players: regs.filter((r) => r.league === l.id).length, drawAt: c?.drawAt || null, drawnAt: c?.drawnAt || null, rounds: c?.rounds || 2, roundDays: c?.roundDays || 7, roundDeadlines: dlMap[l.id] || {}, ...lockInfo(c, roundMax.get(l.id) || 0), ...n };
  });
  const support = await ChatMessage.countDocuments({ kind: 'support', admin: false, adminRead: false, ...(req.superAdmin ? {} : { league: { $in: req.helperLeagues } }) });
  const vis = req.superAdmin ? leagues : leagues.filter((l) => canLeague(req, l.id));
  res.json({ leagues: vis, action: vis.reduce((s, l) => s + l.action, 0), support, superAdmin: req.superAdmin });
}));

// Yordamchi adminlar (faqat katta admin boshqaradi)
// Username yoki ID bo'yicha foydalanuvchi qidirish (helper qo'shish uchun)
app.get('/api/admin/helpers/lookup', adminOnly, ah(async (req, res) => {
  const q = String(req.query.q || '').trim().replace(/^@/, '');
  if (!q) return res.status(400).json({ error: 'fail' });
  let usr;
  if (/^\d+$/.test(q)) {
    usr = await User.findOne({ telegramId: Number(q) }).lean();
  } else {
    usr = await User.findOne({ username: new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }).lean();
  }
  if (!usr) return res.status(404).json({ error: 'nouser' });
  res.json({ ok: true, telegramId: usr.telegramId, name: tgName(usr) });
}));

app.get('/api/admin/helpers', adminOnly, ah(async (req, res) => {
  const rows = await LeagueHelper.find({}).sort({ league: 1, addedAt: 1 }).lean();
  const users = await User.find({ telegramId: { $in: rows.map((r) => r.telegramId) } }).lean();
  const nm = new Map(users.map((x) => [x.telegramId, tgName(x)]));
  res.json({ helpers: rows.map((r) => ({ telegramId: r.telegramId, name: nm.get(r.telegramId) || String(r.telegramId), league: r.league, leagueName: leagueOf(r.league)?.name || r.league })) });
}));
app.post('/api/admin/helpers', adminOnly, ah(async (req, res) => {
  const tid = Number(req.body?.telegramId), league = leagueOf(req.body?.league);
  if (!Number.isInteger(tid) || tid <= 0 || !league) return res.status(400).json({ error: 'fail' });
  if (!(await User.exists({ telegramId: tid }))) return res.status(404).json({ error: 'nouser' });
  if (ADMINS.includes(tid)) return res.status(409).json({ error: 'already' });
  try { await LeagueHelper.create({ telegramId: tid, league: league.id, addedBy: req.admin.id }); }
  catch (e) { return res.status(e.code === 11000 ? 409 : 500).json({ error: e.code === 11000 ? 'already' : 'fail' }); }
  say(tid, {
    uz: `🛠 Siz «${league.name}» ligasining yordamchi admini etib tayinlandingiz. Admin panelda faqat shu ligani boshqarasiz.`,
    en: `🛠 You were appointed helper admin for «${league.name}». You manage only this league in the admin panel.`,
    ru: `🛠 Вы назначены помощником админа лиги «${league.name}». В админ-панели доступна только эта лига.`,
  }, 'shop');
  res.json({ ok: true });
}));
app.post('/api/admin/helpers/remove', adminOnly, ah(async (req, res) => {
  const tid = Number(req.body?.telegramId), league = leagueOf(req.body?.league);
  if (!Number.isInteger(tid) || !league) return res.status(400).json({ error: 'fail' });
  const r = await LeagueHelper.deleteOne({ telegramId: tid, league: league.id });
  if (!r.deletedCount) return res.status(404).json({ error: 'gone' });
  say(tid, {
    uz: `ℹ️ «${league.name}» ligasidagi yordamchi admin huquqingiz olib tashlandi.`,
    en: `ℹ️ Your helper admin rights for «${league.name}» were removed.`,
    ru: `ℹ️ Ваши права помощника админа лиги «${league.name}» сняты.`,
  }, 'shop');
  res.json({ ok: true });
}));

// Admin: davlat → liga → klublar holati (band yoki bo'sh, band bo'lsa kim olgani)
app.get('/api/admin/clubs', staffOnly, ah(async (req, res) => {
  const regs = await Registration.find({ season }).lean();
  const users = await User.find({ telegramId: { $in: regs.map((r) => r.telegramId) } }).lean();
  const nm = new Map(users.map((x) => [x.telegramId, tgName(x)]));
  const byKey = new Map(regs.map((r) => [r.league + '/' + r.club, r]));
  const leagues = EFL.LEAGUES.filter((l) => canLeague(req, l.id)).map((l) => ({
    id: l.id, name: l.name, country: l.country,
    clubs: l.clubs.map((c) => {
      const r = byKey.get(l.id + '/' + c.id);
      return { id: c.id, name: c.name, taken: !!r && !r.vacant, user: r && !r.vacant ? (nm.get(r.telegramId) || String(r.telegramId)) : '' };
    }),
  }));
  res.json({ leagues });
}));

// O'yinlar ro'yxati. status: action (tasdiq kutayotgan/bahsli) | scheduled | confirmed | all
app.get('/api/admin/matches', staffOnly, ah(async (req, res) => {
  const { league, status = 'action', q: searchQ } = req.query;
  const q = { season, status: { $ne: 'cancelled' } };
  if (league) {
    const isCup = cupLogic.FAMILIES[league] || cupLogic.familyOfKey(league);
    if (!EFL.byId[league] && !isCup) return res.status(400).json({ error: 'fail' });
    if (!canLeague(req, league)) return res.status(403).json({ error: 'forbidden' });
    q.league = league;
  }
  else if (!req.superAdmin) q.league = { $in: req.helperLeagues };
  if (status === 'action') q.status = { $in: ['disputed', 'pending'] };
  else if (['scheduled', 'confirmed', 'pending', 'disputed'].includes(status)) q.status = status;
  let [ms, total] = await Promise.all([Match.find(q).sort(status === 'action' ? { status: 1, updatedAt: 1 } : { round: 1, matchNo: 1, _id: 1 }).limit(searchQ ? 500 : 100).lean(), Match.countDocuments(q)]);
  let decorated = await decorate(ms);
  if (searchQ) {
    const raw = String(searchQ).trim();
    const cleanNo = raw.replace(/^#/, '');
    const isNum = /^\d+$/.test(cleanNo);
    decorated = decorated.filter((m) => {
      if (isNum && (String(m.matchNo) === cleanNo || String(m.round) === cleanNo)) return true;
      if (m.id === raw) return true;
      const lower = raw.toLowerCase();
      return (m.home?.club && m.home.club.toLowerCase().includes(lower)) ||
             (m.away?.club && m.away.club.toLowerCase().includes(lower)) ||
             (m.home?.user && m.home.user.toLowerCase().includes(lower)) ||
             (m.away?.user && m.away.user.toLowerCase().includes(lower));
    });
  }
  res.json({ total: decorated.length, matches: decorated });
}));

// Natijani tasdiqlash / kiritish / o'zgartirish (hg — uy egasi goli, ag — mehmon goli)
app.post('/api/admin/matches/:id/result', staffOnly, ah(async (req, res) => {
  const { hg, ag } = req.body || {};
  if (!validId(req.params.id) || !goal(hg) || !goal(ag)) return res.status(400).json({ error: 'badScore' });
  if (!req.superAdmin) {
    const cur = await Match.findOne({ _id: req.params.id, season }).select('league').lean();
    if (!cur) return res.status(404).json({ error: 'gone' });
    if (!canLeague(req, cur.league)) return res.status(403).json({ error: 'forbidden' });
  }
  const m = await Match.findOneAndUpdate({ _id: req.params.id, season, status: { $ne: 'cancelled' } }, { $set: { hg, ag, status: 'confirmed', confirmedBy: 'admin', reportedBy: null, claim: null, updatedAt: new Date() } }, { new: true }).lean();
  if (!m) return res.status(404).json({ error: 'gone' });
  await recalc(m.league);
  const [a, b] = await Promise.all([whoIs(m.league, m.home), whoIs(m.league, m.away)]);
  notify(m.home, 'adminSet', b, hg, ag);
  notify(m.away, 'adminSet', a, ag, hg);
  res.json({ ok: true });
}));

// Natijani o'chirish: o'yin yana «kiritilmagan» holatiga qaytadi, jadval qayta hisoblanadi.
// Dedlayni o'tib ketgan bo'lsa, o'yinchilarga yangi 12 soatlik muhlat beriladi (avto-natija darhol qo'llanmasin).
app.post('/api/admin/matches/:id/reset', staffOnly, ah(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
  const cur = await Match.findOne({ _id: req.params.id, season }).select('league status deadline').lean();
  if (!cur) return res.status(404).json({ error: 'gone' });
  if (!canLeague(req, cur.league)) return res.status(403).json({ error: 'forbidden' });
  if (cur.status === 'cancelled') return res.status(409).json({ error: 'cancelled' });
  if (cur.status === 'scheduled') return res.status(409).json({ error: 'nothing' });
  const now = new Date();
  const deadline = cur.deadline && cur.deadline < now ? new Date(now.getTime() + 12 * 3600 * 1000) : cur.deadline;
  await Match.updateOne({ _id: req.params.id, season }, { $set: { status: 'scheduled', hg: null, ag: null, reportedBy: null, claim: null, proofs: [], confirmedBy: null, auto: null, deadline, notified: [], updatedAt: now } });
  await recalc(cur.league);
  res.json({ ok: true });
}));
// Qura vaqtini belgilash (vaqti kelganda bot o'zi qura qiladi)
// Admin: ligani ochiq/yopiq qilish (yopiq ligaga yangi ishtirokchi ro'yxatdan o'ta olmaydi; mavjudlar o'ynashda davom etadi)
app.post('/api/admin/league/:id/closed', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id];
  if (!league || typeof req.body?.closed !== 'boolean') return res.status(400).json({ error: 'fail' });
  await LeagueConfig.updateOne({ season, league: league.id }, { $set: { closed: req.body.closed } }, { upsert: true });
  res.json({ ok: true, closed: req.body.closed });
}));
// Turlarni ochish/yopish: {round, open} — bitta tur, {all:true, open} — hammasi. Faqat qura o'tgan ligada.
app.post('/api/admin/league/:id/rounds', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id];
  if (!league) return res.status(400).json({ error: 'fail' });
  const cfg = await LeagueConfig.findOne({ season, league: league.id }).lean();
  if (!cfg?.drawnAt) return res.status(409).json({ error: 'notdrawn' });
  const last = await Match.findOne({ season, league: league.id }).sort({ round: -1 }).select('round').lean();
  const total = last?.round || 0, allRounds = Array.from({ length: total }, (_, i) => i + 1);
  const open = req.body?.open;
  if (typeof open !== 'boolean') return res.status(400).json({ error: 'fail' });
  let set;
  if (req.body?.all === true) set = open ? allRounds : [];
  else {
    const r = Number(req.body?.round);
    if (!Number.isInteger(r) || r < 1 || r > total) return res.status(400).json({ error: 'fail' });
    const cur = new Set(cfg.roundsLocked ? (cfg.openRounds || []) : allRounds);   // eski liga: hozirgi holatdan boshlanadi
    if (open) cur.add(r); else cur.delete(r);
    set = [...cur].sort((a, b) => a - b);
  }
  await LeagueConfig.updateOne({ season, league: league.id }, { $set: { roundsLocked: true, openRounds: set } }, { upsert: true });
  res.json({ ok: true, openRounds: set });
}));
app.post('/api/admin/league/:id/draw-time', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id];
  if (!league) return res.status(400).json({ error: 'fail' });
  const at = req.body?.drawAt ? new Date(req.body.drawAt) : null;
  if (at && isNaN(at)) return res.status(400).json({ error: 'fail' });
  if (await LeagueConfig.exists({ season, league: league.id, drawnAt: { $ne: null } })) return res.status(409).json({ error: 'drawn' });
  const c = await LeagueConfig.findOneAndUpdate({ season, league: league.id }, { $set: { drawAt: at, rounds: req.body?.rounds === 1 ? 1 : 2, ...(DL.clampDays(req.body?.roundDays) ? { roundDays: DL.clampDays(req.body.roundDays) } : {}) } }, { upsert: true, new: true }).lean();
  res.json({ ok: true, drawAt: c.drawAt });
}));

// Qurani hozir o'tkazish. redo: faqat hali birorta hisob kiritilmagan bo'lsa qayta o'tkazish mumkin
app.post('/api/admin/league/:id/draw', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id];
  if (!league) return res.status(400).json({ error: 'fail' });
  if (req.body?.redo) {
    if (await Match.exists({ season, league: league.id, status: { $nin: ['scheduled', 'cancelled'] } })) return res.status(409).json({ error: 'played' });
    await Match.deleteMany({ season, league: league.id });
    await LeagueConfig.updateOne({ season, league: league.id }, { $set: { drawnAt: null } });
  }
  const r = await performDraw(league.id, req.body?.rounds, req.body?.roundDays);
  if (r.error) return res.status(409).json({ error: r.error });
  res.json(r);
}));

// Qurani bekor qilish: o'yinlar o'chadi, liga qura o'tkazilmagan (0 dan) holatiga qaytadi. Ishtirokchilar qoladi.
// Hisob kiritilgan o'yin bo'lsa bekor qilib bo'lmaydi (redo bilan bir xil qoida).
app.post('/api/admin/league/:id/draw-cancel', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id];
  if (!league) return res.status(400).json({ error: 'fail' });
  if (await Match.exists({ season, league: league.id, status: { $nin: ['scheduled', 'cancelled'] } })) return res.status(409).json({ error: 'played' });
  await Match.deleteMany({ season, league: league.id });
  await LeagueConfig.updateOne({ season, league: league.id }, { $set: { drawnAt: null, drawAt: null, roundsLocked: false, openRounds: [] } }, { upsert: true });
  await recalc(league.id);
  res.json({ ok: true });
}));
// Bitta turning dedlayni: shu turdagi tugallanmagan o'yinlarga qo'yiladi (faqat belgilangan tur)
app.post('/api/admin/league/:id/round-deadline', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id];
  if (!league) return res.status(400).json({ error: 'fail' });
  const round = Number(req.body?.round);
  if (!Number.isInteger(round) || round < 1) return res.status(400).json({ error: 'fail' });
  const at = new Date(req.body?.deadline);
  if (isNaN(at) || at <= new Date()) return res.status(400).json({ error: 'time' });
  const r = await Match.updateMany({ season, league: league.id, round, status: { $in: ['scheduled', 'pending', 'disputed'] } }, { $set: { deadline: at, notified: [] } });
  res.json({ ok: true, matches: r.modifiedCount ?? r.nModified ?? 0 });
}));
// Eski (dedlaynsiz) o'yinlarga dedlayn berish: tugallanmagan turlar «hozirdan» ketma-ket sanaladi
app.post('/api/admin/league/:id/deadlines', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id], days = DL.clampDays(req.body?.roundDays);
  if (!league || !days) return res.status(400).json({ error: 'fail' });
  const ms = await Match.find({ season, league: league.id, status: { $in: ['scheduled', 'pending', 'disputed'] }, deadline: null }).select('round').lean();
  if (!ms.length) return res.status(409).json({ error: 'nodl' });
  const st = DL.stampSeq(ms.map((m) => ({ _id: m._id, round: m.round })), new Date(), days);
  await Match.bulkWrite(st.map((m) => ({ updateOne: { filter: { _id: m._id }, update: { $set: { startsAt: m.startsAt, deadline: m.deadline, notified: m.notified } } } })));
  await LeagueConfig.updateOne({ season, league: league.id }, { $set: { roundDays: days } }, { upsert: true });
  res.json({ ok: true, matches: st.length });
}));

// Ligadagi ishtirokchilar va bo'sh klublar
app.get('/api/admin/league/:id/players', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id];
  if (!league) return res.status(400).json({ error: 'fail' });
  const regs = await Registration.find({ season, league: league.id }).lean();
  const users = await User.find({ telegramId: { $in: regs.map((r) => r.telegramId) } }).lean();
  const nm = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || '']));
  const taken = new Set(regs.filter((r) => !r.vacant).map((r) => r.club));
  res.json({
    max: league.max,
    players: regs.filter((r) => !r.vacant).sort(rankSort).map((r) => ({ telegramId: r.telegramId, club: EFL.clubName(league.id, r.club), user: nm.get(r.telegramId) || '', pts: r.pts, games: r.w + r.d + r.l })),
    free: league.clubs.filter((c) => !taken.has(c.id)).map((c) => ({ id: c.id, name: c.name })),
    ...(await recoverInfo(league.id, regs)),
  });
}));

// Eski usulda (o'yinlari bekor qilinib) voz kechilgan klublar: o'yinsiz qolgan klub egalari va o'yinlari egasiz qolgan eski ishtirokchilar
async function recoverInfo(leagueId, regs) {
  const all = await Match.find({ season, league: leagueId }).select('home away status auto').lean();
  const regIds = new Set(regs.map((r) => r.telegramId));
  const cnt = new Map();
  all.filter((m) => m.status === 'cancelled' && m.auto?.kind !== 'void').forEach((m) => [m.home, m.away].forEach((id) => { if (!regIds.has(id)) cnt.set(id, (cnt.get(id) || 0) + 1); }));
  // Qura o'tgandan keyin qo'shilgan ishtirokchilar (o'yinlari tiklanishi mumkin): ro'yxatdan o'tgan vaqti birinchi o'yin yaratilganidan keyin
  const first = all.length ? Math.min(...all.map((m) => m._id.getTimestamp().getTime())) : Infinity;
  const needy = regs.filter((r) => !r.vacant && new Date(r.createdAt).getTime() > first);
  if (!needy.length || !cnt.size) return { needy: [], orphans: [] };
  const users = await User.find({ telegramId: { $in: [...cnt.keys(), ...needy.map((r) => r.telegramId)] } }).lean();
  const nm = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || String(x.telegramId)]));
  return {
    needy: needy.map((r) => ({ telegramId: r.telegramId, club: EFL.clubName(leagueId, r.club), user: nm.get(r.telegramId) || String(r.telegramId) })),
    orphans: [...cnt].map(([id, n]) => ({ telegramId: id, user: nm.get(id) || String(id), games: n })),
  };
}

// Eski egasining bekor qilingan o'yinlarini yangi egasiga qaytarish (natijalari bilan)
app.post('/api/admin/league/:id/restore', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id], from = Number(req.body?.from), to = Number(req.body?.to);
  if (!league || !from || !to || from === to) return res.status(400).json({ error: 'fail' });
  const base = { season, league: league.id };
  if (!(await Registration.exists({ ...base, telegramId: to }))) return res.status(404).json({ error: 'gone' });
  if (await Registration.exists({ ...base, telegramId: from })) return res.status(409).json({ error: 'active' });
  // Yangi egasiga admin qo'shganda avtomatik yaratilgan (hali o'ynalmagan) o'yinlar eski o'yinlar o'rniga bekor qilinadi; o'ynalgan o'yin bo'lsa tiklab bo'lmaydi
  const own = await Match.find({ ...base, status: { $ne: 'cancelled' }, $or: [{ home: to }, { away: to }] }).select('status').lean();
  if (own.some((m) => m.status !== 'scheduled')) return res.status(409).json({ error: 'hasgames' });
  const ms = await Match.find({ ...base, status: 'cancelled', 'auto.kind': { $ne: 'void' }, $or: [{ home: from }, { away: from }] }).lean();
  if (!ms.length) return res.status(404).json({ error: 'nogames' });
  const regIds = new Set((await Registration.find(base).select('telegramId').lean()).map((r) => r.telegramId));
  const ops = ms.map((m) => {
    const set = { updatedAt: new Date() };
    if (m.home === from) set.home = to;
    if (m.away === from) set.away = to;
    if (m.reportedBy === from) set.reportedBy = to;
    // ikkala tomon ham hozir ro'yxatda bo'lsa o'yin tiklanadi (aks holda ikkinchi egasi tiklanganda)
    if (regIds.has(set.home ?? m.home) && regIds.has(set.away ?? m.away)) {
      set.status = m.confirmedBy ? 'confirmed' : (m.reportedBy && m.hg != null) ? 'pending' : m.claim ? 'disputed' : 'scheduled';
    }
    return { updateOne: { filter: { _id: m._id }, update: { $set: set } } };
  });
  if (own.length) await Match.updateMany({ _id: { $in: own.map((m) => m._id) } }, { $set: { status: 'cancelled', auto: { kind: 'replaced', at: new Date() }, updatedAt: new Date() } });
  await Match.bulkWrite(ops);
  const keys = ms.map((m) => String(m._id));
  await ChatMessage.updateMany({ kind: 'match', key: { $in: keys }, from }, { $set: { from: to } });
  await ChatMessage.updateMany({ kind: 'match', key: { $in: keys }, readBy: from }, { $addToSet: { readBy: to } });
  await ChatMessage.updateMany({ kind: 'match', key: { $in: keys }, readBy: from }, { $pull: { readBy: from } });
  await recalc(league.id);
  res.json({ ok: true, restored: ms.length });
}));

// Ishtirokchini chiqarish: klub o'yinlari va natijalari bilan bo'sh qoladi, yangi ishtirokchi shundan davom etadi
app.post('/api/admin/league/:id/remove', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id], tid = Number(req.body?.telegramId);
  if (!league || !tid) return res.status(400).json({ error: 'fail' });
  // Natijalar saqlanadi: klub bo'sh qoladi, keyingi qo'shilgan ishtirokchi shu holatdan davom etadi
  const reg = await vacateClub(league.id, tid);
  if (!reg) return res.status(404).json({ error: 'gone' });
  notify(tid, 'removed', league.name);
  res.json({ ok: true });
}));

// Ishtirokchi qo'shish (foydalanuvchi botga /start bosgan bo'lishi kerak). Qura o'tgan bo'lsa — qolganlar bilan o'yinlari qo'shiladi
app.post('/api/admin/league/:id/add', staffOnly, ah(async (req, res) => {
  if (!canLeague(req, req.params.id)) return res.status(403).json({ error: 'forbidden' });
  const league = EFL.byId[req.params.id], club = req.body?.club, q = String(req.body?.user || '').trim().replace(/^@/, '');
  if (!league || !league.clubs.some((c) => c.id === club) || !q) return res.status(400).json({ error: 'fail' });
  const usr = /^\d+$/.test(q) ? await User.findOne({ telegramId: Number(q) }).lean() : await User.findOne({ username: new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }).lean();
  if (!usr) return res.status(404).json({ error: 'nouser' });
  if (await Registration.exists({ season, telegramId: usr.telegramId })) return res.status(409).json({ error: 'already' });
  if (await Registration.exists({ season, league: league.id, club, vacant: true })) {
    // Bo'sh klub: o'yinlar va natijalar o'z holicha yangi egasiga o'tadi
    await takeOverVacant(league.id, club, usr.telegramId);
    await recalc(league.id);
    notify(usr.telegramId, 'added', league.name, EFL.clubName(league.id, club));
    return res.json({ ok: true });
  }
  if ((await Registration.countDocuments({ season, league: league.id })) >= league.max) return res.status(409).json({ error: 'full' });
  try { await Registration.create({ league: league.id, season, telegramId: usr.telegramId, club }); }
  catch (e) { return res.status(e.code === 11000 ? 409 : 500).json({ error: e.code === 11000 ? (/telegramId/.test(e.message) ? 'already' : 'taken') : 'fail' }); }
  const cfg = await LeagueConfig.findOne({ season, league: league.id }).lean();
  if (cfg?.drawnAt) {
    const others = (await Registration.find({ season, league: league.id, telegramId: { $ne: usr.telegramId } }).lean()).map((r) => r.telegramId);
    const last = (await Match.findOne({ season, league: league.id }).sort({ round: -1 }).lean())?.round || 0;
    const fx = FX.fixturesForNewcomer(usr.telegramId, others, last, cfg.rounds === 2);
    if (fx.length) {
      const lastM = await Match.findOne({ season, league: league.id }).sort({ matchNo: -1 }).select('matchNo').lean();
      let curNo = (lastM && lastM.matchNo) ? lastM.matchNo : 0;
      await Match.insertMany(DL.stampSeq(fx, new Date(), cfg.roundDays || 7).map((m) => ({ ...m, league: league.id, season, matchNo: ++curNo })));
    }
  }
  notify(usr.telegramId, 'added', league.name, EFL.clubName(league.id, club));
  const cupWarning = await cupLogic.onLeagueAdd(season, league.id, usr.telegramId);
  res.json({ ok: true, cupWarning });
}));

// Norasmiy turnirlar (unofficial.js)
let botUser = null;
const botName = async () => { if (!botUser) { try { botUser = (await bot.telegram.getMe()).username; } catch (_) {} } return botUser; };
// Norasmiy turnirlar vaqtincha QULFLANGAN (qayta ishlanmoqda). Ochish: UT_LOCKED ni false qiling. Adminlar sinash uchun kira oladi.
const UT_LOCKED = true;
app.use('/api/ut', (req, res, next) => {
  if (!UT_LOCKED) return next();
  const u = tgUser(req);
  if (u && ADMINS.includes(u.id)) return next();
  res.status(423).json({ error: 'locked' });
});
const ut = require('./unofficial')(app, { tgUser, ah, bot, User, ADMINS, Markup, t, MINI_APP_URL, adminOnly, botName });
registerSeasonRoutes(app, { tgUser, adminIds: ADMINS });
registerAdminExtra(app, { adminOnly, ah, bot, season, EFL, Markup, MINI_APP_URL });
const cupApi = require('./lib/cup-api')(app, { tgUser, ah, adminOnly, season, notifyAdmins });
const deadlines = mountDeadlines({ Match, Cup, ChatMessage, LeagueConfig, season, EFL, notify, whoIs, recalc, notifyAdmins });

// ——— Mavsum starti: PL + Championship + FA Cup + Community Shield birga ———
const AUTO_CUPS = ['fa-cup', 'community-shield', 'copa-del-rey', 'supercopa'];
let openedFor = null;

async function ensureSeasonOpened(cal) {
  if (cal.phase !== 'live' && cal.phase !== 'finished') return;
  if (openedFor === cal.number) return;
  try {
    await SeasonState.updateOne({ number: cal.number },
      { $setOnInsert: { startAt: new Date(cal.startAt), endAt: new Date(cal.endAt) } }, { upsert: true });
    const r = await SeasonState.updateOne({ number: cal.number, openedAt: null },
      { $set: { openedAt: new Date(), cupsStartedAt: new Date(), cups: AUTO_CUPS } });
       if (r?.modifiedCount) {
      console.log(`⏱ Mavsum ${cal.number} boshlandi — ligalar + ${AUTO_CUPS.join(', ')}`);
      notifyAdmins('🎲 Mavsum boshlandi!\nFA Cup va Copa del Rey qura marosimi vaqtini kiriting: Admin panel → 🎲 Kubok → "Qura vaqti"');
    }
    openedFor = cal.number;
  } catch (_) { /* DB hali ulanmagan */ }
}

function startSeasonWatcher() {
  const tick = () => { seasonEngine.calendar().then(ensureSeasonOpened).catch(() => {}); };
  tick();
  const id = setInterval(tick, 60 * 1000);
  if (id.unref) id.unref();
}

// Payme va Click callback'lari (tashqi tizimlar chaqiradi; /api limitiga kirmaydi)
payments.mount(app, { notifyUser: (tid, texts) => say(tid, texts, 'shop'), alert });

// Kutilmagan xatolar: konsolga va adminga Telegramda
app.use((err, req, res, _next) => { alert('express ' + req.method + ' ' + req.path, err); res.status(500).json({ error: 'fail' }); });
process.on('unhandledRejection', (e) => alert('unhandledRejection', e));
process.on('uncaughtException', (e) => { alert('uncaughtException', e); setTimeout(() => process.exit(1), 1500).unref(); });

app.listen(process.env.PORT || 3000, () => console.log('Mini app serveri ishga tushdi'));

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  startSeasonWatcher();                 // ← qo'shildi
  // Har daqiqada: vaqti kelgan quralarni avtomatik o'tkazadi
  setInterval(async () => {
    try {
      const due = await LeagueConfig.find({ season, drawnAt: null, drawAt: { $ne: null, $lte: new Date() } }).lean();
      for (const c of due) {
        const r = await performDraw(c.league, c.rounds);
        const name = EFL.byId[c.league]?.name || c.league;
        if (r.ok) notifyAdmins(`🎲 ${name}: qura avtomatik o'tkazildi (${r.matches} ta o'yin).`);
        else { await LeagueConfig.updateOne({ _id: c._id }, { $set: { drawAt: null } }); notifyAdmins(`⚠️ ${name}: qura o'tkazilmadi (${r.error === 'few' ? 'kamida 2 ishtirokchi kerak' : r.error}). Vaqtni qayta belgilang.`); }
      }
      await ut.runDue(); // norasmiy turnirlar quralari
      await cupApi.runDue(); // FA Cup quralari
      await deadlines.tick(); // tur boshlandi / dedlayn eslatmalari / avto-yutuq
      await ut.remind().catch((e) => console.error('Turnir eslatmalari:', e)); // norasmiy turnirlar: dedlayn eslatmasi
    } catch (e) { console.error('Qura rejalashtiruvchisi:', e); }
  }, 60 * 1000);
  bot.catch((err, ctx) => alert('bot ' + (ctx?.updateType || ''), err));
  await bot.launch();
  console.log('Bot ishga tushdi');
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
