import { h } from './dom.js';

const toastEl = () => document.getElementById('toast');

export function showToast(message, actionLabel, action) {
  const toast = toastEl();
  toast.replaceChildren(h('span', { text: message }));
  if (actionLabel) {
    toast.append(h('button', { type: 'button', text: actionLabel, onclick: action }));
  }
  toast.hidden = false;
}

function promptUpdate(worker) {
  showToast('Nueva versión disponible', 'Actualizar', () => worker.postMessage('SKIP_WAITING'));
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // A first install must not reload the page: only updates take over an existing controller.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });

  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((registration) => {
    if (registration.waiting && navigator.serviceWorker.controller) promptUpdate(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(worker);
      });
    });
    const check = () => {
      if (navigator.onLine) registration.update().catch(() => {});
    };
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  }).catch(() => {});
}
