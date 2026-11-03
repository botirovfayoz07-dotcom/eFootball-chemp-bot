'use strict';

// Mavsum kalendari — sof hisob-kitob qatlami (Mongo/HTTP'dan mustaqil).
// Manba: webapp/league-data.js (u yerda start sanasi va paketlar turadi),
// shuning uchun brauzer va server bir xil natija oladi.

const EFL = require('../webapp/league-data');

const calendar = (now) => EFL.seasonCalendar(now);
const canRegister = (now) => calendar(now).phase === 'registration';
const bundle = (countryId, now) => EFL.bundleInfo(countryId, now);
const status = (tournamentId, now) => EFL.tournamentStatus(tournamentId, now);

// Ro'yxatdan o'tishni tekshiradi: { ok:true } yoki { ok:false, error:'notopen'|'closed' }
function registrationGate(now) {
  const cal = calendar(now);
  if (cal.phase === 'registration') return { ok: true, calendar: cal };
  return { ok: false, error: cal.phase === 'soon' ? 'notopen' : 'closed', calendar: cal };
}

function describe(now) {
  const c = calendar(now);
  return `Mavsum ${c.number} · ${c.phase} · start: ${c.startAt} · ro'yxat: ${c.opensAt}`;
}

module.exports = { calendar, canRegister, bundle, status, registrationGate, describe, EFL };
