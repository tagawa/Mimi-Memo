import { t, getLang } from './i18n.js';
import { getEpisodes } from './store.js';
import { timeOfDayBuckets, dayOfWeekCounts, entriesPerDay } from './stats.js';

// Last `n` days as [{label, value}] using per-day counts (oldest -> newest).
function lastNDaysData(entries, n) {
  const perDay = entriesPerDay(entries);
  const locale = getLang() === 'ja' ? 'ja-JP' : 'en';
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    // Label only the first day of each week to avoid clutter; others blank.
    const label = (i % 7 === 0) ? d.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' }) : '';
    out.push({ label, value: perDay[key] ?? 0 });
  }
  return out;
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
  const bw = 100 / data.length;
  const bars = data.map((d, i) => {
    const h = (d.value / max) * 80;
    const x = i * bw + bw * 0.15;
    const w = bw * 0.7;
    return `<rect x="${x}" y="${90 - h}" width="${w}" height="${h}" fill="var(--color-accent)" rx="1"/>
            <text x="${x + w/2}" y="98" font-size="4.5" text-anchor="middle" fill="#666">${d.label}</text>
            <text x="${x + w/2}" y="${88 - h}" font-size="4.5" text-anchor="middle" fill="#666">${d.value || ''}</text>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" class="bar-chart" role="img" aria-label="${label}" preserveAspectRatio="none">${bars}</svg>`;
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
  const dowLabels = getLang() === 'ja'
    ? ['月','火','水','木','金','土','日']
    : ['M','T','W','T','F','S','S'];
  const dowData = dow.map((v, i) => ({ label: dowLabels[i], value: v }));
  const freqData = lastNDaysData(all, 14);

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
