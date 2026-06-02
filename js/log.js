import { t } from './i18n.js';
import {
  createEpisode, addEpisode, updateEpisode, deleteEpisode,
  getEpisodes, defaultsFromLast,
} from './store.js';

let onSaved;
let editingId = null;        // null = just-saved/new sheet; string = editing existing
let justSavedId = null;      // id of the entry created on Log it (for Undo)
let triggerElement = null;

// --- Pill group helper ---
function makePillGroup(name, labels, currentValue) {
  // labels: [{ value, i18nKey }]
  return `
    <div class="pill-group" role="group" aria-label="${t(name)}">
      ${labels.map(({ value, i18nKey }) => `
        <button type="button"
          class="pill pill--${value}"
          data-value="${value}"
          aria-pressed="${currentValue === value ? 'true' : 'false'}">
          ${t(i18nKey)}
        </button>
      `).join('')}
    </div>
  `;
}

function bindPillGroup(container, selector, onSelect) {
  container.querySelectorAll(selector).forEach(pill => {
    pill.addEventListener('click', () => {
      const group = pill.closest('.pill-group');
      const wasPressed = pill.getAttribute('aria-pressed') === 'true';
      group.querySelectorAll('.pill').forEach(p => p.setAttribute('aria-pressed', 'false'));
      if (wasPressed) {
        // Tapping the already-selected pill deselects back to null (not recorded)
        onSelect(null);
      } else {
        pill.setAttribute('aria-pressed', 'true');
        onSelect(pill.dataset.value); // 'none', 'mild', 'moderate', or 'severe'
      }
    });
  });
}

const LOUDNESS_LABELS = [
  { value: 'mild',     i18nKey: 'log.mild' },
  { value: 'moderate', i18nKey: 'log.moderate' },
  { value: 'severe',   i18nKey: 'log.severe' },
];
const CHARACTER_LABELS = [
  { value: 'ringing', i18nKey: 'log.ringing' }, { value: 'buzzing', i18nKey: 'log.buzzing' },
  { value: 'hissing', i18nKey: 'log.hissing' }, { value: 'roaring', i18nKey: 'log.roaring' },
  { value: 'other',   i18nKey: 'log.other' },
];
const PITCH_LABELS = [
  { value: 'high', i18nKey: 'log.high' }, { value: 'low', i18nKey: 'log.low' }, { value: 'mixed', i18nKey: 'log.mixed' },
];
const LOCATION_LABELS = [
  { value: 'left', i18nKey: 'log.left' }, { value: 'right', i18nKey: 'log.right' },
  { value: 'both', i18nKey: 'log.both' }, { value: 'inHead', i18nKey: 'log.inHead' },
];
const PULSATILE_LABELS = [
  { value: 'no', i18nKey: 'log.no' }, { value: 'yes', i18nKey: 'log.yes' },
];

function openModal() {
  triggerElement = document.activeElement;
  const modal = document.getElementById('log-modal');
  modal.hidden = false;
  modal.querySelector('#modal-sheet').focus();
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  const modal = document.getElementById('log-modal');
  modal.hidden = true;
  document.body.style.overflow = '';
  editingId = null;
  justSavedId = null;
  triggerElement?.focus();
  triggerElement = null;
}

