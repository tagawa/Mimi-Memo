import assert from 'node:assert/strict';
const { timeOfDayBuckets, dayOfWeekCounts, loudnessBreakdown, entriesPerDay, pulsatileStats } = await import('../js/stats.js');

function ep(startTime, loudness = null) { return { startTime, loudness }; }

// time-of-day buckets: morning 5-11, afternoon 12-16, evening 17-20, night 21-4
const tod = timeOfDayBuckets([
  ep('2026-06-01T06:00:00'), // morning
  ep('2026-06-01T13:00:00'), // afternoon
  ep('2026-06-01T18:00:00'), // evening
  ep('2026-06-01T23:00:00'), // night
  ep('2026-06-01T02:00:00'), // night
]);
assert.deepStrictEqual(tod, { morning: 1, afternoon: 1, evening: 1, night: 2 }, 'time-of-day buckets');

// day-of-week: index 0 = Monday .. 6 = Sunday. 2026-06-01 is a Monday.
const dow = dayOfWeekCounts([ ep('2026-06-01T10:00:00'), ep('2026-06-08T10:00:00'), ep('2026-06-07T10:00:00') ]);
assert.equal(dow[0], 2, 'two Mondays');
assert.equal(dow[6], 1, 'one Sunday');
assert.equal(dow.length, 7, 'seven days');

// loudness breakdown ignores null
const lb = loudnessBreakdown([ ep('x','mild'), ep('x','mild'), ep('x','severe'), ep('x',null) ]);
assert.deepStrictEqual(lb, { mild: 2, moderate: 0, severe: 1 }, 'loudness breakdown ignores null');

// entries per day: returns map of YYYY-MM-DD -> count (local date)
const perDay = entriesPerDay([ ep('2026-06-01T10:00:00'), ep('2026-06-01T20:00:00'), ep('2026-06-02T10:00:00') ]);
assert.equal(perDay['2026-06-01'], 2);
assert.equal(perDay['2026-06-02'], 1);

// ── pulsatileStats ────────────────────────────────────────────────────────────

// empty input
assert.deepStrictEqual(pulsatileStats([]), { count: 0, recorded: 0, pct: 0 }, 'pulsatile: empty');

// all null → treated as not recorded
assert.deepStrictEqual(
  pulsatileStats([{ pulsatile: null }, { pulsatile: null }]),
  { count: 0, recorded: 0, pct: 0 },
  'pulsatile: all null'
);

// mixed true / false / null
assert.deepStrictEqual(
  pulsatileStats([{ pulsatile: true }, { pulsatile: false }, { pulsatile: null }]),
  { count: 1, recorded: 2, pct: 50 },
  'pulsatile: mixed'
);

// all true
assert.deepStrictEqual(
  pulsatileStats([{ pulsatile: true }, { pulsatile: true }]),
  { count: 2, recorded: 2, pct: 100 },
  'pulsatile: all true'
);

// all false → count 0, pct 0
assert.deepStrictEqual(
  pulsatileStats([{ pulsatile: false }]),
  { count: 0, recorded: 1, pct: 0 },
  'pulsatile: all false'
);

console.log('test-stats: all tests passed');
