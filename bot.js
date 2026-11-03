require('dotenv').config();
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
const CupPrice = require('./models/CupPrice');
const ChatMessage = require('./models/ChatMessage');
const https = require('https');
const TopUp = require('./models/TopUp');
const SeasonState = require('./models/Season');
const seasonEngine = require('./lib/season');
const registerSeasonRoutes = require('./lib/season-api');


const bot = new Telegraf(process.env.BOT_TOKEN);
const MINI_APP_URL = process.env.MINI_APP_URL; // HTTPS bo'lishi shart
// Adminlar: .env dagi ADMIN_IDS=123456,789012 (Telegram ID lar, vergul bilan)
const ADMINS = (process.env.ADMIN_IDS || '').split(',').map((s) => Number(s.trim())).filter(Boolean);

const langKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("O'zbekcha", 'lang_uz')],
  [Markup.button.callback('English', 'lang_en')],
  [Markup.button.callback('Русский', 'lang_ru')],
]);

// "Kirish" va "Qo'llanma" ilovani to'g'ridan-to'g'ri ochadi (?open=guide — Qo'llanma sahifasi)
const mainKeyboard = (lang) =>
  Markup.inlineKeyboard([
    [Markup.button.webApp(t[lang].enter, `${MINI_APP_URL}?lang=${lang}`)],
    [Markup.button.webApp(t[lang].guide, `${MINI_APP_URL}?lang=${lang}&open=guide`)],
  ]);

bot.start(async (ctx) => {
  const { id, first_name, username } = ctx.from;
  await User.findOneAndUpdate(
    { telegramId: id },
    { firstName: first_name, username },
    { upsert: true, new: true }
  );
  // Turnirga taklif havolasi: t.me/<bot>?start=t_KOD → to'g'ridan-to'g'ri turnirga qo'shilish oynasini ochadi
  const m = /^t_([A-Za-z0-9]{4,12})$/.exec(ctx.startPayload || '');
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
app.use(express.static(path.join(__dirname, 'webapp')));

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
const touchUser = (u) => User.updateOne({ telegramId: u.id }, { $set: { firstName: u.first_name || '', username: u.username || '', photoUrl: u.photo_url || '' } }, { upsert: true }).catch(() => {});
// Async marshrutlarda xato chiqsa server qulab tushmasligi uchun
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => { console.error(e); res.status(500).json({ error: 'fail' }); });
const adminOnly = (req, res, next) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  if (!ADMINS.includes(u.id)) return res.status(403).json({ error: 'forbidden' });
  req.admin = u; next();
};
const goal = (v) => Number.isInteger(v) && v >= 0 && v <= 99;
const validId = (id) => mongoose.isValidObjectId(id);

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

