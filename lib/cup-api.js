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
  // So'rovdagi kubok: ?cup= yoki body.cup (noto'g'ri bo'lsa — standart FA Cup)
  const cid = (req) => { const c = (req.query && req.query.cup) || (req.body && req.body.cup); return cup.FAMILIES[c] ? c : cup.CUP; };
  const alert = (text) => { try { if (notifyAdmins) notifyAdmins(text); } catch (_) { } };

  // ——— Foydalanuvchi: saralash bloki + pley-off + mening o'yinlarim ———
  app.get('/api/cup/state', auth, ah(async (req, res) => {
    res.json(await cup.state(season, req.u.id, req.query.cup && cup.FAMILIES[req.query.cup] ? req.query.cup : undefined));
  }));

  // ——— Admin: to'liq holat ———
  app.get('/api/admin/cup', admin, ah(async (req, res) => {
    res.json(await cup.state(season, undefined, cid(req)));
  }));

  // ——— Admin: qura vaqtini belgilash (drawAt: null — o'chirish) ———
  app.post('/api/admin/cup/draw-time', admin, ah(async (req, res) => {
    const { stage } = req.body || {};
    const meta = cup.byStage(stage, cid(req));
    if (!meta) return res.status(400).json({ error: 'stage' });

    let at = null;
    if (req.body.drawAt) {
      at = new Date(req.body.drawAt);
      if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'time' });
    }
    await Cup.updateOne(
      { season, cup: cid(req), stage },
      { $set: { drawAt: at, round: meta.round } },
      { upsert: true }
    );
    return res.json({ ok: true, stage, drawAt: at });
  }));

  // ——— Admin: hoziroq qura ———
  app.post('/api/admin/cup/draw', admin, ah(async (req, res) => {
    const { stage } = req.body || {};
    const r = await cup.draw(season, stage, cid(req));
    if (r.error) return res.status(409).json(r);
    const meta = cup.byStage(stage, cid(req));
    alert(`🎲 ${cup.fam(cid(req)).name} qura — ${meta ? meta.label : stage}: ${r.matches} ta o'yin (${r.teams} klub).`);
    return res.json(r);
  }));

  // ——— Admin: tur starti + dedlayn (soatlarda) ———
  app.post('/api/admin/cup/start', admin, ah(async (req, res) => {
    const { stage, hours } = req.body || {};
    const r = await cup.start(season, stage, hours, cid(req));
    if (r.error) return res.status(409).json(r);
    return res.json(r);
  }));

  // ——— Admin: turni yopish (deadline ni hozirga qo'yib qulflash) ———
  app.post('/api/admin/cup/close', admin, ah(async (req, res) => {
    const { stage } = req.body || {};
    const meta = cup.byStage(stage, cid(req));
    if (!meta) return res.status(400).json({ error: 'stage' });
    await Cup.findOneAndUpdate(
      { season, cup: cid(req), stage },
      { $set: { deadline: new Date(Date.now() - 1000), round: meta.round } },
      { upsert: true, new: true }
    );
    return res.json({ ok: true });
  }));

  // ——— Admin: keyingi bosqichga o'tish ———
  app.post('/api/admin/cup/advance', admin, ah(async (req, res) => {
    const { stage } = req.body || {};
    const meta0 = cup.byStage(stage, cid(req));
    if (!meta0) return res.status(400).json({ error: 'stage' });
    // Bosqichdagi barcha o'yinlar tasdiqlanmagan bo'lsa, g'olib aniqlanmagan klublar chiqib ketmasin
    if (!req.body?.force) {
      const open = await Match.countDocuments({ season, league: cid(req), round: meta0.round, status: { $ne: 'confirmed' } });
      if (open) return res.status(409).json({ error: 'notDone', left: open });
    }
    const r = await cup.advance(season, stage, cid(req));
    if (r.error) return res.status(409).json(r);
    alert(`➡️ ${cup.fam(cid(req)).name}: ${stage} → ${r.next}. ${r.winners} g'olib${r.extra ? `, ${r.extra} kech qo'shilgan` : ''}.`);
    return res.json(r);
  }));

  // ——— Admin: bosqichni tozalash (qayta qura uchun) ———
  app.post('/api/admin/cup/reset', admin, ah(async (req, res) => {
    const { stage } = req.body || {};
    const meta = cup.byStage(stage, cid(req));
    if (!meta) return res.status(400).json({ error: 'stage' });
    // Keyingi bosqich qurilgan bo'lsa, qayta tozalash uni buzadi — ruxsat yo'q
    const later = await Cup.countDocuments({ season, cup: cid(req), round: { $gt: meta.round }, drawnAt: { $ne: null } });
    if (later) return res.status(409).json({ error: 'later' });
    // O'yinlar allaqachon tasdiqlangan bo'lsa, faqat majburiy rejim bilan tozalanadi
    if (!req.body?.force) {
      const played = await Match.countDocuments({ season, league: cid(req), round: meta.round, status: 'confirmed' });
      if (played) return res.status(409).json({ error: 'played', count: played });
    }
    await Match.deleteMany({ season, league: cid(req), round: meta.round });
    await Cup.updateOne(
      { season, cup: cid(req), stage },
      { $set: { drawnAt: null, startedAt: null, deadline: null, winners: [], teams: [], byes: [] } },
      { upsert: true }
    );
    return res.json({ ok: true });
  }));

  // ——— Vaqti kelgan quralarni avtomatik o'tkazish ———
  async function runDue() {
    try {
      const out = [];
      for (const f of Object.values(cup.FAMILIES)) {
        const due = await Cup.find({ season, cup: f.id, drawnAt: null, drawAt: { $ne: null, $lte: new Date() } }).lean();
        for (const c of due) {
          const r = await cup.draw(season, c.stage, f.id);
          out.push({ cup: f.id, stage: c.stage, ...r });
          if (r.ok) {
            const meta = cup.byStage(c.stage, f.id);
            alert(`🎲 ${f.name} qura avtomatik o'tkazildi — ${meta ? meta.label : c.stage}: ${r.matches} ta o'yin.`);
          } else {
            await Cup.updateOne({ season, cup: f.id, stage: c.stage }, { $set: { drawAt: null } });
            alert(`⚠️ ${f.name} qura o'tkazilmadi (${c.stage}): ${r.error === 'few' ? 'kamida 2 ishtirokchi kerak' : r.error}. Vaqtni qayta belgilang.`);
          }
        }
      }
      return out;
    } catch (e) {
      console.error('Kubok qura avtomatik:', e.message);
      return [];
    }
  }
  app.post('/api/admin/cup/shield', admin, ah(async (req, res) => {
    const r = await cup.shield(season, cid(req));
    return res.status(r.ready ? 200 : 409).json(r);
  }));

  app.get('/api/admin/cup/pairs', admin, ah(async (req, res) => {
    const stage = String(req.query.stage || '');
    const meta = cup.byStage(stage, cid(req)) || (stage === 'shield' ? { round: 8 } : null);
    if (!meta) return res.status(400).json({ error: 'stage' });
    const ms = await Match.find({ season, league: cid(req), round: meta.round, status: { $ne: 'cancelled' } }).lean();
    const ids = [...new Set(ms.flatMap((m) => [m.home, m.away]))];
    const regs = await require('../models/Registration').find({ season, telegramId: { $in: ids } }).lean();
    const EFL = require('../webapp/league-data');
    const of = new Map(regs.map((r) => [r.telegramId, EFL.clubName(r.league, r.club)]));
    res.json({ stage, pairs: ms.map((m) => ({ home: of.get(m.home) || String(m.home), away: of.get(m.away) || String(m.away) })) });
  }));

    // ——— Foydalanuvchi: FA Cup sahifasi (4 tab uchun hamma ma'lumot) ———
  app.get('/api/cup/page', auth, ah(async (req, res) => {
    const uid = req.u.id;
    const cupId = req.query.cup && cup.FAMILIES[req.query.cup] ? req.query.cup : await cup.cupIdFor(season, uid);
    const st = await cup.state(season, uid, cupId);
    const EFL = require('../webapp/league-data');

    const all = await Match.find({ season, league: cupId, status: { $ne: 'cancelled' } }).sort({ round: 1 }).lean();
    const ids = [...new Set(all.flatMap((m) => [m.home, m.away]))];
    const regs = await require('../models/Registration').find({ season, telegramId: { $in: ids } }).lean();
    const of = new Map(regs.map((r) => [r.telegramId, { club: EFL.clubName(r.league, r.club), league: r.league, clubId: r.club, tg: r.telegramId }]));
    const side = (id) => of.get(id) || { club: '—', league: null, clubId: null, tg: id };
    const dec = (m) => ({
      id: String(m._id), matchNo: m.matchNo || null, round: m.round, status: m.status, hg: m.hg, ag: m.ag,
      home: side(m.home), away: side(m.away),
      mine: m.home === uid || m.away === uid,
      byMe: m.reportedBy === uid,
      oppTg: m.home === uid ? of.get(m.away)?.club : of.get(m.home)?.club,
    });
    const decAll = all.map(dec);
    const open = st.stages.filter((s) => s.startedAt && (!s.deadline || new Date(s.deadline) > new Date())).pop();

    const goals = new Map();
    all.filter((m) => m.status === 'confirmed' && m.hg != null).forEach((m) => {
      if (m.hg > 0) goals.set(m.home, (goals.get(m.home) || 0) + m.hg);
      if (m.ag > 0) goals.set(m.away, (goals.get(m.away) || 0) + m.ag);
    });
    const played = new Map();
    all.filter((m) => m.status === 'confirmed').forEach((m) => {
      played.set(m.home, (played.get(m.home) || 0) + 1);
      played.set(m.away, (played.get(m.away) || 0) + 1);
    });

    res.json({
      cup: st.cup, cupName: st.cupName, shieldName: st.shieldName,
      stages: st.stages,
      shield: st.shield,
      my: decAll.filter((m) => m.mine),
      current: open ? decAll.filter((m) => m.round === open.round) : [],
      currentLabel: open ? open.label : null,
      bracket: decAll.filter((m) => m.round >= 4 && m.round <= 7),
      qualifiers: decAll.filter((m) => m.round < 4),
      shieldMatches: decAll.filter((m) => m.round === 8),
      scorers: [...goals.entries()]
        .map(([id, g]) => ({ ...side(id), goals: g, played: played.get(id) || 0 }))
        .sort((a, b) => b.goals - a.goals).slice(0, 40),
    });
  }));
  return { runDue };
};