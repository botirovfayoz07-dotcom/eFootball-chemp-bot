'use strict';

const mongoose = require('mongoose');
const { Markup } = require('telegraf');
const Tournament = require('./models/Tournament');
const TournamentPlayer = require('./models/TournamentPlayer');
const TournamentMatch = require('./models/TournamentMatch');
const User = require('./models/User');
const { roundRobin, standings, parseScore, clampInt } = require('./lib/tournament');

module.exports = function registerPrivateRoutes(app, { tgUser, bot, miniAppUrl, adminIds = [] }) {
  const ADMIN_IDS = new Set(adminIds.map(Number).filter(Number.isFinite));
  const isAdmin = (id) => ADMIN_IDS.has(Number(id));
  const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const oid = (v) => (mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null);
  const clean = (v, max) => String(v ?? '').trim().slice(0, max);
  const displayName = (u) =>
    [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || (u.username ? '@' + u.username : 'Ishtirokchi');
  const canManage = (t, u) => isAdmin(u.id) || Number(t.createdBy) === Number(u.id);

  const appUrl = (tournamentId) => {
    const base = String(miniAppUrl || '').replace(/#.*$/, '');
    if (!base) return null;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}lang=uz#private/${tournamentId}`;
  };

  function sendTg(telegramId, text, tournamentId) {
    if (!telegramId || !bot) return;
    const url = appUrl(tournamentId);
    const extra = url ? Markup.inlineKeyboard([[Markup.button.webApp('⚽ Ilovani ochish', url)]]) : undefined;
    Promise.resolve(bot.telegram.sendMessage(Number(telegramId), text, extra)).catch(() => {});
  }

  function notifyAdmins(t, text) {
    const ids = new Set([...ADMIN_IDS, Number(t.createdBy)].filter(Number.isFinite));
    ids.forEach((id) => sendTg(id, text, t._id));
  }

  const scoreText = (m) => `${m.homeScore ?? '—'}:${m.awayScore ?? '—'}`;

  async function getTournament(id) {
    const _id = oid(id);
    if (!_id) return null;
    return Tournament.findById(_id);
  }

  async function getPlayer(tournamentId, telegramId) {
    return TournamentPlayer.findOne({ tournament: tournamentId, telegramId: Number(telegramId) });
  }

  function matchDto(m) {
    return {
      id: String(m._id),
      round: m.round,
      homeId: String(m.home),
      awayId: String(m.away),
      scheduledAt: m.scheduledAt || null,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      submittedById: m.submittedById ? String(m.submittedById) : null,
      submittedAt: m.submittedAt || null,
      confirmedAt: m.confirmedAt || null,
      resultSource: m.resultSource || null,
      disputeReason: m.disputeReason || '',
      disputedAt: m.disputedAt || null,
      createdAt: m.createdAt || null,
    };
  }

  function playerDto(p, viewer, manage) {
    return {
      id: String(p._id),
      name: p.name,
      username: p.username || '',
      club: p.club || '',
      isMe: Number(p.telegramId) === Number(viewer.id),
      ...(manage || Number(p.telegramId) === Number(viewer.id) ? { telegramId: p.telegramId ?? null } : {}),
    };
  }

  // ——— Ro'yxat ———
  app.get('/api/private', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const tournaments = await Tournament.find().sort({ createdAt: -1 }).limit(60).lean();
    const ids = tournaments.map((t) => t._id);
    const [counts, matchCounts, pending, mine] = await Promise.all([
      TournamentPlayer.aggregate([{ $match: { tournament: { $in: ids } } }, { $group: { _id: '$tournament', n: { $sum: 1 } } }]),
      TournamentMatch.aggregate([{ $match: { tournament: { $in: ids } } }, { $group: { _id: '$tournament', n: { $sum: 1 } } }]),
      TournamentMatch.aggregate([
        { $match: { tournament: { $in: ids }, status: { $in: ['pending', 'disputed'] } } },
        { $group: { _id: '$tournament', n: { $sum: 1 } } },
      ]),
      TournamentPlayer.find({ telegramId: Number(u.id), tournament: { $in: ids } }).lean(),
    ]);
    const n = (rows) => new Map(rows.map((r) => [String(r._id), r.n]));
    const cPlayers = n(counts), cMatches = n(matchCounts), cPending = n(pending);
    const myMap = new Map(mine.map((p) => [String(p.tournament), p]));
    res.json({
      admin: isAdmin(u.id),
      tournaments: tournaments.map((t) => ({
        id: String(t._id),
        name: t.name,
        status: t.status,
        maxPlayers: t.maxPlayers,
        players: cPlayers.get(String(t._id)) || 0,
        matches: cMatches.get(String(t._id)) || 0,
        pending: cPending.get(String(t._id)) || 0,
        canManage: canManage(t, u),
        joined: myMap.has(String(t._id)),
        createdAt: t.createdAt,
      })),
    });
  }));

  // ——— Yangi turnir (tashkilotchi avtomatik ishtirokchi bo'ladi) ———
  app.post('/api/private', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const name = clean(req.body?.name, 60);
    if (name.length < 2) return res.status(400).json({ error: 'name' });
    const maxPlayers = clampInt(req.body?.maxPlayers, 2, 32, 8);
    if ((await Tournament.countDocuments({ createdBy: Number(u.id), status: { $ne: 'finished' } })) >= 5) {
      return res.status(409).json({ error: 'limit' });
    }
    const t = await Tournament.create({ name, maxPlayers, createdBy: Number(u.id) });
    await TournamentPlayer.create({
      tournament: t._id,
      telegramId: Number(u.id),
      name: displayName(u),
      username: u.username || '',
      addedBy: Number(u.id),
    });
    res.status(201).json({ ok: true, id: String(t._id) });
  }));

  // ——— Bitta turnir: jadval, o'yinlar, ishtirokchilar ———
  app.get('/api/private/:id', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    const [players, matches] = await Promise.all([
      TournamentPlayer.find({ tournament: t._id }).sort({ createdAt: 1 }).lean(),
      TournamentMatch.find({ tournament: t._id }).sort({ round: 1, scheduledAt: 1, createdAt: 1 }).lean(),
    ]);
    const manage = canManage(t, u);
    const mePlayer = players.find((p) => Number(p.telegramId) === Number(u.id)) || null;
    res.json({
      tournament: {
        id: String(t._id),
        name: t.name,
        status: t.status,
        maxPlayers: t.maxPlayers,
        startsAt: t.startsAt || null,
        createdAt: t.createdAt,
        canManage: manage,
        createdByMe: Number(t.createdBy) === Number(u.id),
      },
      me: {
        id: Number(u.id),
        name: displayName(u),
        admin: isAdmin(u.id),
        playerId: mePlayer ? String(mePlayer._id) : null,
      },
      players: players.map((p) => playerDto(p, u, manage)),
      matches: matches.map(matchDto),
      table: standings(players, matches),
    });
  }));

  // ——— Ishtirokchi qo'shish (admin) ———
  app.post('/api/private/:id/players', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!canManage(t, u)) return res.status(403).json({ error: 'forbidden' });
    if (t.status === 'finished') return res.status(409).json({ error: 'finished' });
    const count = await TournamentPlayer.countDocuments({ tournament: t._id });
    if (count >= t.maxPlayers) return res.status(409).json({ error: 'full' });

    const query = clean(req.body?.query, 80);
    let typedName = clean(req.body?.name, 80);
    const club = clean(req.body?.club, 60);
    if (!query && !typedName) return res.status(400).json({ error: 'empty' });

    let telegramId = null, username = '', lookedUp = null;
    if (query) {
      if (query.startsWith('@') || /^\d+$/.test(query)) {
        const rx = query.startsWith('@')
          ? new RegExp('^' + query.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
          : null;
        lookedUp = await User.findOne(rx ? { username: rx } : { telegramId: Number(query) }).lean();
        if (lookedUp) {
          telegramId = Number(lookedUp.telegramId);
          username = lookedUp.username || '';
          if (!typedName) typedName = [lookedUp.firstName, lookedUp.lastName].filter(Boolean).join(' ').trim() || (username ? '@' + username : '');
        } else if (!typedName) {
          return res.status(404).json({ error: 'user_not_found' });
        }
      } else if (!typedName) {
        typedName = query;
      }
    }
    if (!typedName) return res.status(400).json({ error: 'empty' });
    if (telegramId && await TournamentPlayer.exists({ tournament: t._id, telegramId })) {
      return res.status(409).json({ error: 'already' });
    }
    try {
      const p = await TournamentPlayer.create({
        tournament: t._id, telegramId, name: typedName, username, club, addedBy: Number(u.id),
      });
      res.status(201).json({ ok: true, id: String(p._id) });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ error: 'already' });
      throw e;
    }
  }));

  // ——— Ishtirokchini o'yindan chiqarish (admin) ———
  app.delete('/api/private/:id/players/:pid', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!canManage(t, u)) return res.status(403).json({ error: 'forbidden' });
    const pid = oid(req.params.pid);
    const p = pid && await TournamentPlayer.findOne({ _id: pid, tournament: t._id });
    if (!p) return res.status(404).json({ error: 'not_found' });
    const removed = await TournamentMatch.deleteMany({ tournament: t._id, $or: [{ home: p._id }, { away: p._id }] });
    await p.deleteOne();
    if ((await TournamentPlayer.countDocuments({ tournament: t._id })) === 0) {
      await Tournament.updateOne({ _id: t._id }, { status: 'draft', startsAt: null });
    }
    res.json({ ok: true, removedMatches: removed.deletedCount });
  }));

  // ——— Qur'a tashlash va o'yin vaqtlarini belgilash ———
  app.post('/api/private/:id/draw', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!canManage(t, u)) return res.status(403).json({ error: 'forbidden' });
    if (t.status === 'finished') return res.status(409).json({ error: 'finished' });
    const players = await TournamentPlayer.find({ tournament: t._id }).lean();
    if (players.length < 2) return res.status(409).json({ error: 'not_enough' });
    const existing = await TournamentMatch.countDocuments({ tournament: t._id });
    if (existing && !req.body?.reset) return res.status(409).json({ error: 'has_matches' });
    if (existing) await TournamentMatch.deleteMany({ tournament: t._id });

    const start = req.body?.startAt ? new Date(req.body.startAt) : new Date(Date.now() + 3600 * 1000);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'time' });
    const interval = clampInt(req.body?.intervalMinutes, 10, 1440, 60);
    const pairs = roundRobin(players);
    const docs = pairs.map((p) => ({
      tournament: t._id,
      round: p.round,
      home: p.homeId,
      away: p.awayId,
      scheduledAt: new Date(start.getTime() + (p.round - 1) * interval * 60000),
      status: 'scheduled',
    }));
    await TournamentMatch.insertMany(docs);
    await Tournament.updateOne({ _id: t._id }, { status: 'live', startsAt: start, finishedAt: null });
    res.json({ ok: true, matches: docs.length, rounds: Math.max(...pairs.map((p) => p.round)) });
  }));

  // ——— Qo'lda o'yin qo'shish (kech qo'shilgan ishtirokchi uchun ham) ———
  app.post('/api/private/:id/matches', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!canManage(t, u)) return res.status(403).json({ error: 'forbidden' });
    if (t.status === 'finished') return res.status(409).json({ error: 'finished' });
    const home = oid(req.body?.homeId), away = oid(req.body?.awayId);
    if (!home || !away || String(home) === String(away)) return res.status(400).json({ error: 'pair' });
    const players = await TournamentPlayer.find({ tournament: t._id, _id: { $in: [home, away] } }).lean();
    if (players.length !== 2) return res.status(400).json({ error: 'pair' });
    if (await TournamentMatch.exists({
      tournament: t._id,
      $or: [{ home, away }, { home: away, away: home }],
    })) return res.status(409).json({ error: 'pair_exists' });

    const scheduledAt = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return res.status(400).json({ error: 'time' });
    const last = await TournamentMatch.findOne({ tournament: t._id }).sort({ round: -1 }).select('round').lean();
    const round = clampInt(req.body?.round, 1, 99, (last?.round || 0) + 1);
    const m = await TournamentMatch.create({ tournament: t._id, round, home, away, scheduledAt, status: 'scheduled' });
    if (t.status === 'draft') await Tournament.updateOne({ _id: t._id }, { status: 'live' });
    res.status(201).json({ ok: true, id: String(m._id) });
  }));

  // ——— O'yin vaqtini o'zgartirish ———
  app.patch('/api/private/:id/matches/:mid', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!canManage(t, u)) return res.status(403).json({ error: 'forbidden' });
    const mid = oid(req.params.mid);
    const m = mid && await TournamentMatch.findOne({ _id: mid, tournament: t._id });
    if (!m) return res.status(404).json({ error: 'not_found' });
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'scheduledAt')) {
      if (!req.body.scheduledAt) m.scheduledAt = null;
      else {
        const d = new Date(req.body.scheduledAt);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'time' });
        m.scheduledAt = d;
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'round')) {
      m.round = clampInt(req.body.round, 1, 99, m.round);
    }
    await m.save();
    res.json({ ok: true });
  }));

  app.delete('/api/private/:id/matches/:mid', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!canManage(t, u)) return res.status(403).json({ error: 'forbidden' });
    const mid = oid(req.params.mid);
    const r = mid && await TournamentMatch.deleteOne({ _id: mid, tournament: t._id });
    if (!r || !r.deletedCount) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  }));

  // ——— O'yinchi hisob kiritadi ———
  app.post('/api/private/:id/matches/:mid/submit', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (t.status === 'finished') return res.status(409).json({ error: 'finished' });
    const me = await getPlayer(t._id, u.id);
    if (!me) return res.status(403).json({ error: 'forbidden' });
    const mid = oid(req.params.mid);
    const m = mid && await TournamentMatch.findOne({ _id: mid, tournament: t._id });
    if (!m) return res.status(404).json({ error: 'not_found' });
    if (String(m.home) !== String(me._id) && String(m.away) !== String(me._id)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (m.status === 'confirmed') return res.status(409).json({ error: 'confirmed' });
    if (m.status === 'pending') return res.status(409).json({ error: 'pending' });
    // Nizo bo'lgandan keyin hisobni faqat admin kiritadi (o'yinchi qayta yubora olmaydi)
    if (m.status === 'disputed') return res.status(409).json({ error: 'disputed' });
    const hs = parseScore(req.body?.homeScore), as = parseScore(req.body?.awayScore);
    if (hs === null || as === null) return res.status(400).json({ error: 'score' });

    m.homeScore = hs; m.awayScore = as;
    m.status = 'pending';
    m.submittedById = me._id;
    m.submittedBy = Number(u.id);
    m.submittedAt = new Date();
    m.resultSource = 'player';
    m.confirmedBy = null; m.confirmedAt = null;
    m.disputeReason = ''; m.disputedAt = null;
    await m.save();

    const oppId = String(m.home) === String(me._id) ? m.away : m.home;
    const opp = await TournamentPlayer.findById(oppId).lean();
    if (opp?.telegramId) {
      sendTg(opp.telegramId,
        `⚽ ${t.name}\n${me.name} natija kiritdi: ${hs}:${as}.\n\nIlovada tasdiqlang yoki "Yolg'on" tugmasini bosing. Tasdiqlamasangiz hisob bekor qilinadi va admin kiritadi.`,
        t._id);
    }
    res.json({ ok: true });
  }));

  // ——— Raqib tasdiqlaydi: hisob avtomatik jadvalga tushadi ———
  app.post('/api/private/:id/matches/:mid/confirm', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    const me = await getPlayer(t._id, u.id);
    if (!me) return res.status(403).json({ error: 'forbidden' });
    const mid = oid(req.params.mid);
    const m = mid && await TournamentMatch.findOne({ _id: mid, tournament: t._id });
    if (!m) return res.status(404).json({ error: 'not_found' });
    if (m.status !== 'pending') return res.status(409).json({ error: m.status === 'confirmed' ? 'confirmed' : 'not_pending' });
    if (String(m.submittedById) === String(me._id)) return res.status(403).json({ error: 'self_confirm' });
    if (String(m.home) !== String(me._id) && String(m.away) !== String(me._id)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    m.status = 'confirmed';
    m.resultSource = 'player';
    m.confirmedBy = Number(u.id);
    m.confirmedAt = new Date();
    m.disputeReason = ''; m.disputedAt = null;
    await m.save();

    if (m.submittedBy) {
      sendTg(m.submittedBy,
        `✅ ${t.name}\n${me.name} natijani tasdiqladi: ${scoreText(m)}.\nHisob jadvalga qo'shildi.`,
        t._id);
    }
    res.json({ ok: true });
  }));

  // ——— Raqib "yolg'on" deydi: hisob bekor, admin keyin kiritadi ———
  app.post('/api/private/:id/matches/:mid/dispute', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    const me = await getPlayer(t._id, u.id);
    if (!me) return res.status(403).json({ error: 'forbidden' });
    const mid = oid(req.params.mid);
    const m = mid && await TournamentMatch.findOne({ _id: mid, tournament: t._id });
    if (!m) return res.status(404).json({ error: 'not_found' });
    if (m.status !== 'pending') return res.status(409).json({ error: m.status === 'confirmed' ? 'confirmed' : 'not_pending' });
    if (String(m.submittedById) === String(me._id)) return res.status(403).json({ error: 'self_confirm' });
    if (String(m.home) !== String(me._id) && String(m.away) !== String(me._id)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    m.status = 'disputed';
    m.disputeReason = clean(req.body?.reason, 300);
    m.disputedAt = new Date();
    m.confirmedBy = null; m.confirmedAt = null;
    await m.save();

    const text = `❌ ${t.name}\n${me.name} natijani rad etdi. ${scoreText(m)} hisobi bekor qilindi. Admin tez orada natijani kiritadi.`;
    if (m.submittedBy) sendTg(m.submittedBy, text, t._id);
    notifyAdmins(t, `⚠️ ${t.name}\n${me.name} natijani rad etdi (${scoreText(m)}). Hisob jadvalga kirmadi — admin panelda yangi natija kiriting.`);
    res.json({ ok: true });
  }));

  // ——— Admin natijani kiritadi yoki tasdiqlaydi ———
  app.post('/api/private/:id/matches/:mid/admin-result', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!canManage(t, u)) return res.status(403).json({ error: 'forbidden' });
    const mid = oid(req.params.mid);
    const m = mid && await TournamentMatch.findOne({ _id: mid, tournament: t._id });
    if (!m) return res.status(404).json({ error: 'not_found' });
    const hs = parseScore(req.body?.homeScore), as = parseScore(req.body?.awayScore);
    if (hs === null || as === null) return res.status(400).json({ error: 'score' });

    m.homeScore = hs; m.awayScore = as;
    m.status = 'confirmed';
    m.resultSource = 'admin';
    m.confirmedBy = Number(u.id);
    m.confirmedAt = new Date();
    m.disputeReason = ''; m.disputedAt = null;
    await m.save();
    if (t.status === 'draft') await Tournament.updateOne({ _id: t._id }, { status: 'live' });

    const players = await TournamentPlayer.find({ _id: { $in: [m.home, m.away] } }).lean();
    players.forEach((p) => {
      if (p.telegramId) sendTg(p.telegramId, `🛡 ${t.name}\nAdmin natijani kiritdi: ${hs}:${as}. Hisob jadvalga qo'shildi.`, t._id);
    });
    res.json({ ok: true });
  }));

  // ——— Admin natijani bekor qiladi ———
  app.post('/api/private/:id/matches/:mid/admin-reject', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!canManage(t, u)) return res.status(403).json({ error: 'forbidden' });
    const mid = oid(req.params.mid);
    const m = mid && await TournamentMatch.findOne({ _id: mid, tournament: t._id });
    if (!m) return res.status(404).json({ error: 'not_found' });
    m.status = 'disputed';
    m.disputeReason = clean(req.body?.reason, 300);
    m.disputedAt = new Date();
    m.confirmedBy = null; m.confirmedAt = null;
    await m.save();
    const players = await TournamentPlayer.find({ _id: { $in: [m.home, m.away] } }).lean();
    players.forEach((p) => {
      if (p.telegramId) sendTg(p.telegramId, `🛡 ${t.name}\nAdmin natijani bekor qildi. Yangi natija kutilmoqda.`, t._id);
    });
    res.json({ ok: true });
  }));

  // ——— Turnir sozlamalari ———
  app.patch('/api/private/:id', ah(async (req, res) => {
    const u = tgUser(req);
    if (!u) return res.status(401).json({ error: 'auth' });
    const t = await getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not_found' });
    if (!canManage(t, u)) return res.status(403).json({ error: 'forbidden' });
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'name')) {
      const name = clean(req.body.name, 60);
      if (name.length < 2) return res.status(400).json({ error: 'name' });
      t.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'status')) {
      const st = String(req.body.status);
      if (!['draft', 'live', 'finished'].includes(st)) return res.status(400).json({ error: 'status' });
      t.status = st;
      t.finishedAt = st === 'finished' ? new Date() : null;
    }
    await t.save();
    res.json({ ok: true, status: t.status });
  }));
};
