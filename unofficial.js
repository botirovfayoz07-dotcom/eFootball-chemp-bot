// Norasmiy turnirlar (foydalanuvchilar o'zi tuzadigan turnirlar): API va mantiq
const mongoose = require('mongoose');
const crypto = require('crypto');
const Tournament = require('./models/Tournament');

// Norasmiy turnir yaratilgandan keyin ishtirokchilar qo'shilishi uchun vaqt; shu vaqtda qura avtomatik o'tadi
const UT_AUTO_DRAW_MIN = 15;
const TMatch = require('./models/TMatch');
const FX = require('./fixtures');

const goal = (v) => Number.isInteger(v) && v >= 0 && v <= 99;
const validId = (id) => mongoose.isValidObjectId(id);
const clean = (s, n) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);

// Xabarlar (o'yinchi tilida)
const MSG = {
  reported: { uz: (n, who, a, b) => `⚽ ${n}: ${who} hisob kiritdi — siz ${a}:${b} ${who}.\nTo'g'ri bo'lsa tasdiqlang, noto'g'ri bo'lsa «Yolg'on» ni bosing.`, en: (n, who, a, b) => `⚽ ${n}: ${who} entered the score — you ${a}:${b} ${who}.\nConfirm it if correct, or press “Fake” if wrong.`, ru: (n, who, a, b) => `⚽ ${n}: ${who} ввёл счёт — вы ${a}:${b} ${who}.\nПодтвердите, если верно, или нажмите «Ложь».` },
  confirmed: { uz: (n, who, a, b) => `✅ ${n}: ${who} hisobni tasdiqladi (${a}:${b}). Natija jadvalga o'tdi.`, en: (n, who, a, b) => `✅ ${n}: ${who} confirmed the score (${a}:${b}). It is in the table.`, ru: (n, who, a, b) => `✅ ${n}: ${who} подтвердил счёт (${a}:${b}). Результат в таблице.` },
  rejected: { uz: (n, who) => `❌ ${n}: ${who} hisobni yolg'on deb belgiladi. Hisob bekor qilindi — natijani tashkilotchi/admin kiritadi.`, en: (n, who) => `❌ ${n}: ${who} marked the score as fake. It was cancelled — the organizer/admin will enter the result.`, ru: (n, who) => `❌ ${n}: ${who} отметил счёт как ложный. Он отменён — результат внесёт организатор/админ.` },
  bigWait: { uz: (n, a, b) => `⚠️ ${n}: katta hisob (${a}:${b}) — tashkilotchi/admin tasdig'i kutilmoqda.`, en: (n, a, b) => `⚠️ ${n}: big score (${a}:${b}) — waiting for the organizer/admin.`, ru: (n, a, b) => `⚠️ ${n}: большой счёт (${a}:${b}) — ждём организатора/админа.` },
  review: { uz: (n, h, a, hg, ag) => `⚠️ ${n}: katta hisob tasdiqlashni kutmoqda — ${h} ${hg}:${ag} ${a}.`, en: (n, h, a, hg, ag) => `⚠️ ${n}: a big score awaits approval — ${h} ${hg}:${ag} ${a}.`, ru: (n, h, a, hg, ag) => `⚠️ ${n}: большой счёт ждёт подтверждения — ${h} ${hg}:${ag} ${a}.` },
  dispute: { uz: (n, h, a, hg, ag) => `⚠️ ${n}: bahsli o'yin — ${h} — ${a}. Kiritilgan hisob ${hg}:${ag} «yolg'on» deb belgilandi. Natijani kiriting.`, en: (n, h, a, hg, ag) => `⚠️ ${n}: disputed match — ${h} — ${a}. The entered score ${hg}:${ag} was marked fake. Please enter the result.`, ru: (n, h, a, hg, ag) => `⚠️ ${n}: спорный матч — ${h} — ${a}. Введённый счёт ${hg}:${ag} отмечен как ложный. Внесите результат.` },
  set: { uz: (n, who, a, b) => `🛠 ${n}: natija kiritildi — siz ${a}:${b} ${who}.`, en: (n, who, a, b) => `🛠 ${n}: result entered — you ${a}:${b} ${who}.`, ru: (n, who, a, b) => `🛠 ${n}: результат внесён — вы ${a}:${b} ${who}.` },
  drawn: { uz: (n) => `🎲 ${n}: qura o'tkazildi! O'yinlaringiz — turnir sahifasida.`, en: (n) => `🎲 ${n}: the draw is done! Your matches are on the tournament page.`, ru: (n) => `🎲 ${n}: жеребьёвка проведена! Ваши матчи — на странице турнира.` },
  playoff: { uz: (n) => `🏆 ${n}: play-off boshlandi!`, en: (n) => `🏆 ${n}: the play-off has started!`, ru: (n) => `🏆 ${n}: начался плей-офф!` },
  next: { uz: (n) => `🏆 ${n}: play-off keyingi turi boshlandi.`, en: (n) => `🏆 ${n}: the next play-off round has started.`, ru: (n) => `🏆 ${n}: начался следующий раунд плей-офф.` },
  champion: { uz: (n, who) => `🏆 ${n} yakunlandi! G'olib: ${who}`, en: (n, who) => `🏆 ${n} is over! Champion: ${who}`, ru: (n, who) => `🏆 ${n} завершён! Победитель: ${who}` },
  removed: { uz: (n) => `ℹ️ Siz «${n}» turniridan chiqarildingiz.`, en: (n) => `ℹ️ You were removed from “${n}”.`, ru: (n) => `ℹ️ Вас исключили из турнира «${n}».` },
  added: { uz: (n) => `✅ Siz «${n}» turniriga qo'shildingiz.`, en: (n) => `✅ You were added to “${n}”.`, ru: (n) => `✅ Вас добавили в турнир «${n}».` },
  remind: { uz: (n, r) => `⏰ ${n}: tur dedlayniga 3 soat qoldi. O'yinni tugatib hisobni kiriting / tasdiqlang.`, en: (n, r) => `⏰ ${n}: 3 hours left until the round deadline. Finish your game and enter / confirm the score.`, ru: (n, r) => `⏰ ${n}: до дедлайна тура 3 часа. Доиграйте и введите / подтвердите счёт.` },
  room: { uz: (n, who, room) => `🎮 ${n}: ${who} xona ID sini yubordi: ${room}`, en: (n, who, room) => `🎮 ${n}: ${who} sent the room ID: ${room}`, ru: (n, who, room) => `🎮 ${n}: ${who} прислал ID комнаты: ${room}` },
};

