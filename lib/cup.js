'use strict';

/* ============================================================================
   FA Cup — saralash + pley-off menejeri

   Bosqichlar:
     pl-q    Premier Liga saralash   20 → 10
     ch-q1   Championship saralash   24 → 12
     ch-q2   Championship saralash   12 →  6
     r16     1/8 final (10 + 6 = 16) 16 →  8
     qf      1/4 final                8 →  4
     sf      Yarim final              4 →  2
     final   Final                    2 →  1

   O'yinlar mavjud `Match` modeliga yoziladi (league: 'fa-cup'),
   shu sababli room ID, chat, natija kiritish — hammasi avtomatik ishlaydi.
   ========================================================================== */

const Cup = require('../models/Cup');
const Match = require('../models/Match');
const Registration = require('../models/Registration');
const FX = require('../fixtures');

const CUP = 'fa-cup';

const STAGES = [
  { stage: 'pl-q', teams: 20, round: 1, label: 'Premier Liga saralash', source: 'premier-league' },
  { stage: 'ch-q1', teams: 24, round: 2, label: 'Championship saralash 1', source: 'championship' },
  { stage: 'ch-q2', teams: 12, round: 3, label: 'Championship saralash 2', source: null },
  { stage: 'r16', teams: 16, round: 4, label: '1/8 final', source: null },
  { stage: 'qf', teams: 8, round: 5, label: '1/4 final', source: null },
  { stage: 'sf', teams: 4, round: 6, label: 'Yarim final', source: null },
  { stage: 'final', teams: 2, round: 7, label: 'Final', source: null },
];

const byStage = (s) => STAGES.find((x) => x.stage === s) || null;
const order = (s) => STAGES.findIndex((x) => x.stage === s);
const nextStage = (s) => STAGES[order(s) + 1] || null;

// Tasodifiy juftlash (Fisher–Yates, crypto bilan)
function pair(teams) {
  const a = FX.shuffle(teams);
  const out = [];
  for (let i = 0; i + 1 < a.length; i += 2) out.push({ home: a[i], away: a[i + 1] });
  return out;
}

async function doc(season, stage, create) {
  const meta = byStage(stage);
  if (!meta) return null;
  const q = { season, cup: CUP, stage };
  let d = await Cup.findOne(q);
  if (!d && create) d = await Cup.create({ ...q, round: meta.round });
  return d;
}

// Tasdiqlangan o'yinlardan g'oliblar (durang — g'olib yo'q, qayta o'ynaladi)
async function winners(season, stage) {
  const meta = byStage(stage);
  if (!meta) return [];
  const ms = await Match.find({ season, league: CUP, round: meta.round, status: 'confirmed' }).lean();
  const out = [];
  for (const m of ms) {
    if (m.hg == null || m.ag == null || m.hg === m.ag) continue;
    out.push(m.hg > m.ag ? m.home : m.away);
  }
  return out;
}

// Bosqich ishtirokchilari: ligadan yoki oldingi bosqich g'oliblaridan
async function stageTeams(season, meta) {
  if (meta.source) {
    const regs = await Registration.find({ season, league: meta.source }).lean();
    return regs.map((r) => r.telegramId);
  }
  const prev = STAGES[order(meta.stage) - 1];
  return prev ? winners(season, prev.stage) : [];
}

// ——— Qura (atomik lock bilan — ikki marta bosilsa ham bir marta ishlaydi) ———
async function draw(season, stage) {
  const meta = byStage(stage);
  if (!meta) return { error: 'stage' };

  let lock;
  try {
    lock = await Cup.findOneAndUpdate(
      { season, cup: CUP, stage, drawnAt: null },
      { $set: { drawnAt: new Date(), round: meta.round } },
      { upsert: true, new: true }
    );
  } catch (e) {
    if (e.code === 11000) return { error: 'drawn' };
    throw e;
  }

  const unlock = () => Cup.updateOne({ _id: lock._id }, { $set: { drawnAt: null } }).catch(() => { });

  const teams = lock.teams && lock.teams.length ? lock.teams : await stageTeams(season, meta);
  if (teams.length < 2) { await unlock(); return { error: 'few' }; }

  try {
    const pairs = pair(teams);
    await Match.deleteMany({ season, league: CUP, round: meta.round });
    await Match.insertMany(pairs.map((p) => ({
      league: CUP, season, round: meta.round, home: p.home, away: p.away, status: 'scheduled',
    })));
    await Cup.updateOne({ _id: lock._id }, { $set: { teams, drawAt: null } });
    return { ok: true, matches: pairs.length, teams: teams.length };
  } catch (e) {
    await unlock();
    throw e;
  }
}

