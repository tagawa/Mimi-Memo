import { t, getLang } from './i18n.js';
import { getEpisodes } from './store.js';
import { timeOfDayBuckets, dayOfWeekCounts, frequencyChartData } from './stats.js';

const DOW_KEYS = ['history.mon','history.tue','history.wed','history.thu','history.fri','history.sat','history.sun'];

// Converts frequencyChartData output to [{label, value}] for barChart.
function buildFreqData(entries) {
  const { mode, bars } = frequencyChartData(entries);
  const locale = getLang() === 'ja' ? 'ja-JP' : 'en';
  return bars.map(({ key, value }) => {
    const label = mode === 'week'
      ? `W${parseInt(key.split('-W')[1], 10)}`
      : new Date(key + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    return { label, value };
  });
}

function formatDateTime(iso) {
  const locale = getLang() === 'ja' ? 'ja-JP' : 'en';
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
function loudnessBadge(ep) {
  if (!ep.loudness) return `<span class="loudness-badge loudness-badge--unset" aria-label="${t('log.noLoudness')}">—</span>`;
  return `<span class="loudness-badge loudness-badge--${ep.loudness}">${t('log.' + ep.loudness)}</span>`;
}

// Simple vertical bar chart. data: [{label, value}], label = accessible chart name.
// role="img" + aria-label gives screen readers a meaningful name (inner SVG text is not
// reliably announced under role="img"); visible <text> remains for sighted users.
function barChart(data, label) {
  const max = Math.max(1, ...data.map(d => d.value));
  // viewBox is 270×100 (≈ iPhone aspect ratio) so uniform scaling keeps text un-squashed.
  const bw = 270 / data.length;
  const bars = data.map((d, i) => {
    const h = (d.value / max) * 80;
    const x = i * bw + bw * 0.15;
    const w = bw * 0.7;
    return `<rect x="${x}" y="${90 - h}" width="${w}" height="${h}" fill="var(--color-accent)" rx="1"/>
            <text x="${x + w/2}" y="98" font-size="9" text-anchor="middle" fill="#666">${d.label}</text>
            <text x="${x + w/2}" y="${88 - h}" font-size="4.5" text-anchor="middle" fill="#666">${d.value || ''}</text>`;
  }).join('');
  return `<svg viewBox="0 0 270 100" class="bar-chart" role="img" aria-label="${label}">${bars}</svg>`;
}

export function renderHistory(onEntryClick) {
  const view = document.getElementById('view-history');
  const all = getEpisodes().sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  if (all.length === 0) {
    view.innerHTML = `<h2 class="section-label">${t('history.title')}</h2><p class="empty-state">${t('history.empty')}</p>`;
    return;
  }

  const tod = timeOfDayBuckets(all);
  const todData = [
    { label: t('history.morning'),   value: tod.morning },
    { label: t('history.afternoon'), value: tod.afternoon },
    { label: t('history.evening'),   value: tod.evening },
    { label: t('history.night'),     value: tod.night },
  ];
  const dow = dayOfWeekCounts(all);
  const dowData = dow.map((v, i) => ({ label: t(DOW_KEYS[i]), value: v }));
  const freqData = buildFreqData(all);

  view.innerHTML = `
    <h2 class="section-label">${t('history.frequency')}</h2>
    ${barChart(freqData, t('history.frequency'))}
    <h2 class="section-label">${t('history.timeOfDay')}</h2>
    ${barChart(todData, t('history.timeOfDay'))}
    <h2 class="section-label">${t('history.dayOfWeek')}</h2>
    ${barChart(dowData, t('history.dayOfWeek'))}
    <h2 class="section-label">${t('history.title')}</h2>
    ${all.map(ep => `
      <button class="entry-card" data-id="${ep.id}">
        ${loudnessBadge(ep)}
        <span class="entry-card-body">
          <span class="entry-card-date">${formatDateTime(ep.startTime)}</span>
          <span class="entry-card-summary">${[ep.character && t('log.'+ep.character), ep.location && t('log.'+ep.location)].filter(Boolean).join(' · ')}</span>
        </span>
        <span class="entry-card-arrow" aria-hidden="true">›</span>
      </button>`).join('')}
  `;

  view.querySelectorAll('.entry-card[data-id]').forEach(card => {
    card.addEventListener('click', () => onEntryClick?.(card.dataset.id));
  });
}
