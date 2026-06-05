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

// Map of local YYYY-MM-DD -> count.
export function entriesPerDay(entries) {
  const out = {};
  for (const e of entries) {
    const d = new Date(e.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

const cap = s => s[0].toUpperCase() + s.slice(1);
const TRIGGER_FIELDS = [
  { field: 'stress',           values: ['low','medium','high'],                 labelKey: 'log.stress',           valueKey: v => `log.stress${cap(v)}` },
  { field: 'tiredness',        values: ['low','medium','high'],                 labelKey: 'log.tiredness',        valueKey: v => `log.tiredness${cap(v)}` },
  { field: 'position',         values: ['lying','sitting','standing'],          labelKey: 'log.position',         valueKey: v => `log.${v}` },
  { field: 'surroundingNoise', values: ['quiet','medium','loud'],               labelKey: 'log.surroundingNoise', valueKey: v => `log.noise${cap(v)}` },
  { field: 'alcoholTiming',    values: ['within4h','fourTo12h','notInPast12h'], labelKey: 'log.alcoholTiming',    valueKey: v => `log.${v}` },
  { field: 'caffeineTiming',   values: ['within4h','fourTo12h','notInPast12h'], labelKey: 'log.caffeineTiming',   valueKey: v => `log.${v}` },
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
