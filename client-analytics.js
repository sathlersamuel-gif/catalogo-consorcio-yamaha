(function createClientAnalytics() {
  const config = window.CATALOG_CONFIG || {};
  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.supabasePublishableKey || config.supabaseAnonKey || '');
  const isConfigured = /^https:\/\/.+\.supabase\.co$/i.test(baseUrl) && publishableKey.length > 20;
  if (!isConfigured) return;

  const visitorKey = 'yamaha_catalog_visitor_v1';
  const sessionKey = 'yamaha_catalog_visit_session_v1';
  let pageViewSent = false;

  function readOrCreate(storage, key) {
    try {
      let value = storage.getItem(key);
      if (!value) {
        value = crypto.randomUUID();
        storage.setItem(key, value);
      }
      return value;
    } catch {
      return crypto.randomUUID();
    }
  }

  const visitorId = readOrCreate(localStorage, visitorKey);
  const sessionId = readOrCreate(sessionStorage, sessionKey);

  function currentMotoId() {
    try {
      return new URLSearchParams(location.hash.slice(1)).get('moto') || null;
    } catch {
      return null;
    }
  }

  function track(eventType, extra = {}) {
    fetch(`${baseUrl}/rest/v1/rpc/record_catalog_event`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_event_type: eventType,
        p_visitor_id: visitorId,
        p_session_id: sessionId,
        p_path: `${location.pathname}${location.search}${location.hash}`,
        p_referrer: document.referrer || '',
        p_user_agent: navigator.userAgent || '',
        p_moto_id: extra.motoId || null,
        p_plan_id: extra.planId || null,
      }),
    }).catch(() => {
      // O rastreamento nunca pode interferir no funcionamento do catálogo.
    });
  }

  function trackPageView() {
    if (pageViewSent) return;
    pageViewSent = true;
    track('page_view', { motoId: currentMotoId() });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView, { once: true });
  } else {
    trackPageView();
  }

  document.addEventListener('click', (event) => {
    const whatsappAction = event.target.closest('[data-interest-plan], a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    if (!whatsappAction) return;
    track('whatsapp_click', {
      motoId: currentMotoId(),
      planId: whatsappAction.dataset?.interestPlan || null,
    });
  }, true);
})();
