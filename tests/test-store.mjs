import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: k => store.delete(k),
};
function reset() { store.clear(); }

const {
  getEpisodes, addEpisode, updateEpisode, deleteEpisode,
  createEpisode, defaultsFromLast, generateUuid, setWriteErrorHandler,
} = await import('../js/store.js');

// empty store
reset();
assert.deepStrictEqual(getEpisodes(), [], 'empty store returns []');

// createEpisode shape
reset();
const e = createEpisode();
assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(e.id), 'has uuid v4');
assert.equal(e.schemaVersion, 1, 'schemaVersion 1');
assert.ok(typeof e.startTime === 'string', 'startTime is ISO string');
assert.equal(e.loudness, null, 'loudness null by default');
assert.equal(e.character, null);
assert.equal(e.pitch, null);
assert.equal(e.location, null);
assert.equal(e.pulsatile, null);
assert.equal(e.notes, null);

// add / get
reset();
const a = createEpisode({ loudness: 'mild' });
assert.equal(addEpisode(a), true, 'addEpisode returns true on success');
assert.equal(getEpisodes().length, 1);
assert.equal(getEpisodes()[0].loudness, 'mild');

// update
reset();
const b = createEpisode();
addEpisode(b);
assert.equal(updateEpisode(b.id, { loudness: 'severe' }), true);
assert.equal(getEpisodes()[0].loudness, 'severe');
assert.equal(updateEpisode('missing-id', { loudness: 'mild' }), false, 'update missing id returns false');

// delete
reset();
const c = createEpisode();
addEpisode(c);
assert.equal(deleteEpisode(c.id), true, 'deleteEpisode returns true on success');
assert.equal(getEpisodes().length, 0);

// defaultsFromLast copies character/pitch/location but NOT pulsatile/loudness/notes
reset();
assert.deepStrictEqual(defaultsFromLast(), {}, 'no entries -> empty defaults');
addEpisode(createEpisode({
  startTime: '2026-06-01T10:00:00.000Z',
  loudness: 'severe', character: 'ringing', pitch: 'high',
  location: 'both', pulsatile: true, notes: 'older',
}));
addEpisode(createEpisode({
  startTime: '2026-06-02T10:00:00.000Z',
  loudness: 'mild', character: 'hissing', pitch: 'low',
  location: 'left', pulsatile: false, notes: 'newest',
}));
const d = defaultsFromLast();
assert.deepStrictEqual(d, { character: 'hissing', pitch: 'low', location: 'left' },
  'defaults come from the most recent entry, only character/pitch/location');
assert.ok(!('pulsatile' in d), 'pulsatile never carried forward');
assert.ok(!('loudness' in d), 'loudness never carried forward');
assert.ok(!('notes' in d), 'notes never carried forward');

// pulsatile round-trips as boolean, and defaults to null
reset();
addEpisode(createEpisode({ pulsatile: true }));
assert.equal(getEpisodes()[0].pulsatile, true, 'pulsatile true is stored');
reset();
addEpisode(createEpisode({ pulsatile: false }));
assert.equal(getEpisodes()[0].pulsatile, false, 'pulsatile false is stored');
reset();
addEpisode(createEpisode());
assert.equal(getEpisodes()[0].pulsatile, null, 'pulsatile null by default');

// write failure (e.g. quota exceeded): every saveAll-based op returns false and fires the handler
reset();
const existing = createEpisode();
addEpisode(existing);                 // succeeds before we break setItem
let errorCount = 0;
setWriteErrorHandler(() => { errorCount++; });
const realSetItem = globalThis.localStorage.setItem;
globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
assert.equal(addEpisode(createEpisode()), false, 'addEpisode returns false on write failure');
assert.equal(updateEpisode(existing.id, { loudness: 'mild' }), false, 'updateEpisode returns false on write failure');
assert.equal(deleteEpisode(existing.id), false, 'deleteEpisode returns false on write failure');
assert.equal(errorCount, 3, 'write error handler fires for each failed write');
globalThis.localStorage.setItem = realSetItem;   // restore
setWriteErrorHandler(null);                       // remove handler for any later tests

console.log('test-store: all tests passed');
