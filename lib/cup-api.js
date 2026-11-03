'use strict';

const Cup = require('../models/Cup');
const Match = require('../models/Match');
const cup = require('./cup');

// bot.js da bir marta ulanadi:
//   const cupApi = require('./lib/cup-api')(app, { tgUser, ah, adminOnly, season, notifyAdmins });
module.exports = function mount(app, d) {
  const { tgUser, ah, adminOnly, season, notifyAdmins } = d;

  const auth = (req, res, next) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    req.u = u;
    return next();
  };
  const admin = (req, res, next) => adminOnly(req, res, next);
  const alert = (text) => { try { if (notifyAdmins) notifyAdmins(text); } catch (_) { } };

  // ——— Foydalanuvchi: saralash bloki + pley-off + mening o'yinlarim ———
  app.get('/api/cup/state', auth, ah(async (req, res) => {
    res.json(await cup.state(season, req.u.id));
  }));

  // ——— Admin: to'liq holat ———
  app.get('/api/admin/cup', admin, ah(async (req, res) => {
    res.json(await cup.state(season));
  }));

  // ——— Admin: qura vaqtini belgilash (drawAt: null — o'chirish) ———
  app.post('/api/admin/cup/draw-time', admin, ah(async (req, res) => {
    const { stage } = req.body || {};
    const meta = cup.byStage(stage);
    if (!meta) return res.status(400).json({ error: 'stage' });

    let at = null;
    if (req.body.drawAt) {
      at = new Date(req.body.drawAt);
      if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'time' });
    }
    await Cup.updateOne(
      { season, cup: cup.CUP, stage },
      { $set: { drawAt: at, round: meta.round } },
      { upsert: true }
    );
    return res.json({ ok: true, stage, drawAt: at });
  }));

  // ——— Admin: hoziroq qura ———
  app.post('/api/admin/cup/draw', admin, ah(async (req, res) => {
    const { stage } = req.body || {};
    const r = await cup.draw(season, stage);
    if (r.error) return res.status(409).json(r);
    const meta = cup.byStage(stage);
    alert(`🎲 FA Cup qura — ${meta ? meta.label : stage}: ${r.matches} ta o'yin (${r.teams} klub).`);
    return res.json(r);
  }));

  // ——— Admin: tur starti + dedlayn (soatlarda) ———
  app.post('/api/admin/cup/start', admin, ah(async (req, res) => {
    const { stage, hours } = req.body || {};
    const r = await cup.start(season, stage, hours);
    if (r.error) return res.status(409).json(r);
    return res.json(r);
  }));

  // ——— Admin: keyingi bosqichga o'tish ———
  app.post('/api/admin/cup/advance', admin, ah(async (req, res) => {
    const { stage } = req.body || {};
    const r = await cup.advance(season, stage);
    if (r.error) return res.status(409).json(r);
    alert(`➡️ FA Cup: ${stage} → ${r.next}. ${r.winners} g'olib${r.extra ? `, ${r.extra} kech qo'shilgan` : ''}.`);
    return res.json(r);
  }));

  // ——— Admin: bosqichni tozalash (qayta qura uchun) ———
  app.post('/api/admin/cup/reset', admin, ah(async (req, res) => {
    const { stage } = req.body || {};
    const meta = cup.byStage(stage);
    if (!meta) return res.status(400).json({ error: 'stage' });

    await Match.deleteMany({ season, league: cup.CUP, round: meta.round });
    await Cup.updateOne(
      { season, cup: cup.CUP, stage },
      { $set: { drawnAt: null, startedAt: null, deadline: null, winners: [], teams: [] } },
      { upsert: true }
    );
    return res.json({ ok: true });
  }));

  // ——— Vaqti kelgan quralarni avtomatik o'tkazish ———
  async function runDue() {
    try {
      const due = await Cup.find({ season, cup: cup.CUP, drawnAt: null, drawAt: { $ne: null, $lte: new Date() } }).lean();
      const out = [];
      for (const c of due) {
        const r = await cup.draw(season, c.stage);
        out.push({ stage: c.stage, ...r });
        if (r.ok) {
          const meta = cup.byStage(c.stage);
          alert(`🎲 FA Cup qura avtomatik o'tkazildi — ${meta ? meta.label : c.stage}: ${r.matches} ta o'yin.`);
        } else {
          await Cup.updateOne({ season, cup: cup.CUP, stage: c.stage }, { $set: { drawAt: null } });
          alert(`⚠️ FA Cup qura o'tkazilmadi (${c.stage}): ${r.error === 'few' ? 'kamida 2 ishtirokchi kerak' : r.error}. Vaqtni qayta belgilang.`);
        }
      }
      return out;
    } catch (e) {
      console.error('FA Cup qura avtomatik:', e.message);
      return [];
    }
  }
  app.post('/api/admin/cup/shield', admin, ah(async (req, res) => {
    const r = await cup.shield(season);
    return res.status(r.ready ? 200 : 409).json(r);
  }));

  app.get('/api/admin/cup/pairs', admin, ah(async (req, res) => {
    const stage = String(req.query.stage || '');
    const meta = cup.byStage(stage) || (stage === 'shield' ? { round: 8 } : null);
    if (!meta) return res.status(400).json({ error: 'stage' });
    const ms = await Match.find({ season, league: cup.CUP, round: meta.round, status: { $ne: 'cancelled' } }).lean();
    const ids = [...new Set(ms.flatMap((m) => [m.home, m.away]))];
    const regs = await require('../models/Registration').find({ season, telegramId: { $in: ids } }).lean();
    const EFL = require('../webapp/league-data');
    const of = new Map(regs.map((r) => [r.telegramId, EFL.clubName(r.league, r.club)]));
    res.json({ stage, pairs: ms.map((m) => ({ home: of.get(m.home) || String(m.home), away: of.get(m.away) || String(m.away) })) });
  }));

  return { runDue };
};