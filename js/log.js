import { t } from './i18n.js';
import {
  createEpisode, addEpisode, updateEpisode, deleteEpisode,
  getEpisodes, defaultsFromLast,
} from './store.js';

let onSaved;
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
  { value: 'low', i18nKey: 'log.pitchLow' },
  { value: 'high', i18nKey: 'log.pitchHigh' },
  { value: 'mixed', i18nKey: 'log.mixed' },
];
const LOCATION_LABELS = [
  { value: 'left', i18nKey: 'log.left' }, { value: 'right', i18nKey: 'log.right' },
  { value: 'both', i18nKey: 'log.both' }, { value: 'inHead', i18nKey: 'log.inHead' },
];
const PULSATILE_LABELS = [
  { value: 'no', i18nKey: 'log.no' }, { value: 'yes', i18nKey: 'log.yes' },
];

// --- Trigger field label arrays ---
const STRESS_LABELS = [
  { value: 'low',    i18nKey: 'log.stressLow' },
  { value: 'medium', i18nKey: 'log.stressMedium' },
  { value: 'high',   i18nKey: 'log.stressHigh' },
];
const TIREDNESS_LABELS = [
  { value: 'low',    i18nKey: 'log.tirednessLow' },
  { value: 'medium', i18nKey: 'log.tirednessMedium' },
  { value: 'high',   i18nKey: 'log.tirednessHigh' },
];
const POSITION_LABELS = [
  { value: 'lying',    i18nKey: 'log.lying' },
  { value: 'sitting',  i18nKey: 'log.sitting' },
  { value: 'standing', i18nKey: 'log.standing' },
];
const NOISE_LABELS = [
  { value: 'quiet',  i18nKey: 'log.noiseQuiet' },
  { value: 'medium', i18nKey: 'log.noiseMedium' },
  { value: 'loud',   i18nKey: 'log.noiseLoud' },
];
const ALCOHOL_LABELS = [
  { value: 'within4h',     i18nKey: 'log.within4h' },
  { value: 'fourTo12h',    i18nKey: 'log.fourTo12h' },
  { value: 'notInPast12h', i18nKey: 'log.notInPast12h' },
];
const CAFFEINE_LABELS = [
  { value: 'within4h',     i18nKey: 'log.within4h' },
  { value: 'fourTo12h',    i18nKey: 'log.fourTo12h' },
  { value: 'notInPast12h', i18nKey: 'log.notInPast12h' },
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
  triggerElement?.focus();
  triggerElement = null;
}

function toDatetimeLocal(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Builds the collapsed summary for the "About the Tinnitus" section header.
// Null fields are omitted; pulsatile=false is omitted (absence isn't notable).
function buildAboutSummary(ep) {
  const parts = [];
  if (ep.character) parts.push(t(`log.${ep.character}`));
  const pitchLabel = PITCH_LABELS.find(l => l.value === ep.pitch);
  if (pitchLabel) parts.push(t(pitchLabel.i18nKey));
  if (ep.location) parts.push(t(`log.${ep.location}`));
  if (ep.pulsatile === true) parts.push(t('log.pulsatileLabel')); // false omitted — absence of pulsing isn't notable
  return parts.length ? parts.join(' · ') : t('log.notSet');
}

// Toggle a subsection open/closed; optionally show/hide a summary element.
// Chevron uses string literals (textContent); entities used in innerHTML template strings above.
function bindSubsectionToggle(toggleId, contentId, summaryId = null) {
  const toggle = document.getElementById(toggleId);
  const content = document.getElementById(contentId);
  const summaryEl = summaryId ? document.getElementById(summaryId) : null;
  if (!toggle || !content) return;
  toggle.addEventListener('click', () => {
    const nowExpanded = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(nowExpanded));
    content.hidden = !nowExpanded;
    toggle.querySelector('.chevron').textContent = nowExpanded ? '▴' : '▾';
    if (summaryEl) summaryEl.hidden = nowExpanded; // hidden alone removes from a11y tree
  });
}

