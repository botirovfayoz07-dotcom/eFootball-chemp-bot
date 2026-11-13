// Dedlaynlar: bildirishnomalar va avtomatik texnik natija.
//
// Rasmiy liga o'yinlari (Match.deadline):
//   • tur boshlanganda ikkala o'yinchiga xabar ("roundStart")
//   • dedlaynga 3 soat qolganda eslatma ("remind3h")
//   • dedlayn o'tganda ogohlantirish + AUTO_GRACE_HOURS soat muhlat ("overdue")
//   • muhlat tugagach, hali hisob KIRITILMAGAN o'yinda:
//       faqat bir tomon faol bo'lgan (o'yin chatiga yozgan) → faol tomonga 3:0 texnik g'alaba
//       ikkalasi ham faol bo'lmagan → o'yin bekor qilinadi (jadvalga hisoblanmaydi)
//       ikkalasi ham faol bo'lgan → bahsli (admin hal qiladi)
//   • raqib tasdig'i kutilayotgan (pending) va bahsli o'yinlar o'zi hal qilinmaydi — adminga xabar beriladi
// FA Cup bosqichlari: dedlaynga 3 soat qolganda eslatma, dedlayn o'tganda adminga xabar.
const FX = require('../fixtures');

const HOUR = 3600 * 1000;
const GRACE_H = Number(process.env.AUTO_GRACE_HOURS || 12);
const fmtT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const fmt = (d) => fmtT.format(new Date(d)).replace(',', '');
const clampDays = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 30 ? n : null; };

// Qura paytida: tur r — boshlanishi (r-1)-tur dedlayni, tugashi r-tur dedlayni
function stamp(fx, base, days) {
  const b = new Date(base);
  return fx.map((m) => {
    const startsAt = m.round <= 1 ? b : FX.roundDeadline(b, m.round - 1, days);
    return { ...m, startsAt, deadline: FX.roundDeadline(b, m.round, days), notified: m.round <= 1 ? ['start'] : [] };
  });
}
// Kechroq qo'shilgan o'yinlar (yangi ishtirokchi, eski o'yinlarga dedlayn berish): turlar «hozirdan» ketma-ket sanaladi,
// shunda o'tib ketgan turlar uchun darrov texnik mag'lubiyat berilmaydi
function stampSeq(list, now, days) {
  const ranks = [...new Set(list.map((m) => m.round))].sort((a, b) => a - b);
  return list.map((m) => {
    const k = ranks.indexOf(m.round) + 1;
    return { ...m, startsAt: k === 1 ? new Date(now) : FX.roundDeadline(now, k - 1, days), deadline: FX.roundDeadline(now, k, days), notified: k === 1 ? ['start'] : [] };
  });
}
// Dedlayn o'tgan va hali hisob kiritilmagan o'yin uchun qaror. active — o'yin chatida yozgan o'yinchilar
function decide(m, active) {
  const h = active.includes(m.home), a = active.includes(m.away);
  if (h && a) return { kind: 'manual' };
  if (h) return { kind: 'win-home', hg: 3, ag: 0 };
  if (a) return { kind: 'win-away', hg: 0, ag: 3 };
  return { kind: 'void' };
}

