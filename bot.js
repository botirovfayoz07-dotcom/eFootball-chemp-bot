require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const User = require('./models/User');
const t = require('./locales');
const path = require('path');
const express = require('express');
const crypto = require('crypto');
const Registration = require('./models/Registration');
const SeasonState = require('./models/Season');
const EFL = require('./webapp/league-data');
const seasonEngine = require('./lib/season');
const registerPrivateRoutes = require('./private-api');


const bot = new Telegraf(process.env.BOT_TOKEN);
const MINI_APP_URL = process.env.MINI_APP_URL; // HTTPS bo'lishi shart
const ADMIN_IDS = new Set(
  String(process.env.ADMIN_IDS || '')
    .split(',')
    .map((x) => Number(x.trim()))
    .filter(Number.isFinite)
);
const isGlobalAdmin = (id) => ADMIN_IDS.has(Number(id));

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

bot.action(/^lang_(uz|en|ru)$/, async (ctx) => {
  const lang = ctx.match[1];
  await User.updateOne({ telegramId: ctx.from.id }, { lang });
  await ctx.answerCbQuery();
  await ctx.editMessageText(t[lang].langChanged, mainKeyboard(lang));
});

// Adminlar uchun tezkor kirish: /admin
bot.command('admin', async (ctx) => {
  if (!isGlobalAdmin(ctx.from.id)) return ctx.reply("⛔ Bu bo'lim faqat adminlar uchun.");
  const u = await User.findOne({ telegramId: ctx.from.id }).lean();
  const lang = ['uz', 'en', 'ru'].includes(u?.lang) ? u.lang : 'uz';
  if (!MINI_APP_URL) return ctx.reply('MINI_APP_URL sozlanmagan.');
  return ctx.reply('🛡 Admin panel', Markup.inlineKeyboard([
    [Markup.button.webApp('Admin panelni ochish', `${MINI_APP_URL}?lang=${lang}#private`)],
  ]));
});

// Mini app fayllarini (webapp/) HTTPS domen orqali beradi
const app = express();
app.disable('x-powered-by');
// Nginx/Cloudflare orqasida ishlayotgan bo'lsa TRUST_PROXY=1 qo'yiladi (to'g'ri IP uchun)
const TRUST = Number(process.env.TRUST_PROXY || 0);
if (TRUST > 0) app.set('trust proxy', TRUST);

// Xavfsizlik sarlavhalari (paket talab qilmaydi)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Sodda rate limit: faqat yozuv (POST) so'rovlar uchun, IP bo'yicha.
// GET'lar cheklanmaydi — ro'yxat/reyting kabi o'qishlar normal ishlashi kerak.
function rateLimit({ windowMs = 60000, max = 40 } = {}) {
  const hits = new Map();
  let sweptAt = Date.now();
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    const now = Date.now();
    if (now - sweptAt > windowMs) {
      for (const [k, v] of hits) if (now - v.t > windowMs) hits.delete(k);
      sweptAt = now;
    }
    const key = `${req.ip || req.socket?.remoteAddress || 'x'}|${req.path.split('/')[2] || ''}`;
    const rec = hits.get(key);
    if (rec && now - rec.t < windowMs) {
      rec.n += 1;
      if (rec.n > max) return res.status(429).json({ error: 'ratelimit' });
    } else {
      hits.set(key, { t: now, n: 1 });
    }
    return next();
  };
}

