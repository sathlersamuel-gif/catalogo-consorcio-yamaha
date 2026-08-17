(function restoreMotoCarousel() {
  const app = document.getElementById('app');
  const api = window.CatalogApi;
  if (!app || !api) return;

  let timer = null;
  let current = 0;
  let slides = [];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));

  function installStyles() {
    if (document.getElementById('yamaha-carousel-style')) return;
    const style = document.createElement('style');
    style.id = 'yamaha-carousel-style';
    style.textContent = `
      .yamaha-line-carousel{margin:24px 0 28px;padding:24px;border:1px solid rgba(57,145,255,.45);border-radius:30px;background:linear-gradient(145deg,#061a3a,#072b62);overflow:hidden}
      .yamaha-line-carousel h2{text-align:center;letter-spacing:.28em;text-transform:uppercase;font-size:clamp(18px,2.3vw,28px);margin:0;color:#fff}
      .yamaha-line-carousel .carousel-accent{width:220px;max-width:42%;height:7px;border-radius:99px;background:#e6293f;margin:24px auto 28px}
      .yamaha-carousel-stage{position:relative;border-radius:28px;overflow:hidden;background:#020b1e;aspect-ratio:16/8.8;min-height:250px}
      .yamaha-carousel-slide{position:absolute;inset:0;opacity:0;transition:opacity .45s ease;pointer-events:none}
      .yamaha-carousel-slide.active{opacity:1;pointer-events:auto}
      .yamaha-carousel-slide img{width:100%;height:100%;object-fit:contain;background:linear-gradient(135deg,#03102d,#063c8f);display:block}
      .yamaha-carousel-caption{position:absolute;left:18px;right:18px;bottom:16px;display:flex;justify-content:space-between;align-items:end;gap:12px;padding:14px 16px;border-radius:16px;background:linear-gradient(90deg,rgba(2,12,31,.9),rgba(2,12,31,.35));color:#fff}
      .yamaha-carousel-caption strong{font-size:clamp(17px,2vw,23px)}
      .yamaha-carousel-caption span{font-size:13px;opacity:.8}
      .yamaha-carousel-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:58px;height:92px;border-radius:24px;border:2px solid rgba(92,161,255,.45);background:#071c43;color:#fff;font-size:42px;line-height:1;cursor:pointer}
      .yamaha-carousel-arrow.prev{left:14px}.yamaha-carousel-arrow.next{right:14px}
      .yamaha-carousel-dots{display:flex;justify-content:center;gap:16px;margin-top:24px}
      .yamaha-carousel-dot{width:20px;height:20px;border-radius:50%;border:3px solid #4b9ef7;background:transparent;padding:0;cursor:pointer}
      .yamaha-carousel-dot.active{background:#2c96ff;box-shadow:0 0 0 7px rgba(44,150,255,.2)}
      @media(max-width:640px){.yamaha-line-carousel{padding:16px 12px;border-radius:22px;margin-top:18px}.yamaha-line-carousel h2{letter-spacing:.16em}.yamaha-line-carousel .carousel-accent{margin:18px auto 20px;height:5px}.yamaha-carousel-stage{aspect-ratio:4/3;min-height:220px;border-radius:20px}.yamaha-carousel-arrow{width:44px;height:70px;border-radius:18px;font-size:32px}.yamaha-carousel-arrow.prev{left:7px}.yamaha-carousel-arrow.next{right:7px}.yamaha-carousel-caption{left:10px;right:10px;bottom:10px;padding:10px 12px}.yamaha-carousel-dots{gap:12px;margin-top:18px}.yamaha-carousel-dot{width:16px;height:16px}}
    `;
    document.head.appendChild(style);
  }

  function chooseSlides(data) {
    const photosByMoto = new Map();
    (data.photos || []).slice().sort((a,b) => Number(b.is_primary)-Number(a.is_primary) || Number(a.sort_order)-Number(b.sort_order)).forEach((photo) => {
      if (!photosByMoto.has(photo.moto_id)) photosByMoto.set(photo.moto_id, photo.url);
    });
    const motos = (data.motos || []).filter((moto) => photosByMoto.has(moto.id));
    motos.sort((a,b) => Number(b.featured)-Number(a.featured) || Number(a.sort_order)-Number(b.sort_order));
    return motos.slice(0,5).map((moto) => ({ id:moto.id, name:moto.name, year:moto.year_model || '', url:photosByMoto.get(moto.id) }));
  }

  function renderCarousel() {
    if (!slides.length || app.querySelector('[data-yamaha-carousel]')) return;
    const main = app.querySelector('main.wrap');
    const catalog = app.querySelector('#catalogo');
    if (!main || !catalog) return;

    const section = document.createElement('section');
    section.className = 'yamaha-line-carousel';
    section.dataset.yamahaCarousel = 'true';
    section.innerHTML = `
      <h2>Conheça a Linha Yamaha</h2>
      <div class="carousel-accent"></div>
      <div class="yamaha-carousel-stage">
        ${slides.map((slide,index)=>`<button type="button" class="yamaha-carousel-slide ${index===0?'active':''}" data-carousel-slide="${index}" data-carousel-moto="${escapeHtml(slide.id)}" aria-label="Ver ${escapeHtml(slide.name)}"><img src="${escapeHtml(slide.url)}" alt="${escapeHtml(slide.name)}"><span class="yamaha-carousel-caption"><strong>${escapeHtml(slide.name)}</strong><span>${escapeHtml(slide.year)}</span></span></button>`).join('')}
        <button type="button" class="yamaha-carousel-arrow prev" data-carousel-prev aria-label="Anterior">‹</button>
        <button type="button" class="yamaha-carousel-arrow next" data-carousel-next aria-label="Próxima">›</button>
      </div>
      <div class="yamaha-carousel-dots">${slides.map((_,index)=>`<button type="button" class="yamaha-carousel-dot ${index===0?'active':''}" data-carousel-dot="${index}" aria-label="Ir para imagem ${index+1}"></button>`).join('')}</div>`;
    main.insertBefore(section, catalog);
    show(0);
    startTimer();
  }

  function show(index) {
    if (!slides.length) return;
    current = (index + slides.length) % slides.length;
    app.querySelectorAll('[data-carousel-slide]').forEach((el,i)=>el.classList.toggle('active', i===current));
    app.querySelectorAll('[data-carousel-dot]').forEach((el,i)=>el.classList.toggle('active', i===current));
  }

  function startTimer() {
    clearInterval(timer);
    if (slides.length > 1) timer = setInterval(() => show(current + 1), 3500);
  }

  app.addEventListener('click', (event) => {
    if (event.target.closest('[data-carousel-prev]')) { show(current - 1); startTimer(); return; }
    if (event.target.closest('[data-carousel-next]')) { show(current + 1); startTimer(); return; }
    const dot = event.target.closest('[data-carousel-dot]');
    if (dot) { show(Number(dot.dataset.carouselDot)); startTimer(); return; }
    const slide = event.target.closest('[data-carousel-moto]');
    if (slide) {
      const id = slide.dataset.carouselMoto;
      const target = app.querySelector(`[data-moto-id="${CSS.escape(id)}"]`);
      if (target) target.click();
    }
  });

  const observer = new MutationObserver(() => renderCarousel());
  observer.observe(app, {childList:true, subtree:true});

  async function start() {
    try {
      installStyles();
      const data = await api.getCatalog(false);
      slides = chooseSlides(data);
      renderCarousel();
    } catch (error) {
      console.error('Não foi possível restaurar o carrossel Yamaha.', error);
    }
  }

  start();
})();
