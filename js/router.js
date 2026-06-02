// Derives the view name from location.hash; defaults to 'home' if absent or unrecognised.
const VALID_VIEWS = ['home', 'history', 'doctor'];

function viewFromHash() {
  const hash = location.hash.slice(1); // strip leading '#'
  return VALID_VIEWS.includes(hash) ? hash : 'home';
}

// Activates viewName: updates tab classes/aria, shows the view section,
// optionally moves focus (skip on initial page load).
function activate(viewName, onViewChange, { skipFocus = false } = {}) {
  document.querySelectorAll('.tab').forEach(tab => {
    const isActive = tab.dataset.view === viewName;
    tab.classList.toggle('active', isActive);
    if (isActive) {
      tab.setAttribute('aria-current', 'page');
    } else {
      tab.removeAttribute('aria-current');
    }
  });

  document.querySelectorAll('.view').forEach(v => {
    const isActive = v.id === `view-${viewName}`;
    v.classList.toggle('active', isActive);
    v.hidden = !isActive;
  });

  if (!skipFocus) {
    // Move focus to the view section so screen readers announce the change via aria-label
    document.getElementById(`view-${viewName}`)?.focus();
  }

  onViewChange(viewName);
}

// Sets up hash-based routing. Reads location.hash on init, listens to hashchange
// for back/forward and link clicks. onViewChange is called after each activation.
export function initRouter(onViewChange) {
  window.addEventListener('hashchange', () => activate(viewFromHash(), onViewChange));

  // Initial activation — skip focus so page load doesn't pull focus unexpectedly
  activate(viewFromHash(), onViewChange, { skipFocus: true });
}