app.use('/api', rateLimit({ windowMs: 60000, max: 40 }));
app.use(express.json({ limit: '64kb' }));
// Statik fayllar: rasmlar uzoq keshlanadi, kod (html/js/css) har safar tekshiriladi
app.use(express.static(path.join(__dirname, 'webapp'), {
  maxAge: '30d',
  etag: true,
  setHeaders(res, filePath) {
    if (/\.(html|js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
  },
}));

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

// ——— Mavsumning avtomatik starti ———
// Vaqt kelganda ligalar ham, kuboklar ham qo'lda ochilmasdan ishga tushadi.
// Yozuv idempotent: openedAt faqat bir marta qo'yiladi, qayta ishga tushirish xavfsiz.
const AUTO_CUPS = ['fa-cup', 'community-shield'];
let openedFor = null;

async function ensureSeasonOpened(cal) {
  if (cal.phase !== 'live' && cal.phase !== 'finished') return;
  if (openedFor === cal.number) return;
  try {
    await SeasonState.updateOne(
      { number: cal.number },
      { $setOnInsert: { startAt: new Date(cal.startAt), endAt: new Date(cal.endAt) }, $set: { checkedAt: new Date() } },
      { upsert: true }
    );
    const r = await SeasonState.updateOne(
      { number: cal.number, openedAt: null },
      { $set: { openedAt: new Date(), cupsStartedAt: new Date(), cups: AUTO_CUPS } }
    );
    if (r && r.modifiedCount) {
      console.log(`⏱ Mavsum ${cal.number} avtomatik boshlandi — ligalar + ${AUTO_CUPS.join(', ')}`);
    }
    openedFor = cal.number;
  } catch (_) {
    // DB hali ulanmagan bo'lsa — keyingi tekshiruvda qayta uriniladi
  }
}

// Har daqiqada kalendarni tekshiradi (jarayonni ushlab turmaydi)
function startSeasonWatcher() {
  const tick = () => { ensureSeasonOpened(seasonEngine.calendar()); };
  tick();
  const id = setInterval(tick, 60 * 1000);
  if (id.unref) id.unref();
  return id;
}

// Barcha ligalar: o'yinchilar soni, band klublar va foydalanuvchining o'z ro'yxati (bitta so'rovda)
app.get('/api/leagues', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const regs = await Registration.find({ season }).lean();
  const mine = regs.find((r) => r.telegramId === u.id);
  const cal = seasonEngine.calendar();
  res.json({
    season,
    calendar: cal,
    mine: mine ? { league: mine.league, club: mine.club } : null,
    // Klubini topshirayotganlar (o'zingnikidan tashqari)
    releasing: regs.filter((r) => r.releasing && r.telegramId !== u.id).map((r) => ({ league: r.league, club: r.club, games: r.w + r.d + r.l })),
    leagues: EFL.LEAGUES.map((l) => {
      const rs = regs.filter((r) => r.league === l.id);
      return { id: l.id, max: l.max, players: rs.length, taken: rs.map((r) => r.club) };
    }),
  });
});

// Mavsum kalendari + bitta davlatning paketi (liga + avtomatik kuboklar)
// ?country=en → Angliya: premier-league, championship, fa-cup, community-shield — hammasi bitta startda
app.get('/api/season', async (req, res) => {
  if (!tgUser(req)) return res.status(401).json({ error: 'auth' });
  const country = String(req.query.country || 'en').slice(0, 8);
  const cal = seasonEngine.calendar();
  res.json({ calendar: cal, bundle: EFL.bundleInfo(country) });
});

app.get('/api/profile', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const me = await Registration.findOne({ season, telegramId: u.id }).lean();
  if (!me) return res.json({ league: null, club: null, releasing: false, pos: null, w: 0, d: 0, l: 0, games: [], admin: isGlobalAdmin(u.id) });
  const regs = (await Registration.find({ season, league: me.league }).lean()).sort(rankSort);
  res.json({ league: me.league, club: me.club, releasing: !!me.releasing, pos: regs.findIndex((r) => r.telegramId === u.id) + 1, w: me.w, d: me.d, l: me.l, games: [], admin: isGlobalAdmin(u.id) });
});

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
  // Mavsum oynasi: ro'yxat faqat "registration" fazasida ochiq.
  // Liga va kuboklar bitta sanada start oladi — shuning uchun bitta tekshiruv hammasiga yetadi.
  const gate = seasonEngine.registrationGate();
  if (!gate.ok) return res.status(409).json({ error: gate.error, calendar: gate.calendar });
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
    const owner = await User.findOne({ telegramId: old.telegramId }).lean();
    bot.telegram.sendMessage(old.telegramId, (GONE[owner?.lang] || GONE.uz)(EFL.clubName(league, club))).catch(() => {});
    res.json({ ok: true });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({ error: e.code === 11000 ? 'already' : 'fail' });
  }
});

// Norasmiy turnirlar + admin panel API
registerPrivateRoutes(app, {
  tgUser,
  bot,
  miniAppUrl: MINI_APP_URL,
  adminIds: [...ADMIN_IDS],
});

// Kutilmagan server xatolari JSON bo'lib qaytsin
app.use((err, req, res, next) => {
  console.error('API xatosi:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'fail' });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Mini app serveri ishga tushdi');
  try { console.log(seasonEngine.describe()); } catch (_) {}
});

(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI sozlanmagan');
  await mongoose.connect(process.env.MONGO_URI);
  // Mavsum startini kuzatish: ligalar + kuboklar avtomatik ochiladi
  startSeasonWatcher();
  // Test/sinov uchun botni ishga tushirmaslik mumkin
  if (process.env.NO_BOT === '1') {
    console.log('NO_BOT=1 — bot polling o‘chirilgan');
    return;
  }
  await bot.launch();
  console.log('Bot ishga tushdi');
})().catch((e) => {
  console.error('Ishga tushirish xatosi:', e.message);
  process.exitCode = 1;
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
