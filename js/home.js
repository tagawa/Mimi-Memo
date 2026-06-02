import { t, getLang } from './i18n.js';
import { getEpisodes } from './store.js';

// "Mon 28 Apr · 14:32" (locale-aware)
function formatDateTime(isoString) {
  const locale = getLang() === 'ja' ? 'ja-JP' : 'en';
  const d = new Date(isoString);
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function loudnessBadge(ep) {
  // null loudness = not yet characterised; neutral placeholder with an accessible label.
  if (!ep.loudness) return `<span class="loudness-badge loudness-badge--unset" aria-label="${t('log.noLoudness')}">—</span>`;
  return `<span class="loudness-badge loudness-badge--${ep.loudness}">${t('log.' + ep.loudness)}</span>`;
}

function entrySummary(ep) {
  if (!ep.loudness && !ep.character && !ep.location) {
    return `<span class="entry-needs-details">${t('log.addDetails')}</span>`;
  }
  const parts = [];
  if (ep.character) parts.push(t('log.' + ep.character));
  if (ep.location) parts.push(t('log.' + ep.location));
  return parts.join(' · ');
}

export function renderHome(onLogClick, onEntryClick) {
  const view = document.getElementById('view-home');
  const all = getEpisodes().sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  const recent = all.slice(0, 3);

  view.innerHTML = `
    <button class="btn-log" id="log-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      ${t('home.logButton')}
    </button>

    <h2 class="section-label">${t('home.recent')}</h2>

    ${recent.length === 0
      ? `<p class="empty-state">${t('home.empty')}</p>`
      : recent.map(ep => `
          <button class="entry-card" data-id="${ep.id}">
            ${loudnessBadge(ep)}
            <span class="entry-card-body">
              <span class="entry-card-date">${formatDateTime(ep.startTime)}</span>
              <span class="entry-card-summary">${entrySummary(ep)}</span>
            </span>
            <span class="entry-card-arrow" aria-hidden="true">›</span>
          </button>`).join('')
    }

    ${all.length > 3 ? `<a href="#history" class="see-more-link">${t('home.seeAll')} <span aria-hidden="true">→</span></a>` : ''}
  `;

  document.getElementById('log-btn').addEventListener('click', () => onLogClick?.());
  view.querySelectorAll('.entry-card[data-id]').forEach(card => {
    card.addEventListener('click', () => onEntryClick?.(card.dataset.id));
  });
}
