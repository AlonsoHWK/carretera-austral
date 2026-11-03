// End-to-end checks. Playwright lives outside the repo to keep node_modules out of OneDrive:
//   NODE_PATH=<tooling>/node_modules node tests/e2e.cjs
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PORT = 4173;
const BASE = `http://localhost:${PORT}/carretera-austral/`;
const VIEWPORTS = [[390, 844], [360, 640], [430, 932]];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };

// Overrides simulate deploys without touching the working tree.
const overrides = new Map();
let cacheControl = 'no-cache';
const server = http.createServer((req, res) => {
  const url = new URL(req.url, BASE);
  if (!url.pathname.startsWith('/carretera-austral/')) { res.writeHead(404); return res.end(); }
  let rel = decodeURIComponent(url.pathname.slice('/carretera-austral/'.length)) || 'index.html';
  const body = overrides.has(rel) ? overrides.get(rel) : (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel)) : null);
  if (body === null) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(rel)] || 'application/octet-stream', 'Cache-Control': rel === 'sw.js' ? 'no-cache' : cacheControl });
  res.end(body);
});

let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

const counter = (page) => page.locator('#pn').textContent();
const settle = (page) => page.waitForTimeout(450);

async function newApp(browser, viewport, options = {}) {
  const context = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, serviceWorkers: 'allow', ...options });
  const page = await context.newPage();
  const problems = [];
  const external = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(message.text()); });
  page.on('request', (request) => { if (!request.url().startsWith(`http://localhost:${PORT}`) && !request.url().startsWith('data:')) external.push(request.url()); });
  await page.goto(BASE);
  await page.waitForSelector('.card');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  return { context, page, problems, external };
}

