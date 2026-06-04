const KEY = 'mimi_episodes';

// UUID v4 using Math.random() — IDs are local-only
export function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

let writeErrorHandler = null;
export function setWriteErrorHandler(fn) { writeErrorHandler = fn; }

export function getEpisodes() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch { return []; }
}

function saveAll(episodes) {
  try { localStorage.setItem(KEY, JSON.stringify(episodes)); return true; }
  catch { writeErrorHandler?.(); return false; }
}

export function addEpisode(episode) {
  const episodes = getEpisodes();
  episodes.push(episode);
  return saveAll(episodes);
}

export function updateEpisode(id, updates) {
  const episodes = getEpisodes();
  const idx = episodes.findIndex(e => e.id === id);
  if (idx === -1) return false;
  episodes[idx] = { ...episodes[idx], ...updates };
  return saveAll(episodes);
}

export function deleteEpisode(id) {
  return saveAll(getEpisodes().filter(e => e.id !== id));
}

export function createEpisode(fields = {}) {
  return {
    id: generateUuid(),
    schemaVersion: 2,
    startTime: new Date().toISOString(),
    loudness: null,
    character: null,
    pitch: null,
    location: null,
    pulsatile: null,
    notes: null,
    stress: null,
    tiredness: null,
    position: null,
    surroundingNoise: null,
    alcoholTiming: null,
    caffeineTiming: null,
    ...fields,
  };
}

// Returns { character, pitch, location, pulsatile } from the most recent entry by startTime.
// Excludes loudness, notes, and trigger fields (per-event variables). Returns {} when there are no entries.
export function defaultsFromLast() {
  const episodes = getEpisodes();
  if (episodes.length === 0) return {};
  const last = episodes.reduce((a, b) =>
    new Date(b.startTime) > new Date(a.startTime) ? b : a);
  return { character: last.character, pitch: last.pitch, location: last.location, pulsatile: last.pulsatile };
}
