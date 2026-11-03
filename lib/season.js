'use strict';

/* ============================================================================
   Mavsum kalendari — PREMIER LIGA + CHAMPIONSHIP + FA CUP + COMMUNITY SHIELD
   ----------------------------------------------------------------------------
   Qoida: bitta davlatning BARCHA turnirlari BITTA vaqtda boshlanadi.
   Start sanasi ADMIN PANELDA kiritiladi va `seasons` kolleksiyasida saqlanadi.
   Baza bo'sh bo'lsa — pastdagi standart sana ishlatiladi.

   Bu fayl `webapp/league-data.js` ga TEGMAYDI — faqat undan ma'lumot o'qiydi
   (leaguesOf, countryById, season).
   ========================================================================== */

const EFL = require('../webapp/league-data');
const Season = require('../models/Season');

const DAY = 86400000;
const TTL = 30 * 1000; // 30 sekund kesh

const DEFAULTS = {
  startAt: process.env.SEASON_START || '2026-12-19T18:00:00+05:00',
  endAt: process.env.SEASON_END || '2027-06-06T21:00:00+05:00',
  openDaysBefore: Number(process.env.SEASON_OPEN_DAYS || 60),
  timezone: 'Asia/Tashkent',
};

const DEFAULT_START_MS = Date.parse(DEFAULTS.startAt);
const DEFAULT_END_MS = Date.parse(DEFAULTS.endAt);

// Kubok turlari: ligalar bilan birga avtomatik ochiladi
const isAutoCup = (k) => k && (k.type === 'cup' || k.type === 'supercup');

/* ——— Sof hisob: faza ——— */
// soon → registration → live → finished
function calendar(nowMs, cfg) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const startMs = Number.isFinite(cfg && cfg.startMs) ? cfg.startMs : DEFAULT_START_MS;
  const endMs = Number.isFinite(cfg && cfg.endMs) ? cfg.endMs : DEFAULT_END_MS;
  const openDays = Number.isFinite(cfg && cfg.openDaysBefore) ? cfg.openDaysBefore : DEFAULTS.openDaysBefore;
  const openMs = startMs - openDays * DAY;

  let phase = 'finished';
  if (now < openMs) phase = 'soon';
  else if (now < startMs) phase = 'registration';
  else if (now < endMs) phase = 'live';

  return {
    number: EFL.season,
    phase,
    canRegister: phase === 'registration',
    now,
    opensAt: new Date(openMs).toISOString(),
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
    openDaysBefore: openDays,
    timezone: DEFAULTS.timezone,
    msToStart: startMs - now,
    msToEnd: endMs - now,
  };
}

/* ——— Bitta davlat = bitta paket ——— */
// Angliya: premier-league + championship + fa-cup + community-shield
// Hammasida bitta startAt.
function bundleSync(countryId, nowMs, cfg) {
  const cal = calendar(nowMs, cfg);
  const country = EFL.countryById[countryId] || null;
  const leagues = EFL.leaguesOf(countryId).map((l) => ({
    id: l.id, name: l.name, kind: 'league', group: l.group, auto: false,
  }));
  const cups = ((country && country.cups) || []).filter(isAutoCup).map((k) => ({
    id: k.id, name: k.name, kind: k.type, auto: true,
  }));
  return {
    country: countryId,
    number: cal.number,
    phase: cal.phase,
    canRegister: cal.canRegister,
    startAt: cal.startAt,
    endAt: cal.endAt,
    opensAt: cal.opensAt,
    timezone: cal.timezone,
    msToStart: cal.msToStart,
    sameStart: true,
    tournaments: [...leagues, ...cups],
  };
}

/* ——— Baza (admin kiritgan sana) + kesh ——— */
let cache = { at: 0, cfg: null, src: 'default' };

async function loadCfg(force) {
  if (!force && Date.now() - cache.at < TTL) return cache.cfg;
  let cfg = null;
  let src = 'default';
  try {
    const doc = await Season.findOne({ number: EFL.season }).lean();
    if (doc && doc.startAt) {
      const startMs = new Date(doc.startAt).getTime();
      if (Number.isFinite(startMs)) {
        cfg = {
          startMs,
          endMs: doc.endAt ? new Date(doc.endAt).getTime() : undefined,
          openDaysBefore: Number.isFinite(doc.openDaysBefore) ? doc.openDaysBefore : undefined,
        };
        src = 'admin';
      }
    }
  } catch (_) {
    cfg = null;
    src = 'default';
  }
  cache = { at: Date.now(), cfg, src };
  return cfg;
}

const invalidate = () => { cache = { at: 0, cfg: null, src: 'default' }; };

/* ——— Tashqi API (hammasi async) ——— */
async function getCalendar(now) {
  return calendar(now, await loadCfg());
}
async function getBundle(countryId, now) {
  return bundleSync(countryId, now, await loadCfg());
}
async function registrationGate(now) {
  const cal = await getCalendar(now);
  if (cal.phase === 'registration') return { ok: true, calendar: cal };
  return { ok: false, error: cal.phase === 'soon' ? 'notopen' : 'closed', calendar: cal };
}

async function state() {
  const doc = await Season.findOne({ number: EFL.season }).lean().catch(() => null);
  const cal = await getCalendar();
  return {
    calendar: cal,
    source: cache.src,
    startAt: doc && doc.startAt ? doc.startAt : null,
    endAt: doc && doc.endAt ? doc.endAt : null,
    openDaysBefore: doc && Number.isFinite(doc.openDaysBefore) ? doc.openDaysBefore : DEFAULTS.openDaysBefore,
    updatedBy: doc ? doc.updatedBy : null,
    openedAt: doc ? doc.openedAt : null,
    cupsStartedAt: doc ? doc.cupsStartedAt : null,
    cups: doc ? doc.cups : [],
  };
}

/* ——— Admin panelda sanani belgilash ——— */
async function setSchedule({ startAt, endAt, openDaysBefore, adminId } = {}) {
  const startMs = Date.parse(String(startAt || ''));
  if (!Number.isFinite(startMs)) {
    const e = new Error('time');
    e.code = 'time';
    throw e;
  }
  const endMs = endAt ? Date.parse(String(endAt)) : startMs + 180 * DAY;
  if (!Number.isFinite(endMs) || endMs <= startMs) {
    const e = new Error('range');
    e.code = 'range';
    throw e;
  }
  const openDays = Number.isFinite(Number(openDaysBefore))
    ? Math.min(365, Math.max(0, Number(openDaysBefore)))
    : DEFAULTS.openDaysBefore;

  await Season.updateOne(
    { number: EFL.season },
    {
      $set: {
        startAt: new Date(startMs),
        endAt: new Date(endMs),
        openDaysBefore: openDays,
        updatedBy: Number(adminId) || null,
        // Sana o'zgardi — avtomatik start qaytadan baholanadi
        openedAt: null,
        cupsStartedAt: null,
        cups: [],
      },
    },
    { upsert: true }
  );

  invalidate();
  return state();
}

module.exports = {
  EFL,
  DEFAULTS,
  // sof hisob (bazasiz)
  calendarSync: calendar,
  bundleSync,
  // bazadan (admin kiritgan sana) — async
  calendar: getCalendar,
  bundle: getBundle,
  registrationGate,
  state,
  setSchedule,
  invalidate,
  config: () => loadCfg(true),
};
