'use strict';

/* ============================================================================
   Chempionlar ligasi (UCL) — format B:
     1) Lig bosqichi: ishtirokchilar bir-biri bilan bir marta o'ynaydi (round-robin).
     2) Pley-off: lig bosqichidagi eng yaxshi K ta klub (K = 8, agar ishtirokchi 8 dan kam bo'lsa — 4)
        setkada o'ynaydi: QF (8 klub) → SF → Final. Har bir o'yin bitta o'yin, durang yo'q.
   Hisobni faqat admin kiritadi. Admin hamma bosqichni panel orqali boshqaradi.
   ========================================================================== */

const UclMatch = require('../models/UclMatch');
const UclState = require('../models/UclState');
const Registration = require('../models/Registration');
const User = require('../models/User');
const FX = require('../fixtures');

const PARTICIPANTS_MIN = 4, PARTICIPANTS_MAX = 32;

// Pley-off setkasi: [[1,8],[4,5],[2,7],[3,6]] kabi juftliklar (urug' tartibi)
const bracketPairs = (k) => {
  const order = FX.seedOrder(k), pairs = [];
  for (let i = 0; i < order.length; i += 2) pairs.push([order[i], order[i + 1]]);
  return pairs;
};
const knockoutStages = (k) => (k >= 8 ? ['qf', 'sf', 'final'] : ['sf', 'final']);

// Jadval: pts, gd, gf bo'yicha; teng bo'lsa telegramId bo'yicha (doimiy tartib)
function standings(participants, matches) {
  const st = FX.computeStats(matches.filter((m) => m.hg != null && m.ag != null));
  const rows = participants.map((id) => {
    const s = st.get(id) || { pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    return { id, ...s, gd: s.gf - s.ga };
  });
  rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.id - b.id);
  return rows;
}

// Lig bosqichi tugaganmi (barcha o'yinlarda hisob bor)
const leagueDone = (ms) => ms.length > 0 && ms.every((m) => m.hg != null && m.ag != null);

// Pley-off uchun juftliklarni hisoblash (lig bosqichi natijasidan)
function knockoutPairs(rows) {
  const k = rows.length >= 8 ? 8 : rows.length >= 4 ? 4 : 0;
  const top = rows.slice(0, k).map((r) => r.id);
  return { k, pairs: bracketPairs(k).map(([a, b]) => [top[a - 1], top[b - 1]]) };
}

// Pley-off bosqichining g'oliblari (hg != ag bo'lishi shart)
const winnerOf = (m) => (m.hg > m.ag ? m.home : m.ag > m.hg ? m.away : null);

