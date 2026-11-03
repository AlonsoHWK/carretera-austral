// Bump VERSION whenever any file in SHELL changes: it is what triggers the update toast.
// data/itinerary.json lives in its own cache and is updated by js/data.js, not by this version.
const VERSION = '1.0.2';
const SHELL_PREFIX = 'ca-shell-';
const SHELL_CACHE = SHELL_PREFIX + VERSION;
const DATA_CACHE = 'ca-data-v1';
const DATA_PATH = 'data/itinerary.json';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/base.css',
  'css/cards.css',
  'css/map.css',
  'css/tabs.css',
  'css/info.css',
  'js/main.js',
  'js/dom.js',
  'js/data.js',
  'js/store.js',
  'js/backup.js',
  'js/cards.js',
  'js/map.js',
  'js/tabs.js',
  'js/info.js',
  'js/today.js',
  'js/sw-register.js',
  'fonts/fraunces-latin-500-normal.woff2',
  'fonts/fraunces-latin-700-normal.woff2',
  'fonts/fraunces-latin-400-italic.woff2',
  'fonts/fraunces-latin-500-italic.woff2',
  'fonts/dm-sans-latin-400-normal.woff2',
  'fonts/dm-sans-latin-500-normal.woff2',
  'fonts/dm-sans-latin-700-normal.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    // Bypass the HTTP cache: Cloudflare lets browsers keep JS and CSS for hours, and a stale
    // file stored here would be served until the next VERSION.
    await shell.addAll(SHELL.map((path) => new Request(path, { cache: 'reload' })));
    // Never overwrite the data copy here: it may be newer than the deployed app version.
    const data = await caches.open(DATA_CACHE);
    if (!(await data.match(DATA_PATH))) await storeIfParseable(data, await fetch(DATA_PATH, { cache: 'no-store' }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(SHELL_PREFIX) && name !== SHELL_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/' + DATA_PATH)) {
    // Requests with a query are the app's freshness check: let them reach the network.
    if (url.search) return;
    event.respondWith(serveData(request));
    return;
  }
  event.respondWith(serveShell(request));
});

async function serveData(request) {
  const data = await caches.open(DATA_CACHE);
  const cached = await data.match(DATA_PATH);
  if (cached) return cached;
  const response = await fetch(request);
  await storeIfParseable(data, response.clone());
  return response;
}

// A malformed edit must never become the offline copy.
async function storeIfParseable(cache, response) {
  if (!response.ok) return;
  const text = await response.clone().text();
  try {
    JSON.parse(text);
  } catch {
    return;
  }
  await cache.put(DATA_PATH, response);
}

async function serveShell(request) {
  const shell = await caches.open(SHELL_CACHE);
  if (request.mode === 'navigate') {
    return (await shell.match('index.html')) || fetch(request);
  }
  return (await shell.match(request, { ignoreSearch: true })) || fetch(request);
}