// "Klub (@username)" ko'rinishidagi nom
async function whoIs(leagueId, id) {
  const [reg, usr] = await Promise.all([Registration.findOne({ season, league: leagueId, telegramId: id }).lean(), User.findOne({ telegramId: id }).lean()]);
  const nm = usr?.username ? '@' + usr.username : usr?.firstName || String(id);
  return reg ? `${EFL.clubName(leagueId, reg.club)} (${nm})` : nm;
}
// O'yinlarga klub va ism qo'shib admin panelga tayyorlaydi
async function decorate(ms) {
  if (!ms.length) return [];
  const ids = [...new Set(ms.flatMap((m) => [m.home, m.away]))];
  const [regs, users] = await Promise.all([Registration.find({ season, telegramId: { $in: ids } }).lean(), User.find({ telegramId: { $in: ids } }).lean()]);
  const reg = new Map(regs.map((r) => [r.telegramId, r]));
  const nm = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || '']));
  const side = (id, league) => ({ id, club: reg.has(id) ? EFL.clubName(league, reg.get(id).club) : '—', user: nm.get(id) || String(id) });
  const chatAgg = await ChatMessage.aggregate([{ $match: { kind: 'match', key: { $in: ms.map((m) => String(m._id)) } } }, { $group: { _id: '$key', n: { $sum: 1 } } }]);
  const chatN = new Map(chatAgg.map((x) => [x._id, x.n]));
  return ms.map((m) => ({
    proofs: (m.proofs || []).map((p) => ({ by: nm.get(p.by) || String(p.by), text: p.text || '', fileId: p.fileId || '', hg: p.hg ?? null, ag: p.ag ?? null, at: p.at })),
    chat: chatN.get(String(m._id)) || 0,
    id: String(m._id), league: m.league, leagueName: EFL.byId[m.league]?.name || m.league, round: m.round, status: m.status,
    home: side(m.home, m.league), away: side(m.away, m.league), hg: m.hg, ag: m.ag,
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
async function performDraw(leagueId, rounds) {
  let lock;
  try {
    lock = await LeagueConfig.findOneAndUpdate({ season, league: leagueId, drawnAt: null }, { $set: { drawnAt: new Date(), rounds: rounds === 1 ? 1 : 2 } }, { upsert: true, new: true });
  } catch (e) { if (e.code === 11000) return { error: 'drawn' }; throw e; }
  const unlock = () => LeagueConfig.updateOne({ _id: lock._id }, { $set: { drawnAt: null } });
  const regs = await Registration.find({ season, league: leagueId }).lean();
  if (regs.length < 2) { await unlock(); return { error: 'few' }; }
  try {
    const fx = FX.roundRobin(FX.shuffle(regs.map((r) => r.telegramId)), lock.rounds === 2);
    await Match.insertMany(fx.map((m) => ({ ...m, league: leagueId, season })));
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
      return { id: l.id, max: l.max, players: rs.length, taken: rs.map((r) => r.club), closed: closedSet.has(l.id) };
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
  const unreadAgg = ms.length ? await ChatMessage.aggregate([{ $match: { kind: 'match', key: { $in: ms.map((m) => String(m._id)) }, readBy: { $ne: uid } } }, { $group: { _id: '$key', n: { $sum: 1 } } }]) : [];
  const unread = new Map(unreadAgg.map((x) => [x._id, x.n]));
  return ms.map((m) => {
    const mine = m.home === uid, hasScore = m.hg != null && m.ag != null;
    return {
      id: String(m._id), round: m.round, status: m.status, byMe: m.reportedBy === uid,
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
  res.json({ clubs, collection, equipped: eqOf(me), supportUnread });
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
    name: usr?.firstName || '', username: usr?.username || '', photo: usr?.photoUrl || '', equipped: eqOf(usr),
    collection: [...trs.map((x) => ({ kind: 'trophy', cup: x.league, season: x.season })), ...(usr?.cosmetics || []).map((id) => ({ kind: 'item', id }))],
    clubs,
  });
}));

app.get('/api/rankings/:league', async (req, res) => {
  if (!tgUser(req)) return res.status(401).json({ error: 'auth' });
  const league = req.params.league;
  if (!EFL.byId[league]) return res.status(404).json({ error: 'fail' });
  const regs = await Registration.find({ season, league }).lean();
  const users = await User.find({ telegramId: { $in: regs.map((r) => r.telegramId) } }).lean();
  const names = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || '']));
  const rows = regs
    .map((r) => ({ club: r.club, user: names.get(r.telegramId) || '', pts: r.pts, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, gd: r.gf - r.ga }))
    .sort(rankSort)
    .map((r, i) => ({ pos: i + 1, ...r }));
  res.json({ league, rows });
});

app.post('/api/leagues/:league/register', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
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
    res.json({ ok: true });
  } catch (e) {
    // 11000: klub band yoki foydalanuvchi allaqachon yozilgan (parallel so'rov)
    const dup = e.code === 11000;
    res.status(dup ? 409 : 500).json({ error: dup ? (/telegramId/.test(e.message) ? 'already' : 'taken') : 'fail' });
  }
});

// "Klubdan hoziroq voz kechaman": klub egasidan olinadi va yana ro'yxatdan o'tish ro'yxatiga qaytadi
app.post('/api/leave', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const { league, club } = req.body || {};
  const del = await Registration.findOneAndDelete({ season, telegramId: u.id, league, club }).lean();
  if (!del) return res.status(404).json({ error: 'fail' });
  // Klub o'yinlari bekor qilinadi (admin "chiqarish" bilan bir xil), jadval qayta hisoblanadi
  await Match.updateMany({ season, league, status: { $ne: 'cancelled' }, $or: [{ home: u.id }, { away: u.id }] }, { $set: { status: 'cancelled', updatedAt: new Date() } });
  await recalc(league);
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
const PAY_CARD = process.env.PAY_CARD || '9860190109195155', PAY_HOLDER = process.env.PAY_HOLDER || 'Fayozbek Botirov'; // .env da PAY_CARD / PAY_HOLDER bilan almashtirish mumkin
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
async function sendToAdmins(text, buf) {
  if (!ADMINS.length) return { ok: true, fileId: '' };
  const kb = Markup.inlineKeyboard([[Markup.button.webApp('🛠 Admin panel', `${MINI_APP_URL}?lang=uz&open=admin`)]]);
  let fileId = '';
  const rs = await Promise.allSettled(ADMINS.map(async (id) => {
    if (!buf) return bot.telegram.sendMessage(id, text.slice(0, 4000), kb);
    const m = await bot.telegram.sendPhoto(id, fileId || { source: buf }, { caption: text.slice(0, 1000), ...kb });
    if (!fileId) fileId = m.photo?.[m.photo.length - 1]?.file_id || '';
  }));
  return { ok: rs.some((r) => r.status === 'fulfilled'), fileId };
}
const tgName = (x) => (x?.username ? '@' + x.username : x?.firstName || '');

app.get('/api/shop', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const [me, trs, cps] = await Promise.all([User.findOne({ telegramId: u.id }).lean(), Trophy.find({ telegramId: u.id, status: { $ne: 'sold' } }).sort({ createdAt: -1 }).lean(), CupPrice.find().lean()]);
  const cup = new Map(cps.map((x) => [x.league, x.price]));
  res.json({
    coins: me?.coins || 0, owned: me?.cosmetics || [], equipped: eqOf(me),
    card: PAY_CARD, holder: PAY_HOLDER,
    trophies: trs.map((x) => ({ id: String(x._id), league: x.league, season: x.season, status: x.status, price: (x.status === 'selling' && x.sell?.price) || cup.get(x.league) || 0 })),
  });
}));

