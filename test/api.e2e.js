'use strict';

// To'liq API oqimi: qur'a -> hisob -> tasdiq/rad -> admin natijasi -> ishtirokchi chiqarish.
// Ishga tushirish: node test/api.e2e.js

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const mongoose = require('mongoose');
const User = require('../models/User');

const TOKEN = '123456:test-token';
const PORT = 3217;
const BASE = `http://127.0.0.1:${PORT}`;
const DB = `efootball_e2e_${process.pid}_${Date.now()}`;
const MONGO = `mongodb://127.0.0.1:27017/${DB}`;
const ADMIN = { id: 1001, first_name: 'Admin', username: 'admin_t', language_code: 'uz' };
const B = { id: 2002, first_name: 'Bobur', username: 'player_b', language_code: 'uz' };
const C = { id: 2003, first_name: 'Charos', username: 'player_c', language_code: 'ru' };
const D = { id: 2004, first_name: 'Dilshod', username: 'player_d', language_code: 'en' };

function initData(user) {
  const p = new URLSearchParams();
  p.set('query_id', 'AAHtest');
  p.set('user', JSON.stringify(user));
  p.set('auth_date', String(Math.floor(Date.now() / 1000)));
  const str = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  p.set('hash', crypto.createHmac('sha256', secret).update(str).digest('hex'));
  return p.toString();
}

async function call(path, user, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-init-data': user ? initData(user) : '' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  // `status` har doim HTTP status bo'lsin (ba'zi javoblarda o'z `status` maydoni bor)
  return { ...json, status: res.status };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(child) {
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error('server exited early');
    try {
      const r = await fetch(BASE + '/');
      if (r.ok || r.status === 404) return;
    } catch (_) {}
    await sleep(150);
  }
  throw new Error('server did not start');
}

