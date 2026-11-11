'use strict';

/* ============================================================================
   Kubok (FA Cup / Copa del Rey) — saralash + pley-off menejeri

   Bosqichlar (ikkala kubokda bir xil):
     pl-q    1-liga saralash   20 → 10   (Premier Liga / LaLiga)
     ch-q1   2-liga saralash 1  → yarmi  (Championship / LaLiga 2)
     ch-q2   2-liga saralash 2  → yarmi  (toq bo'lsa bitta klub o'yinsiz o'tadi)
     r16     1/8 final (10 + 6 = 16) 16 → 8
     qf      1/4 final                8 →  4
     sf      Yarim final              4 →  2
     final   Final                    2 →  1
   Supercup (Community Shield / Supercopa): 1-liga g'olibi va kubok g'olibi (8-tur).

   O'yinlar mavjud `Match` modeliga yoziladi (league: kubok id si),
   shu sababli room ID, chat, natija kiritish — hammasi avtomatik ishlaydi.
   ========================================================================== */

const Cup = require('../models/Cup');
const Match = require('../models/Match');
const Registration = require('../models/Registration');
const User = require('../models/User');
const FX = require('../fixtures');

// Kubok oilalari: har bir davlat uchun bir xil tuzilma
const FAMILIES = {
  'fa-cup': { id: 'fa-cup', name: 'FA Cup', shieldKey: 'shield', shieldId: 'community-shield', shieldName: 'Community Shield', l1: 'premier-league', l2: 'championship', n1: 'Premier Liga', n2: 'Championship' },
  'copa-del-rey': { id: 'copa-del-rey', name: 'Copa del Rey', shieldKey: 'supercopa-shield', shieldId: 'supercopa', shieldName: 'Supercopa de España', l1: 'laliga', l2: 'laliga-2', n1: 'LaLiga', n2: 'LaLiga 2' },
};
const CUP = 'fa-cup';   // standart (eski kod bilan moslik)
const fam = (id) => FAMILIES[id] || FAMILIES[CUP];
const familyOfKey = (k) => Object.values(FAMILIES).find((f) => f.id === k || f.shieldKey === k || f.shieldId === k) || null;
const familyOfLeague = (lg) => Object.values(FAMILIES).find((f) => f.l1 === lg || f.l2 === lg) || null;

const stagesOf = (cupId) => {
  const f = fam(cupId);
  return [
    { stage: 'pl-q', teams: 20, round: 1, label: `${f.n1} saralash`, source: f.l1, next: 'r16' },   // 1-liga g'oliblari to'g'ridan-to'g'ri 1/8 finalga o'tadi
    { stage: 'ch-q1', teams: 24, round: 2, label: `${f.n2} saralash 1`, source: f.l2 },
    { stage: 'ch-q2', teams: 12, round: 3, label: `${f.n2} saralash 2`, source: null },
    { stage: 'r16', teams: 16, round: 4, label: '1/8 final', source: null },
    { stage: 'qf', teams: 8, round: 5, label: '1/4 final', source: null },
    { stage: 'sf', teams: 4, round: 6, label: 'Yarim final', source: null },
    { stage: 'final', teams: 2, round: 7, label: 'Final', source: null },
  ];
};
const STAGES = stagesOf(CUP);

const byStage = (s, cupId = CUP) => stagesOf(cupId).find((x) => x.stage === s) || null;
const order = (s, cupId = CUP) => stagesOf(cupId).findIndex((x) => x.stage === s);
const nextStage = (s, cupId = CUP) => { const m = byStage(s, cupId); return (m && m.next ? byStage(m.next, cupId) : stagesOf(cupId)[order(s, cupId) + 1]) || null; };

// Foydalanuvchining ligasiga qarab qaysi kubok oilasi (ligasi yo'q bo'lsa — standart)
async function cupIdFor(season, uid) {
  if (!uid) return CUP;
  const r = await Registration.findOne({ season, telegramId: uid }).select('league').lean();
  return (r && familyOfLeague(r.league)?.id) || CUP;
}

// Tasodifiy juftlash (Fisher–Yates, crypto bilan)
function pair(teams) {
  const a = FX.shuffle(teams);
  const out = [];
  for (let i = 0; i + 1 < a.length; i += 2) out.push({ home: a[i], away: a[i + 1] });
  return out;
}

async function doc(season, stage, create, cupId = CUP) {
  const meta = byStage(stage, cupId);
  if (!meta) return null;
  const q = { season, cup: cupId, stage };
  let d = await Cup.findOne(q);
  if (!d && create) d = await Cup.create({ ...q, round: meta.round });
  return d;
}

// Tasdiqlangan o'yinlardan g'oliblar (durang — g'olib yo'q, qayta o'ynaladi) + o'yinsiz o'tganlar (toq son)
async function winners(season, stage, cupId = CUP) {
  const meta = byStage(stage, cupId);
  if (!meta) return [];
  const ms = await Match.find({ season, league: cupId, round: meta.round, status: 'confirmed' }).lean();
  const out = [];
  for (const m of ms) {
    if (m.hg == null || m.ag == null || m.hg === m.ag) continue;
    out.push(m.hg > m.ag ? m.home : m.away);
  }
  const d = await Cup.findOne({ season, cup: cupId, stage }).select('byes').lean();
  (d?.byes || []).forEach((id) => { if (!out.includes(id)) out.push(id); });
  return out;
}

