import assert from 'node:assert/strict';

// doctor.js statically imports i18n.js/store.js, which touch browser globals at load.
// Stub them so the module imports cleanly in Node (same pattern as the other test files).
const ls = new Map();
globalThis.localStorage = {
  getItem: k => ls.get(k) ?? null,
  setItem: (k, v) => ls.set(k, v),
  removeItem: k => ls.delete(k),
};
Object.defineProperty(globalThis, 'navigator', { value: { language: 'en' }, configurable: true, writable: true });
globalThis.document = { documentElement: {} };

const { summarise } = await import('../js/doctor.js');

const now = new Date();
function daysAgo(n, loudness='mild') {
  const d = new Date(now); d.setDate(d.getDate() - n);
  return { startTime: d.toISOString(), loudness, character: 'ringing', pitch: 'high', location: 'both', pulsatile: null };
}

// period filter: only entries within periodDays counted; null = all time
const entries = [ daysAgo(1,'severe'), daysAgo(10,'mild'), daysAgo(45,'mild') ];

const s30 = summarise(entries, 30);
assert.equal(s30.total, 2, '30-day period excludes the 45-day-old entry');
assert.deepStrictEqual(s30.loudness, { mild: 1, moderate: 0, severe: 1 });

const sAll = summarise(entries, null);
assert.equal(sAll.total, 3, 'null period = all time');
assert.equal(sAll.topCharacter, 'ringing', 'most common character');
assert.equal(sAll.topPitch, 'high', 'most common pitch');
assert.equal(sAll.topLocation, 'both', 'most common location');

// empty -> null tops/peaks, zero total
const sEmpty = summarise([], 30);
assert.equal(sEmpty.total, 0);
assert.equal(sEmpty.topCharacter, null);
assert.equal(sEmpty.peakTimeOfDay, null);
assert.equal(sEmpty.peakDayOfWeek, null);

// peaks: fixed local datetimes (no Z) so they are timezone-stable
const fixed = [
  { startTime: '2026-06-01T13:00:00', loudness:'mild', character:'ringing', pitch:'high', location:'both' }, // Mon afternoon
  { startTime: '2026-06-08T14:00:00', loudness:'mild', character:'ringing', pitch:'high', location:'both' }, // Mon afternoon
  { startTime: '2026-06-02T22:00:00', loudness:'mild', character:'ringing', pitch:'high', location:'both' }, // Tue night
];
const sf = summarise(fixed, null);
assert.equal(sf.peakTimeOfDay, 'afternoon', 'peak time-of-day is afternoon');
assert.equal(sf.peakDayOfWeek, 0, 'peak day-of-week is Monday (index 0)');

// ── frequencyRate ─────────────────────────────────────────────────────────────

// 30-day: 2 entries → 2 / (30/7) ≈ 0.467 per week
const sRate30 = summarise([daysAgo(1), daysAgo(10)], 30);
assert(Math.abs(sRate30.frequencyRate - 2 / (30 / 7)) < 0.01, '30-day frequency rate');

// zero entries → null (suppressed)
assert.equal(summarise([], 30).frequencyRate, null, 'frequencyRate null when no entries');

// entries exist but all outside the 30-day window → scoped is empty → null
assert.equal(summarise([daysAgo(45)], 30).frequencyRate, null, 'frequencyRate null when all entries outside period');

// all-time, 1 entry from 14 days ago → span ≥ 7d → rate ≈ 0.5
const sRate14 = summarise([daysAgo(14)], null);
assert(Math.abs(sRate14.frequencyRate - 0.5) < 0.1, 'all-time frequencyRate with 14-day span');

// all-time, 1 entry from 1 day ago → span < 7d → suppressed
const sRate1 = summarise([daysAgo(1)], null);
assert.equal(sRate1.frequencyRate, null, 'all-time frequencyRate suppressed when span < 7 days');

// ── pulsatile (delegation to pulsatileStats) ──────────────────────────────────

function epFull(n, pulsatile = null) {
  const e = daysAgo(n);
  return { ...e, pulsatile, stress: null, tiredness: null, position: null,
           surroundingNoise: null, sleepQuality: null };
}

const sPulse0 = summarise([epFull(1, null), epFull(2, null)], null);
assert.equal(sPulse0.pulsatile.count, 0, 'pulsatile count 0 when all null');
assert.equal(sPulse0.pulsatile.recorded, 0);

const sPulseMix = summarise([epFull(1, true), epFull(2, false), epFull(3, null)], null);
assert.equal(sPulseMix.pulsatile.count, 1);
assert.equal(sPulseMix.pulsatile.recorded, 2);
assert.equal(sPulseMix.pulsatile.pct, 50);

// ── triggers (delegation to triggerContext) ───────────────────────────────────

function epStress(n, stress) {
  const e = daysAgo(n);
  return { ...e, pulsatile: null, stress, tiredness: null, position: null,
           surroundingNoise: null, sleepQuality: null };
}

const sTrig = summarise([epStress(1, 'high'), epStress(2, 'high'), epStress(3, 'low')], null);
assert.equal(sTrig.triggers.length, 1, 'one trigger field with data');
assert.equal(sTrig.triggers[0].field, 'stress');
assert.equal(sTrig.triggers[0].topValue, 'high');
assert.equal(sTrig.triggers[0].topPct, 67); // Math.round(2/3 * 100)

const sTrigNone = summarise([epFull(1)], null);
assert.equal(sTrigNone.triggers.length, 0, 'triggers [] when all null');

console.log('test-doctor: all tests passed');
