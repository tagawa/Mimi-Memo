import assert from 'assert';

// Mock fetch before importing the module under test
function makeFetch(ok, body) {
  return async () => ({ ok, json: async () => body });
}

global.fetch = makeFetch(true, { current_condition: [{ pressure: '1013' }] });

const { fetchAirPressure } = await import('../js/weather.js');

// Happy path — pressure returned as a number
global.fetch = makeFetch(true, { current_condition: [{ pressure: '1013' }] });
assert.strictEqual(await fetchAirPressure(), 1013, 'returns pressure as number');
console.log('✓ returns pressure as number on success');

// Decimal pressure value
global.fetch = makeFetch(true, { current_condition: [{ pressure: '1013.5' }] });
assert.strictEqual(await fetchAirPressure(), 1013.5, 'handles decimal pressure');
console.log('✓ handles decimal pressure value');

// Non-ok HTTP response
global.fetch = makeFetch(false, {});
assert.strictEqual(await fetchAirPressure(), null, 'returns null on non-ok response');
console.log('✓ returns null on non-ok HTTP response');

// Network error (fetch throws)
global.fetch = async () => { throw new Error('network'); };
assert.strictEqual(await fetchAirPressure(), null, 'returns null on network error');
console.log('✓ returns null on network error');

// Missing current_condition in response
global.fetch = makeFetch(true, {});
assert.strictEqual(await fetchAirPressure(), null, 'returns null when structure missing');
console.log('✓ returns null when response structure is missing');

// Non-numeric pressure string
global.fetch = makeFetch(true, { current_condition: [{ pressure: 'N/A' }] });
assert.strictEqual(await fetchAirPressure(), null, 'returns null for non-numeric pressure');
console.log('✓ returns null for non-numeric pressure string');

// Empty current_condition array
global.fetch = makeFetch(true, { current_condition: [] });
assert.strictEqual(await fetchAirPressure(), null, 'returns null for empty current_condition');
console.log('✓ returns null for empty current_condition array');

// --- initWeather / getCachedPressure ---
const { getCachedPressure, initWeather } = await import('../js/weather.js');

// getCachedPressure returns null before initWeather is called
assert.strictEqual(getCachedPressure(), null, 'getCachedPressure returns null before initWeather');
console.log('✓ getCachedPressure returns null before initWeather is called');

// initWeather sets cachedPressure on success
global.fetch = makeFetch(true, { current_condition: [{ pressure: '1015' }] });
await initWeather();
assert.strictEqual(getCachedPressure(), 1015, 'initWeather sets cachedPressure on success');
console.log('✓ initWeather sets cachedPressure to fetched value on success');

// initWeather retains cachedPressure on failure (does not wipe last known value)
global.fetch = async () => { throw new Error('network'); };
await initWeather();
assert.strictEqual(getCachedPressure(), 1015, 'initWeather retains cachedPressure on fetch failure');
console.log('✓ initWeather retains cachedPressure on fetch failure');

// --- getCachedForecast ---
const { getCachedForecast } = await import('../js/weather.js');

// getCachedForecast returns null before forecast data is loaded
assert.strictEqual(getCachedForecast(), null, 'getCachedForecast returns null before initWeather sets forecast');
console.log('✓ getCachedForecast returns null before forecast data is loaded');

// initWeather sets cachedForecast from weather[].hourly
const MOCK_FULL = {
  current_condition: [{ pressure: '1013' }],
  weather: [
    { hourly: [
      { pressure: '1010' }, { pressure: '1011' }, { pressure: '1012' }, { pressure: '1013' },
      { pressure: '1014' }, { pressure: '1013' }, { pressure: '1012' }, { pressure: '1011' }
    ]},
    { hourly: [
      { pressure: '1010' }, { pressure: '1009' }, { pressure: '1008' }, { pressure: '1007' },
      { pressure: '1008' }, { pressure: '1009' }, { pressure: '1010' }, { pressure: '1011' }
    ]},
    { hourly: [
      { pressure: '1012' }, { pressure: '1013' }, { pressure: '1014' }, { pressure: '1015' },
      { pressure: '1016' }, { pressure: '1015' }, { pressure: '1014' }, { pressure: '1013' }
    ]}
  ]
};
global.fetch = makeFetch(true, MOCK_FULL);
await initWeather();
assert.deepStrictEqual(
  getCachedForecast(),
  [1010,1011,1012,1013,1014,1013,1012,1011,
   1010,1009,1008,1007,1008,1009,1010,1011,
   1012,1013,1014,1015,1016,1015,1014,1013],
  'initWeather sets cachedForecast to 24 numeric pressure values'
);
console.log('✓ initWeather sets cachedForecast from weather[].hourly');

// initWeather retains cachedForecast on fetch failure
global.fetch = async () => { throw new Error('network'); };
await initWeather();
assert.deepStrictEqual(
  getCachedForecast(),
  [1010,1011,1012,1013,1014,1013,1012,1011,
   1010,1009,1008,1007,1008,1009,1010,1011,
   1012,1013,1014,1015,1016,1015,1014,1013],
  'initWeather retains cachedForecast on fetch failure'
);
console.log('✓ initWeather retains cachedForecast on fetch failure');

// initWeather handles missing weather field gracefully (no forecast set, cachedForecast unchanged)
const prevForecast = getCachedForecast();
global.fetch = makeFetch(true, { current_condition: [{ pressure: '1020' }] }); // no weather key
await initWeather();
assert.deepStrictEqual(getCachedForecast(), prevForecast, 'cachedForecast unchanged when weather field absent');
console.log('✓ initWeather leaves cachedForecast unchanged when weather field is absent');

// AbortController regression — abort errors handled same as network errors
global.fetch = async () => {
  const err = new Error('The operation was aborted');
  err.name = 'AbortError';
  throw err;
};
assert.strictEqual(await fetchAirPressure(), null,
  'fetchAirPressure returns null when fetch is aborted');
console.log('✓ fetchAirPressure returns null when aborted');

const pressureBeforeAbort = getCachedPressure();
global.fetch = async () => {
  const err = new Error('The operation was aborted');
  err.name = 'AbortError';
  throw err;
};
await initWeather();
assert.strictEqual(getCachedPressure(), pressureBeforeAbort,
  'initWeather retains cached pressure when fetch is aborted');
console.log('✓ initWeather retains cached pressure when aborted');

console.log('\nAll weather tests passed.');