function mount(app, d) {
  const { tgUser, ah, adminOnly, season, alert } = d;
  const auth = (req, res, next) => { const u = tgUser(req); if (!u) return res.status(401).json({ error: 'auth' }); req.u = u; next(); };
  const nameMap = async (ids) => {
    const us = await User.find({ telegramId: { $in: ids } }).lean();
    return new Map(us.map((x) => [x.telegramId, x.username ? '@' + x.username : x.firstName || String(x.telegramId)]));
  };
  const getState = async () => (await UclState.findOne({ season }).lean()) || { season, phase: 'setup', participants: [], knockoutSize: 0, stage: null, champion: null };

  // ——— Ishtirokchilar ro'yxati uchun: shu mavsumda ro'yxatdan o'tgan klublar ———
  async function candidates() {
    const regs = await Registration.find({ season, vacant: { $ne: true } }).lean();
    const names = await nameMap(regs.map((r) => r.telegramId));
    const EFL = require('../webapp/league-data');
    return regs.map((r) => ({
      id: r.telegramId, user: names.get(r.telegramId) || '',
      club: EFL.clubName(r.league, r.club), league: EFL.byId[r.league]?.name || r.league,
    })).sort((a, b) => a.club.localeCompare(b.club));
  }

  // ——— Admin: holat va hamma ma'lumot bitta so'rovda ———
  app.get('/api/admin/ucl', adminOnly, ah(async (req, res) => {
    const st = await getState();
    const ms = await UclMatch.find({ season }).sort({ stage: 1, round: 1, slot: 1, matchNo: 1 }).lean();
    const names = await nameMap([...new Set(ms.flatMap((m) => [m.home, m.away]).concat(st.participants))]);
    const cand = await candidates();
    const clubOf = new Map(cand.map((c) => [c.id, c]));
    const label = (id) => (clubOf.get(id)?.club || '') + (names.get(id) ? ` (${names.get(id)})` : '');
    const league = ms.filter((m) => m.stage === 'league');
    res.json({
      season, phase: st.phase, stage: st.stage, champion: st.champion ? { id: st.champion, name: label(st.champion) } : null,
      knockoutSize: st.knockoutSize,
      participants: st.participants.map((id) => ({ id, name: label(id) })),
      candidates: cand,
      standings: standings(st.participants, league).map((r) => ({ ...r, name: label(r.id) })),
      matches: ms.map((m) => ({ id: String(m._id), stage: m.stage, round: m.round, slot: m.slot, matchNo: m.matchNo, home: m.home, away: m.away, homeName: label(m.home), awayName: label(m.away), hg: m.hg, ag: m.ag })),
      leagueDone: leagueDone(league),
    });
  }));

  // ——— Admin: ishtirokchilarni tanlash (faqat sozlash bosqichida) ———
  app.post('/api/admin/ucl/participants', adminOnly, ah(async (req, res) => {
    const st = await getState();
    if (st.phase !== 'setup') return res.status(409).json({ error: 'locked' });
    const ids = [...new Set((req.body?.ids || []).map(Number))].filter(Number.isInteger);
    if (ids.length < PARTICIPANTS_MIN || ids.length > PARTICIPANTS_MAX || ids.length % 2) return res.status(400).json({ error: 'count' });
    const regs = await Registration.find({ season, telegramId: { $in: ids }, vacant: { $ne: true } }).select('telegramId').lean();
    if (regs.length !== ids.length) return res.status(400).json({ error: 'notRegistered' });
    await UclState.updateOne({ season }, { $set: { participants: ids, updatedAt: new Date() } }, { upsert: true });
    res.json({ ok: true, count: ids.length });
  }));

  // ——— Admin: lig bosqichini boshlash (qura) ———
  app.post('/api/admin/ucl/start', adminOnly, ah(async (req, res) => {
    const st = await getState();
    if (st.phase !== 'setup') return res.status(409).json({ error: 'locked' });
    const ids = st.participants;
    if (ids.length < PARTICIPANTS_MIN || ids.length % 2) return res.status(400).json({ error: 'count' });
    const fx = FX.roundRobin(FX.shuffle(ids), false);
    await UclMatch.insertMany(fx.map((m, i) => ({ season, stage: 'league', round: m.round, home: m.home, away: m.away, matchNo: i + 1 })));
    await UclState.updateOne({ season }, { $set: { phase: 'league', knockoutSize: ids.length >= 8 ? 8 : 4, updatedAt: new Date() } });
    res.json({ ok: true, matches: fx.length });
  }));

  // ——— Admin: natija kiritish yoki tuzatish ———
  app.post('/api/admin/ucl/result', adminOnly, ah(async (req, res) => {
    const st = await getState();
    const id = String(req.body?.id || ''), hg = req.body?.hg, ag = req.body?.ag;
    if (!/^[a-f0-9]{24}$/.test(id)) return res.status(400).json({ error: 'fail' });
    if (!(Number.isInteger(hg) && Number.isInteger(ag) && hg >= 0 && ag >= 0 && hg <= 99 && ag <= 99)) return res.status(400).json({ error: 'badScore' });
    const m = await UclMatch.findOne({ _id: id, season });
    if (!m) return res.status(404).json({ error: 'gone' });
    if (m.stage === 'league' && st.phase !== 'league') return res.status(409).json({ error: 'locked' });
    if (m.stage !== 'league' && st.stage !== m.stage) return res.status(409).json({ error: 'locked' });
    if (m.stage !== 'league' && hg === ag) return res.status(400).json({ error: 'draw' });   // pley-off: durang yo'q
    await UclMatch.updateOne({ _id: m._id }, { $set: { hg, ag, updatedAt: new Date() } });
    res.json({ ok: true });
  }));

  // ——— Admin: pley-off bosqichini ochish (lig tugagach yoki oldingi bosqich tugagach) ———
  app.post('/api/admin/ucl/advance', adminOnly, ah(async (req, res) => {
    const st = await getState();
    if (st.phase === 'finished') return res.status(409).json({ error: 'finished' });
    const all = await UclMatch.find({ season }).lean();
    if (st.phase === 'league') {
      const league = all.filter((m) => m.stage === 'league');
      if (!leagueDone(league)) return res.status(409).json({ error: 'notDone' });
      const { k, pairs } = knockoutPairs(standings(st.participants, league));
      if (!k) return res.status(409).json({ error: 'few' });
      const stage = knockoutStages(k)[0];
      await UclMatch.insertMany(pairs.map(([h, a], i) => ({ season, stage, round: 0, slot: i + 1, home: h, away: a })));
      await UclState.updateOne({ season }, { $set: { phase: 'knockout', stage, updatedAt: new Date() } });
      return res.json({ ok: true, stage });
    }
    // knockout: hozirgi bosqich tugaganmi
    const cur = all.filter((m) => m.stage === st.stage);
    if (!cur.length || cur.some((m) => m.hg == null || m.ag == null)) return res.status(409).json({ error: 'notDone' });
    const winners = cur.sort((a, b) => a.slot - b.slot).map(winnerOf);
    if (st.stage === 'final') {
      await UclState.updateOne({ season }, { $set: { phase: 'finished', champion: winners[0], updatedAt: new Date() } });
      return res.json({ ok: true, champion: winners[0] });
    }
    const order = knockoutStages(st.knockoutSize);
    const nextStage = order[order.indexOf(st.stage) + 1];
    const docs = [];
    for (let i = 0; i < winners.length; i += 2) docs.push({ season, stage: nextStage, round: 0, slot: i / 2 + 1, home: winners[i], away: winners[i + 1] });
    await UclMatch.insertMany(docs);
    await UclState.updateOne({ season }, { $set: { stage: nextStage, updatedAt: new Date() } });
    res.json({ ok: true, stage: nextStage });
  }));

  // ——— Admin: hammasini qaytadan boshlash (tasdiq so'raladi) ———
  app.post('/api/admin/ucl/reset', adminOnly, ah(async (req, res) => {
    if (req.body?.confirm !== 'RESET') return res.status(400).json({ error: 'confirm' });
    await UclMatch.deleteMany({ season });
    await UclState.updateOne({ season }, { $set: { phase: 'setup', participants: [], knockoutSize: 0, stage: null, champion: null, updatedAt: new Date() } }, { upsert: true });
    res.json({ ok: true });
  }));

  // ——— O'yinchi: jadval, pley-off va o'z o'yinlari ———
  app.get('/api/ucl', auth, ah(async (req, res) => {
    const st = await getState();
    const ms = await UclMatch.find({ season }).sort({ stage: 1, round: 1, slot: 1, matchNo: 1 }).lean();
    const names = await nameMap([...new Set(ms.flatMap((m) => [m.home, m.away]).concat(st.participants))]);
    const EFL = require('../webapp/league-data');
    const reg = new Map((await Registration.find({ season, telegramId: { $in: st.participants } }).lean()).map((r) => [r.telegramId, r]));
    const label = (id) => (reg.get(id) ? EFL.clubName(reg.get(id).league, reg.get(id).club) : '—') + (names.get(id) ? ` (${names.get(id)})` : '');
    const league = ms.filter((m) => m.stage === 'league');
    const mine = ms.filter((m) => m.home === req.u.id || m.away === req.u.id).map((m) => ({
      id: String(m._id), stage: m.stage, round: m.round, matchNo: m.matchNo, mine: m.home === req.u.id,
      opponent: label(m.home === req.u.id ? m.away : m.home), hg: m.hg, ag: m.ag,
    }));
    res.json({
      phase: st.phase, stage: st.stage, champion: st.champion ? label(st.champion) : null,
      standings: standings(st.participants, league).map((r) => ({ ...r, name: label(r.id) })),
      knockout: ms.filter((m) => m.stage !== 'league').map((m) => ({ id: String(m._id), stage: m.stage, slot: m.slot, home: label(m.home), away: label(m.away), hg: m.hg, ag: m.ag })),
      mine,
    });
  }));
}

module.exports = { mount, standings, leagueDone, knockoutPairs, winnerOf, bracketPairs, knockoutStages };
