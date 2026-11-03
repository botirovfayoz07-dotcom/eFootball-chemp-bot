'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { roundRobin, standings, parseScore, clampInt } = require('../lib/tournament');

const players = (n) => Array.from({ length: n }, (_, i) => ({ _id: 'p' + (i + 1), name: 'Player ' + (i + 1) }));

test('round robin: every pair meets exactly once (even)', () => {
  const pairs = roundRobin(players(8), () => 0.42);
  assert.equal(pairs.length, 28);
  const keys = new Set(pairs.map((p) => [p.homeId, p.awayId].sort().join('|')));
  assert.equal(keys.size, 28);
  const perRound = new Map();
  pairs.forEach((p) => perRound.set(p.round, (perRound.get(p.round) || 0) + 1));
  assert.deepEqual([...perRound.values()], [4, 4, 4, 4, 4, 4, 4]);
});

test('round robin: odd player count uses a bye and still meets everyone', () => {
  const pairs = roundRobin(players(5), () => 0.2);
  assert.equal(pairs.length, 10);
  const seen = new Map();
  pairs.forEach((p) => {
    seen.set(p.homeId, (seen.get(p.homeId) || 0) + 1);
    seen.set(p.awayId, (seen.get(p.awayId) || 0) + 1);
  });
  assert.deepEqual([...seen.values()], [4, 4, 4, 4, 4]);
});

test('standings: only confirmed matches count and sorting is correct', () => {
  const ps = players(4);
  const matches = [
    { homeId: 'p1', awayId: 'p2', homeScore: 2, awayScore: 1, status: 'confirmed' },
    { homeId: 'p3', awayId: 'p4', homeScore: 0, awayScore: 0, status: 'confirmed' },
    { homeId: 'p1', awayId: 'p3', homeScore: 9, awayScore: 0, status: 'pending' },
    { homeId: 'p2', awayId: 'p4', homeScore: 5, awayScore: 0, status: 'disputed' },
  ];
  const rows = standings(ps, matches);
  assert.equal(rows[0].playerId, 'p1');
  assert.deepEqual([rows[0].pts, rows[0].played, rows[0].gf, rows[0].ga, rows[0].gd], [3, 1, 2, 1, 1]);
  assert.equal(rows.find((r) => r.playerId === 'p2').pts, 0);
  assert.equal(rows.find((r) => r.playerId === 'p3').pts, 1);
});

test('score parsing rejects empty, negative, fractional and oversized values', () => {
  assert.equal(parseScore('0'), 0);
  assert.equal(parseScore(7), 7);
  assert.equal(parseScore(''), null);
  assert.equal(parseScore(null), null);
  assert.equal(parseScore(-1), null);
  assert.equal(parseScore(2.5), null);
  assert.equal(parseScore(100), null);
});

test('clampInt keeps schedule interval inside limits', () => {
  assert.equal(clampInt(5, 10, 1440, 60), 10);
  assert.equal(clampInt(9999, 10, 1440, 60), 1440);
  assert.equal(clampInt('x', 10, 1440, 60), 60);
});
