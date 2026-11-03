import { h } from './dom.js';
import { loadItinerary, checkForDataUpdate, recoverData } from './data.js';
import { getStartDate } from './store.js';
import { resolveToday } from './today.js';
import { createCards } from './cards.js';
import { createMap } from './map.js';
import { createTabs } from './tabs.js';
import { createInfo } from './info.js';
import { registerServiceWorker, showToast } from './sw-register.js';

const $ = (id) => document.getElementById(id);

// The custom domain also answers on plain http, where service workers (and so offline mode) are unavailable.
if (location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  location.replace(location.href.replace('http:', 'https:'));
}

function showFatal(errors) {
  const status = h('p', { 'aria-live': 'polite' });
  const retry = h('button', {
    type: 'button',
    text: 'Reintentar con la última versión publicada',
    onclick: async () => {
      status.textContent = 'Buscando…';
      try {
        const problems = await recoverData();
        if (problems.length) status.textContent = 'La versión publicada también tiene errores: revísalos arriba y corrígelos en GitHub.';
      } catch {
        status.textContent = 'No se pudo conectar. Inténtalo con señal.';
      }
    }
  });
  $('app').hidden = true;
  const fatal = $('fatal');
  fatal.replaceChildren(
    h('h1', { text: 'No se pudo abrir el itinerario' }),
    h('p', { text: 'Probablemente hay un error en data/itinerary.json. Corrígelo en GitHub y vuelve a intentar. Tus notas y visitas no se han perdido.' }),
    h('ul', {}, errors.map((error) => h('li', { text: error }))),
    retry,
    status);
  fatal.hidden = false;
  registerServiceWorker();
  // A valid version may already be published: recover without asking when there is signal.
  if (navigator.onLine) recoverData().catch(() => {});
}

function watchNetwork() {
  const net = $('net');
  let reachable = true;
  const paint = () => { net.hidden = navigator.onLine && reachable; };
  window.addEventListener('online', () => { reachable = true; paint(); });
  window.addEventListener('offline', paint);
  paint();
  // navigator.onLine stays true with a radio but no data, so failed checks count as offline too.
  return (value) => { reachable = value; paint(); };
}

function start(data, text) {
  const stops = data.stops;
  let current = 0;

  $('kick').textContent = data.trip.kicker || `${data.trip.totalDays} días`;
  $('pt').textContent = `/${String(stops.length).padStart(2, '0')}`;
  $('app').hidden = false;

  const tabs = createTabs();

  function paint(index) {
    current = index;
    const stop = stops[index];
    const segment = data.segments[stop.segment];
    const root = document.documentElement.style;
    root.setProperty('--c', segment.color);
    root.setProperty('--cd', segment.deep);
    $('pn').textContent = String(index + 1).padStart(2, '0');
    $('pd').textContent = `Día ${stop.days}`;
    cards.paintDots(index);
    map.update(index);
  }

  const cards = createCards(data, $('track'), $('dots'), {
    onChange: paint,
    onVisitedChange: () => paint(current)
  });

  const map = createMap(data, $('svg'), $('mapcard'), $('legend'), (index) => {
    tabs.show('routev');
    cards.goTo(index);
  });

  const applyToday = () => {
    const today = resolveToday(data, getStartDate());
    cards.setToday(today);
    return today;
  };

  createInfo(data, $('info'), {
    onDateChange: () => {
      const today = applyToday();
      cards.goTo(today ? today.index : 0, false);
    },
    // Restoring merges notes and visited flags that are already rendered, so rebuild from storage.
    onRestored: () => location.reload()
  });

  const today = applyToday();
  paint(today ? today.index : 0);
  cards.goTo(today ? today.index : 0, false);

  document.addEventListener('keydown', (event) => {
    if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
    if (event.target.closest('input, textarea, select')) return;
    if (tabs.current() === 'infov') return;
    event.preventDefault();
    const next = current + (event.key === 'ArrowRight' ? 1 : -1);
    if (next >= 0 && next < stops.length) cards.goTo(next);
  });

  const setReachable = watchNetwork();
  registerServiceWorker();

  const checkData = () => checkForDataUpdate(text, {
    onReachable: setReachable,
    onUpdate: (apply) => showToast('Nueva versión disponible', 'Actualizar', apply),
    onInvalid: (errors) => {
      console.warn('Published itinerary is invalid:', errors);
      showToast('El itinerario publicado tiene un error. Se mantiene la última copia válida.');
    }
  });
  checkData();
  window.addEventListener('online', checkData);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkData();
  });
}

const result = await loadItinerary();
if (result.errors) showFatal(result.errors);
else start(result.data, result.text);
