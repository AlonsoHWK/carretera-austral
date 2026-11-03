import { h, s, prefersReducedMotion } from './dom.js';
import { getNote, setNote, isVisited, setVisited } from './store.js';

const MOUNTAIN = 'M0 80 L38 34 L56 52 L92 8 L120 44 L138 30 L176 70 L200 56 L200 80Z';
const DONE_LABEL = '✓ Visitado';
const TODO_LABEL = 'Marcar como visitado';

function flags(stop, path) {
  const out = [];
  if ((stop.unverified || []).includes(path)) {
    out.push(h('span', { class: 'flag flag--unverified', text: 'Por confirmar' }));
  }
  const seasonal = (stop.seasonal || []).find((item) => item.path === path);
  if (seasonal) {
    out.push(h('span', { class: 'flag flag--seasonal', text: 'Según temporada', title: seasonal.note || '' }));
  }
  return out;
}

function fact(stop, label, field, wide) {
  return h('div', { class: wide ? 'fact fact--wide' : 'fact' },
    h('span', { class: 'lbl', text: label }),
    h('b', { text: stop[field] }),
    flags(stop, field));
}

function tips(stop) {
  if (!stop.tips.length) return null;
  return h('div', { class: 'tip' },
    h('strong', { text: stop.tips.length > 1 ? 'Consejos' : 'Consejo' }),
    stop.tips.map((tip, i) => h('p', {}, tip, flags(stop, `tips.${i}`))));
}

function returnTrip(stop) {
  const trip = stop.returnTrip;
  if (!trip) return null;
  return h('section', { class: 'ret' },
    h('strong', { text: trip.title || 'Regreso' }),
    h('ol', {}, trip.steps.map((step, i) => h('li', {},
      h('b', { text: step.day }),
      step.text,
      flags(stop, `returnTrip.steps.${i}`)))),
    trip.note ? h('p', { class: 'retnote', text: trip.note }) : null);
}

function links(stop) {
  const maps = `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}`;
  return h('div', { class: 'linkset' },
    h('a', { href: maps, target: '_blank', rel: 'noopener', text: 'Abrir en Maps' }),
    h('p', { class: 'mapsnote', text: 'Necesita señal o un mapa descargado antes.' }),
    stop.links.map((link) => h('a', { href: link.url, target: '_blank', rel: 'noopener', text: link.label })));
}

function notes(stop) {
  let timer;
  const area = h('textarea', {
    value: getNote(stop.id),
    placeholder: 'Reservas, datos, recordatorios…',
    rows: 3,
    maxLength: 2000,
    oninput: () => {
      clearTimeout(timer);
      timer = setTimeout(() => setNote(stop.id, area.value), 250);
    },
    onblur: () => {
      clearTimeout(timer);
      setNote(stop.id, area.value);
    }
  });
  return h('label', { class: 'notes' }, h('span', { class: 'lbl', text: 'Mis notas' }), area);
}

function buildCard(data, stop, onVisitedChange) {
  const segment = data.segments[stop.segment];
  const inkHero = segment.heroText.toUpperCase() !== '#FFFFFF';
  const card = h('article', { class: isVisited(stop.id) ? 'card done' : 'card', 'aria-label': stop.name });
  card.style.setProperty('--tc-deep', segment.deep);
  card.style.setProperty('--tc-tint', segment.tint);

  const hero = h('div', { class: inkHero ? 'hero hero--ink' : 'hero' },
    h('div', { class: 'hrow' },
      h('span', { class: 'pill', text: segment.name }),
      h('div', { class: 'hflags' },
        h('span', { class: 'today', hidden: true }),
        h('span', { class: 'chk', text: DONE_LABEL }))),
    h('div', { class: 'dia', text: `Día ${stop.days}` }),
    h('h2', { text: stop.name }),
    h('p', { class: 'sub', text: stop.subtitle }));
  hero.style.setProperty('--hero', segment.hero);
  hero.style.setProperty('--vivid', segment.color);
  hero.style.setProperty('--hero-text', segment.heroText);
  hero.prepend(s('svg', { class: 'mt', viewBox: '0 0 200 80', 'aria-hidden': 'true' }, s('path', { d: MOUNTAIN })));

  const button = h('button', {
    class: 'dbtn',
    type: 'button',
    text: isVisited(stop.id) ? DONE_LABEL : TODO_LABEL,
    onclick: () => {
      const next = !isVisited(stop.id);
      setVisited(stop.id, next);
      card.classList.toggle('done', next);
      button.textContent = next ? DONE_LABEL : TODO_LABEL;
      onVisitedChange();
    }
  });

  card.append(hero, h('div', { class: 'body' },
    h('p', { class: 'desc' }, stop.description, flags(stop, 'description')),
    h('div', { class: 'facts' },
      fact(stop, 'Dormir', 'sleep'),
      fact(stop, 'Imperdible', 'highlight'),
      fact(stop, 'Moverse', 'transport', true)),
    tips(stop),
    returnTrip(stop),
    links(stop),
    notes(stop),
    button));
  return card;
}

export function createCards(data, track, dotsEl, { onChange, onVisitedChange }) {
  const cards = data.stops.map((stop) => buildCard(data, stop, onVisitedChange));
  track.append(...cards);
  const dots = cards.map(() => h('i'));
  dotsEl.append(...dots);

  // While a programmatic jump is in flight, ignore the cards it scrolls past.
  let pending = null;
  let pendingTimer;
  const clearPending = () => { pending = null; clearTimeout(pendingTimer); };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const index = cards.indexOf(entry.target);
      if (pending !== null && index !== pending) continue;
      clearPending();
      current = index;
      onChange(index);
    }
  }, { root: track, threshold: 0.6 });
  cards.forEach((card) => observer.observe(card));

  // A width change moves the snap points, so realign to the stop the header shows.
  let current = 0;
  let trackWidth = track.clientWidth;
  new ResizeObserver(() => {
    if (track.clientWidth === trackWidth) return;
    trackWidth = track.clientWidth;
    goTo(current, false);
  }).observe(track);

  function goTo(index, smooth = true) {
    const card = cards[index];
    if (!card) return;
    const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
    pending = index;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(clearPending, 1500);
    track.scrollTo({ left, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
    current = index;
    onChange(index);
  }

  function paintDots(current) {
    dots.forEach((dot, i) => {
      dot.className = i === current ? 'on' : (isVisited(data.stops[i].id) ? 'dn' : '');
    });
  }

  function setToday(today) {
    cards.forEach((card, i) => {
      const chip = card.querySelector('.today');
      const on = today && today.index === i;
      chip.hidden = !on;
      if (on) chip.textContent = today.isFlight ? 'Hoy · vuelo' : 'Hoy';
    });
  }

  return { goTo, paintDots, setToday };
}
