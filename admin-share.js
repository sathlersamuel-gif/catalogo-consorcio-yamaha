(function enableAdminMotoShare() {
  const CATALOG_BASE = 'https://consorcio-yamaha-ro.sathlersamuel.chatgpt.site/';
  const root = document.getElementById('adminRoot');
  if (!root) return;

  function motoUrl(motoId) {
    const url = new URL(CATALOG_BASE);
    url.hash = `moto=${encodeURIComponent(motoId)}`;
    return url.toString();
  }

  function motorUrl(motorId) {
    const url = new URL(CATALOG_BASE);
    url.hash = `motor=${encodeURIComponent(motorId)}`;
    return url.toString();
  }

  function installButtons() {
    root.querySelectorAll('[data-edit-moto]').forEach((editButton) => {
      const rowActions = editButton.closest('.row-actions');
      const motoId = editButton.dataset.editMoto;
      if (!rowActions || !motoId || rowActions.querySelector(`[data-share-moto="${CSS.escape(motoId)}"]`)) return;

      const share = document.createElement('button');
      share.type = 'button';
      share.className = 'icon-button';
      share.dataset.shareMoto = motoId;
      share.title = 'Compartilhar esta moto';
      share.setAttribute('aria-label', 'Compartilhar esta moto');
      share.textContent = '🔗';
      rowActions.insertBefore(share, editButton);
    });

    root.querySelectorAll('[data-outboard-edit]').forEach((editButton) => {
      const rowActions = editButton.closest('.row-actions');
      const motorId = editButton.dataset.outboardEdit;
      if (!rowActions || !motorId || rowActions.querySelector(`[data-share-outboard="${CSS.escape(motorId)}"]`)) return;

      const share = document.createElement('button');
      share.type = 'button';
      share.className = 'icon-button';
      share.dataset.shareOutboard = motorId;
      share.title = 'Compartilhar este motor';
      share.setAttribute('aria-label', 'Compartilhar este motor');
      share.textContent = '🔗';
      rowActions.insertBefore(share, editButton);
    });
  }

  async function shareItem(url, copiedMessage, promptMessage) {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Consórcio Yamaha', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = copiedMessage;
        toast.className = 'toast show';
        setTimeout(() => { toast.className = 'toast'; }, 2500);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') window.prompt(promptMessage, url);
    }
  }

  root.addEventListener('click', (event) => {
    const motoButton = event.target.closest('[data-share-moto]');
    const motorButton = event.target.closest('[data-share-outboard]');
    if (!motoButton && !motorButton) return;

    event.preventDefault();
    event.stopPropagation();

    if (motoButton) {
      shareItem(motoUrl(motoButton.dataset.shareMoto), 'Link da moto copiado!', 'Copie o link desta moto:');
      return;
    }

    shareItem(motorUrl(motorButton.dataset.shareOutboard), 'Link do motor copiado!', 'Copie o link deste motor:');
  });

  new MutationObserver(installButtons).observe(root, { childList: true, subtree: true });
  installButtons();
})();