// Coins sotib olish: kartaga o'tkazib, chek rasmini yuboradi -> adminga boradi -> admin tasdiqlasa Coins qo'shiladi
app.post('/api/shop/topup', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const pack = SHOP.PACKS.find((p) => p.id === req.body?.pack), img = String(req.body?.image || ''), cut = img.indexOf(',');
  if (!pack || cut < 0 || !/^data:image\/(jpeg|png|webp);base64$/.test(img.slice(0, cut))) return res.status(400).json({ error: 'fail' });
  const buf = Buffer.from(img.slice(cut + 1), 'base64');
  if (buf.length < 1000 || buf.length > 5 * 1024 * 1024) return res.status(400).json({ error: 'badImage' });
  if (!ADMINS.length) return res.status(503).json({ error: 'fail' });
  if ((await TopUp.countDocuments({ telegramId: u.id, status: 'pending' })) >= 3) return res.status(429).json({ error: 'tooMany' });
  const tu = await TopUp.create({ telegramId: u.id, coins: pack.coins, amount: pack.uzs });
  const caption = `💰 Coins to'ldirish\n👤 ${who(u)} (id ${u.id})\n🪙 ${money(pack.coins)} Coins · ${money(pack.uzs)} UZS\n\nChekni tekshiring va tasdiqlang.`;
  const sent = await toAdmins((id) => bot.telegram.sendPhoto(id, { source: buf }, { caption, ...adminKb('tu_ok_' + tu._id, 'tu_no_' + tu._id) }));
  if (!sent) { await TopUp.deleteOne({ _id: tu._id }); return res.status(502).json({ error: 'fail' }); }
  res.json({ ok: true });
}));

