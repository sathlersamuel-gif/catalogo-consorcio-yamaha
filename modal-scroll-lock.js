(function modalScrollLock() {
  const modalRoot = document.getElementById('modalRoot');
  if (!modalRoot) return;

  let locked = false;
  let scrollY = 0;

  function lockPage() {
    if (locked) return;
    locked = true;
    scrollY = window.scrollY || window.pageYOffset || 0;

    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.setProperty('position', 'fixed', 'important');
    document.body.style.setProperty('top', `-${scrollY}px`, 'important');
    document.body.style.setProperty('left', '0', 'important');
    document.body.style.setProperty('right', '0', 'important');
    document.body.style.setProperty('width', '100%', 'important');
    document.body.style.setProperty('overscroll-behavior', 'none', 'important');
  }

  function unlockPage() {
    if (!locked) return;
    locked = false;

    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('left');
    document.body.style.removeProperty('right');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('overscroll-behavior');

    window.scrollTo(0, scrollY);
  }

  function syncLock() {
    if (modalRoot.children.length > 0) lockPage();
    else unlockPage();
  }

  new MutationObserver(syncLock).observe(modalRoot, { childList: true });
  syncLock();
})();