module.exports = function mount(d) {
  const { Match, Cup, ChatMessage, LeagueConfig, season, EFL, notify, whoIs, recalc, notifyAdmins } = d;
  const lgName = (id) => EFL.byId[id]?.name || id;
  // bir martalik «da'vo»: eslatma faqat bitta jarayon tomonidan yuboriladi (qayta ishga tushganda ham takrorlanmaydi)
  const claim = async (m, tag) => (await Match.updateOne({ _id: m._id, notified: { $ne: tag } }, { $addToSet: { notified: tag } })).modifiedCount > 0;

  // E'lon faqat: tur ochilgan (yoki qulfsiz) VA admin shu tur uchun dedlayn belgilagan bo'lsa.
  // Avtomatik hisoblangan dedlayn bilan "tur ochildi" xabari bormaydi.
  const cfgCache = async () => new Map((await LeagueConfig.find({ season }).select('league roundsLocked openRounds adminDeadlineRounds').lean()).map((c) => [c.league, c]));
  const announced = (m, cfgs) => {
    const c = cfgs.get(m.league);
    const open = !c?.roundsLocked || (c.openRounds || []).includes(m.round);
    const dl = (c?.adminDeadlineRounds || []).includes(m.round);
    return open && dl;
  };

  async function roundStarts(now) {
    const cfgs = await cfgCache();
    const due = await Match.find({ season, status: { $in: ['scheduled', 'pending'] }, startsAt: { $ne: null, $lte: now }, deadline: { $gt: now }, notified: { $ne: 'start' } }).limit(1000).lean();
    for (const m of due) {
      if (!announced(m, cfgs)) continue;
      if (!(await claim(m, 'start'))) continue;
      if (now - new Date(m.startsAt) > 12 * HOUR) continue;   // server uzoq o'chib qolgan bo'lsa, eskirgan «tur boshlandi» yuborilmaydi
      const [a, b] = await Promise.all([whoIs(m.league, m.home), whoIs(m.league, m.away)]);
      notify(m.home, 'roundStart', lgName(m.league), m.round, b, fmt(m.deadline));
      notify(m.away, 'roundStart', lgName(m.league), m.round, a, fmt(m.deadline));
    }
  }

  async function remind3h(now) {
    const cfgs = await cfgCache();
    const due = await Match.find({ season, status: { $in: ['scheduled', 'pending'] }, deadline: { $gt: now, $lte: new Date(now.getTime() + 3 * HOUR) }, notified: { $ne: 'h3' } }).limit(1000).lean();
    for (const m of due) {
      if (!announced(m, cfgs)) continue;
      if (!(await claim(m, 'h3'))) continue;
      const [a, b] = await Promise.all([whoIs(m.league, m.home), whoIs(m.league, m.away)]), lg = lgName(m.league);
      if (m.status === 'pending') {            // hisobni kiritgan tomonga eslatma shart emas — raqib tasdiqlashi kerak
        const to = m.reportedBy === m.home ? m.away : m.home;
        notify(to, 'remindConfirm', lg, m.round, to === m.home ? b : a);
      } else {
        notify(m.home, 'remindPlay', lg, m.round, b, fmt(m.deadline));
        notify(m.away, 'remindPlay', lg, m.round, a, fmt(m.deadline));
      }
    }
  }

  async function overdue(now, digest) {
    const due = await Match.find({ season, status: { $in: ['scheduled', 'pending', 'disputed'] }, deadline: { $ne: null, $lte: now }, notified: { $ne: 'done' } }).limit(1000).lean();
    const touched = new Set();
    // Yopiq turdagi o'yinlarga avto-natija qo'llanmaydi: o'yinchilar natija kiritish imkoniga ega emas edi
    const locked = await LeagueConfig.find({ season, roundsLocked: true }).select('league openRounds').lean();
    const isLocked = (m) => { const c = locked.find((x) => x.league === m.league); return !!c && !(c.openRounds || []).includes(m.round); };
    for (const m of due) {
      if (isLocked(m)) continue;
      const lg = lgName(m.league), row = (digest[m.league] ||= { win: 0, void: 0, manual: 0, waiting: 0 });
      if (m.status !== 'scheduled') {          // pending / disputed — admin ko'radi
        if (await claim(m, 'over')) row.waiting++;
        continue;
      }
      if (!m.notified.includes('over')) {      // 1-bosqich: dedlayn o'tdi, muhlat beramiz
        if (await claim(m, 'over')) {
          const [a, b] = await Promise.all([whoIs(m.league, m.home), whoIs(m.league, m.away)]);
          notify(m.home, 'overdue', lg, m.round, b, GRACE_H);
          notify(m.away, 'overdue', lg, m.round, a, GRACE_H);
        }
        continue;
      }
      if (now.getTime() < new Date(m.deadline).getTime() + GRACE_H * HOUR) continue;   // muhlat hali tugamagan
      // 2-bosqich: qaror
      const active = await ChatMessage.distinct('from', { kind: 'match', key: String(m._id), from: { $in: [m.home, m.away] } });
      const r = decide(m, active), at = new Date();
      const [a, b] = await Promise.all([whoIs(m.league, m.home), whoIs(m.league, m.away)]);
      if (r.kind === 'manual') {
        const ok = await Match.updateOne({ _id: m._id, status: 'scheduled' }, { $set: { status: 'disputed', updatedAt: at }, $addToSet: { notified: 'done' } });
        if (!ok.modifiedCount) continue;
        row.manual++;
        notify(m.home, 'toAdmin', lg, m.round, b); notify(m.away, 'toAdmin', lg, m.round, a);
      } else if (r.kind === 'void') {
        const ok = await Match.updateOne({ _id: m._id, status: 'scheduled' }, { $set: { status: 'cancelled', auto: { kind: 'void', at }, updatedAt: at }, $addToSet: { notified: 'done' } });
        if (!ok.modifiedCount) continue;
        row.void++;
        notify(m.home, 'voided', lg, m.round, b); notify(m.away, 'voided', lg, m.round, a);
      } else {
        const ok = await Match.updateOne({ _id: m._id, status: 'scheduled' }, { $set: { hg: r.hg, ag: r.ag, status: 'confirmed', confirmedBy: 'auto', reportedBy: null, claim: null, auto: { kind: r.kind, at }, updatedAt: at }, $addToSet: { notified: 'done' } });
        if (!ok.modifiedCount) continue;
        row.win++; touched.add(m.league);
        const homeWon = r.kind === 'win-home';
        notify(homeWon ? m.home : m.away, 'techWin', lg, m.round, homeWon ? b : a);
        notify(homeWon ? m.away : m.home, 'techLoss', lg, m.round, homeWon ? a : b);
      }
    }
    for (const l of touched) await recalc(l);
  }

  // FA Cup: bosqich dedlayni
  async function cupTick(now) {
    const stages = await Cup.find({ season, startedAt: { $ne: null }, deadline: { $ne: null }, notified: { $ne: 'over' } }).lean();
    const lines = [];
    for (const c of stages) {
      const fm = require('./cup').familyOfKey(c.cup), left = new Date(c.deadline) - now, label = fm ? (c.cup === fm.id ? fm.name : fm.shieldName) : c.cup;
      const open = () => Match.find({ season, league: fm ? fm.id : c.cup, round: c.round, status: { $in: ['scheduled', 'pending', 'disputed'] } }).lean();
      if (left > 0 && left <= 3 * HOUR && !c.notified.includes('h3')) {
        if (!(await Cup.updateOne({ _id: c._id, notified: { $ne: 'h3' } }, { $addToSet: { notified: 'h3' } })).modifiedCount) continue;
        for (const m of (await open()).filter((x) => x.status !== 'disputed')) {
          if (m.status === 'pending') notify(m.reportedBy === m.home ? m.away : m.home, 'remindConfirm', label, m.round, '');
          else { notify(m.home, 'remindPlay', label, m.round, '', fmt(c.deadline)); notify(m.away, 'remindPlay', label, m.round, '', fmt(c.deadline)); }
        }
      } else if (left <= 0) {
        if (!(await Cup.updateOne({ _id: c._id, notified: { $ne: 'over' } }, { $addToSet: { notified: 'over' } })).modifiedCount) continue;
        const n = (await open()).length;
        if (n) lines.push(`${label} (${c.stage}): ${n} ta o'yin hal bo'lmadi`);
      }
    }
    if (lines.length) notifyAdmins('⏰ Kubok dedlayni o\'tdi:\n' + lines.join('\n') + '\nAdmin panel → Natijalar orqali hal qiling.');
  }

  async function tick() {
    const now = new Date(), digest = {};
    for (const step of [() => roundStarts(now), () => remind3h(now), () => overdue(now, digest), () => cupTick(now)]) {
      try { await step(); } catch (e) { console.error('Dedlaynlar:', e); }
    }
    const lines = Object.entries(digest).filter(([, r]) => r.win || r.void || r.manual || r.waiting).map(([lg, r]) =>
      `• ${lgName(lg)}: ${[r.win && `${r.win} ta texnik g'alaba (3:0)`, r.void && `${r.void} ta bekor qilindi`, r.manual && `${r.manual} ta bahsli`, r.waiting && `${r.waiting} ta admin hal qilishi kerak`].filter(Boolean).join(', ')}`);
    if (lines.length) notifyAdmins('⏱ Dedlayn bo\'yicha avtomatik amallar:\n' + lines.join('\n') + '\n\nXato bo\'lsa: Admin panel → Natijalar → «Tasdiqlangan» orqali natijani o\'zgartiring.');
  }

  return { tick };
};
module.exports.stamp = stamp;
module.exports.stampSeq = stampSeq;
module.exports.decide = decide;
module.exports.clampDays = clampDays;
module.exports.GRACE_H = GRACE_H;
