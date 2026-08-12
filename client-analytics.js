(function createClientAnalytics() {
  const config = window.CATALOG_CONFIG || {};
  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.supabasePublishableKey || config.supabaseAnonKey || '');
  const isConfigured = /^https:\/\/.+\.supabase\.co$/i.test(baseUrl) && publishableKey.length > 20;
  if (!isConfigured) return;

  let pageViewSent = false;

  function track(metric) {
    fetch(`${baseUrl}/rest/v1/rpc/increment_catalog_metric`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metric }),
    }).catch(() => {
      // O rastreamento nunca pode interferir no funcionamento do catálogo.
    });
  }

  function trackPageView() {
    if (pageViewSent) return;
    pageViewSent = true;
    track('page_view');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView, { once: true });
  } else {
    trackPageView();
  }

  document.addEventListener('click', (event) => {
    const whatsappAction = event.target.closest('[data-interest-plan], a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    if (whatsappAction) track('whatsapp_click');
  }, true);
})();
