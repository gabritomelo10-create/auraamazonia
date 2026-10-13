/* Tour Gastronômico de Maués · Jornada de abertura
   Fotos reais com profundidade (efeito "foto 3D"): cada foto tem um mapa de profundidade
   e se desloca em camadas conforme o scroll, o mouse ou o giroscópio do celular. */
(() => {
  const root = document.documentElement;
  const section = document.querySelector('[data-journey]');
  if (!section || !root.classList.contains('has-journey')) return;

  const $ = (s) => section.querySelector(s);
  const $$ = (s) => [...section.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = () => innerWidth <= 900;
  const IMG = 'assets/img/aura/';

  /* Interpola uma lista de [progresso, valor] com suavização entre os pontos */
  const kf = (pts, p) => {
    if (p <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (p <= pts[i][0]) {
        const [p0, v0] = pts[i - 1], [p1, v1] = pts[i];
        return lerp(v0, v1, smooth((p - p0) / (p1 - p0)));
      }
    }
    return pts[pts.length - 1][1];
  };
  const fade = ([a, b, c, d], p) => Math.min(a === b ? 1 : clamp((p - a) / (b - a), 0, 1), c === d ? 1 : clamp((d - p) / (d - c), 0, 1));

  /* Cenas: foto, quando aparece/some, zoom, ponto de foco, névoa de altitude e "deslocamento de câmera" */
  const SCENES = [
    { name: 'aereo-rio', alpha: [0, 0, 0.45, 0.51], focus: [0.62, 0.62],
      zoom: [[0, 1.06], [0.26, 1.1], [0.4, 1.35], [0.51, 1.75]],
      haze: [[0, 0.34], [0.24, 0.24], [0.4, 0.0]],
      dolly: [[0, -0.2], [0.51, 0.8]] },
    { name: 'barco-rio', alpha: [0.45, 0.51, 0.65, 0.71], focus: [0.37, 0.6],
      zoom: [[0.45, 1.08], [0.71, 1.7]], haze: [[0, 0]], dolly: [[0.45, -0.5], [0.71, 0.6]] },
    { name: 'praia-rio', alpha: [0.65, 0.71, 0.81, 0.87], focus: [0.36, 0.62],
      zoom: [[0.65, 1.08], [0.87, 1.32]], haze: [[0, 0]], dolly: [[0.65, -0.6], [0.87, 0.6]] },
    { name: 'cozinheiras', alpha: [0.81, 0.87, 1, 1], focus: [innerWidth > 900 ? 0.66 : 0.45, 0.45],
      zoom: [[0.81, 1.22], [1, 1.05]], haze: [[0, 0]], dolly: [[0.81, 0.5], [1, -0.2]] },
  ];

  const windowEl = $('[data-jwindow]');
  const clouds = $$('[data-jcloud]');
  const fruits = $$('[data-jfruit]');
  const steps = $$('[data-jstep]');
  const routeFill = $('[data-jroute-fill]');
  const stops = $$('[data-jstop]');
  const hint = $('[data-jhint]');
  const canvas = $('canvas');

  /* ---------- Ponteiro / giroscópio ---------- */
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    look.tx = (e.clientX / innerWidth) * 2 - 1;
    look.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    look.tx = clamp(e.gamma / 25, -1, 1);
    look.ty = clamp((e.beta - 45) / 25, -1, 1);
  }, { passive: true });

  /* ---------- Renderizador: WebGL com mapa de profundidade, ou CSS como reserva ---------- */
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: true });
  let draw;

  if (gl) {
    const vs = 'attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
    const fs = `precision mediump float;
      varying vec2 v;
      uniform sampler2D tex, dep;
      uniform vec2 view, img, focus, off;
      uniform float zoom, alpha, haze;
      uniform vec3 hazeCol;
      void main(){
        float s = max(view.x / img.x, view.y / img.y);
        vec2 ext = view / (img * s) / zoom;
        vec2 lo = ext * 0.5, hi = 1.0 - ext * 0.5;
        vec2 c = mix(lo, hi, clamp((focus - lo) / max(hi - lo, vec2(1e-4)), 0.0, 1.0));
        vec2 uv0 = c + (vec2(v.x, 1.0 - v.y) - 0.5) * ext;
        vec2 o = off * ext;
        float d1 = texture2D(dep, uv0).r;
        float d2 = texture2D(dep, uv0 + o * (d1 - 0.5)).r;
        vec2 uv = uv0 + o * ((d1 + d2) * 0.5 - 0.5);
        vec3 col = texture2D(tex, uv).rgb;
        col = mix(col, hazeCol, haze);
        gl_FragColor = vec4(col * alpha, alpha);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['tex', 'dep', 'view', 'img', 'focus', 'off', 'zoom', 'alpha', 'haze', 'hazeCol'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.tex, 0); gl.uniform1i(U.dep, 1);
    gl.uniform3f(U.hazeCol, 0.86, 0.9, 0.94);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const texFrom = (image) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      return t;
    };
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const suffix = small() ? '-m' : '';
    SCENES.forEach((sc, i) => {
      // a primeira cena carrega primeiro; as outras logo em seguida
      const go = () => Promise.all([load(`${IMG}${sc.name}${suffix}.jpg`), load(`${IMG}${sc.name}-depth.png`)])
        .then(([im, dp]) => { sc.tex = texFrom(im); sc.dep = texFrom(dp); sc.w = im.naturalWidth; sc.h = im.naturalHeight; requestFrame(); })
        .catch(() => {});
      i === 0 ? go() : setTimeout(go, 300 + i * 150);
    });

    draw = (p, t) => {
      const w = canvas.width, h = canvas.height;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0.06, 0.13, 0.1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.view, w, h);
      SCENES.forEach((sc) => {
        const a = fade(sc.alpha, p);
        if (a <= 0 || !sc.tex) return;
        const breathe = coarse ? Math.sin(t * 0.6) * 0.35 : 0;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sc.tex);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sc.dep);
        gl.uniform2f(U.img, sc.w, sc.h);
        gl.uniform2f(U.focus, sc.focus[0], sc.focus[1]);
        gl.uniform1f(U.zoom, kf(sc.zoom, p));
        gl.uniform1f(U.haze, kf(sc.haze, p));
        gl.uniform1f(U.alpha, a);
        gl.uniform2f(U.off, (look.x + breathe) * 0.05, (look.y * 0.6 + kf(sc.dolly, p)) * 0.05);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
    };
  } else {
    /* Reserva sem WebGL: as mesmas cenas como camadas CSS */
    canvas.remove();
    const holder = $('[data-jscenes]');
    const suffix = small() ? '-m' : '';
    SCENES.forEach((sc) => {
      const d = document.createElement('div');
      d.className = 'jscene';
      d.style.backgroundImage = `url(${IMG}${sc.name}${suffix}.jpg)`;
      d.style.transformOrigin = `${sc.focus[0] * 100}% ${sc.focus[1] * 100}%`;
      holder.appendChild(d);
      sc.el = d;
    });
    draw = (p) => {
      SCENES.forEach((sc) => {
        const a = fade(sc.alpha, p);
        sc.el.style.opacity = a.toFixed(3);
        sc.el.style.transform = `translate3d(${-look.x * 14}px, ${-look.y * 10}px, 0) scale(${kf(sc.zoom, p)})`;
      });
    };
  }

  /* ---------- Camadas por cima: janela, nuvens, guaranás, textos ---------- */
  function overlay(p, t) {
    // janela do avião: se aproxima e some entre 0.24 e 0.40
    const wz = clamp((p - 0.24) / 0.16, 0, 1);
    windowEl.style.transform = `translate(${-look.x * 10}px, ${-look.y * 6}px) scale(${1 + wz * wz * 7})`;
    windowEl.style.opacity = String(1 - smooth(clamp((wz - 0.55) / 0.45, 0, 1)));
    windowEl.style.visibility = wz >= 1 ? 'hidden' : 'visible';
    section.classList.toggle('is-cabin', p < 0.32);

    // nuvens: passam pela janela e "atravessamos" a camada ao descer
    clouds.forEach((c, i) => {
      const depth = [0.35, 0.7, 1.2][i] || 0.5;
      const pass = clamp((p - 0.18) / 0.24, 0, 1);
      const sc = 1 + pass * pass * (2.5 + depth * 2);
      const op = (1 - smooth(clamp((p - 0.3) / 0.12, 0, 1))) * [0.85, 0.75, 0.6][i];
      const drift = ((t * (6 + depth * 10)) % 200) - 100;
      c.style.opacity = op.toFixed(3);
      c.style.transform = `translate3d(${drift - look.x * 30 * depth}px, ${-look.y * 18 * depth + p * 260 * depth}px, 0) scale(${sc})`;
    });

    // guaranás reais flutuando na cena final, em profundidades diferentes
    const fa = clamp((p - 0.86) / 0.06, 0, 1);
    fruits.forEach((f, i) => {
      const depth = parseFloat(f.dataset.depth || '0.5');
      const bob = Math.sin(t * (0.8 + i * 0.2) + i) * 10 * depth;
      f.style.opacity = fa.toFixed(3);
      f.style.transform = `translate3d(${look.x * -40 * depth}px, ${(1 - fa) * 80 * depth + bob + look.y * -24 * depth}px, 0) rotate(${look.x * 8 * depth + Math.sin(t * 0.5 + i) * 4}deg)`;
    });

    steps.forEach((el) => {
      const a = +el.dataset.in, b = +el.dataset.out;
      const fi = a <= 0 ? 1 : clamp((p - a) / 0.03, 0, 1), fo = b >= 1 ? 1 : clamp((b - p) / 0.03, 0, 1);
      const v = Math.min(fi, fo);
      el.style.opacity = v.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - fi) * 36 - (1 - fo) * 36).toFixed(1)}px, 0)`;
      el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
      el.classList.toggle('is-active', v > 0.5);
    });

    if (routeFill) routeFill.style.transform = `scaleX(${clamp((p - 0.04) / 0.9, 0, 1)})`;
    stops.forEach((s) => s.classList.toggle('is-on', p >= +s.dataset.jstop));
    if (hint) hint.style.opacity = String(1 - clamp(p / 0.04, 0, 1));
  }

  /* ---------- Loop ---------- */
  let visible = true, running = false, pS = 0, last = performance.now();
  const progress = () => {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight), 0, 1);
  };
  const resize = () => {
    if (!gl) return;
    const dpr = Math.min(devicePixelRatio || 1, small() ? 1.5 : 1.75);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  };
  function frame(now) {
    if (!visible) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    const t = now / 1000;
    look.x += (look.tx - look.x) * Math.min(1, dt * 4);
    look.y += (look.ty - look.y) * Math.min(1, dt * 4);
    pS += (progress() - pS) * Math.min(1, dt * 7);
    draw(pS, t);
    overlay(pS, t);
  }
  function requestFrame() {
    if (running || !visible) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  addEventListener('resize', resize);
  resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestFrame(); }, { rootMargin: '120px 0px' }).observe(section);
  pS = progress();
  overlay(pS, 0);
  requestFrame();
  root.classList.add('is-journey-ready');
})();
