import { t, getLang } from './i18n.js';
import { getEpisodes } from './store.js';
import { timeOfDayBuckets, dayOfWeekCounts, loudnessBreakdown, pulsatileStats, triggerContext } from './stats.js';

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

  const frequencyRate = (() => {
    if (scoped.length === 0) return null;
    if (periodDays != null) return scoped.length / (periodDays / 7);
    const earliest = Math.min(...scoped.map(e => new Date(e.startTime).getTime()));
    const spanDays = (Date.now() - earliest) / 86400000;
    // Suppress when span is too short to be meaningful
    return spanDays < 7 ? null : scoped.length / (spanDays / 7);
  })();

  return {
    total: scoped.length,
    frequencyRate,
    loudness,
    pulsatile: pulsatileStats(scoped),
    topCharacter: topOf('character'),
    topPitch: topOf('pitch'),
    topLocation: topOf('location'),
    peakTimeOfDay,
    peakDayOfWeek,
    timeOfDay,
    dayOfWeek,
    triggers: triggerContext(scoped),
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

  const pulsatileRow = (() => {
    if (s.pulsatile.count === 0) return '';
    // pulsatile footnote: show on any sparsity (recorded < total)
    const key = s.pulsatile.recorded < s.total
      ? 'doctor.pulsatileValueSparse'
      : 'doctor.pulsatileValue';
    const val = t(key)
      .replace('{count}', s.pulsatile.count)
      .replace('{pct}', s.pulsatile.pct)
      .replace('{recorded}', s.pulsatile.recorded);
    return `<p><strong>${t('log.pulsatileLabel')}:</strong> ${val}</p>`;
  })();

  const triggerSection = s.triggers.length === 0 ? '' : `
    <h3>${t('doctor.triggerContext')}</h3>
    ${s.triggers.map(tr => {
      const pctPhrase = t('doctor.inPctOfRecorded').replace('{pct}', tr.topPct);
      // trigger sparse footnote: only when coverage < 50% (Approach C)
      const note = tr.recorded < tr.total * 0.5
        ? ' ' + t('doctor.sparseNote').replace('{n}', tr.recorded).replace('{m}', tr.total)
        : '';
      return `<p><strong>${t(tr.labelKey)}:</strong> ${t(tr.valueKey)} ${pctPhrase}${note}</p>`;
    }).join('\n    ')}
  `;

  view.innerHTML = `
    <h2 class="section-label">${t('doctor.title')}</h2>
    <div class="pill-group" role="group" aria-label="${t('doctor.period')}">
      ${periodBtn(30, 'doctor.last30')}
      ${periodBtn(90, 'doctor.last90')}
      ${periodBtn('all', 'doctor.all')}
    </div>
    <div class="doctor-summary">
      <p><strong>${t('doctor.totalEntries')}:</strong> ${s.total}</p>
      ${s.frequencyRate != null ? `<p><strong>${t('doctor.frequencyRate')}:</strong> ${s.frequencyRate.toFixed(1)} ${t('doctor.perWeek')}</p>` : ''}
      <p><strong>${t('doctor.loudnessBreakdown')}:</strong>
         ${t('log.mild')} ${s.loudness.mild} · ${t('log.moderate')} ${s.loudness.moderate} · ${t('log.severe')} ${s.loudness.severe}</p>
      ${pulsatileRow}
      ${row('doctor.topCharacter', s.topCharacter && t('log.' + s.topCharacter))}
      ${row('doctor.topPitch', s.topPitch && (s.topPitch === 'low' ? t('log.pitchLow') : s.topPitch === 'high' ? t('log.pitchHigh') : s.topPitch ? t('log.mixed') : ''))}
      ${row('doctor.topLocation', s.topLocation && t('log.' + s.topLocation))}
      ${row('doctor.peakTime', s.peakTimeOfDay && t('history.' + s.peakTimeOfDay))}
      ${row('doctor.peakDay', s.peakDayOfWeek != null ? weekdayName(s.peakDayOfWeek) : null)}
      ${triggerSection}
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
