const crypto = require('crypto');

// Fisher–Yates aralashtirish (qura)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Doira usuli: har bir juftlik bir marta (double bo'lsa — uyda va mehmonda ikki marta) uchrashadi.
// Qaytaradi: [{ round, home, away }]
function roundRobin(ids, double = true) {
  const p = [...ids];
  if (p.length % 2) p.push(null); // juft bo'lmasa — dam oluvchi
  const n = p.length, rounds = n - 1, out = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = p[i], b = p[n - 1 - i];
      if (a == null || b == null) continue;
      // uy/mehmon almashib turishi uchun
      const flip = (r + i) % 2 === 1;
      out.push({ round: r + 1, home: flip ? b : a, away: flip ? a : b });
    }
    p.splice(1, 0, p.pop()); // birinchisidan tashqari hammasini aylantirish
  }
  if (double) out.push(...out.slice().map((m) => ({ round: m.round + rounds, home: m.away, away: m.home })));
  return out;
}

// Yangi qo'shilgan o'yinchi uchun: qolganlar bilan o'yinlar, `startRound` dan keyingi turlarga
function fixturesForNewcomer(newId, others, startRound, double = true) {
  const out = [];
  others.forEach((o, i) => out.push({ round: startRound + i + 1, home: i % 2 ? o : newId, away: i % 2 ? newId : o }));
  if (double) others.forEach((o, i) => out.push({ round: startRound + others.length + i + 1, home: i % 2 ? newId : o, away: i % 2 ? o : newId }));
  return out;
}

// Tasdiqlangan o'yinlardan jadval statistikasi: Map<telegramId, {pts,w,d,l,gf,ga}>
function computeStats(matches) {
  const st = new Map();
  const row = (id) => { if (!st.has(id)) st.set(id, { pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }); return st.get(id); };
  for (const m of matches) {
    const h = row(m.home), a = row(m.away);
    h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
    if (m.hg > m.ag) { h.w++; h.pts += 3; a.l++; }
    else if (m.hg < m.ag) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return st;
}

// Play-off setkasi uchun urug'lar tartibi: p=8 → [1,8,4,5,2,7,3,6] (ketma-ket juftlar o'ynaydi)
function seedOrder(p) {
  let o = [1];
  while (o.length < p) { const m = o.length * 2 + 1; o = o.flatMap((x) => [x, m - x]); }
  return o;
}
// Tur muddati: boshlanish kunidan `round * days` kun keyin, Toshkent vaqti (UTC+5) bilan 23:59
const TZ = 5 * 3600 * 1000;
function roundDeadline(startedAt, round, days) {
  const b = new Date(new Date(startedAt).getTime() + TZ);
  return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate() + round * days, 23, 59) - TZ);
}
// Katta hisob: biror tomon 6 va undan ko'p gol urgan bo'lsa, tashkilotchi/admin tasdiqlaydi
const BIG_SCORE = 6;
const isBig = (hg, ag) => hg >= BIG_SCORE || ag >= BIG_SCORE;

module.exports = { shuffle, roundRobin, fixturesForNewcomer, computeStats, seedOrder, roundDeadline, isBig, BIG_SCORE };
