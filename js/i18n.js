const strings = {
  en: { appName: 'Mimi Memo', 'nav.home': 'Home', 'nav.history': 'History', 'nav.doctor': 'Doctor' },
  ja: { appName: 'ミミメモ', 'nav.home': 'ホーム', 'nav.history': '履歴', 'nav.doctor': '医師用' },
};

const storedLang = localStorage.getItem('mimi_lang');
let currentLang = storedLang ?? (navigator.language?.startsWith('ja') ? 'ja' : 'en');
document.documentElement.lang = currentLang;

export function t(key) {
  return strings[currentLang]?.[key] ?? strings.en?.[key] ?? key;
}
export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('mimi_lang', lang);
  document.documentElement.lang = lang;
}
export function getLang() { return currentLang; }
