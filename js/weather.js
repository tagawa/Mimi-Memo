// Fetches current air pressure (hPa) from wttr.in using IP-based geolocation.
// Returns a number on success, null on any failure (network, parse, offline, timeout).
export async function fetchAirPressure() {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('https://wttr.in/?format=j1', { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.current_condition?.[0]?.pressure;
    const val = Number(raw);
    return Number.isFinite(val) ? val : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timerId); // always clear — prevents timer firing after a completed request
  }
}

let cachedPressure = null;
let cachedForecast = null; // array of pressure numbers, one per 3-hour slot across 3 forecast days

export function getCachedPressure() {
  return cachedPressure;
}

// Returns an array of up to 24 pressure values (numbers) in chronological order:
// today 00:00, 03:00, … 21:00, tomorrow 00:00, … day-after 21:00.
// Returns null if initWeather has not yet produced forecast data.
export function getCachedForecast() {
  return cachedForecast;
}

// Call once on app load. Fetches the full j1 response, populates cachedPressure
// and cachedForecast. Retains last known values on any failure.
export async function initWeather() {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('https://wttr.in/?format=j1', { signal: controller.signal });
    if (!res.ok) return;
    const data = await res.json();

    const rawPressure = data?.current_condition?.[0]?.pressure;
    const pressure = Number(rawPressure);
    if (Number.isFinite(pressure)) cachedPressure = pressure;

    // Flatten 3 days × 8 slots into a single ordered array of pressure numbers.
    const forecast = (data?.weather ?? []).flatMap(day =>
      (day.hourly ?? []).map(slot => Number(slot.pressure))
    ).filter(Number.isFinite);
    if (forecast.length > 0) cachedForecast = forecast;
  } catch {
    // retain existing cached values on any error (including abort)
  } finally {
    clearTimeout(timerId);
  }
}
