/* Tour Gastronômico de Maués · Jornada de abertura
   A vinheta do Tour é dividida em capítulos. Cada avanço de rolagem leva ao próximo
   capítulo e o vídeo toca aquele trecho sozinho, suave e em Full HD, até a próxima parada.
   Para voltar, os quadros leves (assets/seq/m) tocam o trecho de trás para frente. */
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

  /* Capítulos: em que ponto da rolagem começam e em que quadro do vídeo param */
  const CHAPTERS = [
    { from: 0, frame: 0 },       // abertura: rio parado
    { from: 0.1, frame: 47 },    // voo rasante pelo rio
    { from: 0.32, frame: 71 },   // sobe e mostra a cidade
    { from: 0.54, frame: 104 },  // ingredientes
    { from: 0.76, frame: LAST }, // logo e chamada final
  ];
  const chapterAt = (p) => { let c = 0; CHAPTERS.forEach((ch, i) => { if (p >= ch.from) c = i; }); return c; };

  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const steps = $$('[data-jstep]');
  const routeFill = $('[data-jroute-fill]');
  const stops = $$('[data-jstop]');
  const hint = $('[data-jhint]');
  const dots = $$('[data-jdot]');

  /* ---------- Vídeo (avanço) ---------- */
  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  const webm = video.canPlayType('video/webm; codecs="vp9"') === 'probably';
  video.src = `assets/video/vinheta-${MOBILE ? 720 : 1080}.${webm ? 'webm' : 'mp4'}`;
  video.load();
  const videoReady = () => video.readyState >= 3;

  /* ---------- Quadros leves (volta e reserva) ---------- */
  const SEQ = 96, STEP = 2;
  const seq = new Array(SEQ);
  const order = [];
  for (const gap of [8, 4, 2, 1]) for (let i = 0; i < SEQ; i += gap) if (!order.includes(i)) order.push(i);
  let nextLoad = 0, dirty = true;
  const pump = () => {
    if (nextLoad >= order.length) return;
    const i = order[nextLoad++];
    const im = new Image();
    im.decoding = 'async';
    im.onload = im.onerror = () => { if (im.naturalWidth) seq[i] = im; dirty = true; pump(); };
    im.src = `assets/seq/m/f${String(i).padStart(3, '0')}.webp`;
  };
  // os quadros leves começam a baixar depois que o vídeo pegou embalo
  setTimeout(() => { for (let k = 0; k < 3; k++) pump(); }, MOBILE ? 1500 : 600);
  const poster = new Image();
  poster.onload = () => { dirty = true; };
  poster.src = MOBILE ? 'assets/seq/poster-m.jpg' : 'assets/seq/poster.jpg';
  const seqFrame = (f) => {
    const i = clamp(Math.round(f / STEP), 0, SEQ - 1);
    for (let d = 0; d < SEQ; d++) { if (seq[i - d]) return seq[i - d]; if (seq[i + d]) return seq[i + d]; }
    return null;
  };

  /* ---------- Desenho em canvas (cobre a tela; na vertical, encolhe para o logo caber) ---------- */
  const BG = 'rgb(17,52,33)', BG0 = 'rgba(17,52,33,0)';
  let dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    dirty = true;
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

  /* ---------- Textos por quadro: aparecem quando o vídeo chega naquele trecho ---------- */
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
  }

  /* ---------- Controle: vai até o quadro do capítulo atual ---------- */
  let disp = 0;           // quadro mostrado
  let target = 0;         // quadro do capítulo
  let mode = 'idle';      // 'video' (avançando) | 'seq' (voltando ou sem vídeo) | 'idle'
  let showVideo = false;  // o último quadro desenhado veio do vídeo?

  function startForward() {
    if (!videoReady()) { mode = 'seq'; return; }
    const t = disp / FPS;
    if (Math.abs(video.currentTime - t) > 0.06) video.currentTime = t;
    mode = 'video';
    const p = video.play();
    if (p && p.catch) p.catch(() => { mode = 'seq'; });
  }

  function update(dt) {
    const want = CHAPTERS[chapterAt(progress())].frame;
    if (want !== target) {
      target = want;
      if (target > disp + 0.5) startForward();
      else if (target < disp - 0.5) { if (!video.paused) video.pause(); mode = 'seq'; showVideo = false; }
    }
    const remaining = target - disp;
    if (mode === 'video') {
      if (video.seeking) return;
      // trechos longos (rolou vários capítulos de uma vez) tocam mais rápido;
      // nos últimos quadros antes da parada, o vídeo desacelera
      const rate = clamp(Math.abs(remaining) / (FPS * 2.4), 1, 3);
      const ease = remaining < 10 ? lerp(0.55, 1, remaining / 10) : 1;
      const r = clamp(rate * ease, 0.5, 3);
      if (Math.abs(video.playbackRate - r) > 0.05) video.playbackRate = r;
      const vf = video.currentTime * FPS;
      if (vf >= disp - 1) { disp = Math.max(disp, vf); showVideo = true; }
      if (disp >= target - 0.25 || video.ended) {
        video.pause();
        disp = target; mode = 'idle';
      }
    } else if (mode === 'seq') {
      const dist = Math.abs(remaining);
      if (dist < 0.3) { disp = target; mode = 'idle'; return; }
      const speed = Math.max(FPS * 0.8, Math.min(FPS * 3, dist * 3.2));
      disp += Math.sign(remaining) * Math.min(dist, speed * dt);
      showVideo = false;
      dirty = true;
      if (remaining > 0 && videoReady() && dist > 6) startForward(); // vídeo ficou pronto: assume o avanço
    }
  }

  function render() {
    let ok = false;
    if (showVideo && video.readyState >= 2 && !video.seeking) ok = paint(video, disp);
    if (!ok) {
      const im = (disp < 1 && poster.naturalWidth) ? poster : (seqFrame(disp) || (poster.naturalWidth ? poster : null));
      if (im) paint(im, disp);
    }
    overlay(disp);
    if (hint) hint.style.opacity = String(1 - clamp(progress() / 0.04, 0, 1));
    const c = chapterAt(progress());
    dots.forEach((d, i) => d.classList.toggle('is-on', i === c));
  }

  /* ---------- Mouse / giroscópio: leve profundidade ---------- */
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

  /* ---------- Pontos de parada da rolagem (um por capítulo) ---------- */
  const snaps = $('[data-jsnaps]');
  if (snaps) {
    CHAPTERS.forEach((ch) => {
      const s = document.createElement('div');
      s.className = 'journey__snap';
      s.style.top = `calc((100% - 100vh) * ${ch.from ? ch.from + 0.03 : 0})`;
      snaps.appendChild(s);
    });
  }

  dots.forEach((d, i) => d.addEventListener('click', () => {
    const top = section.getBoundingClientRect().top + scrollY;
    const from = CHAPTERS[i].from ? CHAPTERS[i].from + 0.03 : 0;
    scrollTo({ top: top + (section.offsetHeight - innerHeight) * from, behavior: 'smooth' });
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

  // quem recarrega a página já rolada vê direto o capítulo certo
  disp = target = CHAPTERS[chapterAt(progress())].frame;
  start();
  root.classList.add('is-journey-ready');
})();
