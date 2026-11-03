import { h, s } from './dom.js';
import { isVisited } from './store.js';

const PIN_R = 13;
const MIN_GAP = PIN_R * 2 + 4;
const PAD_Y = 40;
const LABEL_GAP = 7;
const LABEL_FONT = "500 12px 'DM Sans', system-ui, sans-serif";

// Equirectangular projection fitted to the route's bounding box, centered in the given size.
function projector(points, width, height) {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const kx = Math.cos(midLat * Math.PI / 180);
  const spanX = (Math.max(...lngs) - Math.min(...lngs)) * kx;
  const spanY = Math.max(...lats) - Math.min(...lats);
  const scale = Math.min((width - 2 * PIN_R - 16) / spanX, (height - 2 * PAD_Y) / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;
  const minLng = Math.min(...lngs);
  const maxLat = Math.max(...lats);
  return ([lat, lng]) => [offsetX + (lng - minLng) * kx * scale, offsetY + (maxLat - lat) * scale];
}

// Pushes pins apart for display only; the map draws a leader line back to the true position.
function nudge(positions, height) {
  const shown = positions.map(([x, y]) => [x, y]);
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    for (let i = 0; i < shown.length; i++) {
      for (let j = i + 1; j < shown.length; j++) {
        const dx = shown[j][0] - shown[i][0];
        const dy = shown[j][1] - shown[i][1];
        const distance = Math.hypot(dx, dy);
        if (distance >= MIN_GAP) continue;
        const push = (MIN_GAP - distance) / 2 + 0.5;
        const direction = dy >= 0 ? 1 : -1;
        shown[i][1] -= push * direction;
        shown[j][1] += push * direction;
        moved = true;
      }
    }
    if (!moved) break;
  }
  shown.forEach((p) => { p[1] = Math.min(height - PIN_R - 4, Math.max(PAD_Y - PIN_R, p[1])); });
  return shown;
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function placeLabels(stops, shown, routeBoxes, width) {
  const context = document.createElement('canvas').getContext('2d');
  context.font = LABEL_FONT;
  const placed = [];
  return stops.map((stop, i) => {
    const textWidth = context.measureText(stop.mapLabel || stop.name).width + 4;
    const [x, y] = shown[i];
    const box = (side) => ({
      x: side === 'right' ? x + PIN_R + LABEL_GAP : x - PIN_R - LABEL_GAP - textWidth,
      y: y - 9,
      w: textWidth,
      h: 18
    });
    const cost = (side) => {
      const b = box(side);
      let total = 0;
      if (b.x < 4 || b.x + b.w > width - 4) total += 1000;
      for (const other of placed) if (overlap(b, other)) total += 100;
      for (const other of routeBoxes) if (overlap(b, other)) total += 3;
      shown.forEach((p, j) => {
        if (j !== i && overlap(b, { x: p[0] - PIN_R, y: p[1] - PIN_R, w: PIN_R * 2, h: PIN_R * 2 })) total += 100;
      });
      return total;
    };
    const side = stop.labelSide || (cost('right') <= cost('left') ? 'right' : 'left');
    placed.push(box(side));
    return side;
  });
}

function legPath(a, b) {
  const midY = (a[1] + b[1]) / 2;
  return `C ${a[0]} ${midY}, ${b[0]} ${midY}, ${b[0]} ${b[1]}`;
}

export function createMap(data, svg, card, legendEl, onPick) {
  const stops = data.stops;
  const allPoints = stops.flatMap((stop) => [...(stop.via || []), [stop.lat, stop.lng]]);
  let pins = [];
  let trail = null;
  let lengths = [];
  let total = 0;
  let current = 0;

  legendEl.tabIndex = 0;
  legendEl.setAttribute('role', 'group');
  legendEl.setAttribute('aria-label', 'Tramos de la ruta');
  legendEl.append(...Object.values(data.segments).map((segment) => {
    const dot = h('i');
    dot.style.background = segment.color;
    return h('span', {}, dot, segment.name);
  }));

  function render() {
    const width = card.clientWidth;
    const height = card.clientHeight;
    if (!width || !height) return;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const project = projector(allPoints, width, height);
    const truePos = stops.map((stop) => project([stop.lat, stop.lng]));
    const shown = nudge(truePos, height);

    let d = '';
    let last = null;
    const legEnds = [];
    const routeBoxes = [];
    const addPoint = (point) => {
      d += last ? ` ${legPath(last, point)}` : `M ${point[0]} ${point[1]}`;
      if (last) {
        routeBoxes.push({
          x: Math.min(last[0], point[0]),
          y: Math.min(last[1], point[1]),
          w: Math.abs(last[0] - point[0]) || 1,
          h: Math.abs(last[1] - point[1]) || 1
        });
      }
      last = point;
    };
    stops.forEach((stop, i) => {
      (stop.via || []).forEach((point) => addPoint(project(point)));
      addPoint(truePos[i]);
      legEnds.push(d);
    });

    const base = s('path', { class: 'base', d });
    trail = s('path', { class: 'trail', d });
    svg.append(base, trail);
    const measure = s('path', {});
    svg.append(measure);
    lengths = legEnds.map((part) => {
      measure.setAttribute('d', part);
      return measure.getTotalLength();
    });
    measure.remove();
    total = lengths[lengths.length - 1];
    trail.style.strokeDasharray = total;
    trail.style.strokeDashoffset = total - lengths[current];

    const sides = placeLabels(stops, shown, routeBoxes, width);
    const layer = s('g', {});
    pins = stops.map((stop, i) => {
      const segment = data.segments[stop.segment];
      const [x, y] = shown[i];
      const [tx, ty] = truePos[i];
      const moved = Math.hypot(x - tx, y - ty) > 1;
      if (moved) {
        layer.append(s('line', { class: 'leader', x1: tx, y1: ty, x2: x, y2: y }), s('circle', { class: 'truepos', cx: tx, cy: ty, r: 2 }));
      }
      const side = sides[i];
      const label = s('text', {
        class: 'plabel',
        x: side === 'right' ? x + PIN_R + LABEL_GAP : x - PIN_R - LABEL_GAP,
        y,
        'text-anchor': side === 'right' ? 'start' : 'end'
      });
      label.textContent = stop.mapLabel || stop.name;
      const number = s('text', { class: 'num', x, y });
      number.textContent = i + 1;
      const pin = s('g', { class: 'pin', role: 'button', tabindex: 0, 'aria-label': `${i + 1}. ${stop.name}, día ${stop.days}` },
        s('circle', { class: 'ring', cx: x, cy: y, r: PIN_R - 1 }), number, label);
      pin.style.setProperty('--pc', segment.color);
      pin.style.setProperty('--pd', segment.deep);
      pin.style.setProperty('--pt', segment.tint);
      pin.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPick(i);
        }
      });
      layer.append(pin);
      return { el: pin, x, y };
    });
    svg.append(layer);
    update(current);
  }

  // Taps resolve to the nearest pin, which gives every pin a target of at least 44 px.
  svg.addEventListener('click', (event) => {
    const box = svg.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    let best = -1;
    let bestDistance = 30;
    pins.forEach((pin, i) => {
      const distance = Math.hypot(pin.x - x, pin.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    if (best === -1) {
      const onLabel = event.target.closest && event.target.closest('.pin');
      best = onLabel ? pins.findIndex((pin) => pin.el === onLabel) : -1;
    }
    if (best !== -1) onPick(best);
  });

  function update(index) {
    current = index;
    pins.forEach((pin, i) => {
      const past = i < index || isVisited(stops[i].id);
      pin.el.classList.toggle('on', i === index);
      pin.el.classList.toggle('past', past && i !== index);
      if (i === index) pin.el.setAttribute('aria-current', 'step');
      else pin.el.removeAttribute('aria-current');
    });
    if (trail) trail.style.strokeDashoffset = total - lengths[index];
  }

  new ResizeObserver(render).observe(card);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  render();

  return { update };
}
