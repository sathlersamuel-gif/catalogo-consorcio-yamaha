(function restoreMotoCarousel() {
  const app = document.getElementById('app');
  if (!app) return;

  let timer = null;
  let current = 0;
  const slides = [
    'assets/carousel-final-1.webp?v=20260817-2125',
    'assets/carousel-final-2.webp?v=20260817-2125',
    'assets/carousel-final-4.webp?v=20260817-2125',
    'assets/carousel-extra-5.webp?v=20260817-2145',
  ];

  function installStyles() {
    if (document.getElementById('yamaha-carousel-style')) return;
    const style = document.createElement('style');
    style.id = 'yamaha-carousel-style';
    style.textContent = `
      .yamaha-line-carousel{margin:18px 0 30px;padding:34px 54px 28px;border:2px solid rgba(58,135,230,.45);border-radius:34px;background:radial-gradient(circle at 70% 55%,rgba(0,94,220,.42),transparent 36%),linear-gradient(135deg,#03152f 0%,#062657 56%,#031a3d 100%);overflow:hidden}
      .yamaha-line-carousel h2{text-align:center;letter-spacing:.32em;text-transform:uppercase;font-size:clamp(17px,2.2vw,29px);margin:0;color:#fff;font-weight:800}
      .yamaha-line-carousel .carousel-accent{width:265px;max-width:44%;height:8px;border-radius:99px;background:#ff1d3f;margin:28px auto 32px}
      .yamaha-carousel-stage{position:relative;border-radius:30px;overflow:hidden;background:#02091d;aspect-ratio:16/9;min-height:260px}
      .yamaha-carousel-slide{position:absolute;inset:0;opacity:0;transition:opacity .45s ease;pointer-events:none;border:0;padding:0;background:transparent;width:100%;height:100%}
      .yamaha-carousel-slide.active{opacity:1;pointer-events:auto}
      .yamaha-carousel-slide img{width:100%;height:100%;object-fit:cover;display:block}
      .yamaha-carousel-dots{display:flex;justify-content:center;gap:22px;margin-top:30px}
      .yamaha-carousel-dot{width:31px;height:31px;border-radius:50%;border:4px solid #4ba0fb;background:transparent;padding:0;cursor:pointer}
      .yamaha-carousel-dot.active{background:#2c96ff;box-shadow:0 0 0 8px rgba(44,150,255,.22)}
      @media(max-width:640px){
        .yamaha-line-carousel{padding:22px 14px 22px;border-radius:24px;margin-top:14px}
        .yamaha-line-carousel h2{letter-spacing:.18em;font-size:16px}
        .yamaha-line-carousel .carousel-accent{margin:18px auto 20px;height:5px}
        .yamaha-carousel-stage{aspect-ratio:16/9;min-height:0;border-radius:20px}
        .yamaha-carousel-dots{gap:13px;margin-top:20px}
        .yamaha-carousel-dot{width:18px;height:18px;border-width:3px}
        .yamaha-carousel-dot.active{box-shadow:0 0 0 5px rgba(44,150,255,.2)}
      }
    `;
    document.head.appendChild(style);
  }

  function renderCarousel() {
    if (app.querySelector('[data-yamaha-carousel]')) return;
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
        ${slides.map((url, index) => `<div class="yamaha-carousel-slide ${index === 0 ? 'active' : ''}" data-carousel-slide="${index}"><img src="${url}" alt="Linha Yamaha ${index + 1}"></div>`).join('')}
      </div>
      <div class="yamaha-carousel-dots">${slides.map((_, index) => `<button type="button" class="yamaha-carousel-dot ${index === 0 ? 'active' : ''}" data-carousel-dot="${index}" aria-label="Ir para imagem ${index + 1}"></button>`).join('')}</div>`;
    main.insertBefore(section, catalog);
    show(0);
    startTimer();
  }

  function show(index) {
    current = (index + slides.length) % slides.length;
    app.querySelectorAll('[data-carousel-slide]').forEach((el, i) => el.classList.toggle('active', i === current));
    app.querySelectorAll('[data-carousel-dot]').forEach((el, i) => el.classList.toggle('active', i === current));
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => show(current + 1), 3500);
  }

  app.addEventListener('click', (event) => {
    const dot = event.target.closest('[data-carousel-dot]');
    if (dot) {
      show(Number(dot.dataset.carouselDot));
      startTimer();
    }
  });

  new MutationObserver(renderCarousel).observe(app, { childList: true, subtree: true });
  installStyles();
  renderCarousel();
})();
