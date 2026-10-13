/* Tour Gastronômico de Maués · Jornada de abertura
   Cada movimento de rolagem move a vinheta na hora. O vídeo "persegue" a posição da
   rolagem: para frente, o próprio vídeo toca (Full HD, fluido), mais rápido quando a
   rolagem é rápida e desacelerando até parar quando ela para. Para trás, quadros leves
   (assets/seq/m) voltam suavemente. */
(() => {
  const root = document.documentElement;
  const section = document.querySelector('[data-journey]');
  if (!section || !root.classList.contains('has-journey')) return;

  const $ = (s) => section.querySelector(s);
  const $$ = (s) => [...section.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  const FPS = 24, LAST = 191;
  const MOBILE = innerWidth <= 900 || matchMedia('(pointer: coarse)').matches;

  /* Ritmo: quanto de rolagem cada trecho ganha (posição da rolagem → quadro do vídeo) */
  const MAP = [[0, 0], [0.28, 47], [0.48, 71], [0.7, 104], [0.86, 140], [1, LAST]];
  const frameAt = (p) => {
    for (let i = 1; i < MAP.length; i++) {
      if (p <= MAP[i][0]) { const [p0, f0] = MAP[i - 1], [p1, f1] = MAP[i]; return lerp(f0, f1, (p - p0) / (p1 - p0)); }
    }
    return LAST;
  };
  const progressFor = (f) => {
    for (let i = 1; i < MAP.length; i++) {
      if (f <= MAP[i][1]) { const [p0, f0] = MAP[i - 1], [p1, f1] = MAP[i]; return lerp(p0, p1, (f - f0) / (f1 - f0)); }
    }
    return 1;
  };
  /* Partes da viagem, para o indicador lateral (quadro em que cada uma fica em destaque) */
  const PARTS = [0, 40, 70, 102, 170];

  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const steps = $$('[data-jstep]');
  const routeFill = $('[data-jroute-fill]');
  const stops = $$('[data-jstop]');
  const hint = $('[data-jhint]');
  const dots = $$('[data-jdot]');

  /* ---------- Vídeo (para frente) ---------- */
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  const webm = video.canPlayType('video/webm; codecs="vp9"') === 'probably';
  video.src = `assets/video/vinheta-${MOBILE ? 720 : 1080}.${webm ? 'webm' : 'mp4'}`;
  video.load();
  const videoReady = () => video.readyState >= 3;

  /* ---------- Quadros leves (para trás e enquanto o vídeo carrega) ---------- */
  const SEQ = 96, STEP = 2;
  const seq = new Array(SEQ);
  const order = [];
  for (const gap of [8, 4, 2, 1]) for (let i = 0; i < SEQ; i += gap) if (!order.includes(i)) order.push(i);
  let nextLoad = 0;
  const pump = () => {
    if (nextLoad >= order.length) return;
    const i = order[nextLoad++];
    const im = new Image();
    im.decoding = 'async';
    im.onload = im.onerror = () => { if (im.naturalWidth) seq[i] = im; pump(); };
    im.src = `assets/seq/m/f${String(i).padStart(3, '0')}.webp`;
  };
  setTimeout(() => { for (let k = 0; k < 3; k++) pump(); }, MOBILE ? 1200 : 500);
  const poster = new Image();
  poster.src = MOBILE ? 'assets/seq/poster-m.jpg' : 'assets/seq/poster.jpg';
  const seqFrame = (f) => {
    const i = clamp(Math.round(f / STEP), 0, SEQ - 1);
    for (let d = 0; d < SEQ; d++) { if (seq[i - d]) return seq[i - d]; if (seq[i + d]) return seq[i + d]; }
    return null;
  };

  /* ---------- Desenho (cobre a tela; na vertical, encolhe para o logo caber) ---------- */
  const BG = 'rgb(17,52,33)', BG0 = 'rgba(17,52,33,0)';
  let dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  };
  const look = { x: 0, y: 0, tx: 0, ty: 0 };

  function paint(src, f) {
    const iw = src.videoWidth || src.naturalWidth, ih = src.videoHeight || src.naturalHeight;
    if (!iw) return false;
    const cw = canvas.width, ch = canvas.height;
    const cover = Math.max(cw / iw, ch / ih);
    const portrait = ch > cw * 1.05;
    const fitK = portrait ? smooth(clamp((f - 60) / 16, 0, 1)) : 0;
    const endK = smooth(clamp((f - 138) / 30, 0, 1));
    let s = portrait ? lerp(cover, Math.min(cw / (iw * 0.62), cover), fitK) : cover;
    s *= 1.03 * (1 - (portrait ? 0.05 : 0.2) * endK);
    const dw = iw * s, dh = ih * s;
    const lift = (portrait ? ch * 0.07 * fitK : 0) + ch * (portrait ? 0.02 : 0.09) * endK;
    const x = (cw - dw) / 2 - look.x * 12 * dpr, y = (ch - dh) / 2 - look.y * 8 * dpr - lift;
    const shrunk = s < cover;
    if (shrunk) { ctx.fillStyle = BG; ctx.fillRect(0, 0, cw, ch); }
    ctx.drawImage(src, x, y, dw, dh);
    if (shrunk) {
      const grad = (x0, y0, x1, y1, rx, ry, rw, rh) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, BG); g.addColorStop(1, BG0); ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh); };
      const fd = Math.min(dh * 0.18, 90 * dpr), fw = Math.min(dw * 0.1, 70 * dpr);
      if (y > 0) grad(0, y, 0, y + fd, 0, y, cw, fd);
      if (y + dh < ch) grad(0, y + dh, 0, y + dh - fd, 0, y + dh - fd, cw, fd);
      if (x > 0) grad(x, 0, x + fw, 0, x, 0, fw, ch);
      if (x + dw < cw) grad(x + dw, 0, x + dw - fw, 0, x + dw - fw, 0, fw, ch);
    }
    return true;
  }

  /* ---------- Textos por quadro ---------- */
  function overlay(f) {
    steps.forEach((el) => {
      const a = +el.dataset.fin, b = +el.dataset.fout;
      const fi = a <= 0 ? 1 : clamp((f - a) / 8, 0, 1), fo = b >= LAST ? 1 : clamp((b - f) / 8, 0, 1);
      const v = Math.min(fi, fo);
      el.style.opacity = v.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - fi) * 30 - (1 - fo) * 30).toFixed(1)}px, 0)`;
      el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
      el.classList.toggle('is-active', v > 0.5);
    });
    if (routeFill) routeFill.style.transform = `scaleX(${clamp(f / 71, 0, 1)})`;
    stops.forEach((s) => s.classList.toggle('is-on', f >= +s.dataset.jstop));
    section.classList.toggle('is-final', f > 150);
    let part = 0; PARTS.forEach((pf, i) => { if (f >= pf - 4) part = i; });
    dots.forEach((d, i) => d.classList.toggle('is-on', i === part));
  }

  /* ---------- Perseguição: o vídeo vai atrás da rolagem ---------- */
  let disp = 0;            // quadro mostrado
  let fromVideo = false;   // o quadro mostrado veio do vídeo?
  let rate = 1;

  function update(dt) {
    const target = frameAt(progress());
    const gap = target - disp;

    if (gap > 0.8 && videoReady()) {
      // para frente: o vídeo toca, com velocidade proporcional à distância (alcança em ~0,4 s)
      if (video.paused) {
        if (!fromVideo || Math.abs(video.currentTime * FPS - disp) > 1.5) video.currentTime = disp / FPS;
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      }
      const want = clamp(gap / (FPS * 0.4), 0.3, 4);
      rate += (want - rate) * Math.min(1, dt * 8);
      if (Math.abs(video.playbackRate - rate) > 0.04) video.playbackRate = rate;
      if (!video.seeking) {
        const vf = video.currentTime * FPS;
        if (vf >= disp - 1) { disp = Math.min(Math.max(disp, vf), LAST); fromVideo = true; }
      }
      return;
    }

    if (!video.paused) { video.pause(); rate = 1; }

    if (gap > 0.8) {
      // vídeo ainda carregando: avança pelos quadros leves
      disp += gap * Math.min(1, dt * 6);
      fromVideo = false;
    } else if (gap < -0.8) {
      // para trás: volta suave pelos quadros leves
      disp += gap * Math.min(1, dt * 7);
      fromVideo = false;
    }
  }

  function render() {
    let ok = false;
    if (fromVideo && video.readyState >= 2 && !video.seeking) ok = paint(video, disp);
    if (!ok) {
      const im = (disp < 1 && poster.naturalWidth) ? poster : (seqFrame(disp) || (poster.naturalWidth ? poster : null));
      if (im) paint(im, disp);
    }
    overlay(disp);
    if (hint) hint.style.opacity = String(1 - clamp(progress() / 0.03, 0, 1));
  }

  /* ---------- Mouse / giroscópio ---------- */
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

  /* Indicador lateral: clicar leva àquela parte da viagem */
  dots.forEach((d, i) => d.addEventListener('click', () => {
    const top = section.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + (section.offsetHeight - innerHeight) * progressFor(PARTS[i] + (i ? 4 : 0)), behavior: 'smooth' });
  }));

  /* ---------- Loop ---------- */
  const progress = () => {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight), 0, 1);
  };
  let visible = true, running = false, last = performance.now();
  function frame(now) {
    if (!visible) { running = false; if (!video.paused) video.pause(); return; }
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    look.x += (look.tx - look.x) * Math.min(1, dt * 4);
    look.y += (look.ty - look.y) * Math.min(1, dt * 4);
    update(dt);
    render();
  }
  const start = () => { if (running || !visible) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  addEventListener('resize', resize);
  resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { rootMargin: '120px 0px' }).observe(section);

  disp = frameAt(progress()); // quem recarrega a página já rolada vê o ponto certo
  start();
  root.classList.add('is-journey-ready');
})();
