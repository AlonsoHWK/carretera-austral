const KEY = 'ca:v1';

function blank() {
  return { startDate: '', visited: {}, notes: {}, packing: {} };
}

let storageOk = true;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const saved = JSON.parse(raw);
    return { ...blank(), ...saved };
  } catch {
    storageOk = false;
    return blank();
  }
}

// Keyed by stop id, so reordering stops in the JSON cannot attach notes to the wrong stop.
const state = read();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

export const isStorageOk = () => storageOk;

export const isVisited = (id) => Boolean(state.visited[id]);
export function setVisited(id, value) {
  if (value) state.visited[id] = true;
  else delete state.visited[id];
  save();
}

export const getNote = (id) => state.notes[id] || '';
export function setNote(id, text) {
  if (text) state.notes[id] = text;
  else delete state.notes[id];
  save();
}

export const getStartDate = () => state.startDate;
export function setStartDate(value) {
  state.startDate = value || '';
  save();
}

export const isPacked = (id) => Boolean(state.packing[id]);
export function setPacked(id, value) {
  if (value) state.packing[id] = true;
  else delete state.packing[id];
  save();
}

export function snapshot() {
  return JSON.parse(JSON.stringify(state));
}

function mergeNote(mine, theirs) {
  if (!theirs || mine === theirs) return mine;
  if (!mine) return theirs;
  if (mine.includes(theirs)) return mine;
  if (theirs.includes(mine)) return theirs;
  return `${mine}\n---\n${theirs}`;
}

// Merges a backup from the other phone: nothing local is lost.
export function merge(incoming) {
  Object.assign(state.visited, incoming.visited);
  Object.assign(state.packing, incoming.packing);
  for (const [id, note] of Object.entries(incoming.notes)) {
    const merged = mergeNote(state.notes[id] || '', note);
    if (merged) state.notes[id] = merged;
  }
  if (incoming.startDate) state.startDate = incoming.startDate;
  save();
}