// Kosmetika sotib olish (Coins evaziga) va profilda yoqish
app.post('/api/shop/buy', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const item = SHOP.findItem(req.body?.id);
  if (!item) return res.status(400).json({ error: 'fail' });
  await migrateEq(u.id);
  const r = await User.findOneAndUpdate(
    { telegramId: u.id, coins: { $gte: item.price }, cosmetics: { $ne: item.id } },
    { $inc: { coins: -item.price }, $addToSet: { cosmetics: item.id }, $set: { ['equipped.' + (item.kind === 'bg' && item.player ? 'pbg' : item.kind)]: item.id } }, { new: true }).lean();
  if (!r) { const me = await User.findOne({ telegramId: u.id }).lean(); return res.status(409).json({ error: me?.cosmetics?.includes(item.id) ? 'owned' : 'noCoins' }); }
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
app.post('/api/shop/sell', ah(async (req, res) => {
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
  const text = `💸 Kubok sotish so'rovi\n🏆 ${EFL.byId[tr.league]?.name || tr.league} (mavsum ${tr.season})\n💰 Narx: ${money(price)} UZS\n👤 ${who(u)} (id ${u.id})\n💳 Karta: ${cardFmt(card)}\n\nPulni 24 soat ichida o'tkazib bering. O'tkazgach «To'lab berildi» ni bosing — kubok foydalanuvchi ro'yxatidan o'chiriladi.`;
  const sent = await toAdmins((id) => bot.telegram.sendMessage(id, text, adminKb('sl_ok_' + tr._id, 'sl_no_' + tr._id, "✅ To'lab berildi", '❌ Rad etish')));
  if (!sent) { await Trophy.updateOne({ _id: tr._id }, { $set: { status: 'owned' }, $unset: { sell: 1 } }); return res.status(502).json({ error: 'fail' }); }
  res.json({ ok: true });
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
    try { await User.updateOne({ telegramId: tu.telegramId }, { $inc: { coins: tu.coins } }, { upsert: true }); }
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
  const name = EFL.byId[tr.league]?.name || tr.league;
  say(tr.telegramId, ok
    ? { uz: `✅ ${name} kubogi uchun ${money(tr.sell?.price || 0)} UZS kartangizga o'tkazildi. Kubok ro'yxatingizdan chiqarildi.`, en: `✅ ${money(tr.sell?.price || 0)} UZS for the ${name} trophy was sent to your card. The trophy was removed from your list.`, ru: `✅ ${money(tr.sell?.price || 0)} UZS за кубок ${name} переведены на вашу карту. Кубок удалён из вашего списка.` }
    : { uz: `❌ ${name} kubogini sotish so'rovi rad etildi. Kubok ro'yxatingizda qoldi.`, en: `❌ The request to sell the ${name} trophy was declined. The trophy stays in your list.`, ru: `❌ Заявка на продажу кубка ${name} отклонена. Кубок остался в вашем списке.` }, 'me');
}));

// ——— O'yin hisobi: biri kiritadi, raqib tasdiqlaydi yoki "Yolg'on" deydi ———
app.post('/api/matches/:id/report', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const my = req.body?.my, opp = req.body?.opp, id = req.params.id;
  if (!validId(id) || !goal(my) || !goal(opp)) return res.status(400).json({ error: 'badScore' });
  const m0 = await Match.findOne({ _id: id, season, $or: [{ home: u.id }, { away: u.id }] }).lean();
  if (!m0) return res.status(404).json({ error: 'gone' });
  const isHome = m0.home === u.id;
  // Hisob kiritish mumkin: hali kiritilmagan, yoki o'zi kiritgan va raqib hali tasdiqlamagan (tuzatish)
  const m = await Match.findOneAndUpdate(
    { _id: id, season, $or: [{ status: 'scheduled' }, { status: 'pending', reportedBy: u.id }] },
    { $set: { hg: isHome ? my : opp, ag: isHome ? opp : my, status: 'pending', reportedBy: u.id, claim: null, updatedAt: new Date() } },
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
  // Faqat raqib (hisobni kiritmagan tomon) tasdiqlay oladi
  const m = await Match.findOneAndUpdate(
    { _id: req.params.id, season, status: 'pending', reportedBy: { $ne: u.id }, $or: [{ home: u.id }, { away: u.id }] },
    { $set: { status: 'confirmed', confirmedBy: 'player', updatedAt: new Date() } },
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
app.get('/api/matches/:id/chat', ah(async (req, res) => {
  const c = await chatMatch(req, res); if (!c) return;
  const key = String(c.m._id);
  await ChatMessage.updateMany({ kind: 'match', key, readBy: { $ne: c.u.id } }, { $addToSet: { readBy: c.u.id } });
  const [list, opp] = await Promise.all([ChatMessage.find({ kind: 'match', key }).sort({ at: -1 }).limit(100).lean(), User.findOne({ telegramId: c.oppId }).lean()]);
  res.json({
    messages: list.reverse().map((x) => ({ id: String(x._id), mine: x.from === c.u.id, type: x.type, text: x.text, at: x.at })),
    opp: { name: opp?.firstName || '', username: opp?.username || '', photo: opp?.photoUrl || '' },
  });
}));
app.post('/api/matches/:id/chat', ah(async (req, res) => {
  const c = await chatMatch(req, res); if (!c) return;
  const key = String(c.m._id), type = req.body?.type === 'room' ? 'room' : 'text', text = String(req.body?.text || '').trim().slice(0, 500);
  if (!text || (type === 'room' && !/^[A-Za-z0-9\-]{3,24}$/.test(text))) return res.status(400).json({ error: 'badText' });
  const last = await ChatMessage.findOne({ kind: 'match', key, from: c.u.id }).sort({ at: -1 }).lean();
  if (last && Date.now() - last.at < 700) return res.status(429).json({ error: 'fast' });
  // Raqibga bot orqali xabar faqat u hali o'qimagan birinchi xabar uchun boradi (spam bo'lmasin)
  const first = !(await ChatMessage.exists({ kind: 'match', key, from: c.u.id, readBy: { $ne: c.oppId } }));
  await ChatMessage.create({ kind: 'match', key, from: c.u.id, type, text, readBy: [c.u.id] });
  if (first) {
    const who = await whoIs(c.m.league, c.u.id), shown = type === 'room' ? `🎮 ${text}` : text.slice(0, 120);
    say(c.oppId, { uz: `💬 ${who}: ${shown}`, en: `💬 ${who}: ${shown}`, ru: `💬 ${who}: ${shown}` }, 'games');
  }
  res.json({ ok: true });
}));

// ——— «Muammoli holatlar»: foydalanuvchi ↔ admin chati ———
app.get('/api/support', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const key = String(u.id);
  await ChatMessage.updateMany({ kind: 'support', key, admin: true, readBy: { $ne: u.id } }, { $addToSet: { readBy: u.id } });
  const list = await ChatMessage.find({ kind: 'support', key }).sort({ at: -1 }).limit(100).lean();
  res.json({ messages: list.reverse().map((x) => ({ id: String(x._id), mine: !x.admin, text: x.text, fileId: x.fileId, at: x.at })) });
}));
app.post('/api/support', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const text = String(req.body?.text || '').trim().slice(0, 800), buf = decodeImage(req.body?.image);
  if (buf === false) return res.status(400).json({ error: 'badImage' });
  if (!buf && !text) return res.status(400).json({ error: 'badText' });
  const key = String(u.id), hour = new Date(Date.now() - 3600 * 1000);
  const [last, cnt] = await Promise.all([ChatMessage.findOne({ kind: 'support', key, admin: false }).sort({ at: -1 }).lean(), ChatMessage.countDocuments({ kind: 'support', key, admin: false, at: { $gt: hour } })]);
  if ((last && Date.now() - last.at < 1500) || cnt >= 30) return res.status(429).json({ error: 'fast' });
  await touchUser(u);
  const sent = await sendToAdmins(`🆘 Muammoli holat (murojaat)\n👤 ${who(u)} (id ${u.id})\n${text ? `💬 ${text}\n` : ''}${buf ? '📎 Skrinshot ilova qilingan\n' : ''}\nJavob: Admin panel → Xabarlar`, buf);
  if (!sent.ok) return res.status(502).json({ error: 'fail' });
  await ChatMessage.create({ kind: 'support', key, from: u.id, admin: false, text, fileId: sent.fileId, readBy: [u.id] });
  res.json({ ok: true });
}));