// "Right Now" sub-section: six trigger fields, always starts expanded.
function rightNowHtml(ep) {
  return `
    <div class="subsection">
      <button type="button" class="subsection-header" aria-expanded="true"
          aria-controls="right-now-content" id="right-now-toggle">
        <span>${t('log.rightNow')}</span><span class="chevron" aria-hidden="true">&#x25b4;</span>
      </button>
      <div id="right-now-content" class="subsection-content">
        <p class="cluster-label">${t('log.internalState')}</p>
        <p class="section-label">${t('log.stress')}</p>
        <div id="stress-group">${makePillGroup('log.stress', STRESS_LABELS, ep.stress)}</div>
        <p class="section-label" style="margin-top:12px">${t('log.tiredness')}</p>
        <div id="tiredness-group">${makePillGroup('log.tiredness', TIREDNESS_LABELS, ep.tiredness)}</div>
        <p class="cluster-label">${t('log.environment')}</p>
        <p class="section-label">${t('log.position')}</p>
        <div id="position-group">${makePillGroup('log.position', POSITION_LABELS, ep.position)}</div>
        <p class="section-label" style="margin-top:12px">${t('log.surroundingNoise')}</p>
        <div id="noise-group">${makePillGroup('log.surroundingNoise', NOISE_LABELS, ep.surroundingNoise)}</div>
        <p class="cluster-label">${t('log.recentIntake')}</p>
        <p class="section-label">${t('log.alcoholTiming')}</p>
        <div id="alcohol-group">${makePillGroup('log.alcoholTiming', ALCOHOL_LABELS, ep.alcoholTiming)}</div>
        <p class="section-label" style="margin-top:12px">${t('log.caffeineTiming')}</p>
        <div id="caffeine-group">${makePillGroup('log.caffeineTiming', CAFFEINE_LABELS, ep.caffeineTiming)}</div>
      </div>
    </div>`;
}

// Determines whether "About the Tinnitus" should start expanded.
// Starts expanded on first-ever log (isFirstEver) and when any field is still null.
function shouldAboutStartExpanded(ep, isFirstEver) {
  if (isFirstEver) return true;
  return ep.character === null || ep.pitch === null || ep.location === null || ep.pulsatile === null;
}

// "About the Tinnitus" sub-section: four existing fields.
// showFromLastTime: true in just-saved sheet (values came from defaults), false in edit mode.
// The about-summary element carries both the field summary and the "from last time" badge so
// both hide/show together when the section is toggled — bindSubsectionToggle manages one element.
function aboutTinnitusHtml(ep, startExpanded, showFromLastTime) {
  const summary = buildAboutSummary(ep);
  const summaryContent = showFromLastTime && !startExpanded
    ? `${summary} · <em>${t('log.fromLastTime')}</em>`
    : summary;
  return `
    <div class="subsection">
      <button type="button" class="subsection-header" aria-expanded="${startExpanded}"
          aria-controls="about-content" id="about-toggle">
        <span>${t('log.aboutTinnitus')}</span>
        <span class="chevron" aria-hidden="true">${startExpanded ? '&#x25b4;' : '&#x25be;'}</span>
      </button>
      <p id="about-summary" class="subsection-summary" ${startExpanded ? 'hidden' : ''}>${summaryContent}</p>
      <div id="about-content" class="subsection-content" ${startExpanded ? '' : 'hidden'}>
        <p class="section-label">${t('log.character')}</p>
        <div id="character-group">${makePillGroup('log.character', CHARACTER_LABELS, ep.character)}</div>
        <div style="margin-top:16px"><p class="section-label">${t('log.pitch')}</p>
          <div id="pitch-group">${makePillGroup('log.pitch', PITCH_LABELS, ep.pitch)}</div></div>
        <div style="margin-top:16px"><p class="section-label">${t('log.location')}</p>
          <div id="location-group">${makePillGroup('log.location', LOCATION_LABELS, ep.location)}</div></div>
        <div style="margin-top:16px"><p class="section-label">${t('log.pulsatile')}</p>
          <div id="pulsatile-group">${makePillGroup('log.pulsatile', PULSATILE_LABELS,
            ep.pulsatile === true ? 'yes' : ep.pulsatile === false ? 'no' : null)}</div></div>
      </div>
    </div>`;
}

// Notes field, always at the bottom of the expanded form.
function notesHtml(ep) {
  return `
    <div style="border-top:1px solid var(--color-border); padding-top:16px; margin-top:16px;">
      <label class="section-label" for="notes">${t('log.notes')}</label>
      <textarea id="notes" class="field-input" placeholder="${t('log.notesPlaceholder')}"
          style="margin-top:8px;">${ep.notes ?? ''}</textarea>
    </div>`;
}

