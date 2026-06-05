import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: k => store.delete(k),
};
Object.defineProperty(globalThis, 'navigator', { value: { language: 'en' }, configurable: true, writable: true });
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

// renamed pitch keys
setLang('en');
assert.equal(t('log.pitchLow'), 'Low', 'log.pitchLow → Low');
assert.equal(t('log.pitchHigh'), 'High', 'log.pitchHigh → High');
assert.equal(t('log.low'), 'log.low', 'log.low removed — falls back to key');
assert.equal(t('log.high'), 'log.high', 'log.high removed — falls back to key');

// new section labels
assert.equal(t('log.rightNow'), 'Right now');
assert.equal(t('log.aboutTinnitus'), 'About the tinnitus');
assert.equal(t('log.internalState'), 'Internal state');
assert.equal(t('log.environment'), 'Environment');
assert.equal(t('log.recentIntake'), 'Recent intake');
assert.equal(t('log.fromLastTime'), 'from last time');
assert.equal(t('log.notSet'), 'Not set');
assert.equal(t('log.pulsatileLabel'), 'Pulsatile');

// new field labels
assert.equal(t('log.stress'), 'Stress');
assert.equal(t('log.stressLow'), 'Low');
assert.equal(t('log.stressMedium'), 'Medium');
assert.equal(t('log.stressHigh'), 'High');
assert.equal(t('log.tiredness'), 'Tiredness');
assert.equal(t('log.tirednessLow'), 'Low');
assert.equal(t('log.tirednessMedium'), 'Medium');
assert.equal(t('log.tirednessHigh'), 'High');
assert.equal(t('log.position'), 'Position');
assert.equal(t('log.lying'), 'Lying');
assert.equal(t('log.sitting'), 'Sitting');
assert.equal(t('log.standing'), 'Standing');
assert.equal(t('log.surroundingNoise'), 'Surrounding noise');
assert.equal(t('log.noiseQuiet'), 'Quiet');
assert.equal(t('log.noiseMedium'), 'Medium');
assert.equal(t('log.noiseLoud'), 'Loud');
assert.equal(t('log.alcoholTiming'), 'Alcohol');
assert.equal(t('log.caffeineTiming'), 'Caffeine');
assert.equal(t('log.within4h'), 'Within 4h');
assert.equal(t('log.fourTo12h'), '4–12h ago');
assert.equal(t('log.notInPast12h'), 'Not in the past 12h');

// spot-check Japanese
setLang('ja');
assert.equal(t('log.pitchLow'), '低音');
assert.equal(t('log.pitchHigh'), '高音');
assert.equal(t('log.stress'), 'ストレス');
assert.equal(t('log.rightNow'), '今の状況');
setLang('en');

// doctor.* keys added in Task 1
assert.equal(t('doctor.frequencyRate'), 'Frequency');
assert.equal(t('doctor.perWeek'), 'per week');
assert.equal(t('doctor.pulsatileValue'), '{count} episodes ({pct}%)');
assert.equal(t('doctor.pulsatileValueSparse'), '{count} episodes ({pct}% of {recorded} recorded)');
assert.equal(t('doctor.triggerContext'), 'Trigger context');
assert.equal(t('doctor.inPctOfRecorded'), 'in {pct}% of recorded episodes');
assert.equal(t('doctor.sparseNote'), '({n} of {m} recorded)');

console.log('test-i18n: all tests passed');