// Telegram serveridagi rasmni (isbot / murojaat skrinshoti) ilovaga uzatadi. Faqat adminlar yoki rasm egasi ko'ra oladi
app.get('/api/file/:fid', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const fid = String(req.params.fid);
  if (!/^[\w\-]{20,250}$/.test(fid)) return res.status(400).json({ error: 'fail' });
  const ok = ADMINS.includes(u.id) || (await ChatMessage.exists({ kind: 'support', key: String(u.id), fileId: fid })) || (await Match.exists({ 'proofs.fileId': fid, $or: [{ home: u.id }, { away: u.id }] }));
  if (!ok) return res.status(403).json({ error: 'forbidden' });
  const link = await bot.telegram.getFileLink(fid);
  https.get(String(link.href || link), (r) => {
    res.set('Content-Type', r.headers['content-type'] || 'image/jpeg'); res.set('Cache-Control', 'private, max-age=86400');
    r.pipe(res);
  }).on('error', () => res.status(502).end());
}));

// ——— Admin ———
app.get('/api/me', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  // Ilova ochilganda ism/username/avatarni yangilab qo'yamiz va yoqilgan fonni qaytaramiz
  await touchUser(u);
  await migrateEq(u.id);
  const me = await User.findOne({ telegramId: u.id }).lean();
  res.json({ admin: ADMINS.includes(u.id), bg: eqOf(me).pbg });
}));

// Ligalar: ishtirokchilar, qura vaqti/holati, o'yinlar soni
// Admin: har bir liga kubogining narxi (UZS). 0 yoki bo'sh — narx yo'q, sotib bo'lmaydi
app.get('/api/admin/cup-prices', adminOnly, ah(async (req, res) => {
  const cps = await CupPrice.find().lean(), cup = new Map(cps.map((x) => [x.league, x.price]));
  res.json({ cups: EFL.LEAGUES.map((l) => ({ id: l.id, name: l.name, group: l.group, price: cup.get(l.id) || 0 })) });
}));
app.post('/api/admin/cup-prices', adminOnly, ah(async (req, res) => {
  const league = String(req.body?.league || ''), price = Number(req.body?.price || 0);
  if (!EFL.byId[league] || !Number.isInteger(price) || price < 0 || price > 1e9) return res.status(400).json({ error: 'badPrice' });
  if (price === 0) await CupPrice.deleteOne({ league });
  else await CupPrice.updateOne({ league }, { $set: { price, updatedAt: new Date() } }, { upsert: true });
  res.json({ ok: true, price });
}));

// Admin: o'yin chatini ko'rish (bahsli holatlarda isbot sifatida)
app.get('/api/admin/matches/:id/chat', adminOnly, ah(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
  const m = await Match.findOne({ _id: req.params.id, season }).lean();
  if (!m) return res.status(404).json({ error: 'gone' });
  const list = await ChatMessage.find({ kind: 'match', key: String(m._id) }).sort({ at: -1 }).limit(100).lean();
  const users = await User.find({ telegramId: { $in: [m.home, m.away] } }).lean(), nm = new Map(users.map((x) => [x.telegramId, tgName(x)]));
  res.json({ messages: list.reverse().map((x) => ({ id: String(x._id), by: nm.get(x.from) || String(x.from), side: x.from === m.home ? 'home' : 'away', type: x.type, text: x.text, at: x.at })) });
}));