// ——— Tur starti + dedlayn (soatlarda) ———
async function start(season, stage, deadlineHours) {
  // Community Shield alohida hujjatda saqlanadi (cup: 'shield')
  if (stage === 'shield') {
    const d = await Cup.findOne({ season, cup: 'shield', stage: 'shield' });
    if (!d) return { error: 'nodraw' };
    const now = new Date();
    d.startedAt = now;
    d.deadline = Number(deadlineHours) > 0 ? new Date(now.getTime() + Number(deadlineHours) * 3600000) : null;
    await d.save();
    return { ok: true, startedAt: d.startedAt, deadline: d.deadline };
  }

  const d = await doc(season, stage, true);
  if (!d) return { error: 'stage' };
  if (!d.drawnAt) return { error: 'nodraw' };
  const now = new Date();
  d.startedAt = now;
  d.deadline = Number(deadlineHours) > 0 ? new Date(now.getTime() + Number(deadlineHours) * 3600000) : null;
  await d.save();
  return { ok: true, startedAt: d.startedAt, deadline: d.deadline };
}

// ——— Keyingi bosqichga o'tish (g'oliblar + kech qo'shilganlar) ———
async function advance(season, stage) {
  const meta = byStage(stage);
  const nx = nextStage(stage);
  if (!meta) return { error: 'stage' };
  if (!nx) return { error: 'last' };

  const w = await winners(season, stage);
  if (!w.length) return { error: 'none' };

  const d = await doc(season, stage);
  if (d) { d.winners = w; await d.save(); }

  const nd = await doc(season, nx.stage, true);
  const extra = (nd.teams || []).filter((id) => !w.includes(id)); // kech qo'shilganlar saqlanadi
  nd.teams = [...w, ...extra];
  await nd.save();
  return { ok: true, teams: nd.teams.length, next: nx.stage, winners: w.length, extra: extra.length };
}

// ——— Ligaga keyin qo'shilgan o'yinchi ———
// Qura hali o'tmagan: hech narsa kerak emas (teams Registration'dan olinadi).
// Qura o'tgan: saralashni o'tkazib yuboradi va keyingi bosqichga qo'shiladi.
async function onLeagueAdd(season, leagueId, telegramId) {
  const map = { 'premier-league': 'pl-q', championship: 'ch-q1' };
  const stage = map[leagueId];
  if (!stage) return null;

  const d = await doc(season, stage);
  if (!d || !d.drawnAt) return null;

  const nx = nextStage(stage);
  if (!nx) return null;

  const nd = await doc(season, nx.stage, true);
  if (!nd.teams.includes(telegramId)) {
    nd.teams.push(telegramId);
    await nd.save();
  }
  return 'skipqual';
}

