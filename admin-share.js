(function enableAdminMotoShare() {
  const CATALOG_BASE = 'https://consorcio-yamaha-ro.sathlersamuel.chatgpt.site/';
  const root = document.getElementById('adminRoot');
  if (!root) return;

  function motoUrl(motoId) {
    const url = new URL(CATALOG_BASE);
    url.hash = `moto=${encodeURIComponent(motoId)}`;
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
  }

  async function shareMoto(motoId) {
    const url = motoUrl(motoId);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Consórcio Yamaha', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = 'Link da moto copiado!';
        toast.className = 'toast show';
        setTimeout(() => { toast.className = 'toast'; }, 2500);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') window.prompt('Copie o link desta moto:', url);
    }
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-share-moto]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    shareMoto(button.dataset.shareMoto);
  });

  new MutationObserver(installButtons).observe(root, { childList: true, subtree: true });
  installButtons();
})();
