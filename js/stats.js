// Time-of-day buckets by local hour.
// morning 5-11, afternoon 12-16, evening 17-20, night 21-4.
export function timeOfDayBuckets(entries) {
  const b = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const e of entries) {
    const h = new Date(e.startTime).getHours();
    if (h >= 5 && h <= 11) b.morning++;
    else if (h >= 12 && h <= 16) b.afternoon++;
    else if (h >= 17 && h <= 20) b.evening++;
    else b.night++;
  }
  return b;
}

// Counts per weekday, index 0 = Monday .. 6 = Sunday.
export function dayOfWeekCounts(entries) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const e of entries) {
    const js = new Date(e.startTime).getDay(); // 0 = Sunday
    const idx = (js + 6) % 7;                  // shift so Monday = 0
    counts[idx]++;
  }
  return counts;
}

// Counts of mild/moderate/severe; ignores null loudness.
export function loudnessBreakdown(entries) {
  const b = { mild: 0, moderate: 0, severe: 0 };
  for (const e of entries) if (e.loudness && e.loudness in b) b[e.loudness]++;
  return b;
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// Map of local YYYY-MM-DD -> count.
export function entriesPerDay(entries) {
  const out = {};
  for (const e of entries) {
    const key = localDateKey(new Date(e.startTime));
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

const cap = s => s[0].toUpperCase() + s.slice(1);
const TRIGGER_FIELDS = [
  { field: 'stress',           values: ['low','medium','high'],        labelKey: 'log.stress',           valueKey: v => `log.stress${cap(v)}` },
  { field: 'tiredness',        values: ['low','medium','high'],        labelKey: 'log.tiredness',        valueKey: v => `log.tiredness${cap(v)}` },
  { field: 'position',         values: ['lying','sitting','standing'], labelKey: 'log.position',         valueKey: v => `log.${v}` },
  { field: 'surroundingNoise', values: ['quiet','medium','loud'],      labelKey: 'log.surroundingNoise', valueKey: v => `log.noise${cap(v)}` },
  { field: 'sleepQuality',     values: ['poor','fair','good'],         labelKey: 'log.sleepQuality',     valueKey: v => `log.${v}` },
];

// Returns [] when entries is empty or all trigger fields are entirely null.
// Tie-breaking: first value in enum order wins.
export function triggerContext(entries) {
  const total = entries.length;
  const result = [];
  for (const def of TRIGGER_FIELDS) {
    const recorded = entries.filter(e => e[def.field] != null);
    if (recorded.length === 0) continue;
    const counts = {};
    for (const e of recorded) counts[e[def.field]] = (counts[e[def.field]] ?? 0) + 1;
    const maxCount = Math.max(...def.values.map(v => counts[v] ?? 0));
    if (maxCount === 0) continue; // all recorded values are outside the expected enum
    const topValue = def.values.find(v => (counts[v] ?? 0) === maxCount);
    result.push({
      field: def.field,
      labelKey: def.labelKey,
      topValue,
      valueKey: def.valueKey(topValue),
      topPct: Math.round(counts[topValue] / recorded.length * 100),
      recorded: recorded.length,
      total,
    });
  }
  return result;
}

// count of pulsatile===true entries; recorded excludes null/undefined.
export function pulsatileStats(entries) {
  let count = 0, recorded = 0;
  for (const e of entries) {
    if (e.pulsatile == null) continue;
    recorded++;
    if (e.pulsatile === true) count++;
  }
  return { count, recorded, pct: recorded > 0 ? Math.round(count / recorded * 100) : 0 };
}

// ISO week key for a local date: 'YYYY-WNN'. Uses the ISO week-year (may differ from
// calendar year for dates in the first/last week of January).
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // move to Thursday of the same ISO week
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function localDateToUTC(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Returns frequency chart data for the History view.
// mode 'day': one bar per calendar day that has data (no gap-filling).
// mode 'week': one bar per ISO week — activated when entries.length ≥ 7 AND span ≥ 15 days.
// bars are sorted oldest-to-newest; each bar is { key: string, value: number }.
export function frequencyChartData(entries) {
  if (!entries.length) return { mode: 'day', bars: [] };

  const perDay = entriesPerDay(entries);
  const days = Object.keys(perDay).sort();
  const spanDays = Math.round((localDateToUTC(days[days.length - 1]) - localDateToUTC(days[0])) / 86400000) + 1;

  if (entries.length >= 7 && spanDays >= 15) {
    const perWeek = {};
    for (const [day, count] of Object.entries(perDay)) {
      const wk = isoWeekKey(new Date(day + 'T00:00:00'));
      perWeek[wk] = (perWeek[wk] ?? 0) + count;
    }
    const bars = Object.entries(perWeek).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, value }));
    return { mode: 'week', bars };
  }

  return { mode: 'day', bars: days.map(key => ({ key, value: perDay[key] })) };
}

// Returns sleepQuality from the most recent same-calendar-day entry with a non-null
// value (device local time). Returns null if no qualifying entry exists.
export function sameDaySleepQuality(entries, referenceDate = new Date()) {
  const refKey = localDateKey(referenceDate);
  const candidates = entries.filter(
    e => e.sleepQuality != null && localDateKey(new Date(e.startTime)) === refKey
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) =>
    new Date(a.startTime) > new Date(b.startTime) ? a : b
  ).sleepQuality;
}
