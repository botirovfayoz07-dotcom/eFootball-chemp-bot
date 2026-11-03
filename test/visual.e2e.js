'use strict';

// Vizual tekshiruv: test turnirini yaratadi va mobil ekranlarni screenshot qiladi.
// node test/visual.e2e.js

const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const mongoose = require('mongoose');
const User = require('../models/User');
const { chromium } = require(path.join(process.env.WEBTEST_DIR || 'C:/Users/User/Documents/deepseek-harness/default-workspace/.webtest', 'node_modules', 'playwright-core'));

const TOKEN = '123456:visual-token';
const PORT = 3218;
const BASE = `http://127.0.0.1:${PORT}`;
const DB = `efootball_visual_${process.pid}_${Date.now()}`;
const MONGO = `mongodb://127.0.0.1:27017/${DB}`;
const OUT = path.join(__dirname, '..', 'screenshots');
const A = { id: 1001, first_name: 'Admin', username: 'admin_t', language_code: 'uz' };
const USERS = [
  { id: 2001, first_name: 'Bobur', username: 'bobur_10', language_code: 'uz' },
  { id: 2002, first_name: 'Charos', username: 'charos_7', language_code: 'ru' },
  { id: 2003, first_name: 'Dilshod', username: 'dilshod_9', language_code: 'en' },
  { id: 2004, first_name: 'Elyor', username: 'elyor_11', language_code: 'uz' },
  { id: 2005, first_name: 'Farrux', username: 'farrux_4', language_code: 'uz' },
  { id: 2006, first_name: 'Gulnora', username: 'gulnora_8', language_code: 'uz' },
  { id: 2007, first_name: 'Hasan', username: 'hasan_5', language_code: 'uz' },
];

