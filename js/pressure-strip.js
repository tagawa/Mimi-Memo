import { getCachedForecast, getCachedPressure } from './weather.js';
import { t, getLang } from './i18n.js';

// Returns [todayLabel, tomorrowAbbr, dayAfterAbbr] in the active language.
// Weekday abbreviations come from the browser Intl API — no manual translation needed.
function buildDayLabels() {
  const lang = getLang();
  const locale = lang === 'ja' ? 'ja-JP' : 'en';
  const fmt = { weekday: lang === 'ja' ? 'narrow' : 'short' };
  const today = new Date();
  const d1 = new Date(today); d1.setDate(today.getDate() + 1);
  const d2 = new Date(today); d2.setDate(today.getDate() + 2);
  return [
    t('pressure.today'),
    d1.toLocaleDateString(locale, fmt),
    d2.toLocaleDateString(locale, fmt),
  ];
}

function dayLabelsHtml() {
  const [l0, l1, l2] = buildDayLabels();
  return `<div class="pressure-strip-days">
    <span class="pressure-strip-day">${l0}</span>
    <span class="pressure-strip-day">${l1}</span>
    <span class="pressure-strip-day">${l2}</span>
  </div>`;
}

// Shows the strip immediately with a pulsing placeholder line and day labels.
// Call on DOMContentLoaded, before initWeather fires.
// Also called internally by renderPressureStrip() when forecast data is not yet available.
export function renderPressureStripLoading() {
  const strip = document.getElementById('pressure-strip');
  if (!strip) return;
  strip.innerHTML = `
    <span class="pressure-strip-value"></span>
    <div class="pressure-strip-chart">
      <div class="pressure-placeholder"><div class="pressure-placeholder-line"></div></div>
      ${dayLabelsHtml()}
    </div>
  `;
  strip.hidden = false;
}

// Renders the sparkline when forecast data is available.
// Falls back to the loading appearance if forecast data is not yet cached.
// Call after initWeather resolves and whenever the home tab becomes active.
export function renderPressureStrip() {
  const strip = document.getElementById('pressure-strip');
  if (!strip) return;

  const forecast = getCachedForecast();

  if (!forecast || forecast.length < 2) {
    renderPressureStripLoading();
    return;
  }

  const W = 240, H = 32;
  const min = Math.min(...forecast);
  const max = Math.max(...forecast);
  const range = max - min || 1; // avoid div-by-zero when all values are equal

  const xOf = i => (i / (forecast.length - 1)) * (W - 1);
  const yOf = p => (H - 1) - ((p - min) / range) * (H - 1);

  const points = forecast
    .map((p, i) => `${xOf(i).toFixed(1)},${yOf(p).toFixed(1)}`)
    .join(' ');

  // "Now" marker: fractional index within the slot array.
  // Slot 0 = today 00:00 local; each slot = 3h. Clamp to array bounds.
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const nowIndex = Math.min(currentHour / 3, forecast.length - 1);
  const i0 = Math.floor(nowIndex);
  const i1 = Math.min(i0 + 1, forecast.length - 1);
  const tf = nowIndex - i0; // named tf (not t) to avoid shadowing the i18n t() import
  const nowX = (xOf(i0) * (1 - tf) + xOf(i1) * tf).toFixed(1);
  const nowY = yOf(forecast[i0] * (1 - tf) + forecast[i1] * tf).toFixed(1);

  const currentHpa = getCachedPressure();
  const valueLabel = currentHpa !== null ? `${currentHpa} hPa` : '';

  // Day-boundary dividers are CSS divs (not SVG lines) so they span the full strip height,
  // not just the 28px SVG viewBox. Position as % to align with the SVG x coordinates.
  strip.innerHTML = `
    <span class="pressure-strip-value">${valueLabel}</span>
    <div class="pressure-strip-chart">
      ${forecast.length > 8  ? `<div class="pressure-day-divider" style="left:${(xOf(8)  / W * 100).toFixed(2)}%"></div>` : ''}
      ${forecast.length > 16 ? `<div class="pressure-day-divider" style="left:${(xOf(16) / W * 100).toFixed(2)}%"></div>` : ''}
      <svg class="pressure-sparkline" viewBox="0 0 ${W} ${H}"
           aria-hidden="true" preserveAspectRatio="none">
        <polyline points="${points}" fill="none" stroke="var(--color-accent)"
                  stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${nowX}" cy="${nowY}" r="5" fill="var(--color-accent)"/>
      </svg>
      ${dayLabelsHtml()}
    </div>
  `;
  strip.hidden = false;
}
