'use strict';

// Mavsum kalendari testlari — ligalar va kuboklar bitta startda boshlanishini tekshiradi.
// Ishga tushirish: npm test

const test = require('node:test');
const assert = require('node:assert/strict');
const EFL = require('../webapp/league-data');
const season = require('../lib/season');

const DAY = 86400000;
const START = Date.parse(EFL.SEASON.startAt);
const END = Date.parse(EFL.SEASON.endAt);
const OPEN = START - (Number(EFL.SEASON.openDaysBefore) || 0) * DAY;

test('calendar: fazalar ketma-ketligi to‘g‘ri (soon → registration → live → finished)', () => {
  assert.equal(season.calendar(OPEN - 1).phase, 'soon');
  assert.equal(season.calendar(OPEN).phase, 'registration');
  assert.equal(season.calendar(START - 1).phase, 'registration');
  // Start soniyasida ham ro‘yxat yopiladi — hech kim kech qolib yozila olmaydi
  assert.equal(season.calendar(START).phase, 'live');
  assert.equal(season.calendar(END - 1).phase, 'live');
  assert.equal(season.calendar(END).phase, 'finished');
});

test('calendar: canRegister faqat registration fazasida true', () => {
  assert.equal(season.calendar(OPEN - 1).canRegister, false);
  assert.equal(season.calendar(OPEN + 1000).canRegister, true);
  assert.equal(season.calendar(START).canRegister, false);
  assert.equal(season.calendar(END).canRegister, false);
});

test('registrationGate: xato kodlari (notopen / closed)', () => {
  assert.deepEqual(season.registrationGate(OPEN - 1).error, 'notopen');
  assert.deepEqual(season.registrationGate(START).error, 'closed');
  assert.equal(season.registrationGate(OPEN + 1000).ok, true);
  assert.equal(season.registrationGate(OPEN + 1000).error, undefined);
});

test('Angliya: Premier League + Championship + FA Cup + Community Shield — bitta start', () => {
  const at = OPEN + 1000;
  const b = EFL.bundleInfo('en', at);
  assert.equal(b.sameStart, true);
  assert.equal(b.phase, 'registration');

  const ids = b.tournaments.map((t) => t.id);
  assert.deepEqual(ids, ['premier-league', 'championship', 'fa-cup', 'community-shield']);

  // Kuboklar "avtomatik" — qo'lda ochilmaydi, ligalar bilan birga start oladi
  const auto = b.tournaments.filter((t) => t.auto).map((t) => t.id);
  assert.deepEqual(auto, ['fa-cup', 'community-shield']);

  // Har bir turnir uchun start sanasi aynan bir xil
  ids.forEach((id) => {
    const st = EFL.tournamentStatus(id, at);
    assert.equal(st.startAt, b.startAt, `${id} start sanasi boshqacha`);
    assert.equal(st.phase, 'registration', `${id} fazasi boshqacha`);
  });
});

test('Angliya: startdan keyin hamma turnir bir vaqtda live bo‘ladi', () => {
  const at = START + 1000;
  const b = EFL.bundleInfo('en', at);
  assert.equal(b.phase, 'live');
  ['premier-league', 'championship', 'fa-cup', 'community-shield'].forEach((id) => {
    const st = EFL.tournamentStatus(id, at);
    assert.equal(st.phase, 'live', `${id} live bo'lmadi`);
  });
});

test('hamma ochiq davlat: ligalar va kuboklar bitta kalendar startiga bog‘langan', () => {
  const at = OPEN + 1000;
  const cal = season.calendar(at);
  EFL.COUNTRIES.filter((c) => c.open).forEach((c) => {
    const b = EFL.bundleInfo(c.id, at);
    assert.equal(b.sameStart, true, `${c.id}: sameStart`);
    assert.equal(b.startAt, cal.startAt, `${c.id}: start sanasi mavsum bilan mos emas`);
    b.tournaments.forEach((t) => {
      const st = EFL.tournamentStatus(t.id, at);
      assert.equal(st.startAt, cal.startAt, `${c.id}/${t.id}: alohida start`);
    });
  });
});

test('mavsum raqami va kalendar bir manbadan olinadi', () => {
  assert.equal(EFL.season, EFL.SEASON.number);
  assert.equal(season.calendar(OPEN + 1000).number, EFL.SEASON.number);
});

test('bundleOfLeague: liga qaysi davlat paketiga tegishli ekani aniqlanadi', () => {
  assert.equal(EFL.bundleOfLeague('premier-league'), 'en');
  assert.equal(EFL.bundleOfLeague('championship'), 'en');
  assert.equal(EFL.bundleOfLeague('laliga'), 'es');
  assert.equal(EFL.bundleOfLeague('nope'), null);
});

test('noma’lum davlat: bo‘sh paket qaytadi, xato tashlamaydi', () => {
  const b = EFL.bundleInfo('zz', OPEN + 1000);
  assert.deepEqual(b.tournaments, []);
  assert.equal(b.sameStart, true);
});