// Render the "just saved" sheet for a brand-new entry.
function renderJustSaved(ep, isFirstEver) {
  let loudness = ep.loudness;
  const aboutExpanded = shouldAboutStartExpanded(ep, isFirstEver);

  document.getElementById('modal-content').innerHTML = `
    <div style="padding:0 16px 24px;">
      <h2 id="log-modal-title" style="font-size:1.25rem; font-weight:700; margin-bottom:4px;">${t('log.saved')}</h2>
      <p class="section-label">${t('log.loudness')}</p>
      <div id="loudness-group">${makePillGroup('log.loudness', LOUDNESS_LABELS, ep.loudness)}</div>
      <div style="display:flex; gap:12px; margin-top:20px;">
        <button class="btn-primary" id="sheet-done" style="flex:1;">${t('log.done')}</button>
      </div>
      <div class="divider" style="margin-top:20px;">
        <button id="optional-toggle" aria-expanded="false" aria-controls="optional-section"
            style="color:var(--color-accent); font-weight:600;">${t('log.addDetails')} &#x25be;</button>
      </div>
      <div id="optional-section" class="optional-section" hidden>
        ${rightNowHtml(ep)}
        ${aboutTinnitusHtml(ep, aboutExpanded, true)}
        ${notesHtml(ep)}
      </div>
      <button id="sheet-undo" class="btn-danger">${t('log.undo')}</button>
    </div>`;

  bindPillGroup(document.getElementById('loudness-group'), '.pill', v => {
    loudness = v;
    updateEpisode(ep.id, { loudness });   // persist immediately so Done just closes
  });

  // Bind all pill groups up front — works even when sections are hidden
  bindDetailGroups(ep.id);

  // Outer "Add details" toggle
  const optionalToggle = document.getElementById('optional-toggle');
  optionalToggle.addEventListener('click', e => {
    const section = document.getElementById('optional-section');
    const isOpen = !section.hidden;
    section.hidden = isOpen;
    e.currentTarget.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    e.currentTarget.textContent = t('log.addDetails') + (isOpen ? ' ▾' : ' ▴');
  });

  // Inner subsection toggles — bindSubsectionToggle manages expand/collapse + summary visibility
  bindSubsectionToggle('right-now-toggle', 'right-now-content');
  bindSubsectionToggle('about-toggle', 'about-content', 'about-summary');

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

// Bind the detail pill groups for the given entry — covers all ten pill groups.
function bindDetailGroups(id) {
  // About the Tinnitus groups
  [
    ['character-group', 'character'],
    ['pitch-group', 'pitch'],
    ['location-group', 'location'],
  ].forEach(([groupId, field]) => {
    const el = document.getElementById(groupId);
    if (el && !el.dataset.bound) {
      el.dataset.bound = '1';
      bindPillGroup(el, '.pill', v => updateEpisode(id, { [field]: v }));
    }
  });
  const pulse = document.getElementById('pulsatile-group');
  if (pulse && !pulse.dataset.bound) {
    pulse.dataset.bound = '1';
    bindPillGroup(pulse, '.pill', v =>
      updateEpisode(id, { pulsatile: v === 'yes' ? true : v === 'no' ? false : null }));
  }
  // Right Now groups — all auto-persist immediately on tap
  [
    ['stress-group',    'stress'],
    ['tiredness-group', 'tiredness'],
    ['position-group',  'position'],
    ['noise-group',     'surroundingNoise'],
    ['alcohol-group',   'alcoholTiming'],
    ['caffeine-group',  'caffeineTiming'],
  ].forEach(([groupId, field]) => {
    const el = document.getElementById(groupId);
    if (el && !el.dataset.bound) {
      el.dataset.bound = '1';
      bindPillGroup(el, '.pill', v => updateEpisode(id, { [field]: v }));
    }
  });
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
      <button id="modal-delete" class="btn-danger">${t('log.delete')}</button>
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
  const isFirstEver = getEpisodes().length === 0; // check BEFORE adding the new entry
  const ep = createEpisode(defaultsFromLast());
  addEpisode(ep);
  onSaved?.();              // refresh home list immediately
  openModal();
  renderJustSaved(ep, isFirstEver);
}

export function openEditLog(id) {
  const ep = getEpisodes().find(e => e.id === id);
  if (!ep) return;
  openModal();
  renderEdit(ep);
}
