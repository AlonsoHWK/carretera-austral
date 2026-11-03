import { parseDays } from './today.js';

const DATA_URL = 'data/itinerary.json';
const DATA_CACHE = 'ca-data-v1';
const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z0-9-]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_TEXT = ['name', 'subtitle', 'description', 'sleep', 'transport', 'highlight'];

// Returns a list of readable problems; an empty list means the data is usable.
export function validate(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return ['El archivo no contiene un objeto JSON.'];
  if (!data.trip || !Number.isInteger(data.trip.totalDays)) errors.push('Falta `trip.totalDays`.');
  if (!data.trip || typeof data.trip.title !== 'string') errors.push('Falta `trip.title`.');

  const segments = data.segments && typeof data.segments === 'object' ? data.segments : null;
  if (!segments) {
    errors.push('Falta `segments`.');
  } else {
    for (const [key, segment] of Object.entries(segments)) {
      if (typeof segment.name !== 'string') errors.push(`Segmento ${key}: falta \`name\`.`);
      for (const field of ['color', 'deep', 'tint', 'hero', 'heroText']) {
        if (!HEX.test(segment[field] || '')) errors.push(`Segmento ${key}: \`${field}\` no es un color como #2C9A58.`);
      }
    }
  }

  if (!Array.isArray(data.stops) || data.stops.length === 0) {
    errors.push('Falta la lista `stops`.');
    return errors;
  }

  const seen = new Set();
  const covered = new Map();
  data.stops.forEach((stop, index) => {
    const where = `Parada ${index + 1}${stop && stop.id ? ` (${stop.id})` : ''}`;
    if (!stop || typeof stop !== 'object') { errors.push(`${where}: no es un objeto.`); return; }
    if (!ID.test(stop.id || '')) errors.push(`${where}: \`id\` debe usar minúsculas, números y guiones.`);
    if (seen.has(stop.id)) errors.push(`${where}: \`id\` repetido.`);
    seen.add(stop.id);
    if (segments && !segments[stop.segment]) errors.push(`${where}: el segmento «${stop.segment}» no existe.`);
    for (const field of REQUIRED_TEXT) {
      if (typeof stop[field] !== 'string' || !stop[field].trim()) errors.push(`${where}: falta \`${field}\`.`);
    }
    if (!Array.isArray(stop.tips) || stop.tips.some((tip) => typeof tip !== 'string')) errors.push(`${where}: \`tips\` debe ser una lista de textos.`);
    if (typeof stop.lat !== 'number' || stop.lat < -90 || stop.lat > 90) errors.push(`${where}: falta \`lat\` o no es válida.`);
    if (typeof stop.lng !== 'number' || stop.lng < -180 || stop.lng > 180) errors.push(`${where}: falta \`lng\` o no es válida.`);
    if (!DATE.test(stop.lastVerified || '')) errors.push(`${where}: \`lastVerified\` debe tener el formato AAAA-MM-DD.`);
    if (!Array.isArray(stop.links)) errors.push(`${where}: \`links\` debe ser una lista.`);
    else stop.links.forEach((link, i) => {
      if (!link || typeof link.label !== 'string' || !/^https:\/\//.test(link.url || '')) errors.push(`${where}: el enlace ${i + 1} necesita \`label\` y una \`url\` https.`);
    });
    if (stop.unverified !== undefined && !Array.isArray(stop.unverified)) errors.push(`${where}: \`unverified\` debe ser una lista.`);
    if (stop.seasonal !== undefined && (!Array.isArray(stop.seasonal) || stop.seasonal.some((item) => !item || typeof item.path !== 'string'))) errors.push(`${where}: \`seasonal\` debe ser una lista de objetos con \`path\`.`);
    if (stop.via !== undefined && (!Array.isArray(stop.via) || stop.via.some((p) => !Array.isArray(p) || typeof p[0] !== 'number' || typeof p[1] !== 'number'))) errors.push(`${where}: \`via\` debe ser una lista de pares [lat, lng].`);
    if (stop.returnTrip !== undefined && !Array.isArray(stop.returnTrip.steps)) errors.push(`${where}: \`returnTrip.steps\` debe ser una lista.`);

    const range = parseDays(stop.days);
    if (!range) {
      errors.push(`${where}: \`days\` debe ser como "2–3" u "8".`);
    } else {
      for (let day = range[0]; day <= range[1]; day++) {
        if (covered.has(day)) errors.push(`${where}: el día ${day} ya está en otra parada.`);
        covered.set(day, stop.id);
      }
    }
  });

  if (data.trip && Number.isInteger(data.trip.totalDays)) {
    for (let day = 1; day <= data.trip.totalDays; day++) {
      if (!covered.has(day)) errors.push(`Falta una parada para el día ${day}.`);
    }
  }
  return errors;
}

function parseAndValidate(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { errors: [`El JSON está mal escrito: ${error.message}`] };
  }
  const errors = validate(data);
  return errors.length ? { errors } : { data };
}

export async function loadItinerary() {
  let response;
  try {
    response = await fetch(DATA_URL);
  } catch {
    return { errors: ['No se pudo leer el itinerario y no hay una copia guardada. Abre la guía una vez con señal.'] };
  }
  if (!response.ok) return { errors: [`No se pudo leer el itinerario (error ${response.status}).`] };
  const text = await response.text();
  return { ...parseAndValidate(text), text };
}

async function fetchFresh() {
  // The query makes the service worker pass this through; no-store skips the HTTP cache too.
  const response = await fetch(`${DATA_URL}?fresh=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(String(response.status));
  return response.text();
}

async function storeData(text) {
  if (!('caches' in window)) return;
  const cache = await caches.open(DATA_CACHE);
  await cache.put(DATA_URL, new Response(text, { headers: { 'Content-Type': 'application/json' } }));
}

// sw.js only sees code changes, so itinerary edits are detected here by comparing the text.
export async function checkForDataUpdate(currentText, { onUpdate, onInvalid, onReachable }) {
  if (!navigator.onLine) return;
  let text;
  try {
    text = await fetchFresh();
    onReachable(true);
  } catch {
    onReachable(false);
    return;
  }
  if (text === currentText) return;
  const { errors } = parseAndValidate(text);
  if (errors) {
    onInvalid(errors);
    return;
  }
  onUpdate(async () => {
    await storeData(text);
    location.reload();
  });
}

// Used by the error screen: replaces a broken local copy once a valid one is published.
export async function recoverData() {
  const text = await fetchFresh();
  const { errors } = parseAndValidate(text);
  if (errors) return errors;
  await storeData(text);
  location.reload();
  return [];
}