// Dispatches real touch input, so scroll chaining from the card to the track is exercised.
async function swipe(page, cdp, dx) {
  const box = await page.locator('#track').boundingBox();
  const y = box.y + box.height / 2;
  const startX = box.x + box.width / 2 - dx / 2;
  const STEPS = 12;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
  for (let i = 1; i <= STEPS; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX + (dx * i) / STEPS, y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(900);
}

async function viewportSuite(browser, viewport) {
  const tag = viewport.join('x');
  console.log(`\n=== ${tag} ===`);
  const { context, page, problems, external } = await newApp(browser, viewport);
  const cdp = await context.newCDPSession(page);

  check('opens on stop 1', (await counter(page)) === '01');
  check('header says 20 días + vuelo', (await page.locator('#kick').textContent()).includes('20 días + vuelo'));
  check('no page-level horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  check('kicker and counter do not collide', await page.evaluate(() => {
    const a = document.querySelector('.brand').getBoundingClientRect();
    const b = document.querySelector('.prog').getBoundingClientRect();
    return a.right <= b.left;
  }));
  await page.screenshot({ path: path.join(SHOTS, `${tag}-route.png`) });

  await swipe(page, cdp, -viewport[0] * 0.8);
  check('swipe left advances one stop', (await counter(page)) === '02', await counter(page));
  check('snap lands centered', await page.evaluate(() => {
    const track = document.getElementById('track');
    const card = [...track.children].find((c) => {
      const r = c.getBoundingClientRect();
      return r.left >= -1 && r.right <= innerWidth + 1;
    });
    return Boolean(card);
  }));
  await swipe(page, cdp, viewport[0] * 0.8);
  check('swipe right goes back', (await counter(page)) === '01', await counter(page));

  const scrollResult = await page.evaluate(async () => {
    const card = document.querySelector('.card');
    card.scrollTop = 200;
    await new Promise((r) => setTimeout(r, 100));
    return { top: card.scrollTop, trackLeft: document.getElementById('track').scrollLeft, scrollable: card.scrollHeight > card.clientHeight };
  });
  check('card scrolls internally without moving the track', scrollResult.scrollable && scrollResult.top > 0 && scrollResult.trackLeft < 2, JSON.stringify(scrollResult));
  await page.evaluate(() => { document.querySelector('.card').scrollTop = 0; });

  await page.getByRole('button', { name: 'Mapa' }).click();
  check('map tab visible', await page.locator('#mapv').isVisible());
  await settle(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, `${tag}-map.png`) });
  const pinFont = await page.evaluate(() => ({ num: getComputedStyle(document.querySelector('.num')).fontFamily, label: getComputedStyle(document.querySelector('.plabel')).fontFamily, ok: document.fonts.check("700 12px 'DM Sans'") }));
  check('pin text uses DM Sans, loaded', pinFont.num.includes('DM Sans') && pinFont.label.includes('DM Sans') && pinFont.ok, JSON.stringify(pinFont));
  const labels = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.plabel')].map((el) => el.getBoundingClientRect());
    const card = document.getElementById('mapcard').getBoundingClientRect();
    let overlaps = 0;
    boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => { if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps++; }));
    const outside = boxes.filter((b) => b.left < card.left || b.right > card.right).length;
    const circles = [...document.querySelectorAll('.ring')].map((el) => el.getBoundingClientRect());
    let pinOverlaps = 0;
    circles.forEach((a, i) => circles.slice(i + 1).forEach((b) => {
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.width - 1) pinOverlaps++;
    }));
    return { overlaps, outside, pinOverlaps };
  });
  check('map labels and pins do not overlap or clip', labels.overlaps === 0 && labels.outside === 0 && labels.pinOverlaps === 0, JSON.stringify(labels));

  // Pin 7 → card 7. Tap the pin's real position.
  const pin = await page.locator('.pin').nth(6).locator('.ring').boundingBox();
  await page.touchscreen.tap(pin.x + pin.width / 2, pin.y + pin.height / 2);
  await page.waitForTimeout(900);
  check('pin tap jumps to that card', (await counter(page)) === '07' && await page.locator('#routev').isVisible(), await counter(page));
  check('segment color follows the stop', (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cd').trim())) === '#3162D1');
  await page.screenshot({ path: path.join(SHOTS, `${tag}-pin-jump.png`) });

  const card = page.locator('.card').nth(6);
  await card.locator('textarea').fill('Nota de prueba ñandú');
  await card.locator('.dbtn').click();
  await card.locator('textarea').blur();
  await page.reload();
  await page.waitForSelector('.card');
  const reloaded = page.locator('.card').nth(6);
  check('note persists after reload', (await reloaded.locator('textarea').inputValue()) === 'Nota de prueba ñandú');
  check('visited persists after reload', (await reloaded.getAttribute('class')).includes('done') && (await reloaded.locator('.dbtn').textContent()).includes('Visitado'));

  // Sizes
  const sizes = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('.desc, .fact b, .tip p, .ret li, .panel > p, .calls a > span, .checks span, .safety dd')) {
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 14) bad.push(`${el.className || el.tagName}:${size}`);
    }
    const small = [];
    const walker = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (walker.currentNode.textContent.trim() && parseFloat(getComputedStyle(parent).fontSize) < 12) small.push(parent.className || parent.tagName);
    }
    return { bad, small };
  });
  check('body text ≥ 14px, labels ≥ 12px', sizes.bad.length === 0 && sizes.small.length === 0, JSON.stringify(sizes));

  for (const [i, name] of [[1, 'bosque'], [5, 'fiordo'], [7, 'castillo'], [8, 'lago'], [9, 'estepa']]) {
    await page.evaluate((index) => { const track = document.getElementById('track'); const card = track.children[index]; track.scrollLeft = card.offsetLeft - 20; }, i);
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(SHOTS, `${tag}-${name}.png`) });
  }
  await page.getByRole('button', { name: 'Info' }).first().click();
  check('info tab visible', await page.locator('#infov').isVisible());
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, `${tag}-info.png`) });
  const monday = await page.locator('.datenotes').textContent();
  check('Monday constraint shown in Info', monday.includes('lunes'));
  const targets = await page.evaluate(() => {
    const small = [];
    const views = ['routev', 'mapv', 'infov'];
    for (const el of document.querySelectorAll('.tabs button, .dbtn, .linkset a, .btn, .calls a, .checks label, #track .notes textarea, .field input')) {
      const box = el.getBoundingClientRect();
      if (box.width && box.height < 44) small.push(`${el.className || el.tagName}:${Math.round(box.height)}`);
    }
    return { small, views: views.length };
  });
  check('tap targets ≥ 44px', targets.small.length === 0, targets.small.join(','));
  await page.locator('.info').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, `${tag}-info-bottom.png`) });

  // Last card, with the return section
  await page.getByRole('button', { name: 'Ruta' }).click();
  await page.evaluate(() => {
    const track = document.getElementById('track');
    track.scrollLeft = track.scrollWidth;
  });
  await page.waitForTimeout(500);
  check('last stop reachable', (await counter(page)) === '11', await counter(page));
  await page.screenshot({ path: path.join(SHOTS, `${tag}-tortel.png`) });
  await page.locator('.card').last().evaluate((el) => { el.scrollTop = 420; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, `${tag}-tortel-return.png`) });
  check('return section rendered', (await page.locator('.card').last().locator('.ret').textContent()).includes('Día 21'));

  // Offline: reload with no network, everything still works.
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('.card');
  await page.waitForTimeout(300);
  check('offline: app loads with 11 cards', (await page.locator('.card').count()) === 11);
  check('offline: indicator visible', await page.locator('#net').isVisible(), JSON.stringify(await page.evaluate(() => ({ onLine: navigator.onLine, hidden: document.getElementById('net').hidden, box: document.getElementById('net').getBoundingClientRect().width }))));
  check('offline: fonts loaded', await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check("700 16px Fraunces") && document.fonts.check("400 16px 'DM Sans'"); }));
  check('offline: note still there', (await page.locator('.card').nth(6).locator('textarea').inputValue()) === 'Nota de prueba ñandú');
  await page.getByRole('button', { name: 'Mapa' }).click();
  const offlinePin = await page.locator('.pin').nth(2).locator('.ring').boundingBox();
  await page.touchscreen.tap(offlinePin.x + offlinePin.width / 2, offlinePin.y + offlinePin.height / 2);
  await page.waitForTimeout(800);
  check('offline: pin navigation works', (await counter(page)) === '03', await counter(page));
  await page.screenshot({ path: path.join(SHOTS, `${tag}-offline.png`) });
  await page.getByRole('button', { name: 'Info' }).first().click();
  check('offline: info works', await page.locator('.calls').isVisible());
  await context.setOffline(false);

  check('no external requests', external.length === 0, external.slice(0, 3).join(', '));
  const realProblems = problems.filter((text) => !text.includes('ERR_INTERNET_DISCONNECTED'));
  check('no console or page errors', realProblems.length === 0, realProblems.slice(0, 3).join(' | '));
  await context.close();
}