async function main() {
  const child = spawn(process.execPath, ['bot.js'], {
    cwd: require('node:path').join(__dirname, '..'),
    env: {
      ...process.env,
      BOT_TOKEN: TOKEN,
      MONGO_URI: MONGO,
      PORT: String(PORT),
      NO_BOT: '1',
      ADMIN_IDS: String(ADMIN.id),
      MINI_APP_URL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });

  try {
    await waitForServer(child);
    await mongoose.connect(MONGO);
    await User.create([
      { telegramId: ADMIN.id, firstName: ADMIN.first_name, username: ADMIN.username, lang: 'uz' },
      { telegramId: B.id, firstName: B.first_name, username: B.username, lang: 'uz' },
      { telegramId: C.id, firstName: C.first_name, username: C.username, lang: 'ru' },
      { telegramId: D.id, firstName: D.first_name, username: D.username, lang: 'en' },
    ]);

    const profile = await call('/api/profile', ADMIN);
    assert.equal(profile.status, 200);
    assert.equal(profile.admin, true);

    // Turnir yaratish
    const create = await call('/api/private', ADMIN, { method: 'POST', body: { name: 'E2E Cup', maxPlayers: 4 } });
    assert.equal(create.status, 201);
    const id = create.id;
    let detail = await call('/api/private/' + id, ADMIN);
    assert.equal(detail.status, 200);
    assert.equal(detail.players.length, 1);

    // Ishtirokchilar: @username, Telegram ID va qo'lda ism
    assert.equal((await call(`/api/private/${id}/players`, ADMIN, { method: 'POST', body: { query: '@player_b' } })).status, 201);
    assert.equal((await call(`/api/private/${id}/players`, ADMIN, { method: 'POST', body: { query: String(C.id) } })).status, 201);
    assert.equal((await call(`/api/private/${id}/players`, ADMIN, { method: 'POST', body: { query: '', name: 'Manual D', club: 'Inter' } })).status, 201);
    assert.equal((await call(`/api/private/${id}/players`, ADMIN, { method: 'POST', body: { query: '@player_b' } })).status, 409);

    // Begona admin boshqa turnirni boshqara olmaydi
    assert.equal((await call(`/api/private/${id}/players`, B, { method: 'POST', body: { name: 'X' } })).status, 403);
    assert.equal((await call(`/api/private/${id}/draw`, B, { method: 'POST', body: {} })).status, 403);
    const listB = await call('/api/private', B);
    assert.equal(listB.admin, false);
    assert.equal(listB.tournaments.find((x) => x.id === id).canManage, false);
    const detailB = await call('/api/private/' + id, B);
    assert.equal(detailB.tournament.canManage, false);
    assert.equal(detailB.me.admin, false);
    assert.equal('telegramId' in detailB.players.find((p) => p.name === 'Admin'), false);

    // Qur'a
    const start = new Date(Date.now() + 3600 * 1000).toISOString();
    const draw = await call(`/api/private/${id}/draw`, ADMIN, { method: 'POST', body: { startAt: start, intervalMinutes: 30 } });
    assert.equal(draw.status, 200);
    assert.equal(draw.matches, 6);
    assert.equal(draw.rounds, 3);
    detail = await call('/api/private/' + id, ADMIN);
    assert.equal(detail.matches.length, 6);
    assert.equal(detail.tournament.status, 'live');

    const pm = new Map(detail.players.map((p) => [p.name, p]));
    const aP = detail.players.find((p) => p.telegramId === ADMIN.id);
    const bP = detail.players.find((p) => p.telegramId === B.id);
    const cP = detail.players.find((p) => p.telegramId === C.id);
    assert.ok(aP && bP && cP && pm.get('Manual D'));

    const pair = (x, y) => detail.matches.find((m) =>
      (m.homeId === x.id && m.awayId === y.id) || (m.homeId === y.id && m.awayId === x.id));

    const ab = pair(aP, bP);
    const ac = pair(aP, cP);
    const bd = pair(bP, pm.get('Manual D'));
    // Qur'a tasodifiy uy/mehmon beradi — kerakli jamoa uchun hisobni to'g'ri yo'nalishda yuboramiz
    const scoreFor = (m, teamId, teamGoals, oppGoals) => (m.homeId === teamId
      ? { homeScore: teamGoals, awayScore: oppGoals }
      : { homeScore: oppGoals, awayScore: teamGoals });

    // Hisob yuborish + raqib tasdiqlashi
    assert.equal((await call(`/api/private/${id}/matches/${ab.id}/submit`, ADMIN, { method: 'POST', body: scoreFor(ab, aP.id, 2, 1) })).status, 200);
    assert.equal((await call(`/api/private/${id}/matches/${ab.id}/confirm`, ADMIN, { method: 'POST', body: {} })).status, 403);
    assert.equal((await call(`/api/private/${id}/matches/${ab.id}/confirm`, C, { method: 'POST', body: {} })).status, 403);
    assert.equal((await call(`/api/private/${id}/matches/${ab.id}/confirm`, B, { method: 'POST', body: {} })).status, 200);

    detail = await call('/api/private/' + id, ADMIN);
    let row = detail.table.find((r) => r.playerId === aP.id);
    assert.deepEqual([row.pts, row.played, row.gf, row.ga], [3, 1, 2, 1]);

    // Rad etish: hisob bekor, jadvalga kirmaydi
    assert.equal((await call(`/api/private/${id}/matches/${ac.id}/submit`, ADMIN, { method: 'POST', body: { homeScore: 0, awayScore: 0 } })).status, 200);
    assert.equal((await call(`/api/private/${id}/matches/${ac.id}/dispute`, C, { method: 'POST', body: { reason: 'wrong' } })).status, 200);
    detail = await call('/api/private/' + id, ADMIN);
    let acM = detail.matches.find((m) => m.id === ac.id);
    assert.equal(acM.status, 'disputed');
    row = detail.table.find((r) => r.playerId === aP.id);
    assert.equal(row.pts, 3);
    // Nizodan keyin o'yinchi qayta hisob yubora olmaydi — faqat admin
    assert.equal((await call(`/api/private/${id}/matches/${ac.id}/submit`, ADMIN, { method: 'POST', body: { homeScore: 2, awayScore: 0 } })).status, 409);

    // Admin natijani kiritadi
    assert.equal((await call(`/api/private/${id}/matches/${ac.id}/admin-result`, ADMIN, { method: 'POST', body: scoreFor(ac, aP.id, 1, 0) })).status, 200);
    detail = await call('/api/private/' + id, ADMIN);
    row = detail.table.find((r) => r.playerId === aP.id);
    assert.deepEqual([row.pts, row.played, row.gf, row.ga], [6, 2, 3, 1]);

    // Admin bekor qilishi va qayta kiritishi
    assert.equal((await call(`/api/private/${id}/matches/${bd.id}/submit`, B, { method: 'POST', body: scoreFor(bd, bP.id, 3, 3) })).status, 200);
    assert.equal((await call(`/api/private/${id}/matches/${bd.id}/admin-reject`, ADMIN, { method: 'POST', body: {} })).status, 200);
    assert.equal((await call(`/api/private/${id}/matches/${bd.id}/admin-result`, ADMIN, { method: 'POST', body: scoreFor(bd, bP.id, 4, 2) })).status, 200);

    // Vaqtni o'zgartirish
    const newTime = new Date(Date.now() + 7200 * 1000).toISOString();
    assert.equal((await call(`/api/private/${id}/matches/${bd.id}`, ADMIN, { method: 'PATCH', body: { scheduledAt: newTime } })).status, 200);
    detail = await call('/api/private/' + id, ADMIN);
    assert.equal(new Date(detail.matches.find((m) => m.id === bd.id).scheduledAt).toISOString(), newTime);

    // Ishtirokchini chiqarish: u bilan bog'liq o'yinlar ham o'chadi
    const manual = pm.get('Manual D');
    const removed = await call(`/api/private/${id}/players/${manual.id}`, ADMIN, { method: 'DELETE' });
    assert.equal(removed.status, 200);
    assert.equal(removed.removedMatches, 3);
    detail = await call('/api/private/' + id, ADMIN);
    assert.equal(detail.players.length, 3);
    assert.equal(detail.matches.length, 3);

    // Tugatish: yangi natija qabul qilinmaydi
    assert.equal((await call(`/api/private/${id}`, ADMIN, { method: 'PATCH', body: { status: 'finished' } })).status, 200);
    const bc = pair(bP, cP);
    assert.equal((await call(`/api/private/${id}/matches/${bc.id}/submit`, B, { method: 'POST', body: { homeScore: 1, awayScore: 0 } })).status, 409);

    console.log('E2E OK — tournament, draw, confirm, dispute, admin result, time, remove, finish');
  } catch (e) {
    console.error('\n--- server logs ---\n' + logs);
    throw e;
  } finally {
    try { await mongoose.connection.dropDatabase(); } catch (_) {}
    try { await mongoose.disconnect(); } catch (_) {}
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore' });
    } else child.kill('SIGKILL');
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