function initData(user) {
  const p = new URLSearchParams();
  p.set('query_id', 'AAHvisual');
  p.set('user', JSON.stringify(user));
  p.set('auth_date', String(Math.floor(Date.now() / 1000)));
  const str = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  p.set('hash', crypto.createHmac('sha256', secret).update(str).digest('hex'));
  return p.toString();
}
async function call(p, user, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: { 'content-type': 'application/json', 'x-init-data': initData(user) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { http: res.status, ...(await res.json().catch(() => ({}))) };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(child) {
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error('server exited early');
    try { const r = await fetch(BASE + '/'); if (r.ok || r.status === 404) return; } catch (_) {}
    await sleep(150);
  }
  throw new Error('server did not start');
}

async function seed() {
  await User.create([{ telegramId: A.id, firstName: A.first_name, username: A.username, lang: 'uz' },
    ...USERS.map((u) => ({ telegramId: u.id, firstName: u.first_name, username: u.username, lang: u.language_code }))]);
  const create = await call('/api/private', A, { method: 'POST', body: { name: 'YCHL 2026', maxPlayers: 8 } });
  if (create.http !== 201) throw new Error('create failed: ' + JSON.stringify(create));
  const id = create.id;
  for (const u of USERS) {
    const r = await call(`/api/private/${id}/players`, A, { method: 'POST', body: { query: '@' + u.username } });
    if (r.http !== 201) throw new Error('add failed: ' + JSON.stringify(r));
  }
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(18, 0, 0, 0);
  const draw = await call(`/api/private/${id}/draw`, A, { method: 'POST', body: { startAt: start.toISOString(), intervalMinutes: 60 } });
  if (draw.http !== 200) throw new Error('draw failed: ' + JSON.stringify(draw));
  let d = await call('/api/private/' + id, A);
  const by = (name) => d.players.find((p) => p.name === name);
  const pair = (x, y) => d.matches.find((m) => (m.homeId === x.id && m.awayId === y.id) || (m.homeId === y.id && m.awayId === x.id));
  const [B, C, D] = ['Bobur', 'Charos', 'Dilshod'].map(by);
  const a = by('Admin');
  const scoreFor = (mm, teamId, teamGoals, oppGoals) => (mm.homeId === teamId
    ? { homeScore: teamGoals, awayScore: oppGoals }
    : { homeScore: oppGoals, awayScore: teamGoals });
  let m = pair(a, B); await call(`/api/private/${id}/matches/${m.id}/submit`, A, { method: 'POST', body: scoreFor(m, a.id, 2, 1) });
  await call(`/api/private/${id}/matches/${m.id}/confirm`, USERS[0], { method: 'POST', body: {} });
  m = pair(a, C); await call(`/api/private/${id}/matches/${m.id}/submit`, A, { method: 'POST', body: scoreFor(m, a.id, 3, 0) });
  await call(`/api/private/${id}/matches/${m.id}/confirm`, USERS[1], { method: 'POST', body: {} });
  m = pair(B, C); await call(`/api/private/${id}/matches/${m.id}/submit`, USERS[0], { method: 'POST', body: { homeScore: 1, awayScore: 1 } });
  await call(`/api/private/${id}/matches/${m.id}/confirm`, USERS[1], { method: 'POST', body: {} });
  m = pair(a, D); await call(`/api/private/${id}/matches/${m.id}/submit`, A, { method: 'POST', body: { homeScore: 2, awayScore: 2 } });
  m = pair(B, D); await call(`/api/private/${id}/matches/${m.id}/submit`, USERS[2], { method: 'POST', body: scoreFor(m, D.id, 1, 0) });
  await call(`/api/private/${id}/matches/${m.id}/dispute`, USERS[0], { method: 'POST', body: { reason: 'Skrinshot boshqacha' } });
  return id;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const child = spawn(process.execPath, ['bot.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, BOT_TOKEN: TOKEN, MONGO_URI: MONGO, PORT: String(PORT), NO_BOT: '1', ADMIN_IDS: String(A.id), MINI_APP_URL: BASE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (x) => { logs += x; });
  child.stderr.on('data', (x) => { logs += x; });
  let browser;
  try {
    await waitForServer(child);
    await mongoose.connect(MONGO);
    const id = await seed();

    const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/*', (route) => {
      const u = route.request().url();
      if (u.includes('telegram.org') || u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) return route.abort();
      return route.continue();
    });
    const user = { id: A.id, first_name: A.first_name, username: A.username, language_code: 'uz' };
    await page.addInitScript(({ init, u }) => {
      window.Telegram = { WebApp: {
        initData: init, initDataUnsafe: { user: u }, ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {},
        BackButton: { show() {}, hide() {}, onClick() {} },
        HapticFeedback: { impactOccurred() {}, selectionChanged() {}, notificationOccurred() {} },
        showConfirm(msg, cb) { cb(true); }, openTelegramLink() {},
      } };
    }, { init: initData(user), u: user });

    await page.goto(BASE + '/?lang=uz#private', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.p-card', { timeout: 15000 });
    await page.addStyleTag({ content: '#splash{display:none!important}' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '01-list.png') });

    await page.locator('[data-act="open"]').first().click();
    await page.waitForSelector('.p-table', { timeout: 10000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '02-table.png') });

    await page.locator('[data-tab="matches"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '03-matches.png') });

    await page.locator('[data-tab="admin"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '04-admin-results.png') });

    await page.locator('[data-atab="draw"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '05-admin-draw.png') });

    await page.locator('[data-tab="players"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '06-players.png') });

    await page.locator('[data-tab="admin"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-atab="results"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-act="admin-result"]').first().click();
    await page.waitForSelector('.p-sheet');
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, '07-score-modal.png') });
    await page.locator('[data-act="close-modal"]').click();

    // O'yinchi nuqtai nazari: raqib kiritgan hisobni tasdiqlash / "yolg'on" tugmalari
    const dUser = USERS[2];
    const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const playerPage = await playerContext.newPage();
    await playerPage.route('**/*', (route) => {
      const u = route.request().url();
      if (u.includes('telegram.org') || u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) return route.abort();
      return route.continue();
    });
    await playerPage.addInitScript(({ init, u }) => {
      window.Telegram = { WebApp: {
        initData: init, initDataUnsafe: { user: u }, ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {},
        BackButton: { show() {}, hide() {}, onClick() {} },
        HapticFeedback: { impactOccurred() {}, selectionChanged() {}, notificationOccurred() {} },
        showConfirm(msg, cb) { cb(true); }, openTelegramLink() {},
      } };
    }, { init: initData(dUser), u: dUser });
    await playerPage.goto(BASE + `/?lang=uz#private/${id}/matches`, { waitUntil: 'domcontentloaded' });
    await playerPage.waitForSelector('[data-act="confirm"]', { timeout: 15000 });
    await playerPage.addStyleTag({ content: '#splash{display:none!important}' });
    await playerPage.locator('[data-act="confirm"]').first().scrollIntoViewIfNeeded();
    await playerPage.waitForTimeout(300);
    await playerPage.screenshot({ path: path.join(OUT, '08-player-confirm.png') });

    // UI orqali tasdiqlash: natija darhol jadvalga tushishi kerak
    await playerPage.locator('[data-act="confirm"]').first().click();
    await playerPage.waitForTimeout(700);
    assert.ok(await playerPage.locator('.p-match.confirmed').count() >= 1, 'confirmed match should appear after UI confirmation');

    // Kichik ekran (320px) tekshiruvi
    const smallContext = await browser.newContext({ viewport: { width: 320, height: 700 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const small = await smallContext.newPage();
    await small.route('**/*', (route) => {
      const u = route.request().url();
      if (u.includes('telegram.org') || u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com')) return route.abort();
      return route.continue();
    });
    await small.addInitScript(({ init, u }) => {
      window.Telegram = { WebApp: {
        initData: init, initDataUnsafe: { user: u }, ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {},
        BackButton: { show() {}, hide() {}, onClick() {} },
        HapticFeedback: { impactOccurred() {}, selectionChanged() {}, notificationOccurred() {} },
        showConfirm(msg, cb) { cb(true); }, openTelegramLink() {},
      } };
    }, { init: initData(user), u: user });
    await small.goto(BASE + '/?lang=uz#private', { waitUntil: 'domcontentloaded' });
    await small.waitForSelector('.p-card', { timeout: 15000 });
    await small.addStyleTag({ content: '#splash{display:none!important}' });
    await small.waitForTimeout(250);
    await small.screenshot({ path: path.join(OUT, '09-small-list.png') });
    await small.locator('[data-act="open"]').first().click();
    await small.waitForSelector('.p-table', { timeout: 10000 });
    await small.waitForTimeout(250);
    const overflow = await small.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await small.screenshot({ path: path.join(OUT, '10-small-table.png') });
    if (overflow > 1) console.log('SMALL SCREEN OVERFLOW: ' + overflow + 'px');

    if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
    console.log('VISUAL OK — ' + OUT);
    console.log('tournament ' + id);
  } catch (e) {
    console.error('\n--- server logs ---\n' + logs);
    throw e;
  } finally {
    if (browser) await browser.close().catch(() => {});
    try { await mongoose.connection.dropDatabase(); } catch (_) {}
    try { await mongoose.disconnect(); } catch (_) {}
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { stdio: 'ignore' });
    else child.kill('SIGKILL');
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
