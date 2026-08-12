(function enforceAlphanumericPasswordKeyboard() {
  const selector = 'input[type="password"]';

  function fixInput(input) {
    input.removeAttribute('inputmode');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('spellcheck', 'false');
  }

  function fix(root = document) {
    if (root?.matches?.(selector)) fixInput(root);
    root?.querySelectorAll?.(selector).forEach(fixInput);
  }

  fix();

  if (typeof MutationObserver === 'function' && document.documentElement) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node?.nodeType === 1) fix(node);
      }));
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
