import assert from 'node:assert/strict';
const { timeOfDayBuckets, dayOfWeekCounts, loudnessBreakdown, entriesPerDay, pulsatileStats, triggerContext } = await import('../js/stats.js');

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

// ── triggerContext ────────────────────────────────────────────────────────────

// helper: entry with all trigger fields null by default
function trig(stress = null, tiredness = null, position = null,
               surroundingNoise = null, alcoholTiming = null, caffeineTiming = null) {
  return { stress, tiredness, position, surroundingNoise, alcoholTiming, caffeineTiming };
}

// empty input → []
assert.deepStrictEqual(triggerContext([]), [], 'triggerContext: empty input');

// all null → []
assert.deepStrictEqual(triggerContext([trig()]), [], 'triggerContext: all null');

// single field with data → one item, correct shape
const r1 = triggerContext([trig('high')]);
assert.equal(r1.length, 1, 'one field with data');
assert.equal(r1[0].field, 'stress');
assert.equal(r1[0].topValue, 'high');
assert.equal(r1[0].topPct, 100);
assert.equal(r1[0].recorded, 1);
assert.equal(r1[0].total, 1);
assert.equal(r1[0].labelKey, 'log.stress');
assert.equal(r1[0].valueKey, 'log.stressHigh');

// tie-breaking: stress low=1, high=1 → picks 'low' (first in enum order)
const r2 = triggerContext([trig('low'), trig('high')]);
assert.equal(r2[0].topValue, 'low', 'tie-breaking: first by enum order');

// sparse field: recorded=1, total=3 — renderer decides on footnote using these values
const r3 = triggerContext([trig('high'), trig(), trig()]);
assert.equal(r3[0].recorded, 1);
assert.equal(r3[0].total, 3);

// position uses direct log.* key (no prefix transform)
const r4 = triggerContext([trig(null, null, 'lying')]);
assert.equal(r4[0].field, 'position');
assert.equal(r4[0].valueKey, 'log.lying');

// surroundingNoise uses log.noise* prefix
const r5 = triggerContext([trig(null, null, null, 'quiet')]);
assert.equal(r5[0].valueKey, 'log.noiseQuiet');

// alcoholTiming uses direct log.* key
const r6 = triggerContext([trig(null, null, null, null, 'within4h')]);
assert.equal(r6[0].valueKey, 'log.within4h');

// all six fields present → six items in display order
const r7 = triggerContext([trig('high', 'low', 'sitting', 'quiet', 'within4h', 'fourTo12h')]);
assert.equal(r7.length, 6);
assert.equal(r7[0].field, 'stress');
assert.equal(r7[5].field, 'caffeineTiming');

// ── sameDaySleepQuality ───────────────────────────────────────────────────────
const { sameDaySleepQuality } = await import('../js/stats.js');

// no entries → null
assert.equal(sameDaySleepQuality([], new Date('2026-06-09T10:00:00')), null, 'sdsq: empty entries');

// entries exist but none on reference day → null
assert.equal(
  sameDaySleepQuality(
    [{ startTime: '2026-06-08T10:00:00', sleepQuality: 'good' }],
    new Date('2026-06-09T10:00:00')
  ),
  null,
  'sdsq: no same-day entry'
);

// one same-day entry → returns its value
assert.equal(
  sameDaySleepQuality(
    [{ startTime: '2026-06-09T09:00:00', sleepQuality: 'poor' }],
    new Date('2026-06-09T10:00:00')
  ),
  'poor',
  'sdsq: one same-day entry'
);

// multiple same-day entries → returns most recent non-null value
assert.equal(
  sameDaySleepQuality(
    [
      { startTime: '2026-06-09T08:00:00', sleepQuality: 'poor' },
      { startTime: '2026-06-09T12:00:00', sleepQuality: 'fair' },
      { startTime: '2026-06-09T06:00:00', sleepQuality: 'good' },
    ],
    new Date('2026-06-09T14:00:00')
  ),
  'fair',
  'sdsq: picks most recent same-day entry'
);

// same-day entries but all have null sleepQuality → null
assert.equal(
  sameDaySleepQuality(
    [{ startTime: '2026-06-09T08:00:00', sleepQuality: null }],
    new Date('2026-06-09T10:00:00')
  ),
  null,
  'sdsq: same-day entries with null sleepQuality → null'
);

// entry on different side of midnight is not included
assert.equal(
  sameDaySleepQuality(
    [{ startTime: '2026-06-08T23:59:00', sleepQuality: 'good' }],
    new Date('2026-06-09T00:01:00')
  ),
  null,
  'sdsq: entry just before midnight not counted as same day'
);

console.log('test-stats: all tests passed');
