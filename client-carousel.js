(function restoreMotoCarousel() {
  const app = document.getElementById('app');
  const api = window.CatalogApi;
  if (!app || !api) return;

  let timer = null;
  let current = 0;
  let slides = [];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));

  function installStyles() {
    if (document.getElementById('yamaha-carousel-style')) return;
    const style = document.createElement('style');
    style.id = 'yamaha-carousel-style';
    style.textContent = `
      .yamaha-line-carousel{margin:18px 0 30px;padding:34px 54px 28px;border:2px solid rgba(58,135,230,.45);border-radius:34px;background:radial-gradient(circle at 70% 55%,rgba(0,94,220,.42),transparent 36%),linear-gradient(135deg,#03152f 0%,#062657 56%,#031a3d 100%);overflow:hidden}
      .yamaha-line-carousel h2{text-align:center;letter-spacing:.32em;text-transform:uppercase;font-size:clamp(17px,2.2vw,29px);margin:0;color:#fff;font-weight:800}
      .yamaha-line-carousel .carousel-accent{width:265px;max-width:44%;height:8px;border-radius:99px;background:#ff1d3f;margin:28px auto 32px}
      .yamaha-carousel-stage{position:relative;border-radius:30px;overflow:hidden;background:linear-gradient(145deg,#01091d,#053b8e);aspect-ratio:16/8.8;min-height:260px}
      .yamaha-carousel-slide{position:absolute;inset:0;opacity:0;transition:opacity .45s ease;pointer-events:none;border:0;padding:0;background:transparent;width:100%}
      .yamaha-carousel-slide.active{opacity:1;pointer-events:auto}
      .yamaha-carousel-slide.single img{width:100%;height:100%;object-fit:contain;background:linear-gradient(135deg,#020a1e,#0750bb);display:block}
      .yamaha-carousel-group{position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr);align-items:end;gap:0;padding:42px 34px 30px;background:radial-gradient(circle at 70% 30%,rgba(0,123,255,.6),transparent 34%),linear-gradient(150deg,#02091d,#083d89 62%,#021531)}
      .yamaha-carousel-group img{width:100%;height:85%;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 16px 14px rgba(0,0,0,.35))}
      .yamaha-carousel-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:62px;height:112px;border-radius:30px;border:2px solid rgba(81,151,239,.55);background:#061a3e;color:#fff;font-size:54px;line-height:1;cursor:pointer}
      .yamaha-carousel-arrow.prev{left:18px}.yamaha-carousel-arrow.next{right:18px}
      .yamaha-carousel-dots{display:flex;justify-content:center;gap:22px;margin-top:30px}
      .yamaha-carousel-dot{width:31px;height:31px;border-radius:50%;border:4px solid #4ba0fb;background:transparent;padding:0;cursor:pointer}
      .yamaha-carousel-dot.active{background:#2c96ff;box-shadow:0 0 0 8px rgba(44,150,255,.22)}
      @media(max-width:640px){
        .yamaha-line-carousel{padding:22px 14px 22px;border-radius:24px;margin-top:14px}
        .yamaha-line-carousel h2{letter-spacing:.18em;font-size:16px}
        .yamaha-line-carousel .carousel-accent{margin:18px auto 20px;height:5px}
        .yamaha-carousel-stage{aspect-ratio:4/3;min-height:230px;border-radius:20px}
        .yamaha-carousel-group{padding:26px 8px 16px;gap:0}
        .yamaha-carousel-group img{height:82%}
        .yamaha-carousel-arrow{width:44px;height:78px;border-radius:20px;font-size:34px}
        .yamaha-carousel-arrow.prev{left:7px}.yamaha-carousel-arrow.next{right:7px}
        .yamaha-carousel-dots{gap:13px;margin-top:20px}
        .yamaha-carousel-dot{width:18px;height:18px;border-width:3px}
        .yamaha-carousel-dot.active{box-shadow:0 0 0 5px rgba(44,150,255,.2)}
      }
    `;
    document.head.appendChild(style);
  }

  function chooseSlides(data) {
    const photosByMoto = new Map();
    (data.photos || []).slice().sort((a,b) => Number(b.is_primary)-Number(a.is_primary) || Number(a.sort_order)-Number(b.sort_order)).forEach((photo) => {
      if (!photosByMoto.has(photo.moto_id)) photosByMoto.set(photo.moto_id, photo.url);
    });

    const preferredNames = ['MT-03','FZ25','CROSSER','R15'];
    const preferred = [];
    preferredNames.forEach((term) => {
      const moto = (data.motos || []).find((item) => String(item.name || '').toUpperCase().includes(term) && photosByMoto.has(item.id));
      if (moto && !preferred.some((item) => item.id === moto.id)) preferred.push(moto);
    });

    const fallback = (data.motos || []).filter((moto) => photosByMoto.has(moto.id) && !preferred.some((item) => item.id === moto.id));
    const motos = [...preferred, ...fallback].slice(0,4);
    const group = { type:'group', motos:motos.map((moto) => ({ id:moto.id, name:moto.name, url:photosByMoto.get(moto.id) })) };
    const singles = motos.map((moto) => ({ type:'single', id:moto.id, name:moto.name, year:moto.year_model || '', url:photosByMoto.get(moto.id) }));
    return motos.length ? [group, ...singles] : [];
  }

  function renderSlide(slide, index) {
    if (slide.type === 'group') {
      return `<div class="yamaha-carousel-slide ${index===0?'active':''}" data-carousel-slide="${index}"><div class="yamaha-carousel-group">${slide.motos.map((moto) => `<img src="${escapeHtml(moto.url)}" alt="${escapeHtml(moto.name)}">`).join('')}</div></div>`;
    }
    return `<button type="button" class="yamaha-carousel-slide single ${index===0?'active':''}" data-carousel-slide="${index}" data-carousel-moto="${escapeHtml(slide.id)}" aria-label="Ver ${escapeHtml(slide.name)}"><img src="${escapeHtml(slide.url)}" alt="${escapeHtml(slide.name)}"></button>`;
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
        ${slides.map(renderSlide).join('')}
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
  observer.observe(app, { childList:true, subtree:true });

  async function start() {
    try {
      installStyles();
      slides = chooseSlides(await api.getCatalog(false));
      renderCarousel();
    } catch (error) {
      console.error('Não foi possível restaurar o carrossel Yamaha.', error);
    }
  }

  start();
})();
