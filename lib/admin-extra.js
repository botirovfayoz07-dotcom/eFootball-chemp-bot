// Admin: statistika paneli + ommaviy xabar (broadcast)
//   GET  /api/admin/stats?days=14          — foydalanuvchilar, faollik, Coins daromadi, grafik ma'lumotlari
//   POST /api/admin/broadcast/count        — {league?, lang?} → nechta odamga boradi
//   POST /api/admin/broadcast              — {text, league?, lang?, test?} → yuborishni boshlaydi
//   GET  /api/admin/broadcast              — oxirgi xabarlar va ularning holati
const User = require('../models/User');
const Activity = require('../models/Activity');
const Broadcast = require('../models/Broadcast');
const TopUp = require('../models/TopUp');
const Registration = require('../models/Registration');

const TZ = 'Asia/Tashkent';
const DAY = 864e5;
const fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const tzDay = (d = new Date()) => fmtDay.format(d);                       // 'YYYY-MM-DD' (Toshkent)
const lastDays = (n) => Array.from({ length: n }, (_, i) => tzDay(new Date(Date.now() - (n - 1 - i) * DAY)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LANGS = ['uz', 'en', 'ru'];

// touchUser dan chaqiriladi: bugungi faollikni yozib qo'yadi
const trackActivity = (telegramId) =>
  Activity.updateOne({ day: tzDay(), telegramId }, { $setOnInsert: { at: new Date() } }, { upsert: true }).catch(() => {});

module.exports = function registerAdminExtra(app, { adminOnly, ah, bot, season, EFL, Markup, MINI_APP_URL }) {
  // Server o'chib qolganda yarim yo'lda qolgan xabarlar «to'xtatilgan» deb belgilanadi
  Broadcast.updateMany({ status: 'running' }, { $set: { status: 'interrupted', finishedAt: new Date() } }).catch(() => {});

  // ——— Statistika ———
  app.get('/api/admin/stats', adminOnly, ah(async (req, res) => {
    const n = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 7), 60);
    const days = lastDays(n), from = new Date(Date.now() - (n + 1) * DAY), now = Date.now();
    const ago = (d) => new Date(now - d * DAY);

    const [total, dau, wau, mau, new7, regTotal, blocked, activity, signups, topups, pendingTopups, byLeague] = await Promise.all([
      User.estimatedDocumentCount(),
      User.countDocuments({ lastSeen: { $gte: ago(1) } }),
      User.countDocuments({ lastSeen: { $gte: ago(7) } }),
      User.countDocuments({ lastSeen: { $gte: ago(30) } }),
      User.countDocuments({ createdAt: { $gte: ago(7) } }),
      Registration.countDocuments({ season }),
      User.countDocuments({ blocked: true }),
      Activity.aggregate([{ $match: { day: { $in: days } } }, { $group: { _id: '$day', n: { $sum: 1 } } }]),
      User.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, n: { $sum: 1 } } }]),
      TopUp.aggregate([
        { $match: { status: 'approved', doneAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$doneAt', timezone: TZ } }, coins: { $sum: '$coins' }, uzs: { $sum: '$amount' }, n: { $sum: 1 } } },
      ]),
      TopUp.countDocuments({ status: 'pending' }),
      Registration.aggregate([{ $match: { season } }, { $group: { _id: '$league', n: { $sum: 1 } } }]),
    ]);

    const pick = (arr, key = 'n') => { const m = new Map(arr.map((x) => [x._id, x])); return days.map((d) => m.get(d)?.[key] || 0); };
    const series = {
      days,
      active: pick(activity),
      signups: pick(signups),
      coins: pick(topups, 'coins'),
      uzs: pick(topups, 'uzs'),
      payments: pick(topups, 'n'),
    };
    const sum = (a, k = a.length) => a.slice(-k).reduce((s, x) => s + x, 0);
    const lg = new Map(byLeague.map((x) => [x._id, x.n]));
    res.json({
      users: { total, dau, wau, mau, new7, newToday: series.signups[series.signups.length - 1], blocked, registered: regTotal },
      revenue: {
        todayUzs: sum(series.uzs, 1), weekUzs: sum(series.uzs, 7), periodUzs: sum(series.uzs),
        todayCoins: sum(series.coins, 1), weekCoins: sum(series.coins, 7), periodCoins: sum(series.coins),
        payments: sum(series.payments), pending: pendingTopups,
      },
      series,
      leagues: EFL.LEAGUES.map((l) => ({ id: l.id, name: l.name, players: lg.get(l.id) || 0, max: l.max })).sort((a, b) => b.players - a.players),
    });
  }));

  // ——— Ommaviy xabar ———
  async function audience({ league, lang }) {
    const q = { blocked: { $ne: true } };
    if (LANGS.includes(lang)) q.lang = lang;
    if (league) q.telegramId = { $in: await Registration.find({ season, league }).distinct('telegramId') };
    return User.find(q).select('telegramId').lean().then((l) => l.map((u) => u.telegramId));
  }
  const parseTarget = (b) => {
    const league = b?.league ? String(b.league) : null, lang = LANGS.includes(b?.lang) ? b.lang : null;
    if (league && !EFL.byId[league]) return null;
    return { league, lang };
  };

  app.post('/api/admin/broadcast/count', adminOnly, ah(async (req, res) => {
    const tg = parseTarget(req.body);
    if (!tg) return res.status(400).json({ error: 'fail' });
    res.json({ count: (await audience(tg)).length });
  }));

  async function send(id, text, ids) {
    const kb = Markup.inlineKeyboard([[Markup.button.webApp('⚽ Ilovani ochish', `${MINI_APP_URL}?lang=uz`)]]);
    let sent = 0, failed = 0, blocked = 0;
    for (let i = 0; i < ids.length; i++) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try { await bot.telegram.sendMessage(ids[i], text, kb); sent++; break; }
        catch (e) {
          const code = e?.response?.error_code;
          if (code === 429 && attempt === 0) { await sleep(((e.response.parameters?.retry_after || 5) + 1) * 1000); continue; }
          if (code === 403) { blocked++; User.updateOne({ telegramId: ids[i] }, { $set: { blocked: true } }).catch(() => {}); }
          else failed++;
          break;
        }
      }
      if ((i + 1) % 20 === 0) await Broadcast.updateOne({ _id: id }, { $set: { sent, failed, blocked } }).catch(() => {});
      await sleep(40);                                   // ~25 xabar/soniya — Telegram chegarasi (30/s) dan past
    }
    await Broadcast.updateOne({ _id: id }, { $set: { sent, failed, blocked, status: 'done', finishedAt: new Date() } });
  }

  app.post('/api/admin/broadcast', adminOnly, ah(async (req, res) => {
    const text = String(req.body?.text || '').trim();
    if (!text || text.length > 3500) return res.status(400).json({ error: 'badText' });
    // Sinov: faqat o'zingizga yuboradi
    if (req.body?.test) {
      try { await bot.telegram.sendMessage(req.admin.id, '📢 (sinov)\n\n' + text); return res.json({ ok: true, test: true }); }
      catch (_) { return res.status(502).json({ error: 'tgFail' }); }
    }
    const tg = parseTarget(req.body);
    if (!tg) return res.status(400).json({ error: 'fail' });
    if (await Broadcast.exists({ status: 'running' })) return res.status(409).json({ error: 'busy' });
    const ids = await audience(tg);
    if (!ids.length) return res.status(409).json({ error: 'empty' });
    const job = await Broadcast.create({ by: req.admin.id, text, league: tg.league, lang: tg.lang, total: ids.length });
    send(job._id, '📢 ' + text, ids).catch(async (e) => { console.error('broadcast', e); await Broadcast.updateOne({ _id: job._id }, { $set: { status: 'interrupted', finishedAt: new Date() } }).catch(() => {}); });
    res.json({ ok: true, id: String(job._id), total: ids.length });
  }));

  app.get('/api/admin/broadcast', adminOnly, ah(async (req, res) => {
    const list = await Broadcast.find().sort({ createdAt: -1 }).limit(10).lean();
    res.json({
      list: list.map((b) => ({
        id: String(b._id), text: b.text, league: b.league ? EFL.byId[b.league]?.name || b.league : null, lang: b.lang,
        status: b.status, total: b.total, sent: b.sent, failed: b.failed, blocked: b.blocked, at: b.createdAt,
      })),
    });
  }));

  return { trackActivity };
};
module.exports.trackActivity = trackActivity;
