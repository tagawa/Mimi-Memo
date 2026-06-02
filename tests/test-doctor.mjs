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

console.log('test-doctor: all tests passed');
