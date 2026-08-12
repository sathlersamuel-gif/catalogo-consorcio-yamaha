(function restoreLegacyAdminNavigationAndActivity() {
  const api = window.CatalogApi;
  const config = window.CATALOG_CONFIG || {};
  const root = document.getElementById('adminRoot');
  if (!api || !root) return;

  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.supabasePublishableKey || config.supabaseAnonKey || '');
  let customTab = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function toast(message, type = '') {
    const element = document.getElementById('toast');
    if (!element) return;
    element.textContent = message;
    element.className = `toast show ${type}`;
    window.setTimeout(() => { element.className = 'toast'; }, 3000);
  }

  function setCustomActive(tab) {
    customTab = tab;
    root.querySelectorAll('.side-button[data-tab], .side-button[data-legacy-tab], .side-button[data-restored-tab]').forEach((button) => {
      const isCustom = button.dataset.legacyTab === tab;
      if (button.dataset.legacyTab) button.classList.toggle('active', isCustom);
      else if (isCustom || tab) button.classList.remove('active');
    });
  }

  function ensureMenu() {
    const nav = root.querySelector('.side nav');
    if (!nav) return;

    const leads = nav.querySelector('[data-tab="leads"]');
    if (leads && leads.dataset.legacyNamed !== 'true') {
      leads.dataset.legacyNamed = 'true';
      leads.innerHTML = '<span>●</span>Leads WhatsApp';
    }

    if (!nav.querySelector('[data-legacy-tab="whatsapp"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'side-button';
      button.dataset.legacyTab = 'whatsapp';
      button.innerHTML = '<span>💬</span>WhatsApp';
      const leadsButton = nav.querySelector('[data-tab="leads"]');
      nav.insertBefore(button, leadsButton || nav.querySelector('[data-tab="settings"]') || null);
    }

    if (!nav.querySelector('[data-legacy-tab="activity"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'side-button';
      button.dataset.legacyTab = 'activity';
      button.innerHTML = '<span>◉</span>Acessos';
      const settingsButton = nav.querySelector('[data-tab="settings"]');
      nav.insertBefore(button, settingsButton || null);
    }
  }

  async function renderWhatsapp() {
    const content = document.getElementById('adminContent');
    if (!content) return;
    setCustomActive('whatsapp');
    content.innerHTML = '<div class="loading-page"><div class="spinner" aria-hidden="true"></div><p>Carregando WhatsApp…</p></div>';
    try {
      const catalog = await api.getCatalog(true);
      const settings = catalog.settings || {};
      if (customTab !== 'whatsapp') return;
      content.innerHTML = `<div class="admin-page-header"><div><span class="section-kicker">CONTATO DO VENDEDOR</span><h1>WhatsApp</h1></div></div>
        <form id="legacyWhatsappForm" class="card settings-card">
          <div class="form-grid">
            <label class="field"><span>Nome do vendedor</span><input name="seller_name" value="${escapeHtml(settings.seller_name || '')}" required></label>
            <label class="field"><span>WhatsApp com DDI + DDD</span><input name="whatsapp" value="${escapeHtml(settings.whatsapp || '')}" inputmode="tel" placeholder="5569999999999" required><small>Somente números. Exemplo: 55 + DDD + telefone.</small></label>
          </div>
          <div class="hint">Este é o número usado pelos botões “Quero este plano” do catálogo.</div>
          <button class="btn primary" type="submit">Salvar WhatsApp</button>
        </form>`;
      const form = content.querySelector('#legacyWhatsappForm');
      form.dataset.settingsId = settings.id || '1';
    } catch (error) {
      content.innerHTML = `<div class="card error-state"><h2>Não foi possível carregar o WhatsApp</h2><p>${escapeHtml(error.message)}</p></div>`;
    }
  }

  function deviceLabel(userAgent) {
    const ua = String(userAgent || '');
    let device = 'Outro dispositivo';
    if (/iPhone/i.test(ua)) device = 'iPhone';
    else if (/iPad/i.test(ua)) device = 'iPad';
    else if (/Android/i.test(ua)) device = 'Android';
    else if (/Windows/i.test(ua)) device = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) device = 'Mac';

    let browser = '';
    if (/CriOS|Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/FxiOS|Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/EdgiOS|Edg\//i.test(ua)) browser = 'Edge';
    else if (/Safari\//i.test(ua)) browser = 'Safari';
    return browser ? `${device} · ${browser}` : device;
  }

  function visitorLabel(id) {
    return `Visitante #${String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase() || '—'}`;
  }

  async function loadEvents() {
    const session = api.getSession?.();
    if (!session?.access_token) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch(`${baseUrl}/rest/v1/catalog_events?select=id,event_type,visitor_id,session_id,path,referrer,user_agent,moto_id,plan_id,created_at&order=created_at.desc&limit=1000`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Erro ${response.status}`);
    }
    return response.json();
  }

  async function renderActivity() {
    const content = document.getElementById('adminContent');
    if (!content) return;
    setCustomActive('activity');
    content.innerHTML = '<div class="loading-page"><div class="spinner" aria-hidden="true"></div><p>Carregando acessos e contatos…</p></div>';
    try {
      const [catalog, events] = await Promise.all([api.getCatalog(true), loadEvents()]);
      if (customTab !== 'activity') return;
      const pageViews = events.filter((event) => event.event_type === 'page_view');
      const whatsappClicks = events.filter((event) => event.event_type === 'whatsapp_click');
      const clickedVisitors = new Set(whatsappClicks.map((event) => event.visitor_id));
      const motoMap = new Map(catalog.motos.map((moto) => [moto.id, moto]));
      const planMap = new Map(catalog.plans.map((plan) => [plan.id, plan]));

      const whatsappRows = whatsappClicks.slice(0, 300).map((event) => {
        const plan = planMap.get(event.plan_id);
        const moto = motoMap.get(event.moto_id || plan?.moto_id);
        return `<tr>
          <td>${new Date(event.created_at).toLocaleString('pt-BR')}</td>
          <td><strong>${escapeHtml(visitorLabel(event.visitor_id))}</strong></td>
          <td>${escapeHtml(moto?.name || 'WhatsApp geral')}</td>
          <td>${plan ? `${Number(plan.installments)}x · ${money(plan.installment_value)}` : '—'}</td>
          <td>${escapeHtml(deviceLabel(event.user_agent))}</td>
        </tr>`;
      }).join('');

      const accessRows = pageViews.slice(0, 300).map((event) => `<tr>
        <td>${new Date(event.created_at).toLocaleString('pt-BR')}</td>
        <td><strong>${escapeHtml(visitorLabel(event.visitor_id))}</strong></td>
        <td>${escapeHtml(deviceLabel(event.user_agent))}</td>
        <td>${clickedVisitors.has(event.visitor_id) ? '<span class="status active">Clicou no WhatsApp</span>' : '<span class="status">Somente acesso</span>'}</td>
        <td>${escapeHtml(event.referrer ? 'Veio de outro link' : 'Acesso direto')}</td>
      </tr>`).join('');

      content.innerHTML = `<div class="admin-page-header"><div><span class="section-kicker">ACOMPANHAMENTO DO CATÁLOGO</span><h1>Leads e Acessos</h1></div></div>
        <div class="grid stats">
          <div class="card stat"><span class="stat-icon blue-bg">◉</span><span class="muted">Acessos registrados</span><strong>${pageViews.length}</strong></div>
          <div class="card stat"><span class="stat-icon green-bg">↗</span><span class="muted">Cliques no WhatsApp</span><strong>${whatsappClicks.length}</strong></div>
          <div class="card stat"><span class="stat-icon yellow-bg">●</span><span class="muted">Leads de planos</span><strong>${catalog.leads.length}</strong></div>
        </div>

        <section class="card table-card" style="margin-top:18px">
          <div class="admin-page-header compact"><div><span class="section-kicker">CONTATOS</span><h2>Quem clicou no WhatsApp</h2></div></div>
          <div class="table-scroll"><table class="table"><thead><tr><th>Data e hora</th><th>Visitante</th><th>Moto</th><th>Plano</th><th>Dispositivo</th></tr></thead><tbody>
            ${whatsappRows || '<tr><td colspan="5"><div class="empty-table"><strong>Ainda não há cliques registrados.</strong><span>Os próximos cliques no WhatsApp aparecerão aqui.</span></div></td></tr>'}
          </tbody></table></div>
        </section>

        <section class="card table-card" style="margin-top:18px">
          <div class="admin-page-header compact"><div><span class="section-kicker">VISITAS</span><h2>Quem acessou o catálogo</h2></div></div>
          <div class="table-scroll"><table class="table"><thead><tr><th>Data e hora</th><th>Visitante</th><th>Dispositivo</th><th>Resultado</th><th>Origem</th></tr></thead><tbody>
            ${accessRows || '<tr><td colspan="5"><div class="empty-table"><strong>Ainda não há acessos detalhados.</strong><span>Os novos acessos serão registrados a partir desta atualização.</span></div></td></tr>'}
          </tbody></table></div>
        </section>
        <p class="legal-note">O catálogo identifica cada navegador por um código anônimo. O site não consegue descobrir o nome ou o número do visitante apenas pelo acesso; quando o mesmo código clicar no WhatsApp, isso fica marcado aqui.</p>`;
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (error) {
      content.innerHTML = `<div class="card error-state"><h2>Não foi possível carregar os acessos</h2><p>${escapeHtml(error.message)}</p><button class="btn primary" type="button" data-legacy-tab="activity">Tentar novamente</button></div>`;
      toast(error.message, 'error');
    }
  }

  root.addEventListener('click', (event) => {
    const legacy = event.target.closest('[data-legacy-tab]');
    if (legacy) {
      event.preventDefault();
      if (legacy.dataset.legacyTab === 'whatsapp') renderWhatsapp();
      if (legacy.dataset.legacyTab === 'activity') renderActivity();
      return;
    }
    if (event.target.closest('[data-tab], [data-restored-tab]')) customTab = null;
  });

  root.addEventListener('submit', async (event) => {
    const form = event.target;
    if (form.id !== 'legacyWhatsappForm') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const sellerName = String(new FormData(form).get('seller_name') || '').trim();
    const whatsapp = String(new FormData(form).get('whatsapp') || '').replace(/\D/g, '');
    if (!sellerName || whatsapp.length < 12 || whatsapp.length > 13) return toast('Confira o nome e o WhatsApp com DDI + DDD.', 'error');
    const button = form.querySelector('[type="submit"]');
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'Salvando…';
    try {
      await api.update('catalog_settings', form.dataset.settingsId || '1', { seller_name: sellerName, whatsapp });
      toast('WhatsApp salvo com sucesso.');
      await renderWhatsapp();
    } catch (error) {
      button.disabled = false;
      button.textContent = oldText;
      toast(error.message, 'error');
    }
  }, true);

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      ensureMenu();
    });
  });
  observer.observe(root, { childList: true, subtree: true });
  ensureMenu();
})();
