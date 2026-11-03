import { h } from './dom.js';
import { getStartDate, setStartDate, isPacked, setPacked, isStorageOk, snapshot, merge } from './store.js';
import { encodeBackup, decodeBackup } from './backup.js';
import { resolveToday, dateWarnings } from './today.js';

function panel(title, ...children) {
  return h('section', { class: 'panel' }, h('h2', { text: title }), ...children);
}

function datePanel(data, onDateChange) {
  const status = h('div', { 'aria-live': 'polite' });

  function refresh() {
    const value = getStartDate();
    status.replaceChildren();
    if (!value) {
      status.append(h('p', { class: 'status', text: 'Sin fecha, la guía abre en la primera parada.' }));
      return;
    }
    const today = resolveToday(data, value);
    let message = 'Hoy está fuera del viaje: la guía abre en la primera parada.';
    if (today) {
      message = today.isFlight
        ? `Hoy es el día ${today.day}: vuelo de regreso.`
        : `Hoy es el día ${today.day}: ${data.stops[today.index].name}.`;
    }
    status.append(h('p', { class: 'status', text: message }));
    dateWarnings(data, value).forEach((warning) => {
      status.append(h('p', { class: 'status status--warn', text: warning }));
    });
  }

  const input = h('input', {
    type: 'date',
    value: getStartDate(),
    onchange: () => {
      setStartDate(input.value);
      refresh();
      onDateChange();
    }
  });
  refresh();

  return Object.assign(panel('Modo «Hoy»',
    h('p', { text: 'Con la fecha de inicio, la guía abre cada día en la parada que corresponde.' }),
    h('label', { class: 'field' }, 'Inicio del viaje', input),
    status), { refreshDate: () => { input.value = getStartDate(); refresh(); } });
}

function dateNotesPanel(notes) {
  const box = panel(notes.title, h('ul', {}, notes.items.map((item) => h('li', { text: item }))));
  box.classList.add('datenotes');
  return box;
}

function emergencyPanel(items) {
  return panel('Emergencias',
    h('ul', { class: 'calls' }, items.map((item) => h('li', {},
      h('a', { href: `tel:${item.number}` },
        h('b', { text: item.number }),
        h('span', {}, item.label, item.unverified ? h('span', { class: 'flag flag--unverified', text: 'Por confirmar' }) : null))))));
}

function packingPanel(items) {
  return panel('Qué llevar',
    h('ul', { class: 'checks' }, items.map((item) => {
      const box = h('input', {
        type: 'checkbox',
        checked: isPacked(item.id),
        onchange: () => setPacked(item.id, box.checked)
      });
      return h('li', { 'data-pack': item.id }, h('label', {}, box, h('span', { text: item.text })));
    })));
}

function safetyPanel(items) {
  return panel('Seguridad en la ruta',
    h('dl', { class: 'safety' }, items.map((item) => [
      h('dt', { text: item.title }),
      h('dd', { text: item.text })
    ])));
}

function backupPanel(onRestored) {
  const output = h('textarea', { readOnly: true, rows: 3, 'aria-label': 'Código de respaldo', hidden: true });
  const copyStatus = h('p', { class: 'status', hidden: true, 'aria-live': 'polite' });
  const paste = h('textarea', { rows: 3, placeholder: 'Pega aquí el código…', spellcheck: false });
  const pasteStatus = h('p', { class: 'status', 'aria-live': 'polite', hidden: true });
  let decoded = null;

  async function copy() {
    output.value = encodeBackup(snapshot());
    output.hidden = false;
    copyStatus.hidden = false;
    try {
      await navigator.clipboard.writeText(output.value);
      copyStatus.textContent = 'Código copiado. Envíalo al otro teléfono cuando tengas señal.';
    } catch {
      output.focus();
      output.select();
      copyStatus.textContent = 'Selecciona y copia el código a mano.';
    }
  }

  const applyButton = h('button', {
    class: 'btn btn--solid',
    type: 'button',
    hidden: true,
    text: 'Confirmar y combinar',
    onclick: () => {
      merge(decoded);
      decoded = null;
      paste.value = '';
      applyButton.hidden = true;
      pasteStatus.className = 'status';
      pasteStatus.textContent = 'Listo: los datos quedaron combinados.';
      onRestored();
    }
  });

  function preview() {
    decoded = null;
    applyButton.hidden = true;
    pasteStatus.hidden = false;
    try {
      decoded = decodeBackup(paste.value);
    } catch (error) {
      pasteStatus.className = 'status status--warn';
      pasteStatus.textContent = error.message;
      return;
    }
    const visited = Object.keys(decoded.visited).length;
    const notes = Object.keys(decoded.notes).length;
    const start = decoded.startDate ? ` Fecha de inicio: ${decoded.startDate}.` : '';
    pasteStatus.className = 'status';
    pasteStatus.textContent = `El código trae ${visited} visitadas y ${notes} notas.${start} No se borra nada de este teléfono; las notas distintas se conservan juntas.`;
    applyButton.hidden = false;
  }

  return panel('Respaldo',
    h('p', { text: 'Tus notas y visitas viven solo en este teléfono. Copia un código para guardarlas o pasarlas al otro.' }),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', type: 'button', text: 'Copiar código', onclick: copy })),
    h('label', { class: 'field' }, output),
    copyStatus,
    h('label', { class: 'field' }, 'Restaurar desde un código', paste),
    h('div', { class: 'btnrow' },
      h('button', { class: 'btn', type: 'button', text: 'Revisar código', onclick: preview }),
      applyButton),
    pasteStatus);
}

export function createInfo(data, root, { onDateChange, onRestored }) {
  const info = data.info || {};
  const date = datePanel(data, onDateChange);
  const parts = [date];
  if (!isStorageOk()) {
    parts.unshift(h('section', { class: 'panel' }, h('p', { class: 'status status--warn', text: 'Este navegador no permite guardar datos: tus notas y visitas se perderán al cerrar la guía.' })));
  }
  if (info.dateNotes) parts.push(dateNotesPanel(info.dateNotes));
  if (info.emergency) parts.push(emergencyPanel(info.emergency));
  if (info.packing) parts.push(packingPanel(info.packing));
  if (info.safety) parts.push(safetyPanel(info.safety));
  parts.push(backupPanel(() => {
    date.refreshDate();
    onRestored();
  }));
  root.append(...parts);
}
