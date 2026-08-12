(function createAdminApp() {
  const api = window.CatalogApi;
  const root = document.getElementById('adminRoot');
  const modalRoot = document.getElementById('modalRoot');
  const placeholder = 'assets/placeholder-moto.svg';
  let data = null;
  let activeTab = 'dashboard';
  let motoDraft = null;
  let categoryDraft = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
  const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const newId = () => crypto.randomUUID();

  function toast(message, type = '') {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.className = `toast show ${type}`;
    window.setTimeout(() => { element.className = 'toast'; }, 2800);
  }

  function showBusy(button, busy, label = 'Salvando…') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || 'Salvar';
      button.disabled = false;
    }
  }

  function categoryName(id) {
    return data.categories.find((category) => category.id === id)?.name || 'Sem categoria';
  }

  function photosFor(motoId) {
    return data.photos.filter((photo) => photo.moto_id === motoId).sort((a, b) => a.sort_order - b.sort_order);
  }

  function plansFor(motoId) {
    return data.plans.filter((plan) => plan.moto_id === motoId).sort((a, b) => a.sort_order - b.sort_order);
  }

  function lowestPlan(motoId) {
    const plans = plansFor(motoId).filter((plan) => plan.active !== false);
    return plans.length ? Math.min(...plans.map((plan) => Number(plan.installment_value))) : 0;
  }

  function renderSetupRequired() {
    root.innerHTML = `<main class="wrap setup-page">
      <section class="card setup-card">
        <span class="setup-icon">⚙️</span>
        <h1>Banco online aguardando configuração</h1>
        <p>O novo painel seguro está pronto para usar um banco central. Falta conectar o projeto online antes da publicação.</p>
        <div class="setup-list">
          <span>✓ Alterações visíveis para todos os clientes</span>
          <span>✓ Fotos armazenadas online</span>
          <span>✓ Leads recebidos no seu painel</span>
          <span>✓ Login administrativo protegido</span>
        </div>
      </section>
    </main>`;
  }

  function renderLogin() {
    root.innerHTML = `<main class="login-page">
      <section class="login-visual">
        <span class="eyebrow">PAINEL DO ADMINISTRADOR</span>
        <h1>Seu catálogo Yamaha em um só lugar.</h1>
        <p>Gerencie categorias, motos, fotos, planos e interesses com segurança.</p>
      </section>
      <section class="card login-card">
        <div class="login-mark mark">Y</div>
        <h2>Entrar no painel</h2>
        <p class="muted">Digite seu PIN ou senha administrativa.</p>
        <form id="loginForm">
          <label class="field"><span>PIN / senha</span><input name="password" type="password" minlength="6" autocomplete="current-password" placeholder="Digite sua senha" required></label>
          <button class="btn primary full" type="submit">Entrar</button>
        </form>
      </section>
    </main>`;
  }

  function menuButton(tab, icon, label) {
    return `<button class="side-button ${activeTab === tab ? 'active' : ''}" data-tab="${tab}"><span>${icon}</span>${label}</button>`;
  }

  function renderShell() {
    root.innerHTML = `<div class="admin-shell">
      <aside class="side">
        <div class="side-title">PAINEL DO ADMINISTRADOR</div>
        <nav aria-label="Menu administrativo">
          ${menuButton('dashboard', '▦', 'Dashboard')}
          ${menuButton('categories', '▤', 'Categorias')}
          ${menuButton('motos', '🏍', 'Motos')}
          ${menuButton('plans', '≡', 'Planos de Consórcio')}
          ${menuButton('leads', '●', 'Pedidos / Leads')}
          ${menuButton('settings', '⚙', 'Configurações')}
          <a class="side-button" href="index.html" target="_blank" rel="noopener"><span>↗</span>Ver como cliente</a>
        </nav>
        <button class="side-button logout" data-action="logout"><span>←</span>Sair</button>
      </aside>
      <main id="adminContent" class="admin-main"></main>
    </div>`;
    renderActiveTab();
  }

  function pageHeader(kicker, title, action = '') {
    return `<div class="admin-page-header"><div><span class="section-kicker">${escapeHtml(kicker)}</span><h1>${escapeHtml(title)}</h1></div>${action}</div>`;
  }

  function renderDashboard() {
    return `${pageHeader('VISÃO GERAL', 'Dashboard')}
      <div class="grid stats">
        <button class="card stat" data-tab="categories"><span class="stat-icon blue-bg">▤</span><span class="muted">Categorias</span><strong>${data.categories.length}</strong></button>
        <button class="card stat" data-tab="motos"><span class="stat-icon red-bg">🏍</span><span class="muted">Motos</span><strong>${data.motos.length}</strong></button>
        <button class="card stat" data-tab="plans"><span class="stat-icon yellow-bg">≡</span><span class="muted">Planos</span><strong>${data.plans.length}</strong></button>
        <button class="card stat" data-tab="leads"><span class="stat-icon green-bg">●</span><span class="muted">Leads</span><strong>${data.leads.length}</strong></button>
      </div>
      <section class="card welcome-card"><div><span class="section-kicker">BEM-VINDO</span><h2>${escapeHtml(data.settings.seller_name || 'Administrador')}</h2><p>Gerencie seu catálogo, motos, fotos e planos de consórcio.</p></div><a class="btn primary" href="index.html" target="_blank" rel="noopener">Ver catálogo ↗</a></section>`;
  }

  function renderCategories() {
    return `${pageHeader('ORGANIZAÇÃO DO CATÁLOGO', 'Categorias', '<button class="btn primary" data-action="new-category">+ Nova categoria</button>')}
      <div class="card table-card"><div class="table-scroll"><table class="table"><thead><tr><th>#</th><th>Categoria</th><th>Descrição</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        ${data.categories.map((category, index) => `<tr><td>${index + 1}</td><td><div class="table-title">${category.image_url ? `<img src="${escapeHtml(category.image_url)}" alt="">` : `<span>${escapeHtml(category.icon || '🏍️')}</span>`}<strong>${escapeHtml(category.name)}</strong></div></td><td>${escapeHtml(category.description || '—')}</td><td><span class="status ${category.active ? 'active' : 'hidden-status'}">${category.active ? 'Ativa' : 'Oculta'}</span></td><td><div class="row-actions"><button class="icon-button edit" data-edit-category="${category.id}" aria-label="Editar ${escapeHtml(category.name)}">✎</button><button class="icon-button delete" data-delete-category="${category.id}" aria-label="Excluir ${escapeHtml(category.name)}">🗑</button></div></td></tr>`).join('')}
      </tbody></table></div></div>`;
  }

  function renderMotos() {
    return `${pageHeader('PRODUTOS', 'Motos', '<button class="btn primary" data-action="new-moto">+ Nova moto</button>')}
      <div class="card table-card"><div class="table-scroll"><table class="table"><thead><tr><th>Moto</th><th>Categoria</th><th>Ano/Modelo</th><th>Fotos</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        ${data.motos.map((moto) => {
          const photo = photosFor(moto.id).find((item) => item.is_primary) || photosFor(moto.id)[0];
          return `<tr><td><div class="table-title moto-table-title"><img src="${escapeHtml(photo?.url || placeholder)}" alt=""><strong>${escapeHtml(moto.name)}</strong></div></td><td>${escapeHtml(categoryName(moto.category_id))}</td><td>${escapeHtml(moto.year_model || '—')}</td><td>${photosFor(moto.id).length}</td><td><span class="status ${moto.active ? 'active' : 'hidden-status'}">${moto.active ? 'Ativa' : 'Oculta'}</span></td><td><div class="row-actions"><button class="icon-button edit" data-edit-moto="${moto.id}" aria-label="Editar ${escapeHtml(moto.name)}">✎</button><button class="icon-button delete" data-delete-moto="${moto.id}" aria-label="Excluir ${escapeHtml(moto.name)}">🗑</button></div></td></tr>`;
        }).join('')}
      </tbody></table></div></div>`;
  }

  function renderPlans() {
    return `${pageHeader('VALORES EDITÁVEIS', 'Planos de Consórcio')}
      <div class="card table-card"><div class="table-scroll"><table class="table"><thead><tr><th>Moto</th><th>Planos</th><th>Menor parcela</th><th>Ação</th></tr></thead><tbody>
        ${data.motos.map((moto) => `<tr><td><strong>${escapeHtml(moto.name)}</strong></td><td>${plansFor(moto.id).length}</td><td><strong class="blue-text">${lowestPlan(moto.id) ? money(lowestPlan(moto.id)) : 'Sem planos'}</strong></td><td><button class="btn small primary" data-edit-plans="${moto.id}">Editar planos</button></td></tr>`).join('')}
      </tbody></table></div></div>`;
  }

  function renderLeads() {
    return `${pageHeader('INTERESSES RECEBIDOS', 'Pedidos / Leads')}
      <div class="card table-card"><div class="table-scroll"><table class="table"><thead><tr><th>Data e hora</th><th>Moto</th><th>Plano</th><th>Parcela</th></tr></thead><tbody>
        ${data.leads.length ? data.leads.map((lead) => `<tr><td>${new Date(lead.created_at).toLocaleString('pt-BR')}</td><td><strong>${escapeHtml(lead.moto_name)}</strong></td><td>${Number(lead.installments)}x</td><td>${money(lead.installment_value)}</td></tr>`).join('') : '<tr><td colspan="4"><div class="empty-table"><strong>Ainda não há leads.</strong><span>Os interesses aparecerão aqui quando os clientes clicarem nos planos.</span></div></td></tr>'}
      </tbody></table></div></div>`;
  }

  function renderSettings() {
    return `${pageHeader('DADOS DO VENDEDOR E ACESSO', 'Configurações')}
      <form id="settingsForm" class="card settings-card">
        <div class="form-grid">
          <label class="field"><span>Nome do vendedor</span><input name="seller_name" value="${escapeHtml(data.settings.seller_name || '')}" required></label>
          <label class="field"><span>WhatsApp com DDI + DDD</span><input name="whatsapp" value="${escapeHtml(data.settings.whatsapp || '')}" inputmode="tel" placeholder="5569999999999" required><small>Somente números. Exemplo: 55 + DDD + telefone.</small></label>
          <label class="field full"><span>Novo PIN / senha</span><input name="password" type="password" minlength="6" autocomplete="new-password" placeholder="Deixe vazio para não alterar"><small>Use pelo menos 6 caracteres. Não use sequências fáceis.</small></label>
        </div>
        <button class="btn primary" type="submit">Salvar configurações</button>
      </form>`;
  }

  function renderActiveTab() {
    const content = document.getElementById('adminContent');
    if (!content) return;
    const pages = { dashboard: renderDashboard, categories: renderCategories, motos: renderMotos, plans: renderPlans, leads: renderLeads, settings: renderSettings };
    content.innerHTML = (pages[activeTab] || renderDashboard)();
    document.querySelectorAll('.side-button[data-tab]').forEach((button) => button.classList.toggle('active', button.dataset.tab === activeTab));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  async function refresh(tab = activeTab) {
    data = await api.getCatalog(true);
    activeTab = tab;
    renderActiveTab();
  }

  function closeModal() {
    motoDraft?.photos?.forEach((photo) => {
      if (photo.preview) URL.revokeObjectURL(photo.preview);
    });
    modalRoot.innerHTML = '';
    motoDraft = null;
    categoryDraft = null;
  }

  function openCategoryModal(id = null) {
    const current = id ? data.categories.find((category) => category.id === id) : null;
    categoryDraft = { ...(current || { id: newId(), name: '', description: '', icon: '🏍️', image_url: '', image_path: '', active: true, sort_order: data.categories.length + 1 }), isNew: !current };
    modalRoot.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${id ? 'Editar categoria' : 'Nova categoria'}"><form id="categoryForm" class="modal-box">
      <div class="modal-header"><div><span class="section-kicker">CATEGORIA</span><h2>${id ? 'Editar categoria' : 'Nova categoria'}</h2></div><button type="button" class="close-button" data-action="close-modal" aria-label="Fechar">×</button></div>
      <div class="form-grid">
        <label class="field"><span>Nome</span><input name="name" value="${escapeHtml(categoryDraft.name)}" required></label>
        <label class="field"><span>Ícone</span><input name="icon" value="${escapeHtml(categoryDraft.icon || '')}" maxlength="8" placeholder="🏍️"></label>
        <label class="field full"><span>Descrição</span><input name="description" value="${escapeHtml(categoryDraft.description || '')}" required></label>
        <label class="field"><span>Status</span><select name="active"><option value="true" ${categoryDraft.active ? 'selected' : ''}>Ativa</option><option value="false" ${!categoryDraft.active ? 'selected' : ''}>Oculta</option></select></label>
        <label class="field"><span>Ordem</span><input name="sort_order" type="number" min="0" value="${Number(categoryDraft.sort_order || 0)}"></label>
        <label class="field full"><span>Imagem opcional da categoria</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><small>Se não enviar imagem, o ícone será utilizado.</small></label>
      </div>
      ${categoryDraft.image_url ? `<div class="current-category-image"><img src="${escapeHtml(categoryDraft.image_url)}" alt="Imagem atual"><span>Imagem atual</span></div>` : ''}
      <div class="modal-actions"><button type="button" class="btn ghost" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary">Salvar categoria</button></div>
    </form></div>`;
  }

  function photoPreview(photo, index) {
    const source = photo.url || photo.preview;
    return `<div class="photo-admin-card ${photo.is_primary ? 'primary-photo' : ''}">
      <img src="${escapeHtml(source)}" alt="Foto ${index + 1}">
      <div class="photo-badge">${photo.is_primary ? 'Principal' : `Foto ${index + 1}`}</div>
      <div class="photo-tools">
        <button type="button" data-photo-main="${index}" title="Definir como principal">★</button>
        <button type="button" data-photo-up="${index}" title="Mover para esquerda" ${index === 0 ? 'disabled' : ''}>←</button>
        <button type="button" data-photo-down="${index}" title="Mover para direita" ${index === motoDraft.photos.length - 1 ? 'disabled' : ''}>→</button>
        <button type="button" class="danger" data-photo-remove="${index}" title="Excluir foto">×</button>
      </div>
    </div>`;
  }

  function planRow(plan, index) {
    return `<div class="plan-admin-row" data-plan-index="${index}">
      <label class="field"><span>Parcelas</span><input data-plan-field="installments" type="number" min="1" value="${Number(plan.installments || 0)}" required></label>
      <label class="field"><span>Valor da parcela</span><input data-plan-field="installment_value" type="number" min="0.01" step="0.01" value="${Number(plan.installment_value || 0)}" required></label>
      <label class="field"><span>Destaque opcional</span><input data-plan-field="label" value="${escapeHtml(plan.label || '')}" placeholder="Ex.: Mais escolhido"></label>
      <label class="field compact-field"><span>Status</span><select data-plan-field="active"><option value="true" ${plan.active !== false ? 'selected' : ''}>Ativo</option><option value="false" ${plan.active === false ? 'selected' : ''}>Oculto</option></select></label>
      <div class="order-buttons"><button type="button" data-plan-up="${index}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-plan-down="${index}" ${index === motoDraft.plans.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="danger" data-plan-remove="${index}">🗑</button></div>
    </div>`;
  }

  function renderMotoDraft() {
    const gallery = document.getElementById('photoAdminGrid');
    const plans = document.getElementById('planAdminRows');
    if (gallery) gallery.innerHTML = motoDraft.photos.length ? motoDraft.photos.map(photoPreview).join('') : '<div class="empty-gallery">Nenhuma foto cadastrada. Adicione as fotos da moto.</div>';
    if (plans) plans.innerHTML = motoDraft.plans.length ? motoDraft.plans.map(planRow).join('') : '<div class="empty-gallery">Nenhum plano cadastrado.</div>';
  }

  function openMotoModal(id = null, plansOnly = false) {
    const current = id ? data.motos.find((moto) => moto.id === id) : null;
    motoDraft = {
      ...(current || { id: newId(), name: '', category_id: data.categories[0]?.id || '', year_model: new Date().getFullYear().toString(), description: '', active: true, featured: false, sort_order: data.motos.length + 1 }),
      isNew: !current,
      plansOnly,
      photos: current ? photosFor(current.id).map((photo) => ({ ...photo })) : [],
      plans: current ? plansFor(current.id).map((plan) => ({ ...plan })) : [],
      removedPhotos: [],
    };
    modalRoot.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Editar moto"><form id="motoForm" class="modal-box wide-modal">
      <div class="modal-header"><div><span class="section-kicker">${plansOnly ? 'PLANOS DE CONSÓRCIO' : 'MOTO'}</span><h2>${current ? `Editar ${escapeHtml(current.name)}` : 'Nova moto'}</h2></div><button type="button" class="close-button" data-action="close-modal" aria-label="Fechar">×</button></div>
      ${plansOnly ? '' : `<section class="editor-section"><h3>Dados gerais</h3><div class="form-grid">
        <label class="field"><span>Nome da moto</span><input name="name" value="${escapeHtml(motoDraft.name)}" required></label>
        <label class="field"><span>Categoria</span><select name="category_id" required>${data.categories.map((category) => `<option value="${category.id}" ${motoDraft.category_id === category.id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}</select></label>
        <label class="field"><span>Ano/Modelo</span><input name="year_model" value="${escapeHtml(motoDraft.year_model || '')}" required></label>
        <label class="field"><span>Status</span><select name="active"><option value="true" ${motoDraft.active ? 'selected' : ''}>Ativa</option><option value="false" ${!motoDraft.active ? 'selected' : ''}>Oculta</option></select></label>
        <label class="check-field"><input name="featured" type="checkbox" ${motoDraft.featured ? 'checked' : ''}><span>Mostrar como moto em destaque</span></label>
        <label class="field"><span>Ordem</span><input name="sort_order" type="number" min="0" value="${Number(motoDraft.sort_order || 0)}"></label>
        <label class="field full"><span>Descrição completa</span><textarea name="description" rows="5" required>${escapeHtml(motoDraft.description || '')}</textarea></label>
      </div></section>
      <section class="editor-section"><div class="editor-title"><div><h3>Galeria de fotos</h3><p>Adicione várias fotos, escolha a principal e organize a ordem.</p></div><label class="btn ghost file-button">+ Adicionar fotos<input id="motoPhotoInput" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple></label></div><div id="photoAdminGrid" class="photo-admin-grid"></div></section>`}
      <section class="editor-section"><div class="editor-title"><div><h3>Planos de Consórcio</h3><p>A menor parcela será destacada automaticamente.</p></div><button type="button" class="btn ghost" data-action="add-plan">+ Novo plano</button></div><div id="planAdminRows" class="plan-admin-list"></div></section>
      <div class="modal-actions sticky-actions"><button type="button" class="btn ghost" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary">Salvar alterações</button></div>
    </form></div>`;
    renderMotoDraft();
  }

  async function saveCategory(form, submitButton) {
    const formData = new FormData(form);
    const values = {
      name: String(formData.get('name') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      icon: String(formData.get('icon') || '').trim() || '🏍️',
      active: formData.get('active') === 'true',
      sort_order: Number(formData.get('sort_order') || 0),
    };
    if (!values.name) return toast('Informe o nome da categoria.', 'error');
    showBusy(submitButton, true);
    try {
      const id = categoryDraft.id;
      if (categoryDraft.isNew) await api.insert('categories', [{ id, ...values }]);
      else await api.update('categories', id, values);
      const image = formData.get('image');
      if (image?.size) {
        const uploaded = await api.uploadImage(image, `categories/${id}`);
        await api.update('categories', id, { image_url: uploaded.url, image_path: uploaded.path });
        if (categoryDraft.image_path) await api.deleteImage(categoryDraft.image_path).catch(() => {});
      }
      closeModal();
      await refresh('categories');
      toast('Categoria salva com sucesso.');
    } catch (error) {
      showBusy(submitButton, false);
      toast(error.message, 'error');
    }
  }

  function syncPlanFields() {
    modalRoot.querySelectorAll('[data-plan-index]').forEach((row) => {
      const index = Number(row.dataset.planIndex);
      const plan = motoDraft.plans[index];
      row.querySelectorAll('[data-plan-field]').forEach((input) => {
        const field = input.dataset.planField;
        if (field === 'installments') plan[field] = Number(input.value);
        else if (field === 'installment_value') plan[field] = Number(input.value);
        else if (field === 'active') plan[field] = input.value === 'true';
        else plan[field] = input.value.trim();
      });
    });
  }

  async function saveMoto(form, submitButton) {
    syncPlanFields();
    if (!motoDraft.plans.length) return toast('Cadastre pelo menos um plano.', 'error');
    if (motoDraft.plans.some((plan) => !Number(plan.installments) || !Number(plan.installment_value))) return toast('Preencha corretamente todos os planos.', 'error');
    const formData = new FormData(form);
    const values = motoDraft.plansOnly ? null : {
      name: String(formData.get('name') || '').trim(),
      category_id: formData.get('category_id'),
      year_model: String(formData.get('year_model') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      active: formData.get('active') === 'true',
      featured: formData.get('featured') === 'on',
      sort_order: Number(formData.get('sort_order') || 0),
    };
    if (values && (!values.name || !values.category_id || !values.description)) return toast('Preencha os dados obrigatórios da moto.', 'error');
    showBusy(submitButton, true);
    try {
      const motoId = motoDraft.id;
      const targetTab = motoDraft.plansOnly ? 'plans' : 'motos';
      if (!motoDraft.plansOnly) {
        if (motoDraft.isNew) await api.insert('motos', [{ id: motoId, ...values }]);
        else await api.update('motos', motoId, values);
      }

      await api.rpc('replace_moto_plans', {
        p_moto_id: motoId,
        p_plans: motoDraft.plans.map((plan, index) => ({
          installments: Number(plan.installments), installment_value: Number(plan.installment_value), label: String(plan.label || '').trim(), active: plan.active !== false, sort_order: index + 1,
        })),
      });

      if (!motoDraft.plansOnly) {
        await Promise.all(motoDraft.removedPhotos.map(async (photo) => {
          if (photo.path) await api.deleteImage(photo.path).catch(() => {});
          if (photo.id) await api.remove('moto_photos', photo.id).catch(() => {});
        }));
        if (motoDraft.photos.length && !motoDraft.photos.some((photo) => photo.is_primary)) motoDraft.photos[0].is_primary = true;
        for (let index = 0; index < motoDraft.photos.length; index += 1) {
          const photo = motoDraft.photos[index];
          if (photo.file) {
            const uploaded = await api.uploadImage(photo.file, `motos/${motoId}`);
            await api.insert('moto_photos', [{ id: newId(), moto_id: motoId, url: uploaded.url, path: uploaded.path, is_primary: Boolean(photo.is_primary), sort_order: index + 1 }]);
          } else {
            await api.update('moto_photos', photo.id, { is_primary: Boolean(photo.is_primary), sort_order: index + 1 });
          }
        }
      }
      closeModal();
      await refresh(targetTab);
      toast('Moto e planos salvos com sucesso.');
    } catch (error) {
      showBusy(submitButton, false);
      toast(error.message, 'error');
    }
  }

  async function deleteCategory(id) {
    const category = data.categories.find((item) => item.id === id);
    if (data.motos.some((moto) => moto.category_id === id)) return toast('Essa categoria possui motos. Mova ou exclua as motos primeiro.', 'error');
    if (!confirm(`Excluir a categoria “${category?.name || ''}”?`)) return;
    try {
      if (category?.image_path) await api.deleteImage(category.image_path).catch(() => {});
      await api.remove('categories', id);
      await refresh('categories');
      toast('Categoria excluída.');
    } catch (error) { toast(error.message, 'error'); }
  }

  async function deleteMoto(id) {
    const moto = data.motos.find((item) => item.id === id);
    if (!confirm(`Excluir a moto “${moto?.name || ''}” e todos os seus planos?`)) return;
    try {
      await Promise.all(photosFor(id).map((photo) => photo.path ? api.deleteImage(photo.path).catch(() => {}) : Promise.resolve()));
      await api.remove('motos', id);
      await refresh('motos');
      toast('Moto excluída.');
    } catch (error) { toast(error.message, 'error'); }
  }

  async function saveSettings(form, submitButton) {
    const formData = new FormData(form);
    const sellerName = String(formData.get('seller_name') || '').trim();
    const whatsapp = String(formData.get('whatsapp') || '').replace(/\D/g, '');
    const password = String(formData.get('password') || '');
    if (!sellerName || whatsapp.length < 12 || whatsapp.length > 13) return toast('Confira o nome e o WhatsApp com DDI + DDD.', 'error');
    if (password && password.length < 6) return toast('O novo PIN/senha precisa ter pelo menos 6 caracteres.', 'error');
    showBusy(submitButton, true);
    try {
      if (data.settings.id) await api.update('catalog_settings', data.settings.id, { seller_name: sellerName, whatsapp });
      else await api.insert('catalog_settings', [{ id: 1, seller_name: sellerName, whatsapp }]);
      if (password) await api.changePassword(password);
      await refresh('settings');
      toast('Configurações salvas com sucesso.');
    } catch (error) {
      showBusy(submitButton, false);
      toast(error.message, 'error');
    }
  }

  root.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('[type="submit"]');
    if (form.id === 'loginForm') {
      showBusy(submitButton, true, 'Entrando…');
      try {
        await api.login(new FormData(form).get('password'));
        data = await api.getCatalog(true);
        renderShell();
      } catch (error) {
        showBusy(submitButton, false);
        toast(error.status === 400 ? 'PIN ou senha incorreta.' : error.message, 'error');
      }
    } else if (form.id === 'settingsForm') await saveSettings(form, submitButton);
  });

  root.addEventListener('click', async (event) => {
    const tab = event.target.closest('[data-tab]');
    const action = event.target.closest('[data-action]');
    const editCategory = event.target.closest('[data-edit-category]');
    const deleteCategoryButton = event.target.closest('[data-delete-category]');
    const editMoto = event.target.closest('[data-edit-moto]');
    const deleteMotoButton = event.target.closest('[data-delete-moto]');
    const editPlans = event.target.closest('[data-edit-plans]');
    if (tab) { activeTab = tab.dataset.tab; renderActiveTab(); }
    else if (action?.dataset.action === 'logout') { await api.logout(); renderLogin(); }
    else if (action?.dataset.action === 'new-category') openCategoryModal();
    else if (action?.dataset.action === 'new-moto') openMotoModal();
    else if (editCategory) openCategoryModal(editCategory.dataset.editCategory);
    else if (deleteCategoryButton) deleteCategory(deleteCategoryButton.dataset.deleteCategory);
    else if (editMoto) openMotoModal(editMoto.dataset.editMoto);
    else if (deleteMotoButton) deleteMoto(deleteMotoButton.dataset.deleteMoto);
    else if (editPlans) openMotoModal(editPlans.dataset.editPlans, true);
  });

  modalRoot.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.submitter || event.target.querySelector('[type="submit"]');
    if (event.target.id === 'categoryForm') await saveCategory(event.target, submitButton);
    if (event.target.id === 'motoForm') await saveMoto(event.target, submitButton);
  });

  modalRoot.addEventListener('change', (event) => {
    if (event.target.id === 'motoPhotoInput') {
      const files = [...event.target.files];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        motoDraft.photos.push({ tempId: newId(), file, preview: URL.createObjectURL(file), is_primary: motoDraft.photos.length === 0 });
      }
      event.target.value = '';
      renderMotoDraft();
    }
  });

  modalRoot.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    const photoMain = event.target.closest('[data-photo-main]');
    const photoUp = event.target.closest('[data-photo-up]');
    const photoDown = event.target.closest('[data-photo-down]');
    const photoRemove = event.target.closest('[data-photo-remove]');
    const planUp = event.target.closest('[data-plan-up]');
    const planDown = event.target.closest('[data-plan-down]');
    const planRemove = event.target.closest('[data-plan-remove]');
    if (action?.dataset.action === 'close-modal' || event.target.classList.contains('modal')) closeModal();
    else if (action?.dataset.action === 'add-plan') {
      syncPlanFields();
      motoDraft.plans.push({ id: newId(), installments: '', installment_value: '', label: '', active: true });
      renderMotoDraft();
    } else if (photoMain) {
      motoDraft.photos.forEach((photo, index) => { photo.is_primary = index === Number(photoMain.dataset.photoMain); });
      renderMotoDraft();
    } else if (photoUp || photoDown) {
      const index = Number((photoUp || photoDown).dataset[photoUp ? 'photoUp' : 'photoDown']);
      const target = index + (photoUp ? -1 : 1);
      [motoDraft.photos[index], motoDraft.photos[target]] = [motoDraft.photos[target], motoDraft.photos[index]];
      renderMotoDraft();
    } else if (photoRemove) {
      const index = Number(photoRemove.dataset.photoRemove);
      const removed = motoDraft.photos.splice(index, 1)[0];
      if (removed?.id) motoDraft.removedPhotos.push(removed);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      if (motoDraft.photos.length && !motoDraft.photos.some((photo) => photo.is_primary)) motoDraft.photos[0].is_primary = true;
      renderMotoDraft();
    } else if (planUp || planDown) {
      syncPlanFields();
      const index = Number((planUp || planDown).dataset[planUp ? 'planUp' : 'planDown']);
      const target = index + (planUp ? -1 : 1);
      [motoDraft.plans[index], motoDraft.plans[target]] = [motoDraft.plans[target], motoDraft.plans[index]];
      renderMotoDraft();
    } else if (planRemove) {
      syncPlanFields();
      motoDraft.plans.splice(Number(planRemove.dataset.planRemove), 1);
      renderMotoDraft();
    }
  });

  async function start() {
    if (!api.isConfigured) return renderSetupRequired();
    if (!api.getSession()) return renderLogin();
    try {
      data = await api.getCatalog(true);
      renderShell();
    } catch {
      await api.logout();
      renderLogin();
    }
  }

  start();
})();