module.exports = function mount(app, d) {
  const { tgUser, ah, bot, User, ADMINS, Markup, t: LOC, MINI_APP_URL, adminOnly, botName } = d;

  const auth = (req, res, next) => { const u = tgUser(req); if (!u) return res.status(401).json({ error: 'auth' }); req.u = u; next(); };
  const isMgr = (t, u) => t.ownerId === u.id || ADMINS.includes(u.id);
  const umap = async (ids) => new Map((await User.find({ telegramId: { $in: ids } }).lean()).map((x) => [x.telegramId, { user: x.username ? '@' + x.username : x.firstName || String(x.telegramId), username: x.username || '' }]));

  async function notify(id, tid, key, ...args) {
    try {
      const o = await User.findOne({ telegramId: id }).lean(), lang = o?.lang || 'uz';
      const kb = Markup.inlineKeyboard([[Markup.button.webApp(LOC[lang].open, `${MINI_APP_URL}?lang=${lang}&open=ut/${tid}`)]]);
      await bot.telegram.sendMessage(id, MSG[key][lang](...args), kb);
    } catch (_) { /* bot bloklangan bo'lishi mumkin */ }
  }
  const notifyMgrs = (t, key, ...args) => Promise.all([...new Set([t.ownerId, ...ADMINS])].map((id) => notify(id, t._id, key, t.name, ...args)));
  const whoName = async (t, id) => { const m = await umap([id]); const p = (t.players || []).find((x) => x.telegramId === id); return (p?.team ? p.team + ' ' : '') + (m.get(id)?.user || id); };

  // ——— Hisoblar ———
  function standings(t, ms, names) {
    const st = FX.computeStats(ms.filter((m) => m.stage === 'league' && m.status === 'confirmed'));
    const zero = { pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    return (t.players || []).map((p) => ({ id: p.telegramId, team: p.team, user: names.get(p.telegramId)?.user || '', ...(st.get(p.telegramId) || zero) }))
      .map((r) => ({ ...r, p: r.w + r.d + r.l, gd: r.gf - r.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.id - b.id)
      .map((r, i) => ({ pos: i + 1, ...r }));
  }
  function current(t, ms) {
    if (t.status === 'open') return null;
    const po = ms.filter((m) => m.stage === 'playoff');
    if (po.length && (t.status === 'playoff' || t.status === 'finished')) {
      const n = Math.max(...po.map((m) => m.round));
      return { stage: 'playoff', n, total: Math.log2(t.playoff) | 0, deadline: FX.roundDeadline(t.startedAt, t.effRounds + n, t.roundDays) };
    }
    const lg = ms.filter((m) => m.stage === 'league'), open = lg.filter((m) => m.status !== 'confirmed').map((m) => m.round);
    const n = open.length ? Math.min(...open) : t.effRounds;
    return { stage: 'league', n, total: t.effRounds, deadline: FX.roundDeadline(t.startedAt, n, t.roundDays) };
  }
  function decorate(t, ms, names, mgr) {
    const side = (id) => ({ id, team: (t.players || []).find((p) => p.telegramId === id)?.team || '', user: names.get(id)?.user || String(id), username: names.get(id)?.username || '' });
    return ms.map((m) => ({ id: String(m._id), stage: m.stage, round: m.round, slot: m.slot, status: m.status, hg: m.hg, ag: m.ag, reportedBy: m.reportedBy, home: side(m.home), away: side(m.away), claim: mgr && m.claim?.hg != null ? m.claim : null }));
  }
  const sortMs = (a, b) => (a.stage === b.stage ? a.round - b.round || (a.slot ?? 0) - (b.slot ?? 0) : a.stage === 'league' ? -1 : 1);

  async function full(t, u) {
    const ms = (await TMatch.find({ tournament: t._id, status: { $ne: 'cancelled' } }).lean()).sort(sortMs);
    const ids = new Set([t.ownerId, ...(t.players || []).map((p) => p.telegramId)]);
    ms.forEach((m) => { ids.add(m.home); ids.add(m.away); });
    const names = await umap([...ids]), mgr = isMgr(t, u), cur = current(t, ms);
    const dm = decorate(t, ms, names, mgr);
    const rows = standings(t, ms, names);
    const bn = await botName();
    return {
      t: { id: String(t._id), name: t.name, code: t.code, status: t.status, max: t.maxPlayers, rounds: t.effRounds || t.rounds, playoff: t.playoff, roundDays: t.roundDays, drawAt: t.drawAt, startedAt: t.startedAt, champion: t.champion, owner: names.get(t.ownerId)?.user || '', ownerUsername: names.get(t.ownerId)?.username || '', players: (t.players || []).length },
      me: { id: u.id, joined: (t.players || []).some((p) => p.telegramId === u.id), owner: t.ownerId === u.id, mgr },
      link: bn ? `https://t.me/${bn}?start=t_${t.code}` : null,
      cur, rows, players: rows.map((r) => ({ id: r.id, team: r.team, user: r.user })),
      round: cur ? dm.filter((m) => m.stage === cur.stage && m.round === cur.n) : [],
      mine: dm.filter((m) => m.home.id === u.id || m.away.id === u.id),
      bracket: dm.filter((m) => m.stage === 'playoff'),
      action: mgr ? dm.filter((m) => ['pending', 'review', 'disputed'].includes(m.status)) : [],
    };
  }
  const getT = async (req, res) => {
    if (!validId(req.params.id)) { res.status(400).json({ error: 'fail' }); return null; }
    const t = await Tournament.findById(req.params.id).lean();
    if (!t) { res.status(404).json({ error: 'gone' }); return null; }
    return t;
  };
  const mgrT = async (req, res) => { const t = await getT(req, res); if (!t) return null; if (!isMgr(t, req.u)) { res.status(403).json({ error: 'forbidden' }); return null; } return t; };

  // ——— Qura, play-off ———
  async function performDraw(tid) {
    const t0 = await Tournament.findById(tid).lean();
    if (!t0 || t0.status !== 'open') return { error: 'started' };
    if ((t0.players || []).length < 2) return { error: 'few' };
    const lock = await Tournament.findOneAndUpdate({ _id: tid, status: 'open' }, { $set: { status: 'league', startedAt: new Date(), drawAt: null } }, { new: true }).lean();
    if (!lock) return { error: 'started' };
    const revert = () => Tournament.updateOne({ _id: tid }, { $set: { status: 'open', startedAt: null, effRounds: 0 } });
    try {
      const n = (lock.players || []).length, R = Math.min(lock.rounds, n + (n % 2) - 1);
      const fx = FX.roundRobin(FX.shuffle((lock.players || []).map((p) => p.telegramId)), false).filter((m) => m.round <= R);
      await TMatch.insertMany(fx.map((m) => ({ ...m, tournament: tid, stage: 'league' })));
      await Tournament.updateOne({ _id: tid }, { $set: { effRounds: R } });
      (lock.players || []).forEach((p) => notify(p.telegramId, tid, 'drawn', lock.name));
      return { ok: true, matches: fx.length };
    } catch (e) { await TMatch.deleteMany({ tournament: tid }); await revert(); throw e; }
  }
  async function startPlayoff(tid, force) {
    const t = await Tournament.findById(tid).lean();
    if (!t || t.status !== 'league') return { error: 'started' };
    const lgAll = await TMatch.find({ tournament: tid, stage: 'league', status: { $ne: 'cancelled' } }).lean();
    const unplayed = lgAll.filter((m) => m.status !== 'confirmed');
    if (unplayed.length && !force) return { error: 'unfinished', left: unplayed.length };
    const lock = await Tournament.findOneAndUpdate({ _id: tid, status: 'league' }, { $set: { status: 'playoff' } }, { new: true }).lean();
    if (!lock) return { error: 'started' };
    if (unplayed.length) await TMatch.updateMany({ _id: { $in: unplayed.map((m) => m._id) } }, { $set: { status: 'cancelled', updatedAt: new Date() } });
    const rows = standings(lock, lgAll.filter((m) => m.status === 'confirmed'), new Map());
    let P = 1; while (P * 2 <= Math.min(lock.playoff, rows.length)) P *= 2;
    if (lock.playoff < 2 || P < 2) { await Tournament.updateOne({ _id: tid }, { $set: { status: 'finished', champion: rows[0]?.id ?? null, playoff: 0 } }); rows[0] && notifyAll(lock, 'champion', await whoName(lock, rows[0].id)); return { ok: true, finished: true }; }
    const seeds = FX.seedOrder(P), ids = rows.map((r) => r.id), docs = [];
    for (let i = 0; i < P; i += 2) docs.push({ tournament: tid, stage: 'playoff', round: 1, slot: i / 2, home: ids[seeds[i] - 1], away: ids[seeds[i + 1] - 1] });
    await Tournament.updateOne({ _id: tid }, { $set: { playoff: P } });
    await TMatch.insertMany(docs);
    notifyAll(lock, 'playoff');
    return { ok: true, size: P };
  }
  const notifyAll = (t, key, ...args) => (t.players || []).forEach((p) => notify(p.telegramId, t._id, key, t.name, ...args));
  // Play-off turi tugasa — keyingi turni yaratadi yoki g'olibni aniqlaydi
  async function advancePlayoff(tid) {
    const t = await Tournament.findById(tid).lean();
    if (!t || t.status !== 'playoff') return;
    const po = await TMatch.find({ tournament: tid, stage: 'playoff', status: { $ne: 'cancelled' } }).lean();
    const maxR = Math.max(...po.map((m) => m.round)), cur = po.filter((m) => m.round === maxR).sort((a, b) => a.slot - b.slot);
    if (cur.some((m) => m.status !== 'confirmed')) return;
    const win = cur.map((m) => (m.hg > m.ag ? m.home : m.away));
    if (win.length === 1) {
      const lock = await Tournament.findOneAndUpdate({ _id: tid, status: 'playoff' }, { $set: { status: 'finished', champion: win[0] } }, { new: true }).lean();
      if (lock) notifyAll(lock, 'champion', await whoName(lock, win[0]));
      return;
    }
    const docs = [];
    for (let i = 0; i < win.length; i += 2) docs.push({ tournament: tid, stage: 'playoff', round: maxR + 1, slot: i / 2, home: win[i], away: win[i + 1] });
    try { await TMatch.insertMany(docs, { ordered: false }); notifyAll(t, 'next'); } catch (e) { if (e.code !== 11000 && !e.writeErrors) throw e; }
  }
  // Tasdiqlangan o'yindan keyin: play-off bo'lsa davom ettirish
  const afterConfirm = (m) => (m.stage === 'playoff' ? advancePlayoff(m.tournament) : null);

  // ——— O'yinchi API ———
  app.get('/api/ut/mine', auth, ah(async (req, res) => {
    const ts = await Tournament.find({ $or: [{ ownerId: req.u.id }, { 'players.telegramId': req.u.id }] }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ list: ts.map((t) => ({ id: String(t._id), name: t.name, status: t.status, players: (t.players || []).length, max: t.maxPlayers, owner: t.ownerId === req.u.id })) });
  }));

  app.post('/api/ut/create', auth, ah(async (req, res) => {
    const b = req.body || {}, name = clean(b.name, 40);
    const maxPlayers = Number(b.maxPlayers), rounds = Number(b.rounds), playoff = Number(b.playoff), roundDays = Number(b.roundDays);
    if (name.length < 2 || !Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 64 || !Number.isInteger(rounds) || rounds < 1 || rounds > 30 || ![0, 2, 4, 8, 16].includes(playoff) || playoff > maxPlayers || ![1, 2, 3, 5, 7].includes(roundDays)) return res.status(400).json({ error: 'fail' });
    if (!ADMINS.includes(req.u.id) && (await Tournament.countDocuments({ ownerId: req.u.id, status: { $ne: 'finished' } })) >= 3) return res.status(409).json({ error: 'limit' });
    for (let i = 0; i < 5; i++) {
      try {
        const t = await Tournament.create({ name, maxPlayers, rounds, playoff, roundDays, ownerId: req.u.id, code: crypto.randomBytes(3).toString('hex').toUpperCase(), drawAt: new Date(Date.now() + UT_AUTO_DRAW_MIN * 60 * 1000) });
        return res.json({ ok: true, id: String(t._id) });
      } catch (e) { if (e.code !== 11000) throw e; }
    }
    res.status(500).json({ error: 'fail' });
  }));

  app.get('/api/ut/code/:code', auth, ah(async (req, res) => {
    const t = await Tournament.findOne({ code: clean(req.params.code, 12).toUpperCase() }).lean();
    if (!t) return res.status(404).json({ error: 'gone' });
    res.json({ id: String(t._id) });
  }));

  app.get('/api/ut/:id', auth, ah(async (req, res) => { const t = await getT(req, res); if (t) res.json(await full(t, req.u)); }));

  app.post('/api/ut/:id/join', auth, ah(async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
    const u = req.u, team = clean(req.body?.team, 20);
    const t = await Tournament.findOneAndUpdate({ _id: req.params.id, status: 'open', 'players.telegramId': { $ne: u.id }, $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] } }, { $push: { players: { telegramId: u.id, team } } }, { new: true }).lean();
    if (t) return res.json({ ok: true });
    const cur = await Tournament.findById(req.params.id).lean();
    if (!cur) return res.status(404).json({ error: 'gone' });
    res.status(409).json({ error: cur.players.some((p) => p.telegramId === u.id) ? 'already' : cur.status !== 'open' ? 'started' : 'full' });
  }));
  app.post('/api/ut/:id/leave', auth, ah(async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
    const t = await Tournament.findOneAndUpdate({ _id: req.params.id, status: 'open', 'players.telegramId': req.u.id }, { $pull: { players: { telegramId: req.u.id } } }, { new: true }).lean();
    res.status(t ? 200 : 409).json(t ? { ok: true } : { error: 'started' });
  }));

  // O'yin hisobi: kiritish → raqib tasdiqlaydi / "Yolg'on"
  app.post('/api/ut/matches/:id/report', auth, ah(async (req, res) => {
    const u = req.u, my = req.body?.my, opp = req.body?.opp;
    if (!validId(req.params.id) || !goal(my) || !goal(opp)) return res.status(400).json({ error: 'badScore' });
    const m0 = await TMatch.findOne({ _id: req.params.id, $or: [{ home: u.id }, { away: u.id }] }).lean();
    if (!m0) return res.status(404).json({ error: 'gone' });
    if (m0.stage === 'playoff' && my === opp) return res.status(400).json({ error: 'noDraw' });
    const home = m0.home === u.id;
    const m = await TMatch.findOneAndUpdate({ _id: m0._id, $or: [{ status: 'scheduled' }, { status: 'pending', reportedBy: u.id }] }, { $set: { hg: home ? my : opp, ag: home ? opp : my, status: 'pending', reportedBy: u.id, claim: null, updatedAt: new Date() } }, { new: true }).lean();
    if (!m) return res.status(409).json({ error: 'gone' });
    const t = await Tournament.findById(m.tournament).lean();
    notify(home ? m.away : m.home, t._id, 'reported', t.name, await whoName(t, u.id), opp, my);
    res.json({ ok: true });
  }));
  app.post('/api/ut/matches/:id/confirm', auth, ah(async (req, res) => {
    const u = req.u;
    if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
    const old = await TMatch.findOne({ _id: req.params.id, status: 'pending', reportedBy: { $ne: u.id }, $or: [{ home: u.id }, { away: u.id }] }).lean();
    if (!old) return res.status(409).json({ error: 'gone' });
    const big = FX.isBig(old.hg, old.ag); // katta hisob: tashkilotchi/admin tasdiqlaydi
    const m = await TMatch.findOneAndUpdate({ _id: old._id, status: 'pending', hg: old.hg, ag: old.ag }, { $set: { status: big ? 'review' : 'confirmed', confirmedBy: big ? null : 'player', updatedAt: new Date() } }, { new: true }).lean();
    if (!m) return res.status(409).json({ error: 'gone' });
    const t = await Tournament.findById(m.tournament).lean(), rep = m.reportedBy === m.home, mine = rep ? m.hg : m.ag, theirs = rep ? m.ag : m.hg;
    if (big) {
      notify(m.reportedBy, t._id, 'bigWait', t.name, mine, theirs);
      notifyMgrs(t, 'review', await whoName(t, m.home), await whoName(t, m.away), m.hg, m.ag);
    } else { notify(m.reportedBy, t._id, 'confirmed', t.name, await whoName(t, u.id), mine, theirs); await afterConfirm(m); }
    res.json({ ok: true, review: big });
  }));
  app.post('/api/ut/matches/:id/reject', auth, ah(async (req, res) => {
    const u = req.u;
    if (!validId(req.params.id)) return res.status(400).json({ error: 'fail' });
    const old = await TMatch.findOne({ _id: req.params.id, status: 'pending', reportedBy: { $ne: u.id }, $or: [{ home: u.id }, { away: u.id }] }).lean();
    if (!old) return res.status(409).json({ error: 'gone' });
    const m = await TMatch.findOneAndUpdate({ _id: old._id, status: 'pending', hg: old.hg, ag: old.ag, reportedBy: old.reportedBy }, { $set: { status: 'disputed', claim: { hg: old.hg, ag: old.ag, by: old.reportedBy }, hg: null, ag: null, reportedBy: null, updatedAt: new Date() } }, { new: true }).lean();
    if (!m) return res.status(409).json({ error: 'gone' });
    const t = await Tournament.findById(m.tournament).lean();
    notify(old.reportedBy, t._id, 'rejected', t.name, await whoName(t, u.id));
    notifyMgrs(t, 'dispute', await whoName(t, m.home), await whoName(t, m.away), old.hg, old.ag);
    res.json({ ok: true });
  }));
  // "Xona ID sini yuborish" — raqibga bot orqali xabar
  app.post('/api/ut/matches/:id/room', auth, ah(async (req, res) => {
    const room = clean(req.body?.room, 24);
    if (!validId(req.params.id) || room.length < 2) return res.status(400).json({ error: 'fail' });
    const m = await TMatch.findOne({ _id: req.params.id, status: { $ne: 'cancelled' }, $or: [{ home: req.u.id }, { away: req.u.id }] }).lean();
    if (!m) return res.status(404).json({ error: 'gone' });
    const t = await Tournament.findById(m.tournament).lean();
    notify(m.home === req.u.id ? m.away : m.home, t._id, 'room', t.name, await whoName(t, req.u.id), room);
    res.json({ ok: true });
  }));

  // ——— Tashkilotchi / admin ———
  app.post('/api/ut/matches/:id/result', auth, ah(async (req, res) => {
    const { hg, ag } = req.body || {};
    if (!validId(req.params.id) || !goal(hg) || !goal(ag)) return res.status(400).json({ error: 'badScore' });
    const m0 = await TMatch.findOne({ _id: req.params.id, status: { $ne: 'cancelled' } }).lean();
    if (!m0) return res.status(404).json({ error: 'gone' });
    const t = await Tournament.findById(m0.tournament).lean();
    if (!t || !isMgr(t, req.u)) return res.status(403).json({ error: 'forbidden' });
    if (m0.stage === 'playoff' && hg === ag) return res.status(400).json({ error: 'noDraw' });
    if (m0.stage === 'playoff' && t.status !== 'playoff') return res.status(409).json({ error: 'locked' });
    const m = await TMatch.findOneAndUpdate({ _id: m0._id }, { $set: { hg, ag, status: 'confirmed', confirmedBy: 'manager', reportedBy: null, claim: null, updatedAt: new Date() } }, { new: true }).lean();
    const [a, b] = await Promise.all([whoName(t, m.home), whoName(t, m.away)]);
    notify(m.home, t._id, 'set', t.name, b, hg, ag); notify(m.away, t._id, 'set', t.name, a, ag, hg);
    await afterConfirm(m);
    res.json({ ok: true });
  }));
  app.get('/api/ut/:id/matches', auth, ah(async (req, res) => {
    const t = await mgrT(req, res); if (!t) return;
    const st = String(req.query.status || 'scheduled'), q = { tournament: t._id, status: { $ne: 'cancelled' } };
    if (['scheduled', 'confirmed', 'pending', 'review', 'disputed'].includes(st)) q.status = st;
    const ms = (await TMatch.find(q).limit(100).lean()).sort(sortMs);
    res.json({ matches: decorate(t, ms, await umap([...new Set(ms.flatMap((m) => [m.home, m.away]))]), true) });
  }));
  app.post('/api/ut/:id/settings', auth, ah(async (req, res) => {
    const t = await mgrT(req, res); if (!t) return;
    const set = {};
    if (req.body?.name !== undefined) { const n = clean(req.body.name, 40); if (n.length < 2) return res.status(400).json({ error: 'fail' }); set.name = n; }
    if (req.body?.drawAt !== undefined) {
      if (t.status !== 'open') return res.status(409).json({ error: 'started' });
      const at = req.body.drawAt ? new Date(req.body.drawAt) : null;
      if (at && isNaN(at)) return res.status(400).json({ error: 'fail' });
      set.drawAt = at;
    }
    await Tournament.updateOne({ _id: t._id }, { $set: set });
    res.json({ ok: true });
  }));
  app.post('/api/ut/:id/draw', auth, ah(async (req, res) => {
    const t = await mgrT(req, res); if (!t) return;
    const r = await performDraw(t._id);
    if (r.error) return res.status(409).json({ error: r.error });
    res.json(r);
  }));
  app.post('/api/ut/:id/playoff', auth, ah(async (req, res) => {
    const t = await mgrT(req, res); if (!t) return;
    const r = await startPlayoff(t._id, !!req.body?.force);
    if (r.error) return res.status(409).json({ error: r.error, left: r.left });
    res.json(r);
  }));
  app.post('/api/ut/:id/remove', auth, ah(async (req, res) => {
    const t = await mgrT(req, res); if (!t) return;
    const tid = Number(req.body?.telegramId);
    if (!tid || !(t.players || []).some((p) => p.telegramId === tid)) return res.status(404).json({ error: 'gone' });
    if (t.status === 'playoff' || t.status === 'finished') return res.status(409).json({ error: 'locked' });
    await Tournament.updateOne({ _id: t._id }, { $pull: { players: { telegramId: tid } } });
    await TMatch.updateMany({ tournament: t._id, status: { $ne: 'cancelled' }, $or: [{ home: tid }, { away: tid }] }, { $set: { status: 'cancelled', updatedAt: new Date() } });
    notify(tid, t._id, 'removed', t.name);
    res.json({ ok: true });
  }));
  app.post('/api/ut/:id/add', auth, ah(async (req, res) => {
    const t = await mgrT(req, res); if (!t) return;
    const q = clean(req.body?.user, 40).replace(/^@/, ''), team = clean(req.body?.team, 20);
    if (!q) return res.status(400).json({ error: 'fail' });
    if (t.status === 'playoff' || t.status === 'finished') return res.status(409).json({ error: 'locked' });
    const usr = /^\d+$/.test(q) ? await User.findOne({ telegramId: Number(q) }).lean() : await User.findOne({ username: new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }).lean();
    if (!usr) return res.status(404).json({ error: 'nouser' });
    const nt = await Tournament.findOneAndUpdate({ _id: t._id, status: { $in: ['open', 'league'] }, 'players.telegramId': { $ne: usr.telegramId }, $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] } }, { $push: { players: { telegramId: usr.telegramId, team } } }, { new: true }).lean();
    if (!nt) return res.status(409).json({ error: (t.players || []).some((p) => p.telegramId === usr.telegramId) ? 'already' : 'full' });
    if (nt.status === 'league') {
      // Qura o'tgan: yangi o'yinchiga eng kam o'yin o'ynagan raqiblar bilan o'yinlar
      const ms = await TMatch.find({ tournament: t._id, stage: 'league', status: { $ne: 'cancelled' } }).lean();
      const cnt = new Map(); ms.forEach((m) => { cnt.set(m.home, (cnt.get(m.home) || 0) + 1); cnt.set(m.away, (cnt.get(m.away) || 0) + 1); });
      const others = FX.shuffle((t.players || []).map((p) => p.telegramId)).sort((a, b) => (cnt.get(a) || 0) - (cnt.get(b) || 0)).slice(0, Math.max(1, nt.effRounds));
      const R = Math.max(1, nt.effRounds);
      if (others.length) await TMatch.insertMany(others.map((o, i) => ({ tournament: t._id, stage: 'league', round: (i % R) + 1, home: i % 2 ? o : usr.telegramId, away: i % 2 ? usr.telegramId : o })));
    }
    notify(usr.telegramId, t._id, 'added', t.name);
    res.json({ ok: true });
  }));
  app.post('/api/ut/:id/delete', auth, ah(async (req, res) => {
    const t = await mgrT(req, res); if (!t) return;
    await TMatch.deleteMany({ tournament: t._id }); await Tournament.deleteOne({ _id: t._id });
    res.json({ ok: true });
  }));

  // Admin: barcha turnirlar
  app.get('/api/admin/tournaments', adminOnly, ah(async (req, res) => {
    const ts = await Tournament.find().sort({ createdAt: -1 }).limit(100).lean();
    const act = await TMatch.aggregate([{ $match: { tournament: { $in: ts.map((t) => t._id) }, status: { $in: ['pending', 'review', 'disputed'] } } }, { $group: { _id: '$tournament', n: { $sum: 1 } } }]);
    const an = new Map(act.map((a) => [String(a._id), a.n])), names = await umap(ts.map((t) => t.ownerId));
    res.json({ list: ts.map((t) => ({ id: String(t._id), name: t.name, status: t.status, players: (t.players || []).length, max: t.maxPlayers, owner: names.get(t.ownerId)?.user || String(t.ownerId), action: an.get(String(t._id)) || 0, drawAt: t.drawAt })) });
  }));

  // Vaqti kelgan quralar (bot.js dagi daqiqalik rejalashtiruvchi chaqiradi)
  async function runDue() {
    const due = await Tournament.find({ status: 'open', drawAt: { $ne: null, $lte: new Date() } }).lean();
    for (const t of due) {
      const r = await performDraw(t._id);
      if (!r.ok) await Tournament.updateOne({ _id: t._id }, { $set: { drawAt: null } });
      if (r.ok) notify(t.ownerId, t._id, 'drawn', t.name);
      else if (r.error === 'few') bot.telegram.sendMessage(t.ownerId, `⚠️ «${t.name}»: qura o'tkazilmadi — kamida 2 ishtirokchi kerak.`).catch(() => {});
    }
  }
  // Dedlaynga 3 soat qolganda: joriy turda hisobi tugamagan o'yinchilarga eslatma
  async function remind() {
    const now = Date.now(), ts = await Tournament.find({ status: { $in: ['league', 'playoff'] }, startedAt: { $ne: null } }).lean();
    for (const t of ts) {
      const ms = await TMatch.find({ tournament: t._id, status: { $ne: 'cancelled' } }).lean(), cur = current(t, ms);
      const left = cur?.deadline ? new Date(cur.deadline).getTime() - now : 0;
      if (left <= 0 || left > 3 * 3600 * 1000) continue;
      const tag = `h3:${cur.stage}:${cur.n}`;
      if (!(await Tournament.updateOne({ _id: t._id, notified: { $ne: tag } }, { $addToSet: { notified: tag } })).modifiedCount) continue;
      for (const m of ms.filter((x) => x.stage === cur.stage && x.round === cur.n && ['scheduled', 'pending'].includes(x.status))) {
        const to = m.status === 'pending' ? [m.reportedBy === m.home ? m.away : m.home] : [m.home, m.away];   // pending: faqat tasdiqlashi kerak bo'lgan tomonga
        to.forEach((id) => notify(id, t._id, 'remind', t.name, cur.n));
      }
    }
  }
  return { runDue, remind };
};