async function featureSuite(browser) {
  console.log('\n=== features ===');
  const viewport = VIEWPORTS[0];

  // Hoy mode, with fixed clocks via start dates relative to the real today.
  {
    const { context, page } = await newApp(browser, viewport);
    const iso = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const setStart = async (value) => {
      await page.evaluate((v) => {
        const raw = JSON.parse(localStorage.getItem('ca:v1') || '{}');
        raw.startDate = v;
        localStorage.setItem('ca:v1', JSON.stringify(raw));
      }, value);
      await page.reload();
      await page.waitForSelector('.card');
      await page.waitForTimeout(300);
    };
    await setStart(iso(-8));
    check('Hoy: day 9 opens stop 6', (await counter(page)) === '06', await counter(page));
    check('Hoy chip on today card', await page.locator('.card').nth(5).locator('.today').isVisible());
    await page.screenshot({ path: path.join(SHOTS, 'hoy-chip.png') });
    await setStart(iso(-19));
    check('Hoy: day 20 opens Tortel', (await counter(page)) === '11', await counter(page));
    await setStart(iso(-20));
    check('Hoy: flight day opens Tortel', (await counter(page)) === '11' && (await page.locator('.card').last().locator('.today').textContent()).includes('vuelo'));
    await setStart(iso(5));
    check('Hoy: before the trip falls back to stop 1', (await counter(page)) === '01' && !(await page.locator('.today').first().isVisible()));
    await setStart(iso(-30));
    check('Hoy: after the trip falls back to stop 1', (await counter(page)) === '01');

    // A start date 17 days before a Monday makes day 18 a Monday.
    const warn = await page.evaluate(() => {
      const d = new Date(2027, 0, 1);
      while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    await page.getByRole('button', { name: 'Info' }).first().click();
    await page.locator('input[type=date]').fill(warn);
    check('Friday start warns about Monday bus', (await page.locator('.status--warn').first().textContent()).includes('lunes'));
    await page.locator('input[type=date]').fill('');
    await context.close();
  }

  // Backup: A → B merge keeps both sides.
  {
    const a = await newApp(browser, viewport, { permissions: ['clipboard-read', 'clipboard-write'] });
    await a.page.locator('.card').first().locator('textarea').fill('Nota del teléfono A');
    await a.page.locator('.card').first().locator('.dbtn').click();
    await a.page.locator('.card').first().locator('textarea').blur();
    await a.page.getByRole('button', { name: 'Info' }).first().click();
    await a.page.getByRole('button', { name: 'Copiar código' }).click();
    const code = await a.page.locator('textarea[readonly]').inputValue();
    check('backup code generated', code.startsWith('CA1.'));

    const b = await newApp(browser, viewport);
    await b.page.locator('.card').first().locator('textarea').fill('Nota del teléfono B');
    await b.page.locator('.card').first().locator('textarea').blur();
    await b.page.getByRole('button', { name: 'Info' }).first().click();
    const paste = b.page.locator('textarea[placeholder^="Pega"]');
    await paste.fill('basura');
    await b.page.getByRole('button', { name: 'Revisar código' }).click();
    check('bad backup code is rejected', (await b.page.locator('.status--warn').last().textContent()).includes('código'));
    await paste.fill(code.slice(0, -3) + 'xyz');
    await b.page.getByRole('button', { name: 'Revisar código' }).click();
    check('corrupted backup code is rejected', (await b.page.locator('.status--warn').last().textContent()).includes('incompleto'));
    await paste.fill(code);
    await b.page.getByRole('button', { name: 'Revisar código' }).click();
    await b.page.getByRole('button', { name: 'Confirmar y combinar' }).click();
    await b.page.waitForSelector('.card');
    await b.page.waitForTimeout(300);
    const note = await b.page.locator('.card').first().locator('textarea').inputValue();
    check('restore merges notes from both phones', note.includes('teléfono A') && note.includes('teléfono B'), note.replace(/\n/g, ' / '));
    check('restore brings visited flags', (await b.page.locator('.card').first().getAttribute('class')).includes('done'));
    await a.context.close();
    await b.context.close();
  }

  // Storage unavailable: must still render.
  {
    const context = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] } });
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(BASE);
    await page.waitForSelector('.card');
    await page.locator('.dbtn').first().click();
    check('renders and works without localStorage', errors.length === 0 && (await page.locator('.card').count()) === 11, errors.join('|'));
    await context.close();
  }

  // Malformed JSON on first load: readable message, no crash.
  {
    overrides.set('data/itinerary.json', '{ "stops": [ oops ');
    const context = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] } });
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('#fatal:not([hidden])');
    check('malformed JSON shows readable error', (await page.locator('#fatal').textContent()).includes('mal escrito'));
    await page.screenshot({ path: path.join(SHOTS, 'error-malformed.png') });

    const missing = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/itinerary.json'), 'utf8'));
    delete missing.stops[5].lat;
    missing.stops[6].days = '11–12';
    overrides.set('data/itinerary.json', JSON.stringify(missing));
    await page.reload();
    await page.waitForSelector('#fatal:not([hidden])');
    const text = await page.locator('#fatal').textContent();
    check('invalid fields are named per stop', text.includes('Parada 6 (queulat)') && text.includes('`lat`') && text.includes('día 12'), text.slice(0, 200));
    overrides.delete('data/itinerary.json');
    await page.getByRole('button', { name: /Reintentar/ }).click();
    await page.waitForSelector('.card');
    check('error screen recovers once data is fixed', (await page.locator('.card').count()) === 11);
    await context.close();
  }

  // Published data edits: toast, then update; invalid edits keep the last good copy.
  {
    const { context, page } = await newApp(browser, viewport);
    await page.reload();
    await page.waitForSelector('.card');
    const original = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/itinerary.json'), 'utf8'));

    overrides.set('data/itinerary.json', '{ broken');
    await page.reload();
    await page.waitForSelector('.card');
    await page.waitForSelector('#toast:not([hidden])');
    check('broken published JSON keeps last good copy', (await page.locator('.card').count()) === 11 && (await page.locator('#toast').textContent()).includes('última copia'));

    const edited = JSON.parse(JSON.stringify(original));
    edited.stops[0].subtitle = 'Subtítulo editado desde el teléfono';
    overrides.set('data/itinerary.json', JSON.stringify(edited));
    await page.reload();
    await page.waitForSelector('.card');
    await page.waitForSelector('#toast button');
    check('data edit shows update toast', (await page.locator('#toast').textContent()).includes('Nueva versión disponible'));
    await page.screenshot({ path: path.join(SHOTS, 'toast-update.png') });
    await page.locator('#toast button').click();
    await page.waitForFunction(() => document.querySelector('.card .sub')?.textContent.includes('editado'));
    check('toast applies the data edit', true);
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector('.card');
    check('edited data survives offline', (await page.locator('.card .sub').first().textContent()).includes('editado'));
    await context.setOffline(false);
    overrides.delete('data/itinerary.json');
    await context.close();
  }

  // Code deploys: bumping VERSION in sw.js shows the toast rather than serving stale content.
  {
    const { context, page } = await newApp(browser, viewport);
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    overrides.set('sw.js', sw.replace(/const VERSION = '[^']+'/, "const VERSION = '9.9.9'"));
    await page.reload();
    await page.waitForSelector('.card');
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForSelector('#toast button', { timeout: 15000 });
    check('new deploy shows update toast', (await page.locator('#toast').textContent()).includes('Nueva versión disponible'));
    await Promise.all([page.waitForEvent('load'), page.locator('#toast button').click()]);
    await page.waitForSelector('.card');
    const caches9 = await page.evaluate(() => caches.keys());
    check('update activates and drops the old cache', caches9.includes('ca-shell-9.9.9') && caches9.filter((n) => n.startsWith('ca-shell-')).length === 1, caches9.join(','));
    overrides.delete('sw.js');
    await context.close();
  }

  // Cloudflare tells browsers to keep JS for 4 hours: an update must still precache the new files.
  {
    cacheControl = 'max-age=14400';
    const { context, page } = await newApp(browser, viewport);
    const map = fs.readFileSync(path.join(ROOT, 'js/map.js'), 'utf8');
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    overrides.set('js/map.js', `${map}\n// deployed-marker\n`);
    overrides.set('sw.js', sw.replace(/const VERSION = '[^']+'/, "const VERSION = '9.9.8'"));
    await page.reload();
    await page.waitForSelector('.card');
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForSelector('#toast button', { timeout: 15000 });
    await Promise.all([page.waitForEvent('load'), page.locator('#toast button').click()]);
    await page.waitForSelector('.card');
    const cached = await page.evaluate(async () => {
      const shell = await caches.open('ca-shell-9.9.8');
      return (await (await shell.match('js/map.js')).text()).includes('deployed-marker');
    });
    check('update precaches new files despite a long browser cache', cached);
    overrides.delete('js/map.js');
    overrides.delete('sw.js');
    cacheControl = 'no-cache';
    await context.close();
  }

  // Desktop layout and keyboard.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.card');
    await page.waitForTimeout(400);
    check('desktop: map and cards side by side', await page.evaluate(() => {
      const map = document.getElementById('mapv').getBoundingClientRect();
      const route = document.getElementById('routev').getBoundingClientRect();
      return map.width > 0 && route.width > 0 && map.right <= route.left + 1;
    }));
    check('desktop: tab bar hidden', !(await page.locator('.tabs').isVisible()));
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
    check('desktop: arrow key advances', (await counter(page)) === '02', await counter(page));
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(700);
    check('desktop: arrow key goes back', (await counter(page)) === '01', await counter(page));
    await page.locator('.card').first().locator('textarea').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    check('desktop: arrows stay in the textarea', (await counter(page)) === '01');
    await page.locator('.card').first().locator('textarea').blur();
    await page.screenshot({ path: path.join(SHOTS, 'desktop.png') });
    await page.locator('#infobtn').click();
    await page.waitForTimeout(200);
    check('desktop: Info opens from header', await page.locator('.calls').isVisible());
    await page.screenshot({ path: path.join(SHOTS, 'desktop-info.png') });
    await page.keyboard.press('Escape');
    check('desktop: Escape closes Info', !(await page.locator('.calls').isVisible()));
    await context.close();
  }

  // Trail must not animate from full on load, and resizing must keep header and card in sync.
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.pin');
    const trail = await page.evaluate(() => {
      const el = document.querySelector('.trail');
      return { running: el.getAnimations().length, dash: parseFloat(el.style.strokeDasharray), offset: parseFloat(el.style.strokeDashoffset) };
    });
    check('trail starts empty with no running animation', trail.running === 0 && trail.dash === trail.offset, JSON.stringify(trail));

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(900);
    for (const width of [1000, 1400, 950]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(700);
      const state = await page.evaluate(() => {
        const track = document.getElementById('track');
        const box = track.getBoundingClientRect();
        const visible = [...track.children].findIndex((card) => {
          const r = card.getBoundingClientRect();
          return Math.abs(r.left - box.left) < 3 || (r.left >= box.left - 3 && r.right <= box.right + 3);
        });
        return { visible, header: Number(document.getElementById('pn').textContent) };
      });
      check(`resize to ${width}: header matches the visible card`, state.visible + 1 === state.header && state.header === 2 + 1, JSON.stringify(state));
    }
    await context.close();
  }

  // A crash while building the UI explains itself instead of leaving an empty shell.
  {
    const source = fs.readFileSync(path.join(ROOT, 'js/map.js'), 'utf8');
    const head = 'export function createMap(data, svg, card, legendEl, onPick) {';
    overrides.set('js/map.js', source.replace(head, `${head} throw new Error('fallo simulado');`));
    const context = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] }, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('#fatal:not([hidden])');
    check('UI crash shows a readable error', (await page.locator('#fatal').textContent()).includes('fallo simulado') && !(await page.locator('#app').isVisible()));
    overrides.delete('js/map.js');
    await context.close();
  }

  // Reduced motion: programmatic jumps must not animate.
  {
    const context = await browser.newContext({ viewport: { width: viewport[0], height: viewport[1] }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.card');
    const duration = await page.evaluate(() => getComputedStyle(document.querySelector('.trail')).transitionDuration);
    check('reduced motion disables transitions', parseFloat(duration) < 0.01, duration);
    await context.close();
  }

  // Every precached file exists, and the app shell stays on budget.
  {
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const list = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');
    const missing = list.filter((f) => !fs.existsSync(path.join(ROOT, f)));
    check('all precached files exist', missing.length === 0, missing.join(','));
    const listDir = (dir) => fs.readdirSync(path.join(ROOT, dir)).map((f) => `${dir}/${f}`);
    const onDisk = [...listDir('css'), ...listDir('js'), ...listDir('fonts').filter((f) => f.endsWith('.woff2')), ...listDir('icons')];
    const unlisted = onDisk.filter((f) => !list.includes(f));
    check('all app files are precached', unlisted.length === 0, unlisted.join(','));
    const size = (f) => fs.statSync(path.join(ROOT, f)).size;
    const shell = list.filter((f) => !f.startsWith('fonts/') && !f.endsWith('.png')).reduce((sum, f) => sum + size(f), size('sw.js') + size('data/itinerary.json'));
    check('shell + data under 150 KB, excluding fonts and PNGs', shell < 150 * 1024, `${Math.round(shell / 1024)} KB`);
  }
}

async function axeSuite(browser) {
  console.log('\n=== accessibility (axe) ===');
  let source;
  try {
    source = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  } catch {
    console.log('SKIP  axe-core not installed');
    return;
  }
  const { context, page } = await newApp(browser, VIEWPORTS[0]);
  await page.addScriptTag({ content: source });
  for (const view of ['Ruta', 'Mapa', 'Info']) {
    await page.getByRole('button', { name: view }).first().click();
    await page.waitForTimeout(250);
    const result = await page.evaluate(async () => {
      const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] });
      return {
        violations: r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 4).map((n) => n.target.join(' ')).join(' ; ')}`),
        contrastIncomplete: (r.incomplete.find((v) => v.id === 'color-contrast') || { nodes: [] }).nodes.length
      };
    });
    check(`axe ${view}: no WCAG A/AA violations`, result.violations.length === 0, result.violations.join(' || '));
    console.log(`      contrast that axe could not compute: ${result.contrastIncomplete} nodes`);
  }
  await context.close();
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  await new Promise((resolve) => server.listen(PORT, resolve));
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) await viewportSuite(browser, viewport);
    await featureSuite(browser);
    await axeSuite(browser);
  } catch (error) {
    failures++;
    console.error('CRASH', error);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n${failures === 0 ? 'ALL PASSED' : `${failures} FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
})();
