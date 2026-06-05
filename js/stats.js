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
