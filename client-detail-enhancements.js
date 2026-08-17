(function enhanceMotoDetails() {
  const app = document.getElementById('app');
  if (!app) return;

  function currentMotoId() {
    return new URLSearchParams(location.hash.slice(1)).get('moto');
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function installStyles() {
    if (document.getElementById('client-detail-enhancement-style')) return;
    const style = document.createElement('style');
    style.id = 'client-detail-enhancement-style';
    style.textContent = `
      .information-card .moto-description-enhanced {
        white-space: pre-line;
        overflow-wrap: anywhere;
      }
      .information-card .moto-description-enhanced.is-collapsed {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 4;
        overflow: hidden;
      }
      .moto-description-toggle,
      .moto-share-button {
        appearance: none;
        border: 0;
        background: transparent;
        color: #2f9cff;
        padding: 0;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }
      .moto-description-toggle { margin-top: 8px; }
      .moto-share-button { margin-top: 14px; }
    `;
    document.head.appendChild(style);
  }

  function enhanceDescription(card) {
    const description = card.querySelector('p');
    if (!description || description.dataset.enhancedDescription === 'true') return;

    description.dataset.enhancedDescription = 'true';
    description.classList.add('moto-description-enhanced');

    const text = description.textContent.trim();
    if (text.length <= 180) return;

    description.classList.add('is-collapsed');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'moto-description-toggle';
    toggle.textContent = 'Ler mais';
    toggle.setAttribute('aria-expanded', 'false');

    toggle.addEventListener('click', () => {
      const collapsed = description.classList.toggle('is-collapsed');
      toggle.textContent = collapsed ? 'Ler mais' : 'Ler menos';
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });

    description.insertAdjacentElement('afterend', toggle);
  }

  function enhanceShare(card) {
    if (card.querySelector('[data-share-current-moto]')) return;
    const motoId = currentMotoId();
    if (!motoId) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'moto-share-button';
    button.dataset.shareCurrentMoto = 'true';
    button.textContent = '🔗 Compartilhar esta moto';

    button.addEventListener('click', async () => {
      const url = new URL(location.href);
      url.hash = `moto=${encodeURIComponent(motoId)}`;
      const title = card.querySelector('h1')?.textContent?.trim() || 'Yamaha';

      try {
        if (navigator.share) {
          await navigator.share({
            title,
            text: `Veja a ${title}, fotos e planos de consórcio:`,
            url: url.toString(),
          });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url.toString());
          showToast('Link desta moto copiado!');
        } else {
          window.prompt('Copie o link desta moto:', url.toString());
        }
      } catch (error) {
        if (error?.name !== 'AbortError') window.prompt('Copie o link desta moto:', url.toString());
      }
    });

    card.appendChild(button);
  }

  function applyEnhancements() {
    installStyles();
    const card = app.querySelector('.detail-page .information-card');
    if (!card) return;
    enhanceDescription(card);
    enhanceShare(card);
  }

  new MutationObserver(applyEnhancements).observe(app, { childList: true, subtree: true });
  applyEnhancements();
})();