// Admin: «Muammoli holatlar» murojaatlari
app.get('/api/admin/support', adminOnly, ah(async (req, res) => {
  const agg = await ChatMessage.aggregate([
    { $match: { kind: 'support' } }, { $sort: { at: -1 } },
    { $group: { _id: '$key', last: { $first: '$$ROOT' }, unread: { $sum: { $cond: [{ $and: [{ $eq: ['$admin', false] }, { $eq: ['$adminRead', false] }] }, 1, 0] } } } },
    { $sort: { 'last.at': -1 } }, { $limit: 60 },
  ]);
  const users = await User.find({ telegramId: { $in: agg.map((g) => Number(g._id)) } }).lean(), nm = new Map(users.map((x) => [x.telegramId, tgName(x)]));
  res.json({ threads: agg.map((g) => ({ uid: g._id, name: nm.get(Number(g._id)) || g._id, text: g.last.text || (g.last.fileId ? '📎 Rasm' : ''), at: g.last.at, unread: g.unread, fromAdmin: !!g.last.admin })) });
}));
app.get('/api/admin/support/:uid', adminOnly, ah(async (req, res) => {
  const uid = Number(req.params.uid);
  if (!Number.isInteger(uid)) return res.status(400).json({ error: 'fail' });
  await ChatMessage.updateMany({ kind: 'support', key: String(uid), admin: false, adminRead: false }, { $set: { adminRead: true } });
  const [list, usr] = await Promise.all([ChatMessage.find({ kind: 'support', key: String(uid) }).sort({ at: -1 }).limit(100).lean(), User.findOne({ telegramId: uid }).lean()]);
  res.json({ user: { name: usr?.firstName || '', username: usr?.username || '' }, messages: list.reverse().map((x) => ({ id: String(x._id), mine: x.admin, text: x.text, fileId: x.fileId, at: x.at })) });
}));
app.post('/api/admin/support/:uid', adminOnly, ah(async (req, res) => {
  const uid = Number(req.params.uid), text = String(req.body?.text || '').trim().slice(0, 800);
  if (!Number.isInteger(uid) || !text) return res.status(400).json({ error: 'badText' });
  await ChatMessage.create({ kind: 'support', key: String(uid), from: req.admin.id, admin: true, text, adminRead: true, readBy: [] });
  say(uid, { uz: `📩 Admin javobi:\n${text}`, en: `📩 Admin reply:\n${text}`, ru: `📩 Ответ админа:\n${text}` }, 'support');
  res.json({ ok: true });
}));

app.get('/api/admin/overview', adminOnly, ah(async (req, res) => {
  const [regs, cfgs, groups] = await Promise.all([
    Registration.find({ season }).select('league').lean(),
    LeagueConfig.find({ season }).lean(),
    Match.aggregate([{ $match: { season, status: { $ne: 'cancelled' } } }, { $group: { _id: { league: '$league', status: '$status' }, n: { $sum: 1 } } }]),
  ]);
  const cfg = new Map(cfgs.map((c) => [c.league, c]));
  const cnt = {};
  groups.forEach((g) => { const c = (cnt[g._id.league] ||= { total: 0, confirmed: 0, action: 0 }); c.total += g.n; if (g._id.status === 'confirmed') c.confirmed += g.n; if (g._id.status === 'pending' || g._id.status === 'disputed') c.action += g.n; });
  const leagues = EFL.LEAGUES.map((l) => {
    const c = cfg.get(l.id), n = cnt[l.id] || { total: 0, confirmed: 0, action: 0 };
    return { id: l.id, name: l.name, group: l.group, max: l.max, closed: !!c?.closed, players: regs.filter((r) => r.league === l.id).length, drawAt: c?.drawAt || null, drawnAt: c?.drawnAt || null, rounds: c?.rounds || 2, ...n };
  });
  const support = await ChatMessage.countDocuments({ kind: 'support', admin: false, adminRead: false });
  res.json({ leagues, action: leagues.reduce((s, l) => s + l.action, 0), support });
}));

// O'yinlar ro'yxati. status: action (tasdiq kutayotgan/bahsli) | scheduled | confirmed | all
app.get('/api/admin/matches', adminOnly, ah(async (req, res) => {
  const { league, status = 'action' } = req.query;
  const q = { season, status: { $ne: 'cancelled' } };
  if (league) { if (!EFL.byId[league]) return res.status(400).json({ error: 'fail' }); q.league = league; }
  if (status === 'action') q.status = { $in: ['disputed', 'pending'] };
  else if (['scheduled', 'confirmed', 'pending', 'disputed'].includes(status)) q.status = status;
  const [ms, total] = await Promise.all([Match.find(q).sort(status === 'action' ? { status: 1, updatedAt: 1 } : { round: 1, _id: 1 }).limit(100).lean(), Match.countDocuments(q)]);
  res.json({ total, matches: await decorate(ms) });
}));

