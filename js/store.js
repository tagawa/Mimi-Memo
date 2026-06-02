export function getEpisodes() {
  try { return JSON.parse(localStorage.getItem('mimi_episodes')) ?? []; }
  catch { return []; }
}
export function setWriteErrorHandler() {}
