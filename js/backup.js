const PREFIX = 'CA1';

function checksum(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
  const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeBackup(state) {
  const body = toBase64Url(JSON.stringify(state));
  return `${PREFIX}.${body}.${checksum(body)}`;
}

function asFlags(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.keys(value).filter((key) => value[key]).map((key) => [key, true]));
}

// Throws an Error with a readable Spanish message when the code cannot be used.
export function decodeBackup(code) {
  const parts = code.replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) throw new Error('Este texto no parece un código de respaldo.');
  if (checksum(parts[1]) !== parts[2]) throw new Error('El código está incompleto o cambió al copiarlo.');
  let raw;
  try {
    raw = JSON.parse(fromBase64Url(parts[1]));
  } catch {
    throw new Error('No se pudo leer el código de respaldo.');
  }
  const notes = {};
  if (raw.notes && typeof raw.notes === 'object') {
    for (const [id, note] of Object.entries(raw.notes)) {
      if (typeof note === 'string' && note) notes[id] = note;
    }
  }
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate || '') ? raw.startDate : '';
  return { startDate, notes, visited: asFlags(raw.visited), packing: asFlags(raw.packing) };
}