// Natijani tasdiqlash / kiritish / o'zgartirish (hg — uy egasi goli, ag — mehmon goli)
app.post('/api/admin/matches/:id/result', adminOnly, ah(async (req, res) => {
  const { hg, ag } = req.body || {};
  if (!validId(req.params.id) || !goal(hg) || !goal(ag)) return res.status(400).json({ error: 'badScore' });
  const m = await Match.findOneAndUpdate({ _id: req.params.id, season, status: { $ne: 'cancelled' } }, { $set: { hg, ag, status: 'confirmed', confirmedBy: 'admin', reportedBy: null, claim: null, updatedAt: new Date() } }, { new: true }).lean();
  if (!m) return res.status(404).json({ error: 'gone' });
  await recalc(m.league);
  const [a, b] = await Promise.all([whoIs(m.league, m.home), whoIs(m.league, m.away)]);
  notify(m.home, 'adminSet', b, hg, ag);
  notify(m.away, 'adminSet', a, ag, hg);
  res.json({ ok: true });
}));

// Qura vaqtini belgilash (vaqti kelganda bot o'zi qura qiladi)
// Admin: ligani ochiq/yopiq qilish (yopiq ligaga yangi ishtirokchi ro'yxatdan o'ta olmaydi; mavjudlar o'ynashda davom etadi)
app.post('/api/admin/league/:id/closed', adminOnly, ah(async (req, res) => {
  const league = EFL.byId[req.params.id];
  if (!league || typeof req.body?.closed !== 'boolean') return res.status(400).json({ error: 'fail' });
  await LeagueConfig.updateOne({ season, league: league.id }, { $set: { closed: req.body.closed } }, { upsert: true });
  res.json({ ok: true, closed: req.body.closed });
}));
app.post('/api/admin/league/:id/draw-time', adminOnly, ah(async (req, res) => {
  const league = EFL.byId[req.params.id];
  if (!league) return res.status(400).json({ error: 'fail' });
  const at = req.body?.drawAt ? new Date(req.body.drawAt) : null;
  if (at && isNaN(at)) return res.status(400).json({ error: 'fail' });
  if (await LeagueConfig.exists({ season, league: league.id, drawnAt: { $ne: null } })) return res.status(409).json({ error: 'drawn' });
  const c = await LeagueConfig.findOneAndUpdate({ season, league: league.id }, { $set: { drawAt: at, rounds: req.body?.rounds === 1 ? 1 : 2 } }, { upsert: true, new: true }).lean();
  res.json({ ok: true, drawAt: c.drawAt });
}));

// Qurani hozir o'tkazish. redo: faqat hali birorta hisob kiritilmagan bo'lsa qayta o'tkazish mumkin
app.post('/api/admin/league/:id/draw', adminOnly, ah(async (req, res) => {
  const league = EFL.byId[req.params.id];
  if (!league) return res.status(400).json({ error: 'fail' });
  if (req.body?.redo) {
    if (await Match.exists({ season, league: league.id, status: { $nin: ['scheduled', 'cancelled'] } })) return res.status(409).json({ error: 'played' });
    await Match.deleteMany({ season, league: league.id });
    await LeagueConfig.updateOne({ season, league: league.id }, { $set: { drawnAt: null } });
  }
  const r = await performDraw(league.id, req.body?.rounds);
  if (r.error) return res.status(409).json({ error: r.error });
  res.json(r);
}));

// Ligadagi ishtirokchilar va bo'sh klublar
app.get('/api/admin/league/:id/players', adminOnly, ah(async (req, res) => {
  const league = EFL.byId[req.params.id];
  if (!league) return res.status(400).json({ error: 'fail' });
  const regs = await Registration.find({ season, league: league.id }).lean();
  const users = await User.find({ telegramId: { $in: regs.map((r) => r.telegramId) } }).lean();
  const nm = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || '']));
  const taken = new Set(regs.map((r) => r.club));
  res.json({
    max: league.max,
    players: regs.sort(rankSort).map((r) => ({ telegramId: r.telegramId, club: EFL.clubName(league.id, r.club), user: nm.get(r.telegramId) || '', pts: r.pts, games: r.w + r.d + r.l })),
    free: league.clubs.filter((c) => !taken.has(c.id)).map((c) => ({ id: c.id, name: c.name })),
  });
}));