function toDatetimeLocal(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Full detail form fields for a given episode (shared markup).
function detailFieldsHtml(ep) {
  return `
    <div class="field" style="flex-direction:column; align-items:flex-start; gap:6px; margin-bottom:20px;">
      <label class="field-label" for="start-time">${t('log.startTime')}</label>
      <input type="datetime-local" id="start-time" class="field-input" style="width:100%;" value="${toDatetimeLocal(ep.startTime)}" />
    </div>
    <div><p class="section-label">${t('log.character')}</p><div id="character-group">${makePillGroup('log.character', CHARACTER_LABELS, ep.character)}</div></div>
    <div style="margin-top:16px"><p class="section-label">${t('log.pitch')}</p><div id="pitch-group">${makePillGroup('log.pitch', PITCH_LABELS, ep.pitch)}</div></div>
    <div style="margin-top:16px"><p class="section-label">${t('log.location')}</p><div id="location-group">${makePillGroup('log.location', LOCATION_LABELS, ep.location)}</div></div>
    <div style="margin-top:16px"><p class="section-label">${t('log.pulsatile')}</p><div id="pulsatile-group">${makePillGroup('log.pulsatile', PULSATILE_LABELS, ep.pulsatile === true ? 'yes' : ep.pulsatile === false ? 'no' : null)}</div></div>
    <div style="border-top:1px solid var(--color-border); padding-top:16px; margin-top:16px;">
      <label class="section-label" for="notes">${t('log.notes')}</label>
      <textarea id="notes" class="field-input" placeholder="${t('log.notesPlaceholder')}" style="margin-top:8px;">${ep.notes ?? ''}</textarea>
    </div>`;
}

// Render the "just saved" sheet for a brand-new entry.
function renderJustSaved(ep) {
  justSavedId = ep.id;
  let loudness = ep.loudness;
  document.getElementById('modal-content').innerHTML = `
    <div style="padding:0 16px 24px;">
      <h2 id="log-modal-title" style="font-size:1.25rem; font-weight:700; margin-bottom:4px;">${t('log.saved')}</h2>
      <p class="section-label">${t('log.loudness')}</p>
      <div id="loudness-group">${makePillGroup('log.loudness', LOUDNESS_LABELS, ep.loudness)}</div>
      <div style="display:flex; gap:12px; margin-top:20px;">
        <button class="btn-primary" id="sheet-done" style="flex:1;">${t('log.done')}</button>
      </div>
      <div class="divider" style="margin-top:20px;">
        <button id="optional-toggle" aria-expanded="false" style="color:var(--color-accent); font-weight:600;">${t('log.differentFromUsual')} ▾</button>
      </div>
      <div id="optional-section" hidden style="display:flex; flex-direction:column; padding-top:12px;">
        ${detailFieldsHtml(ep)}
      </div>
      <button id="sheet-undo" style="display:block; width:100%; margin-top:16px; padding:12px; color:var(--color-severe); font-weight:600; border:1.5px solid var(--color-severe); border-radius:var(--radius-md);">${t('log.undo')}</button>
    </div>`;

  bindPillGroup(document.getElementById('loudness-group'), '.pill', v => {
    loudness = v;
    updateEpisode(ep.id, { loudness });   // persist immediately so Done just closes
  });

  const optionalToggle = document.getElementById('optional-toggle');
  optionalToggle.addEventListener('click', e => {
    const section = document.getElementById('optional-section');
    const isOpen = !section.hidden;
    section.hidden = isOpen;
    e.currentTarget.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    e.currentTarget.textContent = t('log.differentFromUsual') + (isOpen ? ' ▾' : ' ▴');
    if (!isOpen) bindDetailGroups(ep.id);   // bind only once revealed
  });

  document.getElementById('sheet-done').addEventListener('click', () => {
    persistDetailFieldsIfPresent(ep.id);
    closeModal();
    document.getElementById('status-msg').textContent = t('log.saved');
    onSaved?.();
  });
  document.getElementById('sheet-undo').addEventListener('click', () => {
    deleteEpisode(ep.id);
    closeModal();
    document.getElementById('status-msg').textContent = t('log.deleted');
    onSaved?.();
  });
}

// Bind the detail pill groups for the given entry (character/pitch/location/pulsatile).
function bindDetailGroups(id) {
  [['character-group', 'character'], ['pitch-group', 'pitch'], ['location-group', 'location']].forEach(([groupId, field]) => {
    const el = document.getElementById(groupId);
    if (el && !el.dataset.bound) {
      el.dataset.bound = '1';
      bindPillGroup(el, '.pill', v => updateEpisode(id, { [field]: v }));
    }
  });
  const pulse = document.getElementById('pulsatile-group');
  if (pulse && !pulse.dataset.bound) {
    pulse.dataset.bound = '1';
    bindPillGroup(pulse, '.pill', v => updateEpisode(id, { pulsatile: v === 'yes' ? true : v === 'no' ? false : null }));
  }
}

// Read the free-text/time fields (not auto-persisted on tap) and save them.
function persistDetailFieldsIfPresent(id) {
  const startInput = document.getElementById('start-time');
  const notesInput = document.getElementById('notes');
  const updates = {};
  if (startInput?.value) updates.startTime = new Date(startInput.value).toISOString();
  if (notesInput) updates.notes = notesInput.value.trim() || null;
  if (Object.keys(updates).length) updateEpisode(id, updates);
}

// Edit mode for an existing entry: full form, including loudness, plus delete.
function renderEdit(ep) {
  document.getElementById('modal-content').innerHTML = `
    <div style="padding:0 16px 24px;">
      <h2 id="log-modal-title" style="font-size:1.25rem; font-weight:700; margin-bottom:12px;">${t('log.editTitle')}</h2>
      <p class="section-label">${t('log.loudness')}</p>
      <div id="loudness-group">${makePillGroup('log.loudness', LOUDNESS_LABELS, ep.loudness)}</div>
      <div style="margin-top:16px">${detailFieldsHtml(ep)}</div>
      <button class="btn-primary" id="modal-save" style="margin-top:20px;">${t('log.save')}</button>
      <button id="modal-delete" style="display:block; width:100%; margin-top:16px; padding:12px; color:var(--color-severe); font-weight:600; border:1.5px solid var(--color-severe); border-radius:var(--radius-md);">${t('log.delete')}</button>
    </div>`;

  let loudness = ep.loudness, character = ep.character, pitch = ep.pitch, location = ep.location;
  let pulsatile = ep.pulsatile;
  bindPillGroup(document.getElementById('loudness-group'), '.pill', v => { loudness = v; });
  bindPillGroup(document.getElementById('character-group'), '.pill', v => { character = v; });
  bindPillGroup(document.getElementById('pitch-group'), '.pill', v => { pitch = v; });
  bindPillGroup(document.getElementById('location-group'), '.pill', v => { location = v; });
  bindPillGroup(document.getElementById('pulsatile-group'), '.pill', v => { pulsatile = v === 'yes' ? true : v === 'no' ? false : null; });

  document.getElementById('modal-save').addEventListener('click', () => {
    const startInput = document.getElementById('start-time');
    const notesInput = document.getElementById('notes');
    updateEpisode(ep.id, {
      loudness, character, pitch, location, pulsatile,
      startTime: startInput?.value ? new Date(startInput.value).toISOString() : ep.startTime,
      notes: notesInput?.value.trim() || null,
    });
    closeModal();
    document.getElementById('status-msg').textContent = t('log.updated');
    onSaved?.();
  });
  document.getElementById('modal-delete').addEventListener('click', () => {
    if (confirm(t('log.confirmDelete'))) {
      deleteEpisode(ep.id);
      closeModal();
      document.getElementById('status-msg').textContent = t('log.deleted');
      onSaved?.();
    }
  });
}

// --- public API ---
export function initLog(onSavedCallback) {
  onSaved = onSavedCallback;
  document.getElementById('modal-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('log-modal').hidden) closeModal();
  });
}

// Called by the Log it button: save instantly, then show the just-saved sheet.
export function logNow() {
  const ep = createEpisode(defaultsFromLast());
  addEpisode(ep);
  onSaved?.();              // refresh home list immediately
  openModal();
  renderJustSaved(ep);
}

export function openEditLog(id) {
  const ep = getEpisodes().find(e => e.id === id);
  if (!ep) return;
  editingId = id;
  openModal();
  renderEdit(ep);
}