// Bosqich ishtirokchilari: ligadan yoki oldingi bosqich g'oliblaridan
async function stageTeams(season, meta, cupId = CUP) {
  if (meta.source) {
    const regs = await Registration.find({ season, league: meta.source }).lean();
    return regs.filter((r) => !r.vacant).map((r) => r.telegramId);
  }
  const prev = stagesOf(cupId)[order(meta.stage, cupId) - 1];
  return prev ? winners(season, prev.stage, cupId) : [];
}

// ——— Qura (atomik lock bilan — ikki marta bosilsa ham bir marta ishlaydi) ———
async function draw(season, stage, cupId = CUP) {
  const meta = byStage(stage, cupId);
  if (!meta) return { error: 'stage' };

  let lock;
  try {
    lock = await Cup.findOneAndUpdate(
      { season, cup: cupId, stage, drawnAt: null },
      { $set: { drawnAt: new Date(), round: meta.round } },
      { upsert: true, new: true }
    );
  } catch (e) {
    if (e.code === 11000) return { error: 'drawn' };
    throw e;
  }

  const unlock = () => Cup.updateOne({ _id: lock._id }, { $set: { drawnAt: null } }).catch(() => { });

  const teams = lock.teams && lock.teams.length ? lock.teams : await stageTeams(season, meta, cupId);
  if (teams.length < 2) { await unlock(); return { error: 'few' }; }

  try {
    const pairs = pair(teams);
    const paired = new Set(pairs.flatMap((p) => [p.home, p.away]));
    const byes = teams.filter((id) => !paired.has(id));   // toq son: bittasi o'yinsiz keyingi bosqichga o'tadi
    await Match.deleteMany({ season, league: cupId, round: meta.round });
    const lastCupM = await Match.findOne({ season, league: cupId }).sort({ matchNo: -1 }).select('matchNo').lean();
    let curCupNo = (lastCupM && lastCupM.matchNo) ? lastCupM.matchNo : 0;
    await Match.insertMany(pairs.map((p) => ({
      league: cupId, season, round: meta.round, home: p.home, away: p.away, status: 'scheduled', matchNo: ++curCupNo,
    })));
    await Cup.updateOne({ _id: lock._id }, { $set: { teams, byes, drawAt: null } });
    return { ok: true, matches: pairs.length, teams: teams.length, byes: byes.length };
  } catch (e) {
    await unlock();
    throw e;
  }
}

// ——— Tur starti + dedlayn (soatlarda) ———
async function start(season, stage, deadlineHours, cupId = CUP) {
  const f = fam(cupId);
  // Supercup (Community Shield / Supercopa) alohida hujjatda saqlanadi
  if (stage === 'shield') {
    const d = await Cup.findOne({ season, cup: f.shieldKey, stage: 'shield' });
    if (!d) return { error: 'nodraw' };
    const now = new Date();
    d.startedAt = now;
    d.deadline = Number(deadlineHours) > 0 ? new Date(now.getTime() + Number(deadlineHours) * 3600000) : null;
    await d.save();
    return { ok: true, startedAt: d.startedAt, deadline: d.deadline };
  }

  const d = await doc(season, stage, true, cupId);
  if (!d) return { error: 'stage' };
  if (!d.drawnAt) return { error: 'nodraw' };
  const now = new Date();
  d.startedAt = now;
  d.deadline = Number(deadlineHours) > 0 ? new Date(now.getTime() + Number(deadlineHours) * 3600000) : null;
  await d.save();
  return { ok: true, startedAt: d.startedAt, deadline: d.deadline };
}

// ——— Keyingi bosqichga o'tish (g'oliblar + kech qo'shilganlar) ———
async function advance(season, stage, cupId = CUP) {
  const meta = byStage(stage, cupId);
  const nx = nextStage(stage, cupId);
  if (!meta) return { error: 'stage' };
  if (!nx) return { error: 'last' };

  const w = await winners(season, stage, cupId);
  if (!w.length) return { error: 'none' };

  const d = await doc(season, stage, false, cupId);
  if (d) { d.winners = w; await d.save(); }

  const nd = await doc(season, nx.stage, true, cupId);
  const extra = (nd.teams || []).filter((id) => !w.includes(id)); // kech qo'shilganlar saqlanadi
  nd.teams = [...w, ...extra];
  await nd.save();
  return { ok: true, teams: nd.teams.length, next: nx.stage, winners: w.length, extra: extra.length };
}

