'use strict';
// Chempionlar ligasi: sof mantiq testlari (DB talab qilinmaydi)
// Ishga tushirish: node --test test/
const test = require('node:test');
const assert = require('node:assert/strict');
const u = require('../lib/ucl');

test('pley-off setkasi urug\' tartibida (8 klub)', () => {
  assert.deepEqual(u.bracketPairs(8), [[1, 8], [4, 5], [2, 7], [3, 6]]);
});

test('bosqichlar: 8 klub → qf, sf, final; 4 klub → sf, final', () => {
  assert.deepEqual(u.knockoutStages(8), ['qf', 'sf', 'final']);
  assert.deepEqual(u.knockoutStages(4), ['sf', 'final']);
});

test('jadval: ball, keyin farq, keyin gol bo\'yicha tartiblanadi', () => {
  const ids = [1, 2, 3, 4];
  const ms = [
    { home: 1, away: 2, hg: 2, ag: 0 }, { home: 3, away: 4, hg: 1, ag: 1 },
    { home: 1, away: 3, hg: 3, ag: 1 }, { home: 2, away: 4, hg: 0, ag: 0 },
    { home: 4, away: 1, hg: 0, ag: 2 }, { home: 2, away: 3, hg: 1, ag: 1 },
  ];
  const rows = u.standings(ids, ms);
  assert.equal(rows[0].id, 1);
  assert.equal(rows[0].pts, 9);
  assert.equal(rows.length, 4);
});

test('lig tugashini aniqlash: hisobsiz o\'yin bo\'lsa false', () => {
  assert.equal(u.leagueDone([{ hg: 1, ag: 0 }, { hg: null, ag: null }]), false);
  assert.equal(u.leagueDone([{ hg: 1, ag: 0 }, { hg: 2, ag: 2 }]), true);
  assert.equal(u.leagueDone([]), false);
});

test('pley-off juftliklari jadvaldan olinadi (4 klub → 2 juftlik)', () => {
  const ids = [1, 2, 3, 4];
  const ms = [
    { home: 1, away: 2, hg: 2, ag: 0 }, { home: 3, away: 4, hg: 1, ag: 1 },
    { home: 1, away: 3, hg: 3, ag: 1 }, { home: 2, away: 4, hg: 0, ag: 0 },
    { home: 4, away: 1, hg: 0, ag: 2 }, { home: 2, away: 3, hg: 1, ag: 1 },
  ];
  const k = u.knockoutPairs(u.standings(ids, ms));
  assert.equal(k.k, 4);
  assert.deepEqual(k.pairs, [[1, 4], [3, 2]]);
});

test('g\'olib: durang bo\'lsa null, aks holda katta hisobdagi jamoa', () => {
  assert.equal(u.winnerOf({ hg: 2, ag: 1, home: 5, away: 6 }), 5);
  assert.equal(u.winnerOf({ hg: 0, ag: 3, home: 5, away: 6 }), 6);
  assert.equal(u.winnerOf({ hg: 1, ag: 1, home: 5, away: 6 }), null);
});
