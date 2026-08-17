(function restoreCatalogSelector() {
  const app = document.getElementById('app');
  if (!app) return;

  let mode = 'motos';
  let applying = false;

  function installStyles() {
    if (document.getElementById('catalog-mode-style')) return;
    const style = document.createElement('style');
    style.id = 'catalog-mode-style';
    style.textContent = `
      .catalog-mode-switch {
        display: flex;
        gap: 10px;
        margin: 0 0 18px;
        flex-wrap: wrap;
      }
      .catalog-mode-switch .btn {
        min-width: 150px;
      }
      .catalog-mode-switch .btn.is-active {
        pointer-events: none;
      }
      @media (max-width: 640px) {
        .catalog-mode-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .catalog-mode-switch .btn {
          min-width: 0;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSelector(catalog) {
    let selector = catalog.querySelector(':scope > [data-catalog-mode-switch]');
    if (selector) return selector;

    selector = document.createElement('div');
    selector.className = 'catalog-mode-switch';
    selector.dataset.catalogModeSwitch = 'true';
    selector.innerHTML = `
      <button type="button" class="btn primary is-active" data-catalog-mode="motos">🏍️ Motos</button>
      <button type="button" class="btn ghost" data-catalog-mode="motores">⚓ Motores de Popa</button>
    `;
    catalog.prepend(selector);
    return selector;
  }

  function applyMode() {
    if (applying) return;
    applying = true;
    try {
      const catalog = app.querySelector('#catalogo');
      if (!catalog) return;
      installStyles();
      const selector = ensureSelector(catalog);
      const outboard = catalog.querySelector(':scope > [data-outboard-section]');

      Array.from(catalog.children).forEach((child) => {
        if (child === selector) return;
        if (child === outboard) {
          child.hidden = mode !== 'motores';
          return;
        }
        child.hidden = mode !== 'motos';
      });

      selector.querySelectorAll('[data-catalog-mode]').forEach((button) => {
        const active = button.dataset.catalogMode === mode;
        button.classList.toggle('is-active', active);
        button.classList.toggle('primary', active);
        button.classList.toggle('ghost', !active);
        button.setAttribute('aria-pressed', String(active));
      });
    } finally {
      applying = false;
    }
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('[data-catalog-mode]');
    if (!button) return;
    event.preventDefault();
    mode = button.dataset.catalogMode === 'motores' ? 'motores' : 'motos';
    applyMode();
    app.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const observer = new MutationObserver(() => queueMicrotask(applyMode));
  observer.observe(app, { childList: true, subtree: true });
  applyMode();
})();
