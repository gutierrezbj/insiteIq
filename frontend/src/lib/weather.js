/**
 * weather.js — fetch de datos meteorológicos vía Open-Meteo.
 *
 * Open-Meteo (https://open-meteo.com) es un API público gratuito sin token,
 * datos meteo del modelo ECMWF/GFS, granularidad horaria. No requiere
 * autenticación ni rate-limit duro para uso responsable.
 *
 * Endpoint usado:
 *   https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y
 *     &current=temperature_2m,wind_speed_10m,precipitation_probability,weather_code
 *     &daily=temperature_2m_max,temperature_2m_min
 *     &timezone=auto
 *
 * Cache en memoria por coords (clave "lat,lng" redondeada a 2 decimales)
 * con TTL de 30 min — Open-Meteo recomienda no spamear.
 */

const CACHE = new Map(); // key: "lat,lng" → { data, fetchedAt }
const TTL_MS = 30 * 60 * 1000; // 30 min

function cacheKey(lat, lng) {
  return `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;
}

/**
 * Mapeo Open-Meteo weather_code → label español + descripción + flightOk.
 * Codes oficiales: https://open-meteo.com/en/docs (sección WMO weather codes).
 */
const WEATHER_CODE = {
  0:  { label: "Despejado",            flightOk: true },
  1:  { label: "Mayormente despejado", flightOk: true },
  2:  { label: "Parcialmente nublado", flightOk: true },
  3:  { label: "Nublado",              flightOk: true },
  45: { label: "Niebla",               flightOk: false },
  48: { label: "Niebla helada",        flightOk: false },
  51: { label: "Llovizna leve",        flightOk: true },
  53: { label: "Llovizna moderada",    flightOk: true },
  55: { label: "Llovizna intensa",     flightOk: false },
  61: { label: "Lluvia leve",          flightOk: true },
  63: { label: "Lluvia moderada",      flightOk: false },
  65: { label: "Lluvia intensa",       flightOk: false },
  71: { label: "Nieve leve",           flightOk: false },
  73: { label: "Nieve moderada",       flightOk: false },
  75: { label: "Nieve intensa",        flightOk: false },
  80: { label: "Chubascos leves",      flightOk: true },
  81: { label: "Chubascos moderados",  flightOk: false },
  82: { label: "Chubascos violentos",  flightOk: false },
  95: { label: "Tormenta",             flightOk: false },
  96: { label: "Tormenta con granizo", flightOk: false },
  99: { label: "Tormenta severa",      flightOk: false },
};

function describeWeatherCode(code) {
  return WEATHER_CODE[code] || { label: "—", flightOk: true };
}

/**
 * Trae el clima actual + max/min del día para una coord.
 * @returns {Promise<null | {condition, flightOk, temp, tempMin, tempMax, wind, precip, fetchedAt}>}
 */
export async function fetchWeatherFor(lat, lng) {
  if (lat == null || lng == null) return null;
  const key = cacheKey(lat, lng);
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.data;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    "temperature_2m,wind_speed_10m,precipitation_probability,weather_code"
  );
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = await res.json();
    const current = json.current || {};
    const daily = json.daily || {};
    const code = current.weather_code;
    const wcode = describeWeatherCode(code);
    const tempMax = daily.temperature_2m_max?.[0];
    const tempMin = daily.temperature_2m_min?.[0];
    const precip = current.precipitation_probability;
    const wind = current.wind_speed_10m;

    // Decisión de "Apto vuelo": cielo permite + viento bajo + precip baja
    const windOk = wind == null || wind < 50;
    const precipOk = precip == null || precip < 60;
    const flightOk = wcode.flightOk && windOk && precipOk;

    const data = {
      condition: wcode.label,
      flightOk,
      temp: Math.round(current.temperature_2m ?? 0),
      tempMin: tempMin != null ? Math.round(tempMin) : null,
      tempMax: tempMax != null ? Math.round(tempMax) : null,
      wind: wind != null ? Math.round(wind) : null,
      precip: precip != null ? Math.round(precip) : null,
      fetchedAt: Date.now(),
    };
    CACHE.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Helper para formato de temperatura "10°/22°" o "22°".
 */
export function formatTemp(weather) {
  if (!weather) return "—";
  if (weather.tempMin != null && weather.tempMax != null) {
    return `${weather.tempMin}° / ${weather.tempMax}°`;
  }
  return `${weather.temp}°`;
}