// Ishtirokchini o'yindan chiqarish: uning o'yinlari bekor qilinadi (natijalari ham jadvaldan olib tashlanadi)
app.post('/api/admin/league/:id/remove', adminOnly, ah(async (req, res) => {
  const league = EFL.byId[req.params.id], tid = Number(req.body?.telegramId);
  if (!league || !tid) return res.status(400).json({ error: 'fail' });
  const reg = await Registration.findOneAndDelete({ season, league: league.id, telegramId: tid }).lean();
  if (!reg) return res.status(404).json({ error: 'gone' });
  await Match.updateMany({ season, league: league.id, status: { $ne: 'cancelled' }, $or: [{ home: tid }, { away: tid }] }, { $set: { status: 'cancelled', updatedAt: new Date() } });
  await recalc(league.id);
  notify(tid, 'removed', league.name);
  res.json({ ok: true });
}));

// Ishtirokchi qo'shish (foydalanuvchi botga /start bosgan bo'lishi kerak). Qura o'tgan bo'lsa — qolganlar bilan o'yinlari qo'shiladi
app.post('/api/admin/league/:id/add', adminOnly, ah(async (req, res) => {
  const league = EFL.byId[req.params.id], club = req.body?.club, q = String(req.body?.user || '').trim().replace(/^@/, '');
  if (!league || !league.clubs.some((c) => c.id === club) || !q) return res.status(400).json({ error: 'fail' });
  const usr = /^\d+$/.test(q) ? await User.findOne({ telegramId: Number(q) }).lean() : await User.findOne({ username: new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }).lean();
  if (!usr) return res.status(404).json({ error: 'nouser' });
  if (await Registration.exists({ season, telegramId: usr.telegramId })) return res.status(409).json({ error: 'already' });
  if ((await Registration.countDocuments({ season, league: league.id })) >= league.max) return res.status(409).json({ error: 'full' });
  try { await Registration.create({ league: league.id, season, telegramId: usr.telegramId, club }); }
  catch (e) { return res.status(e.code === 11000 ? 409 : 500).json({ error: e.code === 11000 ? (/telegramId/.test(e.message) ? 'already' : 'taken') : 'fail' }); }
  const cfg = await LeagueConfig.findOne({ season, league: league.id }).lean();
  if (cfg?.drawnAt) {
    const others = (await Registration.find({ season, league: league.id, telegramId: { $ne: usr.telegramId } }).lean()).map((r) => r.telegramId);
    const last = (await Match.findOne({ season, league: league.id }).sort({ round: -1 }).lean())?.round || 0;
    const fx = FX.fixturesForNewcomer(usr.telegramId, others, last, cfg.rounds === 2);
    if (fx.length) await Match.insertMany(fx.map((m) => ({ ...m, league: league.id, season })));
  }
  notify(usr.telegramId, 'added', league.name, EFL.clubName(league.id, club));
  res.json({ ok: true });
}));

// Norasmiy turnirlar (unofficial.js)
let botUser = null;
const botName = async () => { if (!botUser) { try { botUser = (await bot.telegram.getMe()).username; } catch (_) {} } return botUser; };
const ut = require('./unofficial')(app, { tgUser, ah, bot, User, ADMINS, Markup, t, MINI_APP_URL, adminOnly, botName });
registerSeasonRoutes(app, { tgUser, adminIds: ADMINS });

// ——— Mavsum starti: PL + Championship + FA Cup + Community Shield birga ———
const AUTO_CUPS = ['fa-cup', 'community-shield'];
let openedFor = null;

async function ensureSeasonOpened(cal) {
  if (cal.phase !== 'live' && cal.phase !== 'finished') return;
  if (openedFor === cal.number) return;
  try {
    await SeasonState.updateOne({ number: cal.number },
      { $setOnInsert: { startAt: new Date(cal.startAt), endAt: new Date(cal.endAt) } }, { upsert: true });
    const r = await SeasonState.updateOne({ number: cal.number, openedAt: null },
      { $set: { openedAt: new Date(), cupsStartedAt: new Date(), cups: AUTO_CUPS } });
    if (r?.modifiedCount) console.log(`⏱ Mavsum ${cal.number} boshlandi — ligalar + ${AUTO_CUPS.join(', ')}`);
    openedFor = cal.number;
  } catch (_) { /* DB hali ulanmagan */ }
}

function startSeasonWatcher() {
  const tick = () => { seasonEngine.calendar().then(ensureSeasonOpened).catch(() => {}); };
  tick();
  const id = setInterval(tick, 60 * 1000);
  if (id.unref) id.unref();
}

app.listen(process.env.PORT || 3000, () => console.log('Mini app serveri ishga tushdi'));

(async () => {
  startSeasonWatcher();
  await mongoose.connect(process.env.MONGO_URI);
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
    } catch (e) { console.error('Qura rejalashtiruvchisi:', e); }
  }, 60 * 1000);
  await bot.launch();
  console.log('Bot ishga tushdi');
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
