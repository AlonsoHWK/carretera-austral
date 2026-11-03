const DESKTOP = '(min-width: 900px)';

export function createTabs() {
  const views = [...document.querySelectorAll('.view')];
  const buttons = [...document.querySelectorAll('.tabs button')];
  const infoButton = document.getElementById('infobtn');

  function show(viewId) {
    views.forEach((view) => view.classList.toggle('on', view.id === viewId));
    buttons.forEach((button) => {
      const on = button.dataset.v === viewId;
      button.classList.toggle('on', on);
      if (on) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    infoButton.setAttribute('aria-expanded', String(viewId === 'infov'));
  }

  const current = () => (views.find((view) => view.classList.contains('on')) || {}).id;

  buttons.forEach((button) => button.addEventListener('click', () => show(button.dataset.v)));
  infoButton.addEventListener('click', () => show(current() === 'infov' ? 'routev' : 'infov'));
  infoButton.setAttribute('aria-expanded', 'false');

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current() === 'infov' && window.matchMedia(DESKTOP).matches) show('routev');
  });

  return { show, current };
}
