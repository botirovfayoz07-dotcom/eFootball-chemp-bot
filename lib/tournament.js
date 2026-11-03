'use strict';

// Norasmiy turnirlar uchun sof hisob-kitob funksiyalari (HTTP/Mongo'dan mustaqil).

const idOf = (x) => String(x && (x._id ?? x.id ?? x));

function shuffle(list, random = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Bir davrali (round-robin) qur'a: har kim har kim bilan bir marta o'ynaydi.
// Juftliklar soni: n*(n-1)/2. Toq ishtirokchida har turda bittasi dam oladi.
function roundRobin(players, random = Math.random) {
  const list = shuffle(players, random);
  if (list.length < 2) return [];
  const slots = list.map(idOf);
  if (slots.length % 2) slots.push(null); // BYE
  const n = slots.length;
  const rounds = n - 1;
  const pairs = [];
  let ring = [...slots];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      let homeId = ring[i];
      let awayId = ring[n - 1 - i];
      if (!homeId || !awayId) continue;
      // Uy/mehmon balansini saqlash
      if ((r + i) % 2) [homeId, awayId] = [awayId, homeId];
      pairs.push({ round: r + 1, homeId, awayId });
    }
    // Birinchi o'rin joyida qoladi, qolganlari aylanadi
    ring = [ring[0], ring[n - 1], ...ring.slice(1, n - 1)];
  }
  return pairs;
}

// Faqat tasdiqlangan o'yinlar jadvalga tushadi.
function standings(players, matches) {
  const rows = new Map();
  players.forEach((p) => {
    const id = idOf(p);
    rows.set(id, {
      playerId: id,
      name: p.name || '',
      username: p.username || '',
      club: p.club || '',
      played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0,
    });
  });
  (matches || []).forEach((m) => {
    if (m.status !== 'confirmed') return;
    const h = rows.get(idOf(m.homeId ?? m.home));
    const a = rows.get(idOf(m.awayId ?? m.away));
    if (!h || !a) return;
    const hs = Number(m.homeScore), as = Number(m.awayScore);
    if (!Number.isInteger(hs) || !Number.isInteger(as)) return;
    h.played++; a.played++;
    h.gf += hs; h.ga += as;
    a.gf += as; a.ga += hs;
    if (hs > as) { h.w++; a.l++; h.pts += 3; }
    else if (hs < as) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  });
  const out = [...rows.values()];
  out.forEach((r) => { r.gd = r.gf - r.ga; });
  out.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.name.localeCompare(y.name));
  return out.map((r, i) => ({ ...r, pos: i + 1 }));
}

function parseScore(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 99) return null;
  return n;
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

module.exports = { idOf, shuffle, roundRobin, standings, parseScore, clampInt };
