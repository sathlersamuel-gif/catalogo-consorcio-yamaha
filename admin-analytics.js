(function createAdminAnalytics() {
  const api = window.CatalogApi;
  const config = window.CATALOG_CONFIG || {};
  const root = document.getElementById('adminRoot');
  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.supabasePublishableKey || config.supabaseAnonKey || '');
  if (!root || !api || !baseUrl || !publishableKey) return;

  let metrics = null;
  let loading = false;
  let renderScheduled = false;

  function number(value) {
    return Number(value || 0).toLocaleString('pt-BR');
  }

  function setTextIfChanged(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function renderMetrics() {
    if (!metrics) return;
    const stats = document.querySelector('#adminContent .grid.stats');
    if (!stats) return;

    let views = stats.querySelector('[data-analytics="page-views"]');
    if (!views) {
      views = document.createElement('div');
      views.className = 'card stat';
      views.dataset.analytics = 'page-views';
      views.innerHTML = '<span class="stat-icon blue-bg">◉</span><span class="muted">Acessos à página</span><strong>0</strong>';
      stats.appendChild(views);
    }
    setTextIfChanged(views.querySelector('strong'), number(metrics.page_views));

    let clicks = stats.querySelector('[data-analytics="whatsapp-clicks"]');
    if (!clicks) {
      clicks = document.createElement('div');
      clicks.className = 'card stat';
      clicks.dataset.analytics = 'whatsapp-clicks';
      clicks.innerHTML = '<span class="stat-icon green-bg">↗</span><span class="muted">Cliques no WhatsApp</span><strong>0</strong>';
      stats.appendChild(clicks);
    }
    setTextIfChanged(clicks.querySelector('strong'), number(metrics.whatsapp_clicks));
  }

  async function loadMetrics() {
    if (loading) return;
    const session = api.getSession?.();
    if (!session?.access_token) return;
    loading = true;
    try {
      const response = await fetch(`${baseUrl}/rest/v1/catalog_analytics?select=page_views,whatsapp_clicks&id=eq.1&limit=1`, {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) return;
      const rows = await response.json();
      metrics = rows[0] || { page_views: 0, whatsapp_clicks: 0 };
      renderMetrics();
    } catch {
      // As métricas são complementares e não podem interferir no painel.
    } finally {
      loading = false;
    }
  }

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    queueMicrotask(() => {
      renderScheduled = false;
      if (!document.querySelector('#adminContent .grid.stats')) return;
      if (metrics) renderMetrics();
      else loadMetrics();
    });
  }

  const observer = new MutationObserver(scheduleRender);
  observer.observe(root, { childList: true, subtree: true });
  loadMetrics();
})();