// ——— Holat (UI uchun) ———
async function state(season, uid) {
  const docs = await Cup.find({ season, cup: CUP }).lean();
  const map = new Map(docs.map((d) => [d.stage, d]));

  const agg = await Match.aggregate([
    { $match: { season, league: CUP } },
    { $group: { _id: { round: '$round', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const cnt = (round) => {
    const row = { total: 0, confirmed: 0, pending: 0 };
    agg.filter((a) => a._id.round === round).forEach((a) => {
      row.total += a.n;
      if (a._id.status === 'confirmed') row.confirmed += a.n;
      else if (a._id.status === 'pending' || a._id.status === 'disputed') row.pending += a.n;
    });
    return row;
  };

  const now = new Date();
  const myMatches = uid
    ? (await Match.find({ season, league: CUP, status: { $ne: 'cancelled' }, $or: [{ home: uid }, { away: uid }] })
      .sort({ round: 1 }).lean())
              .map((m) => ({
          id: String(m._id), round: m.round, status: m.status,
          home: m.home, away: m.away, hg: m.hg, ag: m.ag, mine: m.home === uid,
          byMe: m.reportedBy === uid,          // ← qo'shildi
        }))
    : [];

  // ⬇️⬇️ QO'SHILADI: raqib klubini aniqlash
  if (myMatches.length) {
    const oppIds = [...new Set(myMatches.flatMap((m) => [m.home, m.away]).filter((id) => id !== uid))];
    const regs = await Registration.find({ season, telegramId: { $in: oppIds } }).lean();
    const clubOf = new Map(regs.map((r) => [r.telegramId, { league: r.league, club: r.club }]));
    myMatches.forEach((m) => {
      const oid = m.mine ? m.away : m.home;
      const c = clubOf.get(oid);
      m.oppLeague = c?.league || null;
      m.oppClub = c?.club || null;
    });
  }
  // ⬆️⬆️
  const sh = await Cup.findOne({ season, cup: 'shield', stage: 'shield' }).lean();
  return {
    cup: CUP,
    stages: STAGES.map((s, i) => {
      const d = map.get(s.stage) || {};
      const c = cnt(s.round);
      return {
        stage: s.stage, round: s.round, label: s.label, index: i,
        teams: (d.teams || []).length,
        winners: (d.winners || []).length,
        drawAt: d.drawAt || null,
        drawnAt: d.drawnAt || null,
        startedAt: d.startedAt || null,
        deadline: d.deadline || null,
        matches: c.total, confirmed: c.confirmed, pending: c.pending,
        drawn: !!d.drawnAt,
        open: !!(d.startedAt && (!d.deadline || new Date(d.deadline) > now)),
      };
    }),
    myMatches,
    shield: sh ? {
      ready: true, teams: (sh.teams || []).length,
       startedAt: sh.startedAt || null, deadline: sh.deadline || null,
       drawnAt: sh.drawnAt || null, round: sh.round || 8,
     } : null,
  };
}

module.exports = {
  CUP, STAGES, byStage, order, nextStage,
  pair, winners, stageTeams,
  draw, start, advance, onLeagueAdd, state, shield,
};

// ——— Community Shield: 2 finalist aniq bo'lganda avtomatik juftlik ———
// Shart: FA Cup finali tasdiqlangan + Premier Liga to'liq yakunlangan
async function shield(season) {
  const finalDoc = await doc(season, 'final');
  const cupWinners = await winners(season, 'final');
  if (!finalDoc || !cupWinners.length) return { ready: false, error: 'finalists_unknown' };

  // Premier Liga tugaganmi?
  const left = await Match.countDocuments({ season, league: 'premier-league', status: { $in: ['scheduled', 'pending', 'disputed'] } });
  if (left > 0) return { ready: false, error: 'pl_not_finished', left };

  const plTop = await Registration.find({ season, league: 'premier-league' }).sort({ pts: -1, gf: -1, ga: 1 }).limit(1).lean();
  const plWin = plTop[0]?.telegramId;
  const cupWin = cupWinners[0];
  if (!plWin) return { ready: false, error: 'finalists_unknown' };

  if (plWin === cupWin) {
    await Cup.updateOne({ season, cup: 'shield', stage: 'shield' },
      { $set: { drawnAt: new Date(), teams: [plWin], winners: [plWin], round: 8 } }, { upsert: true });
    return { ready: true, autoWinner: plWin };
  }

  const exist = await Match.exists({ season, league: 'fa-cup', round: 8 });
  if (!exist) {
    await Match.create({ league: 'fa-cup', season, round: 8, home: plWin, away: cupWin, status: 'scheduled' });
  }
  await Cup.updateOne({ season, cup: 'shield', stage: 'shield' },
    { $set: { drawnAt: new Date(), teams: [plWin, cupWin], round: 8 } }, { upsert: true });
  return { ready: true, home: plWin, away: cupWin };
}