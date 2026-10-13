/* Tour Gastronômico de Maués · Jornada de abertura
   A vinheta 3D do Tour vira uma sequência de quadros controlada pelo scroll:
   rolar para baixo avança o voo pelo rio até Maués, rolar para cima volta. */
(() => {
  const root = document.documentElement;
  const section = document.querySelector('[data-journey]');
  if (!section || !root.classList.contains('has-journey')) return;

  const $ = (s) => section.querySelector(s);
  const $$ = (s) => [...section.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* Quadros: computador recebe todos (24 fps); celular recebe um a cada dois, menores */
  const MOBILE = innerWidth <= 900 || matchMedia('(pointer: coarse)').matches;
  const DIR = MOBILE ? 'assets/seq/m/' : 'assets/seq/d/';
  const COUNT = MOBILE ? 96 : 192;
  const STEP = MOBILE ? 2 : 1; // quadro do vídeo original = índice * STEP
  const src = (i) => `${DIR}f${String(i).padStart(3, '0')}.webp`;

  /* Mapa scroll → quadro do vídeo (0–191): o rio e a chegada a Maués ganham mais rolagem */
  const MAP = [[0, 0], [0.3, 47], [0.52, 71], [0.74, 111], [0.88, 136], [1, 191]];
  const frameAt = (p) => {
    for (let i = 1; i < MAP.length; i++) {
      if (p <= MAP[i][0]) {
        const [p0, f0] = MAP[i - 1], [p1, f1] = MAP[i];
        return lerp(f0, f1, (p - p0) / (p1 - p0));
      }
    }
    return 191;
  };

  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const steps = $$('[data-jstep]');
  const routeFill = $('[data-jroute-fill]');
  const stops = $$('[data-jstop]');
  const hint = $('[data-jhint]');
  const loader = $('[data-jloader]');

  /* ---------- Carregamento progressivo: primeiro um quadro a cada 8, depois o resto ---------- */
  const imgs = new Array(COUNT);
  let loaded = 0;
  const order = [];
  for (const gap of [8, 4, 2, 1]) for (let i = 0; i < COUNT; i += gap) if (!order.includes(i)) order.push(i);
  let next = 0;
  const pump = () => {
    if (next >= order.length) return;
    const i = order[next++];
    const im = new Image();
    im.decoding = 'async';
    im.onload = im.onerror = () => {
      if (im.naturalWidth) { imgs[i] = im; loaded++; }
      if (loader) loader.style.transform = `scaleX(${loaded / COUNT})`;
      if (loaded === COUNT && loader) loader.parentElement.classList.add('is-done');
      need = true;
      pump();
    };
    im.src = src(i);
  };
  for (let k = 0; k < (MOBILE ? 4 : 6); k++) pump();

  // quadro carregado mais próximo do pedido (enquanto o resto ainda chega)
  const nearest = (i) => {
    for (let d = 0; d < COUNT; d++) {
      if (imgs[i - d]) return imgs[i - d];
      if (imgs[i + d]) return imgs[i + d];
    }
    return null;
  };

  /* ---------- Desenho ---------- */
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, MOBILE ? 2 : 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    need = true;
  };

  const BG = 'rgb(17,52,33)', BG0 = 'rgba(17,52,33,0)';
  function draw(f, t) {
    const idx = clamp(Math.round(f / STEP), 0, COUNT - 1);
    const im = nearest(idx);
    if (!im) return;
    const iw = im.naturalWidth, ih = im.naturalHeight;
    const cw = canvas.width, ch = canvas.height;
    const cover = Math.max(cw / iw, ch / ih);
    // em tela vertical, a partir dos ingredientes a imagem encolhe para o logo caber inteiro
    const portrait = ch > cw * 1.05;
    let s = cover;
    if (portrait) {
      const fit = Math.min(cw / (iw * 0.62), cover);
      s = lerp(cover, fit, smooth(clamp((f - 60) / 16, 0, 1)));
    }
    // leve zoom de "respiração" e deslocamento com o mouse para dar profundidade
    s *= 1.03 + Math.sin(t * 0.4) * 0.006;
    // no fim, afasta um pouco e sobe o logo para abrir espaço aos botões
    const endK = smooth(clamp((f - 138) / 30, 0, 1));
    s *= 1 - (portrait ? 0.05 : 0.2) * endK;
    const dw = iw * s, dh = ih * s;
    const lift = (portrait ? ch * 0.07 * smooth(clamp((f - 60) / 16, 0, 1)) : 0) + ch * (portrait ? 0.02 : 0.09) * endK;
    const x = (cw - dw) / 2 - look.x * 14 * dpr, y = (ch - dh) / 2 - look.y * 10 * dpr - lift;
    ctx.globalAlpha = 1;
    const shrunk = s < cover;
    if (shrunk) {
      // fundo no verde da própria cena; a imagem entra com bordas esfumadas
      ctx.fillStyle = BG; ctx.fillRect(0, 0, cw, ch);
    }
    ctx.drawImage(im, x, y, dw, dh);
    if (shrunk) {
      const fd = Math.min(dh * 0.18, 90 * dpr);
      const fadeEdge = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, BG); g.addColorStop(1, BG0); ctx.fillStyle = g; ctx.fillRect(0, Math.min(y0, y1), cw, Math.abs(y1 - y0)); };
      if (y > 0) fadeEdge(y, y + fd);
      if (y + dh < ch) fadeEdge(y + dh, y + dh - fd);
      const fw = Math.min(dw * 0.1, 70 * dpr);
      const fadeSide = (x0, x1) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, BG); g.addColorStop(1, BG0); ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), ch); };
      if (x > 0) fadeSide(x, x + fw);
      if (x + dw < cw) fadeSide(x + dw, x + dw - fw);
    }
  }

  /* ---------- Textos e rota ---------- */
  function overlay(p) {
    steps.forEach((el) => {
      const a = +el.dataset.in, b = +el.dataset.out;
      const fi = a <= 0 ? 1 : clamp((p - a) / 0.03, 0, 1), fo = b >= 1 ? 1 : clamp((b - p) / 0.03, 0, 1);
      const v = Math.min(fi, fo);
      el.style.opacity = v.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - fi) * 36 - (1 - fo) * 36).toFixed(1)}px, 0)`;
      el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
      el.classList.toggle('is-active', v > 0.5);
    });
    if (routeFill) routeFill.style.transform = `scaleX(${clamp(p / 0.52, 0, 1)})`;
    stops.forEach((s) => s.classList.toggle('is-on', p >= +s.dataset.jstop));
    section.classList.toggle('is-final', p > 0.86);
    if (hint) hint.style.opacity = String(1 - clamp(p / 0.04, 0, 1));
  }

  /* ---------- Mouse / giroscópio ---------- */
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    look.tx = (e.clientX / innerWidth) * 2 - 1;
    look.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    look.tx = clamp(e.gamma / 30, -1, 1);
    look.ty = clamp((e.beta - 45) / 30, -1, 1);
  }, { passive: true });

  /* ---------- Loop ---------- */
  let visible = true, running = false, need = true, fS = 0, last = performance.now();
  const progress = () => {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight), 0, 1);
  };
  function frame(now) {
    if (!visible) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const p = progress();
    const target = frameAt(p);
    fS += (target - fS) * Math.min(1, dt * 9);
    look.x += (look.tx - look.x) * Math.min(1, dt * 4);
    look.y += (look.ty - look.y) * Math.min(1, dt * 4);
    draw(fS, now / 1000);
    overlay(p);
  }
  const start = () => { if (running || !visible) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  addEventListener('resize', resize);
  resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { rootMargin: '120px 0px' }).observe(section);
  fS = frameAt(progress());
  overlay(progress());
  start();
  root.classList.add('is-journey-ready');
})();
