(function restoreCatalogSelector() {
  const app = document.getElementById('app');
  const selector = document.querySelector('[data-catalog-mode-switch]');
  if (!app || !selector) return;

  let mode = 'motos';
  let applying = false;

  function installStyles() {
    if (document.getElementById('catalog-mode-style')) return;
    const style = document.createElement('style');
    style.id = 'catalog-mode-style';
    style.textContent = `
      #catalogModeBar { padding-top: 16px; padding-bottom: 0; }
      .catalog-mode-switch { display:flex; gap:10px; margin:0 0 18px; flex-wrap:wrap; }
      .catalog-mode-switch .btn { min-width:170px; }
      .catalog-mode-switch .btn.is-active { pointer-events:none; }
      @media (max-width:640px) {
        #catalogModeBar { padding-top:12px; }
        .catalog-mode-switch { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .catalog-mode-switch .btn { min-width:0; width:100%; padding-left:8px; padding-right:8px; }
      }
    `;
    document.head.appendChild(style);
  }

  function applyMode() {
    if (applying) return;
    applying = true;
    try {
      installStyles();
      selector.querySelectorAll('[data-catalog-mode]').forEach((button) => {
        const active = button.dataset.catalogMode === mode;
        button.classList.toggle('is-active', active);
        button.classList.toggle('primary', active);
        button.classList.toggle('ghost', !active);
        button.setAttribute('aria-pressed', String(active));
      });

      const carousel = app.querySelector('[data-yamaha-carousel]');
      if (carousel) carousel.hidden = mode !== 'motos';

      const catalog = app.querySelector('#catalogo');
      if (!catalog) return;
      const outboard = catalog.querySelector(':scope > [data-outboard-section]');

      Array.from(catalog.children).forEach((child) => {
        child.hidden = child === outboard ? mode !== 'motores' : mode !== 'motos';
      });
    } finally {
      applying = false;
    }
  }

  selector.addEventListener('click', (event) => {
    const button = event.target.closest('[data-catalog-mode]');
    if (!button) return;
    event.preventDefault();
    mode = button.dataset.catalogMode === 'motores' ? 'motores' : 'motos';
    applyMode();
    app.querySelector('#catalogo')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  const observer = new MutationObserver(() => queueMicrotask(applyMode));
  observer.observe(app, { childList:true, subtree:true });
  applyMode();
})();
