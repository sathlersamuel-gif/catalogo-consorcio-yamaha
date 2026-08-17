(function restoreCatalogSelector() {
  const app = document.getElementById('app');
  const selector = document.querySelector('[data-catalog-mode-switch]');
  if (!app || !selector) return;

  let mode = 'motos';

  function installStyles() {
    let style = document.getElementById('catalog-mode-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'catalog-mode-style';
      document.head.appendChild(style);
    }

    style.textContent = `
      #catalogModeBar { padding-top: 16px; padding-bottom: 0; }
      .catalog-mode-switch {
        display: flex;
        gap: 10px;
        margin: 0 0 18px;
        flex-wrap: wrap;
      }
      .catalog-mode-switch .btn { min-width: 170px; }
      .catalog-mode-switch .btn.is-active { pointer-events: none; }

      /* MODO MOTOS: motores de popa nunca aparecem */
      body[data-catalog-mode="motos"] #catalogo > [data-outboard-section] {
        display: none !important;
      }

      /* MODO MOTORES: categorias e motos nunca aparecem */
      body[data-catalog-mode="motores"] #catalogo > :not([data-outboard-section]) {
        display: none !important;
      }

      /* O carrossel é exclusivo da área de motos */
      body[data-catalog-mode="motores"] [data-yamaha-carousel] {
        display: none !important;
      }

      body[data-catalog-mode="motores"] #catalogo > [data-outboard-section] {
        display: block !important;
      }

      @media (max-width: 640px) {
        #catalogModeBar { padding-top: 12px; }
        .catalog-mode-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .catalog-mode-switch .btn {
          min-width: 0;
          width: 100%;
          padding-left: 8px;
          padding-right: 8px;
        }
      }
    `;
  }

  function applyMode() {
    installStyles();
    document.body.dataset.catalogMode = mode;

    selector.querySelectorAll('[data-catalog-mode]').forEach((button) => {
      const active = button.dataset.catalogMode === mode;
      button.classList.toggle('is-active', active);
      button.classList.toggle('primary', active);
      button.classList.toggle('ghost', !active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  selector.addEventListener('click', (event) => {
    const button = event.target.closest('[data-catalog-mode]');
    if (!button) return;
    event.preventDefault();
    mode = button.dataset.catalogMode === 'motores' ? 'motores' : 'motos';
    applyMode();
    app.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const observer = new MutationObserver(() => {
    if (document.body.dataset.catalogMode !== mode) applyMode();
  });
  observer.observe(app, { childList: true, subtree: true });

  applyMode();
})();
