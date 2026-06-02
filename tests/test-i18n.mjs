import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: k => store.delete(k),
};
globalThis.navigator = { language: 'en' };
globalThis.document = { documentElement: {} };

const { t, setLang, getLang } = await import('../js/i18n.js');

assert.equal(getLang(), 'en', 'defaults to en when navigator.language is en');
assert.equal(t('nav.home'), 'Home', 'returns English string');
assert.equal(t('log.severe'), 'Severe');

setLang('ja');
assert.equal(getLang(), 'ja', 'setLang switches language');
assert.equal(t('nav.home'), 'ホーム', 'returns Japanese string');
assert.equal(store.get('mimi_lang'), 'ja', 'persists language to mimi_lang');

assert.equal(t('___missing___'), '___missing___', 'unknown key falls back to the key itself');

setLang('en');
assert.equal(t('nav.home'), 'Home', 'switches back to en');

console.log('test-i18n: all tests passed');
