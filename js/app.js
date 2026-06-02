import { initRouter } from './router.js';
import { t, getLang, setLang } from './i18n.js';
import { setWriteErrorHandler } from './store.js';
import { renderHome } from './home.js';
import { renderHistory } from './history.js';
import { renderDoctor } from './doctor.js';

function renderView(view) {
  switch (view) {
    case 'home': renderHome(); break;
    case 'history': renderHistory(); break;
    case 'doctor': renderDoctor(); break;
  }
}

function updateStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
}

function initLangToggle() {
  const btn = document.getElementById('lang-toggle');
  function updateBtn() {
    btn.textContent = getLang() === 'en' ? '日本語' : 'EN';
    btn.setAttribute('aria-label', getLang() === 'en' ? 'Switch to Japanese' : 'Switch to English');
  }
  updateBtn();
  btn.addEventListener('click', () => {
    setLang(getLang() === 'en' ? 'ja' : 'en');
    updateBtn();
    updateStaticI18n();
    renderView(document.querySelector('.tab.active')?.dataset.view ?? 'home');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setWriteErrorHandler(() => {});
  updateStaticI18n();
  initRouter(renderView);
  initLangToggle();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registration failed:', err));
  }
});
