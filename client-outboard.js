(function restoreOutboardCatalog() {
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modalRoot');
  const config = window.CATALOG_CONFIG || {};
  if (!app || !modalRoot) return;

  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const publishableKey = String(config.supabasePublishableKey || config.supabaseAnonKey || '');
  const placeholder = 'assets/placeholder-moto.svg';
  let motors = [];
  let photos = [];
  let plans = [];
  let settings = { seller_name: 'Samuel Yamaha', whatsapp: '' };
  let homeSnapshot = '';
  let renderingMotor = false;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));

  const money = (value) => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });

  async function list(table, query) {
    const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
      headers: { apikey: publishableKey },
    });
    if (!response.ok) throw new Error(`Falha ao carregar ${table}`);
    return response.json();
  }

  function photosFor(motorId) {
    return photos
      .filter((photo) => photo.motor_id === motorId)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || Number(a.sort_order) - Number(b.sort_order));
  }

  function plansFor(motorId) {
    return plans
      .filter((plan) => plan.motor_id === motorId && plan.active !== false)
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || Number(a.installments) - Number(b.installments));
  }

  function minimumPlan(motorId) {
    const motorPlans = plansFor(motorId);
    return motorPlans.length
      ? motorPlans.reduce((best, current) => Number(current.installment_value) < Number(best.installment_value) ? current : best)
      : null;
  }

  function currentMotorId() {
    return new URLSearchParams(location.hash.slice(1)).get('motor');
  }

  function renderOutboardSection() {
    if (renderingMotor || !motors.length) return;
    const catalog = app.querySelector('#catalogo');
    if (!catalog || catalog.querySelector('[data-outboard-section]')) return;

    const section = document.createElement('section');
    section.dataset.outboardSection = 'true';
    section.className = 'outboard-catalog-section';
    section.innerHTML = `
      <div class="section-title motos-heading">
        <div><span class="section-kicker">LINHA NÁUTICA</span><h2>Motores de Popa</h2></div>
        <span class="result-count">${motors.length} ${motors.length === 1 ? 'item' : 'itens'}</span>
      </div>
      <div class="grid motos">
        ${motors.map((motor) => {
          const photo = photosFor(motor.id)[0]?.url || placeholder;
          const min = minimumPlan(motor.id);
          return `<article class="card moto-card">
            <button class="moto-photo-button" data-outboard-id="${escapeHtml(motor.id)}" aria-label="Abrir detalhes de ${escapeHtml(motor.name)}">
              <img src="${escapeHtml(photo)}" alt="${escapeHtml(motor.name)}" onerror="this.src='${placeholder}'">
              ${motor.featured ? '<span class="featured-tag">Destaque</span>' : ''}
            </button>
            <div class="moto-card-body">
              <span class="moto-category">Motores de Popa</span>
              <h3>${escapeHtml(motor.name)}</h3>
              ${min ? `<small>A partir de</small><strong class="price">${money(min.installment_value)}</strong>` : '<small>Consulte os planos disponíveis</small>'}
              <button class="btn primary full" data-outboard-id="${escapeHtml(motor.id)}">Ver detalhes</button>
            </div>
          </article>`;
        }).join('')}
      </div>`;
    catalog.appendChild(section);
    homeSnapshot = app.innerHTML;
  }

  function renderMotor(motorId) {
    const motor = motors.find((item) => item.id === motorId);
    if (!motor) return;
    if (!homeSnapshot && app.querySelector('#catalogo')) homeSnapshot = app.innerHTML;

    renderingMotor = true;
    const motorPhotos = photosFor(motor.id);
    const motorPlans = plansFor(motor.id);
    const minimum = minimumPlan(motor.id);
    const firstPhoto = motorPhotos[0]?.url || placeholder;

    app.innerHTML = `<main class="wrap detail-page" data-outboard-detail="${escapeHtml(motor.id)}">
      <button class="btn ghost back-button" data-outboard-action="back">← Voltar para o catálogo</button>
      <div class="detail-layout">
        <section class="gallery-card card">
          <button class="main-photo-button" data-outboard-action="open-gallery" aria-label="Abrir galeria de fotos">
            <img id="outboardMainPhoto" class="gallery-main" src="${escapeHtml(firstPhoto)}" alt="${escapeHtml(motor.name)}" onerror="this.src='${placeholder}'">
            ${motorPhotos.length ? '<span class="expand-photo">⛶ Ver galeria</span>' : ''}
          </button>
          ${motorPhotos.length > 1 ? `<div class="thumbs" aria-label="Miniaturas das fotos">${motorPhotos.map((photo, index) => `<button class="thumb ${index === 0 ? 'active' : ''}" data-outboard-photo-url="${escapeHtml(photo.url)}"><img src="${escapeHtml(photo.url)}" alt="Foto ${index + 1} de ${escapeHtml(motor.name)}"></button>`).join('')}</div>` : ''}
        </section>

        <section class="moto-information">
          <div class="card information-card">
            <div class="moto-meta"><span>Motores de Popa</span><span>${escapeHtml(motor.year_model || '')}</span></div>
            <h1>${escapeHtml(motor.name)}</h1>
            <p>${escapeHtml(motor.description || 'Descrição em atualização.')}</p>
          </div>
          <div class="plans-header"><span class="section-kicker">ESCOLHA SUA PARCELA</span><h2>Planos de Consórcio</h2></div>
          <div class="plans-list">
            ${motorPlans.length ? motorPlans.map((plan) => {
              const isMinimum = minimum?.id === plan.id;
              return `<article class="plan-card card ${isMinimum ? 'best' : ''}">
                <div class="plan-quantity"><strong>${Number(plan.installments)}x</strong>${isMinimum ? '<span class="tag blue">Menor parcela</span>' : ''}${plan.label ? `<span class="tag red-tag">${escapeHtml(plan.label)}</span>` : ''}</div>
                <div class="plan-price"><strong>${money(plan.installment_value)}</strong><small>por parcela</small></div>
                <button class="btn whatsapp" data-outboard-plan="${escapeHtml(plan.id)}">Quero este plano</button>
              </article>`;
            }).join('') : '<div class="card empty-state"><strong>Planos em atualização.</strong><span>Fale com o vendedor para consultar as condições.</span></div>'}
          </div>
          <p class="legal-note">Consulte condições, disponibilidade e regras do consórcio.</p>
        </section>
      </div>
    </main>`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function restoreHome() {
    history.replaceState(null, '', location.pathname + location.search);
    renderingMotor = false;
    if (homeSnapshot) {
      app.innerHTML = homeSnapshot;
      renderOutboardSection();
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      location.reload();
    }
  }

  function openGallery(motorId, selectedUrl) {
    const motor = motors.find((item) => item.id === motorId);
    const motorPhotos = photosFor(motorId);
    if (!motor || !motorPhotos.length) return;
    const selectedIndex = Math.max(0, motorPhotos.findIndex((photo) => photo.url === selectedUrl));
    modalRoot.innerHTML = `<div class="modal gallery-modal" role="dialog" aria-modal="true" aria-label="Galeria de ${escapeHtml(motor.name)}" data-outboard-modal>
      <div class="gallery-viewer">
        <div class="gallery-viewer-top"><strong>${escapeHtml(motor.name)}</strong><button class="close-button" data-outboard-action="close-modal" aria-label="Fechar galeria">×</button></div>
        <img id="outboardGalleryImage" src="${escapeHtml(motorPhotos[selectedIndex].url)}" alt="${escapeHtml(motor.name)}">
        <div class="gallery-strip">${motorPhotos.map((photo, index) => `<button class="gallery-strip-item ${index === selectedIndex ? 'active' : ''}" data-outboard-gallery-photo="${escapeHtml(photo.url)}"><img src="${escapeHtml(photo.url)}" alt="Foto ${index + 1}"></button>`).join('')}</div>
      </div>
    </div>`;
  }

  function openWhatsapp(planId) {
    const plan = plans.find((item) => item.id === planId);
    const motor = plan && motors.find((item) => item.id === plan.motor_id);
    const phone = String(settings.whatsapp || '').replace(/\D/g, '');
    if (!plan || !motor || !phone) return;
    const message = `Olá! Tenho interesse no ${motor.name}. Escolhi o plano de ${plan.installments}x de ${money(plan.installment_value)}. Gostaria de mais informações.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  app.addEventListener('click', (event) => {
    const motorButton = event.target.closest('[data-outboard-id]');
    const planButton = event.target.closest('[data-outboard-plan]');
    const thumb = event.target.closest('[data-outboard-photo-url]');
    const action = event.target.closest('[data-outboard-action]');

    if (motorButton) {
      const motorId = motorButton.dataset.outboardId;
      history.replaceState(null, '', `#motor=${encodeURIComponent(motorId)}`);
      renderMotor(motorId);
    } else if (planButton) {
      openWhatsapp(planButton.dataset.outboardPlan);
    } else if (thumb) {
      const mainPhoto = document.getElementById('outboardMainPhoto');
      if (mainPhoto) mainPhoto.src = thumb.dataset.outboardPhotoUrl;
      app.querySelectorAll('[data-outboard-photo-url]').forEach((item) => item.classList.remove('active'));
      thumb.classList.add('active');
    } else if (action?.dataset.outboardAction === 'back') {
      restoreHome();
    } else if (action?.dataset.outboardAction === 'open-gallery') {
      const motorId = currentMotorId();
      openGallery(motorId, document.getElementById('outboardMainPhoto')?.src);
    }
  });

  modalRoot.addEventListener('click', (event) => {
    const modal = event.target.closest('[data-outboard-modal]');
    if (!modal) return;
    const close = event.target.closest('[data-outboard-action="close-modal"]');
    const photo = event.target.closest('[data-outboard-gallery-photo]');
    if (close || event.target === modal) {
      modalRoot.innerHTML = '';
      return;
    }
    if (photo) {
      const image = document.getElementById('outboardGalleryImage');
      if (image) image.src = photo.dataset.outboardGalleryPhoto;
      modalRoot.querySelectorAll('[data-outboard-gallery-photo]').forEach((item) => item.classList.remove('active'));
      photo.classList.add('active');
    }
  });

  const observer = new MutationObserver(() => {
    if (!renderingMotor) renderOutboardSection();
  });
  observer.observe(app, { childList: true, subtree: true });

  async function start() {
    try {
      if (!baseUrl || !publishableKey) return;
      const [motorRows, photoRows, planRows, settingRows] = await Promise.all([
        list('outboard_motors', 'select=*&active=eq.true&order=sort_order.asc,name.asc'),
        list('outboard_motor_photos', 'select=*&order=sort_order.asc'),
        list('outboard_motor_plans', 'select=*&active=eq.true&order=sort_order.asc,installments.asc'),
        list('catalog_settings', 'select=id,seller_name,whatsapp&limit=1'),
      ]);
      motors = motorRows;
      photos = photoRows;
      plans = planRows;
      settings = settingRows[0] || settings;

      const motorId = currentMotorId();
      if (motorId && motors.some((motor) => motor.id === motorId)) {
        if (app.querySelector('#catalogo')) homeSnapshot = app.innerHTML;
        renderMotor(motorId);
      } else {
        renderOutboardSection();
      }
    } catch (error) {
      console.error('Não foi possível restaurar a área de motores de popa.', error);
    }
  }

  start();
})();
