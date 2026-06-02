import { t, getLang } from './i18n.js';
import { getEpisodes } from './store.js';
import { timeOfDayBuckets, dayOfWeekCounts, loudnessBreakdown } from './stats.js';

let currentPeriod = 30; // 30, 90, or null (all)

// Pure: filter to period and aggregate. periodDays null = all time.
export function summarise(entries, periodDays) {
  let scoped = entries;
  if (periodDays != null) {
    const cutoff = Date.now() - periodDays * 86400000;
    scoped = entries.filter(e => new Date(e.startTime).getTime() >= cutoff);
  }
  const loudness = loudnessBreakdown(scoped);

  const topOf = field => {
    const counts = {};
    for (const e of scoped) if (e[field]) counts[e[field]] = (counts[e[field]] ?? 0) + 1;
    const keys = Object.keys(counts);
    return keys.length ? keys.sort((a, b) => counts[b] - counts[a])[0] : null;
  };

  const timeOfDay = timeOfDayBuckets(scoped);
  const dayOfWeek = dayOfWeekCounts(scoped);

  // Highest bucket, or null when there are no entries.
  const peakTimeOfDay = (() => {
    const pairs = Object.entries(timeOfDay);
    const max = Math.max(...pairs.map(([, v]) => v));
    return max > 0 ? pairs.find(([, v]) => v === max)[0] : null;
  })();
  const peakDayOfWeek = (() => {
    const max = Math.max(...dayOfWeek);
    return max > 0 ? dayOfWeek.indexOf(max) : null;   // 0 = Monday .. 6 = Sunday
  })();

  return {
    total: scoped.length,
    loudness,
    topCharacter: topOf('character'),
    topPitch: topOf('pitch'),
    topLocation: topOf('location'),
    peakTimeOfDay,
    peakDayOfWeek,
    timeOfDay,
    dayOfWeek,
  };
}

export function renderDoctor() {
  const view = document.getElementById('view-doctor');
  const s = summarise(getEpisodes(), currentPeriod);

  const isActive = val => (val === 'all' ? currentPeriod === null : currentPeriod === val);
  const periodBtn = (val, key) =>
    `<button class="pill" data-period="${val}" aria-pressed="${isActive(val)}">${t(key)}</button>`;

  const locale = getLang() === 'ja' ? 'ja-JP' : 'en';
  // idx 0 = Monday .. 6 = Sunday; 2024-01-01 was a Monday.
  const weekdayName = idx => new Date(2024, 0, 1 + idx).toLocaleDateString(locale, { weekday: 'long' });
  const row = (labelKey, value) => value ? `<p><strong>${t(labelKey)}:</strong> ${value}</p>` : '';

  view.innerHTML = `
    <h2 class="section-label">${t('doctor.title')}</h2>
    <div class="pill-group" role="group" aria-label="${t('doctor.period')}">
      ${periodBtn(30, 'doctor.last30')}
      ${periodBtn(90, 'doctor.last90')}
      ${periodBtn('all', 'doctor.all')}
    </div>
    <div class="doctor-summary">
      <p><strong>${t('doctor.totalEntries')}:</strong> ${s.total}</p>
      <p><strong>${t('doctor.loudnessBreakdown')}:</strong>
         ${t('log.mild')} ${s.loudness.mild} · ${t('log.moderate')} ${s.loudness.moderate} · ${t('log.severe')} ${s.loudness.severe}</p>
      ${row('doctor.topCharacter', s.topCharacter && t('log.' + s.topCharacter))}
      ${row('doctor.topPitch', s.topPitch && t('log.' + s.topPitch))}
      ${row('doctor.topLocation', s.topLocation && t('log.' + s.topLocation))}
      ${row('doctor.peakTime', s.peakTimeOfDay && t('history.' + s.peakTimeOfDay))}
      ${row('doctor.peakDay', s.peakDayOfWeek != null ? weekdayName(s.peakDayOfWeek) : null)}
    </div>
    <button class="btn-primary" id="doctor-print">${t('doctor.print')}</button>
  `;

  view.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period === 'all' ? null : Number(btn.dataset.period);
      renderDoctor();
    });
  });
  document.getElementById('doctor-print').addEventListener('click', () => window.print());
}
