import { t } from './i18n.js';
export function renderHome() {
  document.getElementById('view-home').innerHTML = `<p style="padding:24px">${t('appName')} — home</p>`;
}