// ——— Ligaga keyin qo'shilgan o'yinchi ———
// Qura hali o'tmagan: hech narsa kerak emas (teams Registration'dan olinadi).
// Qura o'tgan: saralashni o'tkazib yuboradi va keyingi bosqichga qo'shiladi.
async function onLeagueAdd(season, leagueId, telegramId) {
  const f = familyOfLeague(leagueId);
  if (!f) return null;
  const stage = leagueId === f.l1 ? 'pl-q' : 'ch-q1';

  const d = await doc(season, stage, false, f.id);
  if (!d || !d.drawnAt) return null;

  const nx = nextStage(stage, f.id);
  if (!nx) return null;

  const nd = await doc(season, nx.stage, true, f.id);
  if (!nd.teams.includes(telegramId)) {
    nd.teams.push(telegramId);
    await nd.save();
  }
  return 'skipqual';
}

// ——— Holat (UI uchun) ———
async function state(season, uid, cupIdArg) {
  const cupId = cupIdArg || await cupIdFor(season, uid);
  const f = fam(cupId);
  const STG = stagesOf(f.id);
  const docs = await Cup.find({ season, cup: f.id }).lean();
  const map = new Map(docs.map((d) => [d.stage, d]));

  const agg = await Match.aggregate([
    { $match: { season, league: f.id } },
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
    ? (await Match.find({ season, league: f.id, status: { $ne: 'cancelled' }, $or: [{ home: uid }, { away: uid }] })
      .sort({ round: 1 }).lean())
      .map((m) => ({
        id: String(m._id), round: m.round, status: m.status,
        home: m.home, away: m.away, hg: m.hg, ag: m.ag, mine: m.home === uid,
        byMe: m.reportedBy === uid,
      }))
    : [];

  // Raqib klubini aniqlash
  if (myMatches.length) {
    const oppIds = [...new Set(myMatches.flatMap((m) => [m.home, m.away]).filter((id) => id !== uid))];
    const regs = await Registration.find({ season, telegramId: { $in: oppIds } }).lean();
    const clubOf = new Map(regs.map((r) => [r.telegramId, { league: r.league, club: r.club }]));
    const us = await User.find({ telegramId: { $in: oppIds } }).lean();
    const uOf = new Map(us.map((x) => [x.telegramId, x]));
    myMatches.forEach((m) => {
      const oid = m.mine ? m.away : m.home;
      const c = clubOf.get(oid), x = uOf.get(oid);
      m.oppLeague = c?.league || null;
      m.oppClub = c?.club || null;
      m.oppUser = x ? (x.username ? '@' + x.username : x.firstName || '') : '';
      m.oppTg = x?.username || '';
    });
  }
  const sh = await Cup.findOne({ season, cup: f.shieldKey, stage: 'shield' }).lean();
  return {
    cup: f.id, cupName: f.name, shieldName: f.shieldName, shieldId: f.shieldId,
    stages: STG.map((s, i) => {
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

// ——— Supercup (Community Shield / Supercopa): 2 finalist aniq bo'lganda avtomatik juftlik ———
// Shart: kubok finali tasdiqlangan + 1-liga to'liq yakunlangan
async function shield(season, cupId = CUP) {
  const f = fam(cupId);
  const finalDoc = await doc(season, 'final', false, f.id);
  const cupWinners = await winners(season, 'final', f.id);
  if (!finalDoc || !cupWinners.length) return { ready: false, error: 'finalists_unknown' };

  // 1-liga tugaganmi?
  const left = await Match.countDocuments({ season, league: f.l1, status: { $in: ['scheduled', 'pending', 'disputed'] } });
  if (left > 0) return { ready: false, error: 'pl_not_finished', left };

  const plTop = await Registration.find({ season, league: f.l1 }).sort({ pts: -1, gf: -1, ga: 1 }).limit(1).lean();
  const plWin = plTop[0]?.telegramId;
  const cupWin = cupWinners[0];
  if (!plWin) return { ready: false, error: 'finalists_unknown' };

  if (plWin === cupWin) {
    await Cup.updateOne({ season, cup: f.shieldKey, stage: 'shield' },
      { $set: { drawnAt: new Date(), teams: [plWin], winners: [plWin], round: 8 } }, { upsert: true });
    return { ready: true, autoWinner: plWin };
  }

  const exist = await Match.exists({ season, league: f.id, round: 8 });
  if (!exist) {
    const lastShieldM = await Match.findOne({ season, league: f.id }).sort({ matchNo: -1 }).select('matchNo').lean();
    const curShieldNo = ((lastShieldM && lastShieldM.matchNo) ? lastShieldM.matchNo : 0) + 1;
    await Match.create({ league: f.id, season, round: 8, home: plWin, away: cupWin, status: 'scheduled', matchNo: curShieldNo });
  }
  await Cup.updateOne({ season, cup: f.shieldKey, stage: 'shield' },
    { $set: { drawnAt: new Date(), teams: [plWin, cupWin], round: 8 } }, { upsert: true });
  return { ready: true, home: plWin, away: cupWin };
}

module.exports = {
  CUP, FAMILIES, fam, familyOfKey, familyOfLeague, cupIdFor, stagesOf,
  STAGES, byStage, order, nextStage,
  pair, winners, stageTeams,
  draw, start, advance, onLeagueAdd, state, shield,
};
