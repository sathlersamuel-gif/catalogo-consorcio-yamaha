(function createClientApp() {
  const api = window.CatalogApi;
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modalRoot');
  const placeholder = 'assets/placeholder-moto.svg';
  let data = null;
  let selectedCategory = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));

  const money = (value) => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  });

  function toast(message) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.classList.add('show');
    window.setTimeout(() => element.classList.remove('show'), 2500);
  }

  function categoryById(id) {
    return data.categories.find((category) => category.id === id);
  }

  function photosFor(motoId) {
    return data.photos
      .filter((photo) => photo.moto_id === motoId)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  }

  function plansFor(motoId) {
    return data.plans
      .filter((plan) => plan.moto_id === motoId && plan.active !== false)
      .sort((a, b) => a.sort_order - b.sort_order || a.installments - b.installments);
  }

  function minimumPlan(motoId) {
    const plans = plansFor(motoId);
    return plans.length ? plans.reduce((best, current) => Number(current.installment_value) < Number(best.installment_value) ? current : best) : null;
  }

  function categoryVisual(category) {
    if (category.image_url) return `<img class="category-image" src="${escapeHtml(category.image_url)}" alt="">`;
    return `<span class="category-icon" aria-hidden="true">${escapeHtml(category.icon || '🏍️')}</span>`;
  }

  function renderHome() {
    const validCategories = new Set(data.categories.map((category) => category.id));
    const visibleMotos = data.motos.filter((moto) => validCategories.has(moto.category_id));
    const motos = selectedCategory ? visibleMotos.filter((moto) => moto.category_id === selectedCategory) : visibleMotos;
    const title = selectedCategory ? categoryById(selectedCategory)?.name || 'Motos' : 'Motos em destaque';

    app.innerHTML = `<main id="inicio" class="wrap">
      <section class="hero">
        <div>
          <span class="eyebrow">CATÁLOGO DE CONSÓRCIO</span>
          <h1>Encontre a Yamaha ideal para você</h1>
          <p>Veja motos, fotos, características e planos. Escolha sua parcela e fale diretamente com ${escapeHtml(data.settings.seller_name || 'o vendedor')}.</p>
          <a class="btn red" href="#catalogo">Ver motos</a>
        </div>
        <div class="hero-emblem" aria-hidden="true">🏍️</div>
      </section>

      <section id="catalogo" class="catalog-section">
        <div class="section-title">
          <div><span class="section-kicker">ESCOLHA SEU ESTILO</span><h2>Categorias</h2></div>
          ${selectedCategory ? '<button class="text-button" data-action="clear-category">Mostrar todas</button>' : ''}
        </div>
        <div class="grid categories">
          ${data.categories.map((category) => `<button class="card category-card ${selectedCategory === category.id ? 'selected' : ''}" data-category-id="${escapeHtml(category.id)}">
            ${categoryVisual(category)}
            <span class="category-copy"><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.description)}</small></span>
          </button>`).join('')}
        </div>

        <div class="section-title motos-heading">
          <div><span class="section-kicker">CATÁLOGO</span><h2>${escapeHtml(title)}</h2></div>
          <span class="result-count">${motos.length} ${motos.length === 1 ? 'moto' : 'motos'}</span>
        </div>
        <div class="grid motos">
          ${motos.length ? motos.map((moto) => {
            const photo = photosFor(moto.id)[0]?.url || placeholder;
            const category = categoryById(moto.category_id);
            const min = minimumPlan(moto.id);
            return `<article class="card moto-card">
              <button class="moto-photo-button" data-moto-id="${escapeHtml(moto.id)}" aria-label="Abrir detalhes de ${escapeHtml(moto.name)}">
                <img src="${escapeHtml(photo)}" alt="${escapeHtml(moto.name)}" onerror="this.src='${placeholder}'">
                ${moto.featured ? '<span class="featured-tag">Destaque</span>' : ''}
              </button>
              <div class="moto-card-body">
                <span class="moto-category">${escapeHtml(category?.name || '')}</span>
                <h3>${escapeHtml(moto.name)}</h3>
                ${min ? `<small>A partir de</small><strong class="price">${money(min.installment_value)}</strong>` : '<small>Consulte os planos disponíveis</small>'}
                <button class="btn primary full" data-moto-id="${escapeHtml(moto.id)}">Ver detalhes</button>
              </div>
            </article>`;
          }).join('') : '<div class="card empty-state"><strong>Nenhuma moto nesta categoria.</strong><span>Escolha outra categoria para continuar.</span></div>'}
        </div>
      </section>
    </main>`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderMoto(motoId) {
    const moto = data.motos.find((item) => item.id === motoId);
    if (!moto) return renderHome();
    const category = categoryById(moto.category_id);
    const photos = photosFor(moto.id);
    const plans = plansFor(moto.id);
    const minimum = minimumPlan(moto.id);
    const firstPhoto = photos[0]?.url || placeholder;

    app.innerHTML = `<main class="wrap detail-page">
      <button class="btn ghost back-button" data-action="back">← Voltar para as motos</button>
      <div class="detail-layout">
        <section class="gallery-card card">
          <button class="main-photo-button" data-action="open-gallery" aria-label="Abrir galeria de fotos">
            <img id="mainPhoto" class="gallery-main" src="${escapeHtml(firstPhoto)}" alt="${escapeHtml(moto.name)}" onerror="this.src='${placeholder}'">
            ${photos.length ? '<span class="expand-photo">⛶ Ver galeria</span>' : ''}
          </button>
          ${photos.length > 1 ? `<div class="thumbs" aria-label="Miniaturas das fotos">${photos.map((photo, index) => `<button class="thumb ${index === 0 ? 'active' : ''}" data-photo-url="${escapeHtml(photo.url)}"><img src="${escapeHtml(photo.url)}" alt="Foto ${index + 1} de ${escapeHtml(moto.name)}"></button>`).join('')}</div>` : ''}
        </section>

        <section class="moto-information">
          <div class="card information-card">
            <div class="moto-meta"><span>${escapeHtml(category?.name || '')}</span><span>${escapeHtml(moto.year_model || '')}</span></div>
            <h1>${escapeHtml(moto.name)}</h1>
            <p>${escapeHtml(moto.description || 'Descrição em atualização.')}</p>
          </div>
          <div class="plans-header"><span class="section-kicker">ESCOLHA SUA PARCELA</span><h2>Planos de Consórcio</h2></div>
          <div class="plans-list">
            ${plans.length ? plans.map((plan) => {
              const isMinimum = minimum?.id === plan.id;
              return `<article class="plan-card card ${isMinimum ? 'best' : ''}">
                <div class="plan-quantity"><strong>${Number(plan.installments)}x</strong>${isMinimum ? '<span class="tag blue">Menor parcela</span>' : ''}${plan.label ? `<span class="tag red-tag">${escapeHtml(plan.label)}</span>` : ''}</div>
                <div class="plan-price"><strong>${money(plan.installment_value)}</strong><small>por parcela</small></div>
                <button class="btn whatsapp" data-interest-plan="${escapeHtml(plan.id)}">Quero este plano</button>
              </article>`;
            }).join('') : '<div class="card empty-state"><strong>Planos em atualização.</strong><span>Fale com o vendedor para consultar as condições.</span></div>'}
          </div>
          <p class="legal-note">Consulte condições, disponibilidade e regras do consórcio.</p>
        </section>
      </div>
    </main>`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function openGallery(motoId, selectedUrl) {
    const moto = data.motos.find((item) => item.id === motoId);
    const photos = photosFor(motoId);
    if (!moto || !photos.length) return;
    const selectedIndex = Math.max(0, photos.findIndex((photo) => photo.url === selectedUrl));
    modalRoot.innerHTML = `<div class="modal gallery-modal" role="dialog" aria-modal="true" aria-label="Galeria de ${escapeHtml(moto.name)}">
      <div class="gallery-viewer">
        <div class="gallery-viewer-top"><strong>${escapeHtml(moto.name)}</strong><button class="close-button" data-action="close-modal" aria-label="Fechar galeria">×</button></div>
        <img id="galleryViewerImage" src="${escapeHtml(photos[selectedIndex].url)}" alt="${escapeHtml(moto.name)}">
        <div class="gallery-strip">${photos.map((photo, index) => `<button class="gallery-strip-item ${index === selectedIndex ? 'active' : ''}" data-gallery-photo="${escapeHtml(photo.url)}"><img src="${escapeHtml(photo.url)}" alt="Foto ${index + 1}"></button>`).join('')}</div>
      </div>
    </div>`;
  }

  function whatsappUrl(moto, plan) {
    const phone = String(data.settings.whatsapp || '').replace(/\D/g, '');
    const message = `Olá! Tenho interesse na ${moto.name}. Escolhi o plano de ${plan.installments}x de ${money(plan.installment_value)}. Gostaria de mais informações.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function registerInterest(planId) {
    const plan = data.plans.find((item) => item.id === planId);
    const moto = plan && data.motos.find((item) => item.id === plan.moto_id);
    if (!plan || !moto) return;
    if (!String(data.settings.whatsapp || '').replace(/\D/g, '')) {
      toast('O WhatsApp do vendedor ainda não foi configurado.');
      return;
    }
    window.open(whatsappUrl(moto, plan), '_blank', 'noopener,noreferrer');
    api.createLead({
      moto_id: moto.id,
      plan_id: plan.id,
      moto_name: moto.name,
      installments: Number(plan.installments),
      installment_value: Number(plan.installment_value),
    }).catch(() => toast('WhatsApp aberto. Não foi possível registrar o interesse.'));
  }

  app.addEventListener('click', (event) => {
    const categoryButton = event.target.closest('[data-category-id]');
    const motoButton = event.target.closest('[data-moto-id]');
    const interestButton = event.target.closest('[data-interest-plan]');
    const actionButton = event.target.closest('[data-action]');
    const thumb = event.target.closest('[data-photo-url]');

    if (categoryButton) {
      selectedCategory = categoryButton.dataset.categoryId;
      renderHome();
      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
    } else if (motoButton) {
      renderMoto(motoButton.dataset.motoId);
      history.replaceState(null, '', `#moto=${encodeURIComponent(motoButton.dataset.motoId)}`);
    } else if (interestButton) {
      registerInterest(interestButton.dataset.interestPlan);
    } else if (thumb) {
      document.getElementById('mainPhoto').src = thumb.dataset.photoUrl;
      document.querySelectorAll('.thumb').forEach((item) => item.classList.remove('active'));
      thumb.classList.add('active');
    } else if (actionButton?.dataset.action === 'back') {
      history.replaceState(null, '', location.pathname);
      renderHome();
    } else if (actionButton?.dataset.action === 'clear-category') {
      selectedCategory = null;
      renderHome();
    } else if (actionButton?.dataset.action === 'open-gallery') {
      const motoId = new URLSearchParams(location.hash.slice(1)).get('moto');
      openGallery(motoId, document.getElementById('mainPhoto')?.src);
    }
  });

  modalRoot.addEventListener('click', (event) => {
    const close = event.target.closest('[data-action="close-modal"]');
    const photo = event.target.closest('[data-gallery-photo]');
    if (close || event.target.classList.contains('modal')) modalRoot.innerHTML = '';
    if (photo) {
      document.getElementById('galleryViewerImage').src = photo.dataset.galleryPhoto;
      modalRoot.querySelectorAll('.gallery-strip-item').forEach((item) => item.classList.remove('active'));
      photo.classList.add('active');
    }
  });

  async function start() {
    try {
      data = await api.getCatalog(false);
      const motoFromHash = new URLSearchParams(location.hash.slice(1)).get('moto');
      if (motoFromHash && data.motos.some((moto) => moto.id === motoFromHash)) renderMoto(motoFromHash);
      else renderHome();
    } catch (error) {
      app.innerHTML = `<main class="wrap"><div class="card error-state"><h1>Não foi possível carregar o catálogo</h1><p>${escapeHtml(error.message)}</p><button class="btn primary" onclick="location.reload()">Tentar novamente</button></div></main>`;
    }
  }

  start();
})();
