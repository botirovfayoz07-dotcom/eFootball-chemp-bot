require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const User = require('./models/User');
const t = require('./locales');
const path = require('path');
const express = require('express');
const crypto = require('crypto');
const Registration = require('./models/Registration');
const EFL = require('./webapp/league-data');


const bot = new Telegraf(process.env.BOT_TOKEN);
const MINI_APP_URL = process.env.MINI_APP_URL; // HTTPS bo'lishi shart

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

app.get('/api/profile', async (req, res) => {
  const u = tgUser(req);
  if (!u) return res.status(401).json({ error: 'auth' });
  const me = await Registration.findOne({ season, telegramId: u.id }).lean();
  if (!me) return res.json({ league: null, club: null, releasing: false, pos: null, w: 0, d: 0, l: 0, games: [] });
  const regs = (await Registration.find({ season, league: me.league }).lean()).sort(rankSort);
  res.json({ league: me.league, club: me.club, releasing: !!me.releasing, pos: regs.findIndex((r) => r.telegramId === u.id) + 1, w: me.w, d: me.d, l: me.l, games: [] });
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
app.listen(process.env.PORT || 3000, () => console.log('Mini app serveri ishga tushdi'));

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await bot.launch();
  console.log('Bot ishga tushdi');
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
