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
app.use(express.json());
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
const rankSort = (a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;

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
    uz: (lg) => `🎲 ${lg}: qura o'tkazildi! O'yinlaringiz: Profil → Mening o'yinlarim.`,
    en: (lg) => `🎲 ${lg}: the draw is done! Your games: Profile → My games.`,
    ru: (lg) => `🎲 ${lg}: жеребьёвка проведена! Ваши игры: Профиль → Мои игры.`,
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
  return ms.map((m) => ({
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
  const regs = await Registration.find({ season }).lean();
  const mine = regs.find((r) => r.telegramId === u.id);
  res.json({
    season,
    mine: mine ? { league: mine.league, club: mine.club } : null,
    // Klubini topshirayotganlar (o'zingnikidan tashqari)
    releasing: regs.filter((r) => r.releasing && r.telegramId !== u.id).map((r) => ({ league: r.league, club: r.club, games: r.w + r.d + r.l })),
    leagues: EFL.LEAGUES.map((l) => {
      const rs = regs.filter((r) => r.league === l.id);
      return { id: l.id, max: l.max, players: rs.length, taken: rs.map((r) => r.club) };
    }),
  });
});

app.get('/api/profile', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const me = await Registration.findOne({ season, telegramId: u.id }).lean();
  if (!me) return res.json({ league: null, club: null, releasing: false, pos: null, w: 0, d: 0, l: 0, games: [] });
  const regs = (await Registration.find({ season, league: me.league }).lean()).sort(rankSort);
  // Mening o'yinlarim (bekor qilinganlardan tashqari), tur bo'yicha
  const ms = await Match.find({ season, league: me.league, status: { $ne: 'cancelled' }, $or: [{ home: u.id }, { away: u.id }] }).sort({ round: 1 }).lean();
  const oppId = (m) => (m.home === u.id ? m.away : m.home);
  const users = await User.find({ telegramId: { $in: ms.map(oppId) } }).lean();
  const uname = new Map(users.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || '']));
  const clubOf = new Map(regs.map((r) => [r.telegramId, r.club]));
  const games = ms.map((m) => {
    const mine = m.home === u.id, hasScore = m.hg != null && m.ag != null;
    return {
      id: String(m._id), round: m.round, status: m.status, byMe: m.reportedBy === u.id,
      opponent: clubOf.has(oppId(m)) ? EFL.clubName(me.league, clubOf.get(oppId(m))) : '', user: uname.get(oppId(m)) || '',
      score: hasScore ? `${mine ? m.hg : m.ag}:${mine ? m.ag : m.hg}` : null, // men:raqib
    };
  });
  res.json({ league: me.league, club: me.club, releasing: !!me.releasing, pos: regs.findIndex((r) => r.telegramId === u.id) + 1, w: me.w, d: me.d, l: me.l, games });
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
  const league = EFL.byId[req.params.league], club = req.body?.club;
  if (!league || !league.clubs.some((c) => c.id === club)) return res.status(400).json({ error: 'fail' });
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

// "Klubimni topshiraman" — yoqilsa klub bosh sahifadagi ro'yxatga chiqadi, o'chirilsa qaytib oladi
app.post('/api/profile/release', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const me = await Registration.findOneAndUpdate({ season, telegramId: u.id }, { releasing: !!req.body?.on }, { new: true }).lean();
  if (!me) return res.status(404).json({ error: 'fail' });
  res.json({ ok: true, releasing: me.releasing });
});

// Topshirilayotgan klubni olish: jadval va natijalari bilan birga yangi egasiga o'tadi, eski egasi ligadan chiqadi
const GONE = {
  uz: (n) => `ℹ️ Klubingiz (${n}) boshqa o'yinchiga o'tdi. Siz ligadan chiqdingiz.`,
  en: (n) => `ℹ️ Your club (${n}) was taken by another player. You have left the league.`,
  ru: (n) => `ℹ️ Ваш клуб (${n}) перешёл другому игроку. Вы вышли из лиги.`,
};
app.post('/api/claim', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const { league, club } = req.body || {};
  if (!EFL.byId[league] || typeof club !== 'string') return res.status(400).json({ error: 'fail' });
  if (await Registration.exists({ season, telegramId: u.id })) return res.status(409).json({ error: 'already' });
  try {
    // Bitta atomik amal: faqat hali topshirilayotgan klubni olish mumkin
    const old = await Registration.findOneAndUpdate({ season, league, club, releasing: true }, { telegramId: u.id, releasing: false }, { new: false }).lean();
    if (!old) return res.status(409).json({ error: 'gone' });
    // Klub o'yinlari ham yangi egasiga o'tadi (jadval va natijalar saqlanadi)
    const q = { season, league };
    await Promise.all(['home', 'away', 'reportedBy'].map((f) => Match.updateMany({ ...q, [f]: old.telegramId }, { $set: { [f]: u.id } })));
    const owner = await User.findOne({ telegramId: old.telegramId }).lean();
    bot.telegram.sendMessage(old.telegramId, (GONE[owner?.lang] || GONE.uz)(EFL.clubName(league, club))).catch(() => {});
    res.json({ ok: true });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({ error: e.code === 11000 ? 'already' : 'fail' });
  }
});
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

app.post('/api/matches/:id/reject', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
  const old = await Match.findOne({ _id: req.params.id, season, status: 'pending', reportedBy: { $ne: u.id }, $or: [{ home: u.id }, { away: u.id }] }).lean();
  if (!old) return res.status(409).json({ error: 'gone' });
  // Hisob bekor: jadvalga o'tmaydi, admin keyinroq kiritadi. Kiritilgan hisob faqat admin ma'lumoti uchun saqlanadi.
  const m = await Match.findOneAndUpdate(
    { _id: old._id, status: 'pending', hg: old.hg, ag: old.ag, reportedBy: old.reportedBy },
    { $set: { status: 'disputed', claim: { hg: old.hg, ag: old.ag, by: old.reportedBy }, hg: null, ag: null, reportedBy: null, updatedAt: new Date() } },
    { new: true }
  ).lean();
  if (!m) return res.status(409).json({ error: 'gone' });
  notify(old.reportedBy, 'rejected', await whoIs(m.league, u.id));
  const [a, b] = await Promise.all([whoIs(m.league, m.home), whoIs(m.league, m.away)]);
  notifyAdmins(`⚠️ Bahsli o'yin — ${EFL.byId[m.league].name}, ${m.round}-tur\n${a} — ${b}\nKiritilgan hisob: ${old.hg}:${old.ag} («Yolg'on» deb belgilandi). Natijani admin panelda kiriting.`);
  res.json({ ok: true });
}));

// ——— Admin ———
app.get('/api/me', ah(async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  res.json({ admin: ADMINS.includes(u.id) });
}));

// Ligalar: ishtirokchilar, qura vaqti/holati, o'yinlar soni
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
    return { id: l.id, name: l.name, group: l.group, max: l.max, players: regs.filter((r) => r.league === l.id).length, drawAt: c?.drawAt || null, drawnAt: c?.drawnAt || null, rounds: c?.rounds || 2, ...n };
  });
  res.json({ leagues, action: leagues.reduce((s, l) => s + l.action, 0) });
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

app.listen(process.env.PORT || 3000, () => console.log('Mini app serveri ishga tushdi'));

(async () => {
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
    } catch (e) { console.error('Qura rejalashtiruvchisi:', e); }
  }, 60 * 1000);
  await bot.launch();
  console.log('Bot ishga tushdi');
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
