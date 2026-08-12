(function restoreCompleteAdminFeatures() {
  const api = window.CatalogApi;
  const config = window.CATALOG_CONFIG || {};
  const root = document.getElementById('adminRoot');
  const modalRoot = document.getElementById('modalRoot');
  if (!api || !root || !modalRoot) return;

  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.supabasePublishableKey || config.supabaseAnonKey || '');
  const outboardBucket = 'outboard-motor-images';
  let outboardData = { motors: [], photos: [], plans: [] };
  let outboardDraft = null;
  let outboardLoadPromise = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));

  function toast(message, type = '') {
    const element = document.getElementById('toast');
    if (!element) return;
    element.textContent = message;
    element.className = `toast show ${type}`;
    window.setTimeout(() => { element.className = 'toast'; }, 3000);
  }

  function parseBRMoney(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    let text = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
    if (!text) return NaN;
    if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
    else if ((text.match(/\./g) || []).length > 1) text = text.replace(/\./g, '');
    text = text.replace(/[^0-9.-]/g, '');
    return Number(text);
  }

  function formatBRMoney(value) {
    const number = parseBRMoney(value);
    if (!Number.isFinite(number)) return '';
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function money(value) {
    const number = Number(value || 0);
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function sessionHeaders(json = false) {
    const session = api.getSession?.();
    if (!session?.access_token) throw new Error('Sua sessão expirou. Entre novamente.');
    const headers = {
      apikey: publishableKey,
      Authorization: `Bearer ${session.access_token}`,
    };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async function parseResponse(response) {
    if (response.status === 204) return null;
    const type = response.headers.get('content-type') || '';
    const body = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = body?.message || body?.error_description || body?.hint || body?.details || body?.error || String(body || `Erro ${response.status}`);
      throw new Error(message);
    }
    return body;
  }

  async function readTable(table, query) {
    const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, { headers: sessionHeaders() });
    return parseResponse(response);
  }

  async function loadOutboardData() {
    if (outboardLoadPromise) return outboardLoadPromise;
    outboardLoadPromise = (async () => {
      try {
        const [motors, photos, plans] = await Promise.all([
          readTable('outboard_motors', 'select=id,name,horsepower,year_model,description,active,featured,sort_order&order=sort_order.asc,name.asc'),
          readTable('outboard_motor_photos', 'select=id,motor_id,url,path,is_primary,sort_order&order=sort_order.asc'),
          readTable('outboard_motor_plans', 'select=id,motor_id,installments,installment_value,label,active,sort_order&order=sort_order.asc,installments.asc'),
        ]);
        outboardData = { motors, photos, plans };
        return outboardData;
      } finally {
        outboardLoadPromise = null;
      }
    })();
    return outboardLoadPromise;
  }

  function photosFor(motorId) {
    return outboardData.photos.filter((photo) => photo.motor_id === motorId).sort((a, b) => a.sort_order - b.sort_order);
  }

  function plansFor(motorId) {
    return outboardData.plans.filter((plan) => plan.motor_id === motorId).sort((a, b) => a.sort_order - b.sort_order || a.installments - b.installments);
  }

  function lowestPlan(motorId) {
    const values = plansFor(motorId).filter((plan) => plan.active !== false).map((plan) => Number(plan.installment_value)).filter(Number.isFinite);
    return values.length ? Math.min(...values) : 0;
  }

  function setOutboardActive() {
    document.querySelectorAll('.side-button[data-tab]').forEach((button) => button.classList.remove('active'));
    root.querySelector('[data-restored-tab="outboard"]')?.classList.add('active');
  }

  function ensureOutboardTab() {
    const nav = root.querySelector('.side nav');
    if (!nav || nav.querySelector('[data-restored-tab="outboard"]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'side-button';
    button.dataset.restoredTab = 'outboard';
    button.innerHTML = '<span>⚓</span>Motores de Popa';
    const motos = nav.querySelector('[data-tab="motos"]');
    if (motos?.nextSibling) nav.insertBefore(button, motos.nextSibling);
    else nav.appendChild(button);
  }

  async function ensureDashboardOutboardCard() {
    const stats = root.querySelector('#adminContent .grid.stats');
    if (!stats || stats.querySelector('[data-restored-tab="outboard"]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card stat';
    button.dataset.restoredTab = 'outboard';
    button.innerHTML = '<span class="stat-icon blue-bg">⚓</span><span class="muted">Motores de Popa</span><strong>—</strong>';
    stats.appendChild(button);
    try {
      const loaded = await loadOutboardData();
      if (button.isConnected) button.querySelector('strong').textContent = String(loaded.motors.length);
    } catch {
      if (button.isConnected) button.querySelector('strong').textContent = '0';
    }
  }

  function renderOutboardLoading() {
    const content = document.getElementById('adminContent');
    if (!content) return;
    content.innerHTML = '<div class="loading-page"><div class="spinner" aria-hidden="true"></div><p>Carregando motores de popa…</p></div>';
  }

  async function renderOutboard() {
    const content = document.getElementById('adminContent');
    if (!content) return;
    setOutboardActive();
    renderOutboardLoading();
    try {
      await loadOutboardData();
      setOutboardActive();
      content.innerHTML = `<div class="admin-page-header"><div><span class="section-kicker">PRODUTOS NÁUTICOS</span><h1>Motores de Popa</h1></div><button class="btn primary" type="button" data-outboard-new>+ Novo motor</button></div>
        <div class="card table-card"><div class="table-scroll"><table class="table"><thead><tr><th>Motor</th><th>Potência</th><th>Ano/Modelo</th><th>Fotos</th><th>Planos</th><th>Menor parcela</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        ${outboardData.motors.length ? outboardData.motors.map((motor) => `<tr>
          <td><strong>${escapeHtml(motor.name)}</strong></td>
          <td>${escapeHtml(motor.horsepower || '—')}</td>
          <td>${escapeHtml(motor.year_model || '—')}</td>
          <td>${photosFor(motor.id).length}</td>
          <td>${plansFor(motor.id).length}</td>
          <td><strong class="blue-text">${lowestPlan(motor.id) ? money(lowestPlan(motor.id)) : 'Sem planos'}</strong></td>
          <td><span class="status ${motor.active ? 'active' : 'hidden-status'}">${motor.active ? 'Ativo' : 'Oculto'}</span></td>
          <td><div class="row-actions"><button class="btn small ghost" type="button" data-outboard-plans="${motor.id}">Planos</button><button class="icon-button edit" type="button" data-outboard-edit="${motor.id}" aria-label="Editar ${escapeHtml(motor.name)}">✎</button><button class="icon-button delete" type="button" data-outboard-delete="${motor.id}" aria-label="Excluir ${escapeHtml(motor.name)}">🗑</button></div></td>
        </tr>`).join('') : '<tr><td colspan="8"><div class="empty-table"><strong>Nenhum motor cadastrado.</strong><span>Use “Novo motor” para cadastrar.</span></div></td></tr>'}
        </tbody></table></div></div>`;
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (error) {
      content.innerHTML = `<div class="card error-state"><h2>Não foi possível carregar os motores</h2><p>${escapeHtml(error.message)}</p><button class="btn primary" type="button" data-restored-tab="outboard">Tentar novamente</button></div>`;
      toast(error.message, 'error');
    }
  }

  function safeExtension(file) {
    const byName = String(file?.name || '').split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(byName)) return byName === 'jpeg' ? 'jpg' : byName;
    const byType = String(file?.type || '').split('/').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(byType) ? byType.replace('jpeg', 'jpg') : 'jpg';
  }

  async function uploadOutboardImage(file, motorId) {
    if (!file?.type?.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
    if (file.size > 8 * 1024 * 1024) throw new Error('Cada foto pode ter no máximo 8 MB.');
    const path = `${motorId}/${crypto.randomUUID()}.${safeExtension(file)}`;
    const response = await fetch(`${baseUrl}/storage/v1/object/${outboardBucket}/${path}`, {
      method: 'POST',
      headers: { ...sessionHeaders(), 'Content-Type': file.type || 'image/jpeg', 'x-upsert': 'false' },
      body: file,
    });
    await parseResponse(response);
    return { path, url: `${baseUrl}/storage/v1/object/public/${outboardBucket}/${path}` };
  }

  async function deleteOutboardImage(path) {
    if (!path) return;
    const response = await fetch(`${baseUrl}/storage/v1/object/${outboardBucket}/${path}`, {
      method: 'DELETE', headers: sessionHeaders(),
    });
    await parseResponse(response);
  }

  function outboardPhotoCard(photo, index) {
    const source = photo.url || photo.preview;
    return `<div class="photo-admin-card ${photo.is_primary ? 'primary-photo' : ''}">
      <img src="${escapeHtml(source)}" alt="Foto ${index + 1}">
      <div class="photo-badge">${photo.is_primary ? 'Principal' : `Foto ${index + 1}`}</div>
      <div class="photo-tools">
        <button type="button" data-outboard-photo-main="${index}" title="Definir como principal">★</button>
        <button type="button" data-outboard-photo-up="${index}" title="Mover para esquerda" ${index === 0 ? 'disabled' : ''}>←</button>
        <button type="button" data-outboard-photo-down="${index}" title="Mover para direita" ${index === outboardDraft.photos.length - 1 ? 'disabled' : ''}>→</button>
        <button type="button" class="danger" data-outboard-photo-remove="${index}" title="Excluir foto">×</button>
      </div>
    </div>`;
  }

  function outboardPlanRow(plan, index) {
    return `<div class="plan-admin-row" data-outboard-plan-index="${index}">
      <label class="field"><span>Prazo / parcelas</span><input data-outboard-plan-field="installments" type="number" min="1" inputmode="numeric" value="${plan.installments || ''}" placeholder="Ex.: 36" required></label>
      <label class="field"><span>Valor da parcela</span><input data-outboard-plan-field="installment_value" type="text" inputmode="decimal" value="${escapeHtml(formatBRMoney(plan.installment_value))}" placeholder="Ex.: 1.245,55" required></label>
      <label class="field"><span>Destaque opcional</span><input data-outboard-plan-field="label" value="${escapeHtml(plan.label || '')}" placeholder="Ex.: Mais escolhido"></label>
      <label class="field compact-field"><span>Status</span><select data-outboard-plan-field="active"><option value="true" ${plan.active !== false ? 'selected' : ''}>Ativo</option><option value="false" ${plan.active === false ? 'selected' : ''}>Oculto</option></select></label>
      <div class="order-buttons"><button type="button" data-outboard-plan-up="${index}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-outboard-plan-down="${index}" ${index === outboardDraft.plans.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="danger" data-outboard-plan-remove="${index}">🗑</button></div>
    </div>`;
  }

  function renderOutboardDraft() {
    const gallery = document.getElementById('outboardPhotoAdminGrid');
    const plans = document.getElementById('outboardPlanAdminRows');
    if (gallery) gallery.innerHTML = outboardDraft.photos.length ? outboardDraft.photos.map(outboardPhotoCard).join('') : '<div class="empty-gallery">Nenhuma foto cadastrada. Adicione as fotos do motor.</div>';
    if (plans) plans.innerHTML = outboardDraft.plans.length ? outboardDraft.plans.map(outboardPlanRow).join('') : '<div class="empty-gallery">Nenhum plano cadastrado. Você pode adicionar o prazo que quiser.</div>';
  }

  function openOutboardModal(id = null, plansOnly = false) {
    const current = id ? outboardData.motors.find((motor) => motor.id === id) : null;
    outboardDraft = {
      ...(current || { id: crypto.randomUUID(), name: '', horsepower: '', year_model: new Date().getFullYear().toString(), description: '', active: true, featured: false, sort_order: outboardData.motors.length + 1 }),
      isNew: !current,
      plansOnly,
      photos: current ? photosFor(current.id).map((photo) => ({ ...photo })) : [],
      plans: current ? plansFor(current.id).map((plan) => ({ ...plan })) : [],
      removedPhotos: [],
    };

    modalRoot.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="Editar motor de popa"><form id="outboardMotorForm" class="modal-box wide-modal">
      <div class="modal-header"><div><span class="section-kicker">${plansOnly ? 'PLANOS DE CONSÓRCIO' : 'MOTOR DE POPA'}</span><h2>${current ? `Editar ${escapeHtml(current.name)}` : 'Novo motor de popa'}</h2></div><button type="button" class="close-button" data-outboard-close aria-label="Fechar">×</button></div>
      ${plansOnly ? '' : `<section class="editor-section"><h3>Dados gerais</h3><div class="form-grid">
        <label class="field"><span>Nome do motor</span><input name="name" value="${escapeHtml(outboardDraft.name)}" required></label>
        <label class="field"><span>Potência</span><input name="horsepower" value="${escapeHtml(outboardDraft.horsepower || '')}" placeholder="Ex.: 40 HP" required></label>
        <label class="field"><span>Ano/Modelo</span><input name="year_model" value="${escapeHtml(outboardDraft.year_model || '')}" required></label>
        <label class="field"><span>Status</span><select name="active"><option value="true" ${outboardDraft.active ? 'selected' : ''}>Ativo</option><option value="false" ${!outboardDraft.active ? 'selected' : ''}>Oculto</option></select></label>
        <label class="check-field"><input name="featured" type="checkbox" ${outboardDraft.featured ? 'checked' : ''}><span>Mostrar como destaque</span></label>
        <label class="field"><span>Ordem</span><input name="sort_order" type="number" min="0" value="${Number(outboardDraft.sort_order || 0)}"></label>
        <label class="field full"><span>Descrição completa</span><textarea name="description" rows="5" placeholder="Descrição do motor">${escapeHtml(outboardDraft.description || '')}</textarea></label>
      </div></section>
      <section class="editor-section"><div class="editor-title"><div><h3>Galeria de fotos</h3><p>Adicione várias fotos, escolha a principal e organize a ordem.</p></div><label class="btn ghost file-button">+ Adicionar fotos<input id="outboardPhotoInput" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple></label></div><div id="outboardPhotoAdminGrid" class="photo-admin-grid"></div></section>`}
      <section class="editor-section"><div class="editor-title"><div><h3>Planos de Consórcio</h3><p>Cadastre qualquer prazo e qualquer valor de parcela.</p></div><button type="button" class="btn ghost" data-outboard-add-plan>+ Novo plano</button></div><div id="outboardPlanAdminRows" class="plan-admin-list"></div></section>
      <div class="modal-actions sticky-actions"><button type="button" class="btn ghost" data-outboard-close>Cancelar</button><button type="submit" class="btn primary">Salvar alterações</button></div>
    </form></div>`;
    renderOutboardDraft();
  }

  function closeOutboardModal() {
    outboardDraft?.photos?.forEach((photo) => { if (photo.preview) URL.revokeObjectURL(photo.preview); });
    outboardDraft = null;
    modalRoot.innerHTML = '';
  }

  function syncOutboardPlanFields() {
    if (!outboardDraft) return;
    modalRoot.querySelectorAll('[data-outboard-plan-index]').forEach((row) => {
      const index = Number(row.dataset.outboardPlanIndex);
      const plan = outboardDraft.plans[index];
      if (!plan) return;
      row.querySelectorAll('[data-outboard-plan-field]').forEach((input) => {
        const field = input.dataset.outboardPlanField;
        if (field === 'installments') plan[field] = Number(input.value);
        else if (field === 'installment_value') plan[field] = parseBRMoney(input.value);
        else if (field === 'active') plan[field] = input.value === 'true';
        else plan[field] = input.value.trim();
      });
    });
  }

  function showBusy(button, busy, label = 'Salvando…') {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = label;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || 'Salvar alterações';
      button.disabled = false;
    }
  }

  async function saveOutboardMotor(form, submitButton) {
    syncOutboardPlanFields();
    if (outboardDraft.plans.some((plan) => !Number.isInteger(Number(plan.installments)) || Number(plan.installments) <= 0 || !Number.isFinite(Number(plan.installment_value)) || Number(plan.installment_value) <= 0)) {
      return toast('Confira os prazos e os valores das parcelas.', 'error');
    }

    const formData = new FormData(form);
    const values = outboardDraft.plansOnly ? null : {
      name: String(formData.get('name') || '').trim(),
      horsepower: String(formData.get('horsepower') || '').trim(),
      year_model: String(formData.get('year_model') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      active: formData.get('active') === 'true',
      featured: formData.get('featured') === 'on',
      sort_order: Number(formData.get('sort_order') || 0),
    };
    if (values && (!values.name || !values.horsepower || !values.year_model)) return toast('Preencha nome, potência e ano/modelo.', 'error');

    showBusy(submitButton, true);
    try {
      const motorId = outboardDraft.id;
      if (!outboardDraft.plansOnly) {
        if (outboardDraft.isNew) await api.insert('outboard_motors', [{ id: motorId, ...values }]);
        else await api.update('outboard_motors', motorId, values);
      }

      await api.rpc('replace_outboard_motor_plans', {
        p_motor_id: motorId,
        p_plans: outboardDraft.plans.map((plan, index) => ({
          installments: Number(plan.installments),
          installment_value: Number(plan.installment_value),
          label: String(plan.label || '').trim(),
          active: plan.active !== false,
          sort_order: index + 1,
        })),
      });

      if (!outboardDraft.plansOnly) {
        await Promise.all(outboardDraft.removedPhotos.map(async (photo) => {
          if (photo.path) await deleteOutboardImage(photo.path).catch(() => {});
          if (photo.id) await api.remove('outboard_motor_photos', photo.id).catch(() => {});
        }));

        if (outboardDraft.photos.length && !outboardDraft.photos.some((photo) => photo.is_primary)) outboardDraft.photos[0].is_primary = true;
        for (let index = 0; index < outboardDraft.photos.length; index += 1) {
          const photo = outboardDraft.photos[index];
          if (photo.file) {
            const uploaded = await uploadOutboardImage(photo.file, motorId);
            await api.insert('outboard_motor_photos', [{ id: crypto.randomUUID(), motor_id: motorId, url: uploaded.url, path: uploaded.path, is_primary: Boolean(photo.is_primary), sort_order: index + 1 }]);
          } else if (photo.id) {
            await api.update('outboard_motor_photos', photo.id, { is_primary: Boolean(photo.is_primary), sort_order: index + 1 });
          }
        }
      }

      const wasPlansOnly = outboardDraft.plansOnly;
      closeOutboardModal();
      await loadOutboardData();
      await renderOutboard();
      toast(wasPlansOnly ? 'Planos salvos com sucesso.' : 'Motor e planos salvos com sucesso.');
    } catch (error) {
      showBusy(submitButton, false);
      toast(error.message, 'error');
    }
  }

  async function deleteOutboardMotor(id) {
    const motor = outboardData.motors.find((item) => item.id === id);
    if (!motor || !confirm(`Excluir o motor “${motor.name}” e todos os seus planos?`)) return;
    try {
      await Promise.all(photosFor(id).map((photo) => photo.path ? deleteOutboardImage(photo.path).catch(() => {}) : Promise.resolve()));
      await api.remove('outboard_motors', id);
      await loadOutboardData();
      await renderOutboard();
      toast('Motor excluído.');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function enhanceMotoMoneyInputs(scope = modalRoot) {
    scope.querySelectorAll?.('[data-plan-field="installment_value"]').forEach((input) => {
      if (input.dataset.brMoneyEnhanced) return;
      input.dataset.brMoneyEnhanced = 'true';
      input.type = 'text';
      input.inputMode = 'decimal';
      input.removeAttribute('min');
      input.removeAttribute('step');
      input.placeholder = 'Ex.: 1.245,55';
      input.value = formatBRMoney(input.value);
      input.addEventListener('blur', () => {
        const parsed = parseBRMoney(input.value);
        if (Number.isFinite(parsed)) input.value = formatBRMoney(parsed);
      });
    });
  }

  function normalizeMotoMoneyInputs() {
    modalRoot.querySelectorAll('[data-plan-field="installment_value"]').forEach((input) => {
      const parsed = parseBRMoney(input.value);
      if (Number.isFinite(parsed)) input.value = String(parsed);
    });
  }

  root.addEventListener('click', (event) => {
    const restoredTab = event.target.closest('[data-restored-tab="outboard"]');
    if (restoredTab) {
      event.preventDefault();
      renderOutboard();
      return;
    }
    if (event.target.closest('[data-tab]')) root.querySelector('[data-restored-tab="outboard"]')?.classList.remove('active');
  });

  root.addEventListener('click', (event) => {
    const add = event.target.closest('[data-outboard-new]');
    const edit = event.target.closest('[data-outboard-edit]');
    const plans = event.target.closest('[data-outboard-plans]');
    const remove = event.target.closest('[data-outboard-delete]');
    if (add) openOutboardModal();
    else if (edit) openOutboardModal(edit.dataset.outboardEdit);
    else if (plans) openOutboardModal(plans.dataset.outboardPlans, true);
    else if (remove) deleteOutboardMotor(remove.dataset.outboardDelete);
  });

  modalRoot.addEventListener('submit', async (event) => {
    if (event.target.id !== 'outboardMotorForm') return;
    event.preventDefault();
    await saveOutboardMotor(event.target, event.submitter || event.target.querySelector('[type="submit"]'));
  });

  modalRoot.addEventListener('change', (event) => {
    if (event.target.id !== 'outboardPhotoInput' || !outboardDraft) return;
    const files = [...event.target.files];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      outboardDraft.photos.push({ tempId: crypto.randomUUID(), file, preview: URL.createObjectURL(file), is_primary: outboardDraft.photos.length === 0 });
    }
    event.target.value = '';
    renderOutboardDraft();
  });

  modalRoot.addEventListener('click', (event) => {
    if (!outboardDraft) return;
    if (event.target.classList?.contains('modal')) {
      closeOutboardModal();
      return;
    }
    const close = event.target.closest('[data-outboard-close]');
    const addPlan = event.target.closest('[data-outboard-add-plan]');
    const photoMain = event.target.closest('[data-outboard-photo-main]');
    const photoUp = event.target.closest('[data-outboard-photo-up]');
    const photoDown = event.target.closest('[data-outboard-photo-down]');
    const photoRemove = event.target.closest('[data-outboard-photo-remove]');
    const planUp = event.target.closest('[data-outboard-plan-up]');
    const planDown = event.target.closest('[data-outboard-plan-down]');
    const planRemove = event.target.closest('[data-outboard-plan-remove]');

    if (close) {
      closeOutboardModal();
    } else if (addPlan) {
      syncOutboardPlanFields();
      outboardDraft.plans.push({ id: crypto.randomUUID(), installments: '', installment_value: '', label: '', active: true, sort_order: outboardDraft.plans.length + 1 });
      renderOutboardDraft();
    } else if (photoMain) {
      outboardDraft.photos.forEach((photo, index) => { photo.is_primary = index === Number(photoMain.dataset.outboardPhotoMain); });
      renderOutboardDraft();
    } else if (photoUp || photoDown) {
      const source = photoUp || photoDown;
      const index = Number(photoUp ? source.dataset.outboardPhotoUp : source.dataset.outboardPhotoDown);
      const target = index + (photoUp ? -1 : 1);
      if (target >= 0 && target < outboardDraft.photos.length) {
        [outboardDraft.photos[index], outboardDraft.photos[target]] = [outboardDraft.photos[target], outboardDraft.photos[index]];
        renderOutboardDraft();
      }
    } else if (photoRemove) {
      const index = Number(photoRemove.dataset.outboardPhotoRemove);
      const removed = outboardDraft.photos.splice(index, 1)[0];
      if (removed?.id) outboardDraft.removedPhotos.push(removed);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      if (outboardDraft.photos.length && !outboardDraft.photos.some((photo) => photo.is_primary)) outboardDraft.photos[0].is_primary = true;
      renderOutboardDraft();
    } else if (planUp || planDown) {
      syncOutboardPlanFields();
      const source = planUp || planDown;
      const index = Number(planUp ? source.dataset.outboardPlanUp : source.dataset.outboardPlanDown);
      const target = index + (planUp ? -1 : 1);
      if (target >= 0 && target < outboardDraft.plans.length) {
        [outboardDraft.plans[index], outboardDraft.plans[target]] = [outboardDraft.plans[target], outboardDraft.plans[index]];
        renderOutboardDraft();
      }
    } else if (planRemove) {
      syncOutboardPlanFields();
      outboardDraft.plans.splice(Number(planRemove.dataset.outboardPlanRemove), 1);
      renderOutboardDraft();
    }
  });

  modalRoot.addEventListener('blur', (event) => {
    const input = event.target.closest?.('[data-outboard-plan-field="installment_value"]');
    if (!input) return;
    const parsed = parseBRMoney(input.value);
    if (Number.isFinite(parsed)) input.value = formatBRMoney(parsed);
  }, true);

  // O editor antigo usava valor monetário brasileiro. Esta captura normaliza
  // somente no instante em que o admin.js precisa converter o campo para Number().
  modalRoot.addEventListener('submit', (event) => {
    if (event.target.id === 'motoForm') normalizeMotoMoneyInputs();
  }, true);

  modalRoot.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="add-plan"],[data-plan-up],[data-plan-down],[data-plan-remove]')) normalizeMotoMoneyInputs();
  }, true);

  const observer = new MutationObserver(() => {
    ensureOutboardTab();
    ensureDashboardOutboardCard();
    enhanceMotoMoneyInputs();
  });
  observer.observe(root, { childList: true, subtree: true });
  observer.observe(modalRoot, { childList: true, subtree: true });

  ensureOutboardTab();
  ensureDashboardOutboardCard();
  enhanceMotoMoneyInputs();
})();
