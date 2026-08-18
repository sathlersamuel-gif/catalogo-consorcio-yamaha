(function optimizeGalleryPreload() {
  const preloadCache = new Map();
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modalRoot');

  function normalizeUrl(url) {
    if (!url) return '';
    try { return new URL(url, location.href).href; } catch (_) { return String(url); }
  }

  function preload(url) {
    const src = normalizeUrl(url);
    if (!src || preloadCache.has(src)) return;

    const image = new Image();
    image.decoding = 'async';
    try { image.fetchPriority = 'high'; } catch (_) {}
    image.src = src;
    preloadCache.set(src, image);

    if (typeof image.decode === 'function') {
      image.decode().catch(() => {});
    }
  }

  function scan(root) {
    if (!root?.querySelectorAll) return;

    root.querySelectorAll('.thumb img, .gallery-strip-item img').forEach((image) => {
      preload(image.currentSrc || image.src);
    });

    root.querySelectorAll('[data-photo-url]').forEach((button) => preload(button.dataset.photoUrl));
    root.querySelectorAll('[data-gallery-photo]').forEach((button) => preload(button.dataset.galleryPhoto));
    root.querySelectorAll('[data-outboard-photo-url]').forEach((button) => preload(button.dataset.outboardPhotoUrl));
    root.querySelectorAll('[data-outboard-gallery-photo]').forEach((button) => preload(button.dataset.outboardGalleryPhoto));
  }

  function scheduleScan(root) {
    const run = () => scan(root || document);
    if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 250 });
    else setTimeout(run, 0);
  }

  document.addEventListener('touchstart', (event) => {
    const target = event.target.closest?.('[data-photo-url], [data-gallery-photo], [data-outboard-photo-url], [data-outboard-gallery-photo]');
    if (!target) return;
    preload(target.dataset.photoUrl || target.dataset.galleryPhoto || target.dataset.outboardPhotoUrl || target.dataset.outboardGalleryPhoto);
  }, { capture: true, passive: true });

  document.addEventListener('pointerdown', (event) => {
    const target = event.target.closest?.('[data-photo-url], [data-gallery-photo], [data-outboard-photo-url], [data-outboard-gallery-photo]');
    if (!target) return;
    preload(target.dataset.photoUrl || target.dataset.galleryPhoto || target.dataset.outboardPhotoUrl || target.dataset.outboardGalleryPhoto);
  }, { capture: true, passive: true });

  if (app) new MutationObserver(() => scheduleScan(app)).observe(app, { childList: true, subtree: true });
  if (modalRoot) new MutationObserver(() => scheduleScan(modalRoot)).observe(modalRoot, { childList: true, subtree: true });

  scheduleScan(document);
})();
