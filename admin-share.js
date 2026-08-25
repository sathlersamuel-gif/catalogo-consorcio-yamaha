(function enableAdminMotoShare() {
  const CATALOG_BASE = 'https://sathlersamuel-gif.github.io/catalogo-consorcio-yamaha/';
  const REFRESHED_PREVIEW_IDS = new Set([
    'b5f75169-0baa-48c0-aa36-445e502eb066', '2ce221a6-c6ae-4a90-a536-6439b971360a',
    'c38aff53-47f4-4718-8816-68ea45734887', 'e08f54bf-184f-4c60-8be3-130df0757c1f',
    '66c58e1d-b945-4ea2-8097-e65431e2afa2', 'ba422fba-6642-4f14-8f1f-be00ae87b97c',
    'bbfa54bb-c0ea-480a-9919-0440ade9981c', '8d7ccb0f-ff3e-4835-8a21-bfbebbc9201b',
  ]);
  const root = document.getElementById('adminRoot');
  if (!root) return;

  function motoUrl(motoId) {
    const url = new URL(`share/moto/${encodeURIComponent(motoId)}/`, CATALOG_BASE);
    if (REFRESHED_PREVIEW_IDS.has(motoId)) url.searchParams.set('v', '2');
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
