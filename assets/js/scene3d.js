/* Tour Gastronômico de Maués · cenas 3D
   1) Jornada: janela do avião → Manaus e Teatro Amazonas → viagem de barco pelo rio
   2) Guaranás 3D que seguem o mouse e reagem ao scroll */
import * as THREE from '../vendor/three.module.min.js';

const root = document.documentElement;
const isCoarse = matchMedia('(pointer: coarse)').matches;
const isSmall = matchMedia('(max-width: 860px)').matches;
const LITE = isCoarse || isSmall;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- Ponteiro compartilhado ---------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: innerWidth / 2, py: innerHeight / 2, active: false };
addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / innerWidth) * 2 - 1;
  pointer.ty = -((e.clientY / innerHeight) * 2 - 1);
  pointer.px = e.clientX; pointer.py = e.clientY; pointer.active = true;
}, { passive: true });

/* ---------- Velocidade do scroll ---------- */
let lastY = scrollY, scrollVel = 0;

/* ---------- Texturas desenhadas em canvas ---------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/* ==========================================================================
   GUARANÁ 3D
   ========================================================================== */
function makeGuarana(seg = 40) {
  const g = new THREE.Group();
  const open = 0.62; // abertura da casca
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xc9151e, roughness: 0.3, metalness: 0.05, side: THREE.DoubleSide });
  const shellGeo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75), 0, Math.PI * 2, open, Math.PI - open);
  shellGeo.rotateX(Math.PI / 2); // abertura virada para +z
  const shell = new THREE.Mesh(shellGeo, shellMat);
  shell.scale.set(1, 1.04, 1);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(Math.sin(open), 0.045, 10, seg), shellMat);
  rim.position.z = Math.cos(open);
  const aril = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, seg, Math.round(seg * 0.75)),
    new THREE.MeshStandardMaterial({ color: 0xf6f1e7, roughness: 0.55 }),
  );
  aril.position.z = 0.22;
  const seed = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, seg, Math.round(seg * 0.75)),
    new THREE.MeshStandardMaterial({ color: 0x0b0908, roughness: 0.12, metalness: 0.35 }),
  );
  seed.position.z = 0.66;
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  glint.position.set(0.15, 0.17, 1.09);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 0.55, 8),
    new THREE.MeshStandardMaterial({ color: 0x5b3a1e, roughness: 0.8 }),
  );
  stem.position.set(0, 0.25, -1.1);
  stem.rotation.x = -0.9;
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f7a3b, roughness: 0.6, flatShading: true }),
  );
  leaf.scale.set(0.35, 0.06, 1);
  leaf.position.set(0.3, 0.55, -1.25);
  leaf.rotation.set(-0.5, 0.4, 0.3);
  g.add(shell, rim, aril, seed, glint, stem, leaf);
  g.userData.seed = seed;
  return g;
}

/* ==========================================================================
   JORNADA
   ========================================================================== */
function initJourney() {
  const section = document.querySelector('[data-journey]');
  if (!section) return;
  const canvas = section.querySelector('canvas');
  const windowEl = section.querySelector('[data-jwindow]');
  const steps = [...section.querySelectorAll('[data-jstep]')];
  const routeFill = section.querySelector('[data-jroute-fill]');
  const routeStops = [...section.querySelectorAll('[data-jstop]')];
  const hint = section.querySelector('[data-jhint]');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LITE, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, LITE ? 1.25 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 9000);
  scene.add(camera);

  /* Rio: linha central sinuosa ao longo de -z */
  const RIVER_W = 150;
  const xr = (z) => 250 + 60 * Math.sin(z * 0.0021) + 22 * Math.sin(z * 0.0057 + 1.1);

  /* Céu */
  const sunDir = new THREE.Vector3(0.45, 0.2, -1).normalize();
  const skyU = {
    top: { value: new THREE.Color('#3f7fc4') },
    horizon: { value: new THREE.Color('#f3dcb6') },
    sunCol: { value: new THREE.Color('#ffd08a') },
    sunDir: { value: sunDir },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4200, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, horizon, sunCol, sunDir; varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 col = mix(horizon, top, smoothstep(-0.02, 0.55, h));
          col = mix(col, horizon * 0.8, smoothstep(0.0, -0.2, h));
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          col += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.45);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  scene.fog = new THREE.Fog(0xf3dcb6, 600, 3800);
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x2d4a22, 1.3));
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.2);
  sun.position.copy(sunDir).multiplyScalar(-1000).setY(800);
  scene.add(sun);

  /* Chão: floresta vista de cima, com o rio e a mancha urbana */
  const GW = 7000, GCZ = -1200;
  const groundTex = canvasTex(2048, 2048, (ctx, w, h) => {
    ctx.fillStyle = '#21492a'; ctx.fillRect(0, 0, w, h);
    const greens = ['#1d4226', '#2a5a31', '#305f2f', '#1a3a22', '#3b6b35', '#264f2b'];
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = greens[i % greens.length];
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, rand(2, 11), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const toPx = (x, z) => [((x + GW / 2) / GW) * w, ((z - GCZ + GW / 2) / GW) * h];
    // mancha urbana de Manaus
    const [cx, cy] = toPx(-40, 0);
    const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
    grd.addColorStop(0, '#cfc6b6'); grd.addColorStop(0.7, '#a9a18f'); grd.addColorStop(1, 'rgba(120,120,100,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, 120, 0, 7); ctx.fill();
    for (let i = 0; i < 900; i++) {
      const a = Math.random() * 7, r = Math.sqrt(Math.random()) * 105;
      ctx.fillStyle = ['#e9e2d2', '#d8c9b0', '#c8b5a0', '#bfc5c4'][i % 4];
      ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rand(1.5, 4), rand(1.5, 4));
    }
    // rio
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [col, extra] of [['#3b2c1a', 10], ['#5a4026', 0]]) {
      ctx.strokeStyle = col; ctx.lineWidth = (RIVER_W / GW) * w + extra;
      ctx.beginPath();
      for (let z = 2300; z >= -4700; z -= 25) { const [px, py] = toPx(xr(z), z); z === 2300 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke();
    }
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GW), new THREE.MeshLambertMaterial({ map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, GCZ);
  scene.add(ground);

  /* Água do rio (shader com ondas, reflexo do céu e brilho do sol) */
  const waterU = {
    time: { value: 0 },
    deep: { value: new THREE.Color('#4a3420') },
    skyCol: { value: new THREE.Color('#e9c9a0') },
    sunCol: { value: new THREE.Color('#fff0c8') },
    sunDir: { value: sunDir },
    fogColor: { value: new THREE.Color('#f3dcb6') },
    fogNear: { value: 600 }, fogFar: { value: 3800 },
  };
  const wGeo = new THREE.PlaneGeometry(RIVER_W + 30, 7000, 1, 700);
  wGeo.rotateX(-Math.PI / 2);
  const wp = wGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const z = wp.getZ(i) - 1200;
    wp.setZ(i, z);
    wp.setX(i, wp.getX(i) + xr(z));
  }
  wGeo.computeBoundingSphere();
  const water = new THREE.Mesh(wGeo, new THREE.ShaderMaterial({
    uniforms: waterU,
    vertexShader: `uniform float time; varying vec3 vW;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y += sin(w.x * 0.15 + time) * 0.12 + sin(w.z * 0.1 - time * 1.3) * 0.15;
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `uniform float time, fogNear, fogFar; uniform vec3 deep, skyCol, sunCol, sunDir, fogColor; varying vec3 vW;
      void main(){
        vec2 p = vW.xz; float t = time;
        float dx = cos(p.x * 0.15 + t) * 0.018 + cos(p.x * 0.45 + p.y * 0.3 + t * 2.1) * 0.05 + cos(p.x * 1.3 - p.y * 0.7 + t * 3.0) * 0.02;
        float dz = -cos(p.y * 0.1 - t * 1.3) * 0.015 + cos(p.y * 0.55 - p.x * 0.2 - t * 1.7) * 0.05 + cos(p.y * 1.1 + p.x * 0.9 - t * 2.6) * 0.02;
        vec3 N = normalize(vec3(-dx, 1.0, -dz));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 col = mix(deep, skyCol, 0.18 + 0.7 * fres);
        vec3 R = reflect(-V, N);
        col += sunCol * (pow(max(dot(R, sunDir), 0.0), 140.0) * 2.0 + pow(max(dot(R, sunDir), 0.0), 12.0) * 0.12);
        float d = length(cameraPosition - vW);
        col = mix(col, fogColor, smoothstep(fogNear, fogFar, d));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  water.position.y = 0.6;
  scene.add(water);

  /* Floresta: copas low-poly instanciadas */
  const treeGeo = new THREE.IcosahedronGeometry(1, 0);
  const treeMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const greens = ['#2e6b34', '#3d7d3a', '#24562b', '#4f8a3a', '#1f4a26', '#5c943f', '#2a6230'].map((c) => new THREE.Color(c));
  const nTrees = LITE ? 2600 : 5200;
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, nTrees);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  let ti = 0;
  const inCity = (x, z) => Math.hypot(x + 40, z) < 330;
  const placeTree = (x, z, s) => {
    e.set(rand(0, 3), rand(0, 6), rand(0, 3)); q.setFromEuler(e);
    const sy = s * rand(0.75, 1.25);
    m4.compose(v3.set(x, sy * 0.85, z), q, s3.set(s * rand(0.9, 1.2), sy, s * rand(0.9, 1.2)));
    trees.setMatrixAt(ti, m4);
    trees.setColorAt(ti, greens[(Math.random() * greens.length) | 0]);
    ti++;
  };
  const bankCount = Math.floor(nTrees * 0.68);
  while (ti < bankCount) {
    const z = rand(-3200, 400), side = Math.random() < 0.5 ? -1 : 1;
    const d = 6 + Math.pow(Math.random(), 1.6) * 220;
    const x = xr(z) + side * (RIVER_W / 2 + d);
    if (inCity(x, z)) continue;
    placeTree(x, z, d < 30 ? rand(5, 12) : rand(7, 15));
  }
  const cityTrees = ti + (LITE ? 120 : 260);
  while (ti < cityTrees) {
    const x = rand(-360, 300), z = rand(-330, 330);
    if (!inCity(x, z) || x > xr(z) - RIVER_W / 2 - 6 || (Math.abs(x) < 62 && z > -70 && z < 130)) continue;
    placeTree(x, z, rand(3.5, 6));
  }
  while (ti < nTrees) {
    const a = rand(0, Math.PI * 2), r = rand(340, 1500);
    const x = -40 + Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x - xr(z)) < RIVER_W / 2 + 8) continue;
    placeTree(x, z, rand(9, 20));
  }
  trees.instanceMatrix.needsUpdate = true;
  scene.add(trees);

  /* Palmeiras de açaí nas margens */
  const nPalms = LITE ? 160 : 320;
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 1, 5);
  trunkGeo.translate(0, 0.5, 0);
  const palmTrunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x8a7a5e }), nPalms);
  const crownGeo = new THREE.ConeGeometry(3.2, 2.2, 7, 1, true);
  crownGeo.rotateX(Math.PI);
  const palmCrowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ color: 0x3f7a35, flatShading: true, side: THREE.DoubleSide }), nPalms);
  for (let i = 0; i < nPalms; i++) {
    const z = rand(-3000, 200), side = Math.random() < 0.5 ? -1 : 1;
    const x = xr(z) + side * (RIVER_W / 2 + rand(3, 28));
    const h = rand(14, 24);
    m4.compose(v3.set(x, 0, z), q.identity(), s3.set(1, h, 1));
    palmTrunks.setMatrixAt(i, m4);
    e.set(rand(-0.2, 0.2), rand(0, 6), rand(-0.2, 0.2)); q.setFromEuler(e);
    m4.compose(v3.set(x, h + 0.6, z), q, s3.set(1, 1, 1));
    palmCrowns.setMatrixAt(i, m4);
  }
  scene.add(palmTrunks, palmCrowns);

  /* Casas ribeirinhas sobre palafitas */
  const nHouses = LITE ? 30 : 60;
  const houseGeo = new THREE.BoxGeometry(6, 4, 5); houseGeo.translate(0, 4, 0);
  const roofGeo = new THREE.ConeGeometry(4.8, 2.6, 4); roofGeo.rotateY(Math.PI / 4); roofGeo.translate(0, 7.3, 0);
  const houses = new THREE.InstancedMesh(houseGeo, new THREE.MeshLambertMaterial(), nHouses);
  const roofs = new THREE.InstancedMesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0x8c3b2a }), nHouses);
  const houseCols = ['#f2efe6', '#5fa4c9', '#e7c14b', '#d9654f', '#7fbf7a', '#e9e2d0'].map((c) => new THREE.Color(c));
  for (let i = 0; i < nHouses; i++) {
    const z = rand(-2600, -250), side = Math.random() < 0.5 ? -1 : 1;
    const x = xr(z) + side * (RIVER_W / 2 + rand(4, 10));
    e.set(0, rand(0, 6), 0); q.setFromEuler(e);
    m4.compose(v3.set(x, 0, z), q, s3.set(1, 1, 1));
    houses.setMatrixAt(i, m4); roofs.setMatrixAt(i, m4);
    houses.setColorAt(i, houseCols[i % houseCols.length]);
  }
  scene.add(houses, roofs);

  /* Cidade: quarteirões instanciados */
  const nBlds = LITE ? 300 : 560;
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const blds = new THREE.InstancedMesh(bGeo, new THREE.MeshLambertMaterial(), nBlds);
  const bCols = ['#f2efe6', '#e8d9c0', '#d9a5a0', '#c9d8e0', '#efe1a8', '#ffffff', '#bfc6c9', '#e3b98f'].map((c) => new THREE.Color(c));
  let bi = 0, guard = 0;
  while (bi < nBlds && guard++ < 20000) {
    const gx = Math.round(rand(-360, 300) / 26) * 26 + rand(-3, 3);
    const gz = Math.round(rand(-330, 330) / 26) * 26 + rand(-3, 3);
    if (Math.hypot(gx + 40, gz) > 330) continue;
    if (gx > xr(gz) - RIVER_W / 2 - 14) continue;
    if (Math.abs(gx) < 62 && gz > -70 && gz < 130) continue; // teatro + largo
    const far = Math.hypot(gx, gz);
    const tower = far > 110 && Math.random() < 0.07;
    const h = tower ? rand(30, 52) : 4 + Math.pow(Math.random(), 2.5) * 15;
    m4.compose(v3.set(gx, 0, gz), q.identity(), s3.set(rand(8, 15), h, rand(8, 15)));
    blds.setMatrixAt(bi, m4);
    blds.setColorAt(bi, bCols[(Math.random() * bCols.length) | 0]);
    bi++;
  }
  blds.count = bi;
  scene.add(blds);

  /* Teatro Amazonas */
  const teatro = new THREE.Group();
  const rose = '#e4a3a2';
  const facadeTex = canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = rose; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f7f2ea'; ctx.fillRect(0, h * 0.47, w, 10); ctx.fillRect(0, 0, w, 14); ctx.fillRect(0, h - 16, w, 16);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 8; col++) {
        const x = 18 + col * 62, y = 30 + row * 118, ww = 30, hh = 70;
        ctx.fillStyle = '#f7f2ea'; ctx.fillRect(x - 5, y - 5, ww + 10, hh + 8);
        ctx.beginPath(); ctx.arc(x + ww / 2, y - 3, ww / 2 + 5, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#5d3a3a'; ctx.fillRect(x, y, ww, hh);
        ctx.beginPath(); ctx.arc(x + ww / 2, y, ww / 2, Math.PI, 0); ctx.fill();
      }
    }
  });
  const roseMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.8 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf7f3ec, roughness: 0.7 });
  const plainRose = new THREE.MeshStandardMaterial({ color: rose, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(50, 18, 72), roseMat);
  body.position.set(0, 9, -12);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(52, 1.4, 74), whiteMat);
  cornice.position.set(0, 18.4, -12);
  // pórtico frontal
  const porch = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(36, 4, 12), whiteMat); base.position.set(0, 2, 30);
  const ent = new THREE.Mesh(new THREE.BoxGeometry(36, 2.2, 12.5), whiteMat); ent.position.set(0, 16.4, 30);
  const attic = new THREE.Mesh(new THREE.BoxGeometry(30, 5, 10), plainRose); attic.position.set(0, 20, 29);
  const atticTop = new THREE.Mesh(new THREE.BoxGeometry(31, 1, 10.5), whiteMat); atticTop.position.set(0, 23, 29);
  porch.add(base, ent, attic, atticTop);
  const colGeo = new THREE.CylinderGeometry(0.8, 0.9, 11, 12);
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Mesh(colGeo, whiteMat);
    c.position.set(-15.75 + i * 4.5, 9.5, 35);
    porch.add(c);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 1), roseMat); back.position.set(0, 10, 25.5);
  porch.add(back);
  for (let i = 0; i < 5; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(40 - i * 0.5, 0.8, 4), whiteMat);
    st.position.set(0, 0.4 + i * 0.8, 46 - i * 2.4);
    porch.add(st);
  }
  // cúpula de azulejos verde, amarelo e azul
  const domeTex = canvasTex(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#2b2b2b'; ctx.fillRect(0, 0, w, h);
    const cols = ['#1d8c47', '#f1c21b', '#1f5fae'];
    const nx = 48, ny = 22, cw = w / nx, ch = h / ny;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      ctx.fillStyle = cols[(i + j) % 3];
      ctx.beginPath();
      const x = i * cw, y = j * ch;
      ctx.moveTo(x + cw / 2, y + 1); ctx.lineTo(x + cw - 1, y + ch / 2); ctx.lineTo(x + cw / 2, y + ch - 1); ctx.lineTo(x + 1, y + ch / 2);
      ctx.fill();
    }
  });
  const domeMat = new THREE.MeshStandardMaterial({ map: domeTex, roughness: 0.25, metalness: 0.15 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 12.5, 6, 32), plainRose); drum.position.set(0, 21, 2);
  const drumRing = new THREE.Mesh(new THREE.CylinderGeometry(13.2, 13.2, 1, 32), whiteMat); drumRing.position.set(0, 24.3, 2);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(12.5, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.scale.set(1, 1.3, 1); dome.position.set(0, 24.6, 2);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 3.5, 12), whiteMat); lantern.position.set(0, 42.5, 2);
  const lanternDome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeMat); lanternDome.position.set(0, 44.2, 2);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 4, 8), whiteMat); spire.position.set(0, 48, 2);
  teatro.add(body, cornice, porch, drum, drumRing, dome, lantern, lanternDome, spire);
  scene.add(teatro);

  // Largo de São Sebastião com o calçadão de ondas
  const waveTex = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 11;
    for (let y = -20; y < h + 40; y += 34) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin((x / w) * Math.PI * 4) * 12; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.stroke();
    }
  }, [3, 3]);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(124, 90), new THREE.MeshLambertMaterial({ map: waveTex }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.25, 86);
  const monBase = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 3, 16), whiteMat); monBase.position.set(0, 1.5, 92);
  const monCol = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 16, 12), whiteMat); monCol.position.set(0, 11, 92);
  const monTop = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), new THREE.MeshStandardMaterial({ color: 0x9b7b3c, metalness: 0.6, roughness: 0.4 }));
  monTop.position.set(0, 19.5, 92);
  // ruas ao redor do teatro
  const street = new THREE.Mesh(new THREE.PlaneGeometry(150, 200), new THREE.MeshLambertMaterial({ color: 0x6b6862 }));
  street.rotation.x = -Math.PI / 2; street.position.set(0, 0.12, 30);
  scene.add(street, plaza, monBase, monCol, monTop);
  // árvores do largo
  for (let i = 0; i < 26; i++) {
    const t = new THREE.Mesh(treeGeo, new THREE.MeshLambertMaterial({ color: greens[i % greens.length], flatShading: true }));
    const side = i % 2 ? 1 : -1;
    t.position.set(side * rand(52, 60), 6, rand(45, 128));
    t.scale.setScalar(rand(4.5, 6.5));
    scene.add(t);
  }

  /* Nuvens */
  const cloudTex = canvasTex(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 14; i++) {
      const x = rand(60, 196), y = rand(80, 170), r = rand(40, 80);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  });
  const clouds = [];
  const nClouds = LITE ? 26 : 45;
  for (let i = 0; i < nClouds; i++) {
    const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.6, color: 0xffffff, fog: false });
    const sp = new THREE.Sprite(mat);
    const s = rand(180, 420);
    sp.scale.set(s * 1.6, s, 1);
    sp.position.set(rand(-1500, 500), rand(260, 560), rand(-400, 1700));
    if (Math.abs(sp.position.x + 1100) < 260 && sp.position.y > 450) sp.position.y -= 250;
    sp.userData.base = 0.6;
    scene.add(sp);
    clouds.push(sp);
  }

  /* Asa do avião (presa à câmera) */
  const plane = new THREE.Group();
  const wingGeo = new THREE.BufferGeometry();
  const wv = new Float32Array([
    -3.2, -2.6, -3.6, 1.8, -2.6, -3.0, 7.5, -1.8, -24,
    -3.2, -2.6, -3.6, 7.5, -1.8, -24, 5.3, -1.8, -24.6,
  ]);
  wingGeo.setAttribute('position', new THREE.BufferAttribute(wv, 3));
  wingGeo.computeVertexNormals();
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xe9ecef, emissive: 0x5d636b, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide, fog: false });
  const wing = new THREE.Mesh(wingGeo, wingMat);
  const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 1.6), wingMat);
  winglet.position.set(6.5, -0.6, -24.2); winglet.rotation.z = -0.15;
  const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.8, 4, 20), new THREE.MeshStandardMaterial({ color: 0xbfc5cc, roughness: 0.4, metalness: 0.5, fog: false }));
  nacelle.rotation.z = Math.PI / 2; nacelle.position.set(0.2, -3.5, -10);
  plane.add(wing, winglet, nacelle);
  camera.add(plane);

  /* Proa da lancha (presa à câmera) */
  const boat = new THREE.Group();
  const hull = new THREE.Shape();
  hull.moveTo(-2.4, 0); hull.lineTo(-2.2, -3.5); hull.quadraticCurveTo(-1.2, -6.4, 0, -7.6); hull.quadraticCurveTo(1.2, -6.4, 2.2, -3.5); hull.lineTo(2.4, 0); hull.lineTo(-2.4, 0);
  const deckGeo = new THREE.ExtrudeGeometry(hull, { depth: 0.9, bevelEnabled: false });
  deckGeo.rotateX(Math.PI / 2);
  const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6, fog: false }));
  const stripe = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: 0xc9151e, roughness: 0.6, fog: false }));
  stripe.scale.set(1.02, 0.35, 1.02); stripe.position.y = -0.95;
  const planks = new THREE.Mesh(new THREE.ShapeGeometry(hull), new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.9, fog: false }));
  planks.rotation.x = -Math.PI / 2; planks.position.y = 0.02; planks.scale.set(0.9, 0.9, 1);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x2d6b45, roughness: 0.5, fog: false });
  const railPts = [[-2.3, -0.2], [-2.1, -3.5], [-1.1, -6.2], [0, -7.3], [1.1, -6.2], [2.1, -3.5], [2.3, -0.2]].map(([x, z]) => new THREE.Vector3(x, 1.1, z));
  const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts), 40, 0.06, 6), railMat);
  for (const p of railPts) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), railMat);
    post.position.set(p.x, 0.55, p.z);
    boat.add(post);
  }
  // cesto de guaranás na proa
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.55, 0.55, 14), new THREE.MeshStandardMaterial({ color: 0x8a6232, roughness: 0.9, fog: false }));
  basket.position.set(0.9, 0.3, -2.6);
  boat.add(deck, stripe, planks, rail, basket);
  const basketFruits = [];
  for (let i = 0; i < 5; i++) {
    const g = makeGuarana(16);
    g.scale.setScalar(0.24);
    g.position.set(0.9 + Math.cos(i * 1.3) * 0.38, 0.62 + (i % 2) * 0.08, -2.6 + Math.sin(i * 1.3) * 0.38);
    g.traverse((o) => { if (o.material) o.material.fog = false; });
    boat.add(g);
    basketFruits.push(g);
  }
  boat.position.set(0, -3.4, -2.2);
  boat.visible = false;
  camera.add(boat);

  /* Pássaros sobre o rio */
  const birds = [];
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x1b1b1b, side: THREE.DoubleSide });
  const birdWing = new THREE.BufferGeometry();
  birdWing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 2.2, 0.2, 0.6, 0, 0, 1.2]), 3));
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Group();
    const l = new THREE.Mesh(birdWing, birdMat), r = new THREE.Mesh(birdWing, birdMat);
    r.scale.x = -1;
    b.add(l, r);
    b.userData = { l, r, ph: rand(0, 6), z0: rand(-2200, -300), y: rand(22, 45), off: rand(-50, 50) };
    scene.add(b);
    birds.push(b);
  }

  /* Luzes da cena do guaraná na proa */
  const fill = new THREE.PointLight(0xffffff, 2, 12);
  fill.position.set(0, 1.5, -1);
  camera.add(fill);

  /* ---------- Caminho da câmera ---------- */
  const KF = [
    { p: 0.00, pos: [-1150, 660, 1550], tgt: [0, 0, 760] },
    { p: 0.15, pos: [-980, 520, 1000], tgt: [0, 0, 260] },
    { p: 0.30, pos: [-620, 300, 470], tgt: [0, 10, 0] },
    { p: 0.44, pos: [-170, 95, 230], tgt: [0, 22, 0] },
    { p: 0.55, pos: [120, 58, 160], tgt: [0, 24, -4] },
    { p: 0.63, pos: [xr(-120) - 70, 55, -120], tgt: [xr(-480), 4, -480] },
    { p: 0.70, pos: [xr(-380), 6, -380], tgt: [xr(-600), 4, -600] },
  ];
  const BOAT_START = 0.70, Z0 = -380, Z1 = -2800;
  const desiredPos = new THREE.Vector3(), desiredTgt = new THREE.Vector3();
  const curPos = new THREE.Vector3(...KF[0].pos), curTgt = new THREE.Vector3(...KF[0].tgt);
  const look = new THREE.Vector3();

  function pathAt(p, out, outT) {
    if (p >= BOAT_START) {
      const t = (p - BOAT_START) / (1 - BOAT_START);
      const z = lerp(Z0, Z1, t);
      out.set(xr(z), 6, z);
      outT.set(xr(z - 220), 4, z - 220);
      return;
    }
    let i = 0;
    while (i < KF.length - 2 && p > KF[i + 1].p) i++;
    const a = KF[i], b = KF[i + 1];
    const t = smooth(clamp((p - a.p) / (b.p - a.p), 0, 1));
    out.set(lerp(a.pos[0], b.pos[0], t), lerp(a.pos[1], b.pos[1], t), lerp(a.pos[2], b.pos[2], t));
    outT.set(lerp(a.tgt[0], b.tgt[0], t), lerp(a.tgt[1], b.tgt[1], t), lerp(a.tgt[2], b.tgt[2], t));
  }

  /* Paletas de céu por fase */
  const SKY = [
    { p: 0.0, top: '#2f6fbf', hor: '#e9e3d2', fogN: 1600, fogF: 7000 },
    { p: 0.45, top: '#3f7fc4', hor: '#f3dcb6', fogN: 600, fogF: 3400 },
    { p: 0.75, top: '#4a6fa8', hor: '#f6c487', fogN: 260, fogF: 1900 },
    { p: 1.0, top: '#5a5f9a', hor: '#f7a964', fogN: 220, fogF: 1600 },
  ].map((s) => ({ ...s, top: new THREE.Color(s.top), hor: new THREE.Color(s.hor) }));
  const tmpC = new THREE.Color();
  function skyAt(p) {
    let i = 0;
    while (i < SKY.length - 2 && p > SKY[i + 1].p) i++;
    const a = SKY[i], b = SKY[i + 1], t = clamp((p - a.p) / (b.p - a.p), 0, 1);
    skyU.top.value.copy(a.top).lerp(b.top, t);
    skyU.horizon.value.copy(a.hor).lerp(b.hor, t);
    scene.fog.color.copy(skyU.horizon.value);
    scene.fog.near = lerp(a.fogN, b.fogN, t);
    scene.fog.far = lerp(a.fogF, b.fogF, t);
    waterU.fogColor.value.copy(scene.fog.color);
    waterU.fogNear.value = scene.fog.near;
    waterU.fogFar.value = scene.fog.far;
    waterU.skyCol.value.copy(tmpC.copy(skyU.horizon.value).lerp(skyU.top.value, 0.25));
  }

  /* ---------- Overlays (janela, textos, rota) ---------- */
  function updateOverlay(p) {
    // janela do avião: aproxima e some entre 0.26 e 0.40
    const wz = clamp((p - 0.26) / 0.14, 0, 1);
    const ez = wz * wz;
    windowEl.style.transform = `translate(${-pointer.x * 12}px, ${pointer.y * 8}px) scale(${1 + ez * 7})`;
    windowEl.style.opacity = String(1 - smooth(clamp((wz - 0.55) / 0.45, 0, 1)));
    windowEl.style.visibility = wz >= 1 ? 'hidden' : 'visible';
    plane.visible = wz < 0.6;

    steps.forEach((el) => {
      const a = +el.dataset.in, b = +el.dataset.out;
      const fadeIn = a <= 0 ? 1 : clamp((p - a) / 0.035, 0, 1), fadeOut = b >= 1 ? 1 : clamp((b - p) / 0.035, 0, 1);
      const v = Math.min(fadeIn, fadeOut);
      el.style.opacity = v.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - fadeIn) * 40 - (1 - fadeOut) * 40).toFixed(1)}px, 0)`;
      el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
      el.classList.toggle('is-active', v > 0.5);
    });

    if (routeFill) routeFill.style.transform = `scaleX(${clamp((p - 0.05) / 0.9, 0, 1)})`;
    routeStops.forEach((s) => s.classList.toggle('is-on', p >= +s.dataset.jstop));
    if (hint) hint.style.opacity = String(1 - clamp(p / 0.05, 0, 1));
  }

  /* ---------- Loop ---------- */
  let visible = false, pS = 0, running = false;
  const clock = new THREE.Clock();
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 68 : 55;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  const progress = () => {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight), 0, 1);
  };

  function frame() {
    if (!visible) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    const p = progress();
    pS += (p - pS) * Math.min(1, dt * 5);

    pathAt(pS, desiredPos, desiredTgt);
    const k = Math.min(1, dt * 6);
    curPos.lerp(desiredPos, k);
    curTgt.lerp(desiredTgt, k);

    const onBoat = pS > BOAT_START - 0.04;
    const bob = onBoat ? Math.sin(t * 1.6) * 0.35 + Math.sin(t * 0.9) * 0.2 : Math.sin(t * 0.7) * 1.5;
    camera.position.set(curPos.x, curPos.y + bob, curPos.z);
    // olhar ao redor com o mouse
    const dist = curPos.distanceTo(curTgt);
    look.copy(curTgt);
    look.x += pointer.x * dist * 0.16;
    look.y += pointer.y * dist * 0.1;
    camera.lookAt(look);
    camera.rotateZ(onBoat ? Math.sin(t * 1.1) * 0.012 : -0.04 + Math.sin(t * 0.5) * 0.01);

    sky.position.copy(camera.position);
    skyAt(pS);
    waterU.time.value = t;

    // nuvens somem quando descemos
    const cloudFade = clamp((camera.position.y - 140) / 160, 0, 1);
    clouds.forEach((c) => { c.material.opacity = c.userData.base * cloudFade; c.position.x += dt * 6; });

    // lancha surge por baixo
    const bt = clamp((pS - 0.665) / 0.05, 0, 1);
    boat.visible = bt > 0;
    boat.position.y = lerp(-9, -3.0, smooth(bt));
    boat.rotation.z = Math.sin(t * 1.1) * 0.02;
    basketFruits.forEach((g, i) => { g.rotation.y = Math.sin(t * 0.8 + i) * 0.4 + pointer.x * 0.8; g.rotation.x = -0.5 - pointer.y * 0.4; });

    birds.forEach((b) => {
      const u = b.userData;
      const z = u.z0 - ((t * 9) % 600);
      b.position.set(xr(z) + u.off, u.y + Math.sin(t + u.ph) * 2, z);
      const f = Math.sin(t * 7 + u.ph) * 0.6;
      u.l.rotation.z = f; u.r.rotation.z = -f;
      b.rotation.y = Math.PI;
    });

    section.classList.toggle('is-cabin', pS < 0.34);
    updateOverlay(pS);
    renderer.render(scene, camera);
  }

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
  }, { rootMargin: '100px 0px' }).observe(section);

  updateOverlay(0);
  section.classList.add('is-ready');
}

/* ==========================================================================
   CAMADA DE GUARANÁS (seguem o mouse, reagem ao scroll)
   ========================================================================== */
function initGuaranaLayer() {
  const anchors = [...document.querySelectorAll('[data-guarana]')];
  if (!anchors.length) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'guarana-layer';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.z = 12;
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x1d3b2c, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf3a72c, 2.2); rim.position.set(6, -2, -4); scene.add(rim);

  const items = anchors.map((el, i) => {
    const g = makeGuarana(LITE ? 24 : 40);
    const holder = new THREE.Group();
    holder.add(g);
    scene.add(holder);
    const side = el.dataset.guarana === 'left' ? -1 : 1;
    return {
      el, holder, g, side,
      fy: parseFloat(el.dataset.guaranaY || '0.3'),
      size: (LITE ? 30 : 88) * (0.8 + ((i * 37) % 10) / 20),
      s: 0, sv: 0, spin: rand(0, 6), roll: 0, dodgeX: 0, dodgeY: 0,
      q: new THREE.Quaternion(),
    };
  });

  let W = innerWidth, H = innerHeight, pxw = 1;
  const resize = () => {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    pxw = (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / H;
  };
  addEventListener('resize', resize);
  resize();

  const helper = new THREE.Object3D();
  const target = new THREE.Vector3();
  const clock = new THREE.Clock();
  let wander = 0;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const y = scrollY;
    scrollVel += ((y - lastY) - scrollVel) * 0.2;
    lastY = y;

    // sem mouse (toque): os olhos passeiam
    let mx = pointer.px, my = pointer.py;
    if (!pointer.active || isCoarse) { wander += dt * 0.6; mx = W / 2 + Math.cos(wander) * W * 0.3; my = H / 2 + Math.sin(wander * 1.3) * H * 0.3; }

    let any = false;
    items.forEach((it, i) => {
      const r = it.el.getBoundingClientRect();
      const sy = r.top + r.height * it.fy + Math.sin(t * 0.9 + i) * 8;
      const onScreen = r.bottom > -100 && r.top < H + 100 && getComputedStyle(it.el).visibility !== 'hidden';
      const margin = Math.max(0, (W - 1240) / 2) + 24;
      const inset = Math.max(-it.size * 0.2, margin - it.size * 0.85);
      const sxBase = it.side < 0 ? inset : W - inset;

      // desvia do cursor
      const ddx = sxBase - mx, ddy = sy - my, d = Math.hypot(ddx, ddy);
      const push = d < it.size * 2.2 ? (1 - d / (it.size * 2.2)) * it.size * 0.6 : 0;
      it.dodgeX += ((d ? (ddx / d) * push : 0) - it.dodgeX) * 0.12;
      it.dodgeY += ((d ? (ddy / d) * push : 0) - it.dodgeY) * 0.12;
      const sx = sxBase + it.dodgeX, syy = sy + it.dodgeY;

      // escala com mola (entra "pulando")
      const vis = onScreen && syy > -it.size && syy < H + it.size ? 1 : 0;
      it.sv += (vis - it.s) * 0.12; it.sv *= 0.72; it.s += it.sv;
      const sc = Math.max(0, it.s) * it.size * pxw;
      it.holder.visible = sc > 0.001;
      if (!it.holder.visible) return;
      any = true;
      it.holder.scale.setScalar(sc);
      it.holder.position.set((sx - W / 2) * pxw, -(syy - H / 2) * pxw, 0);

      // olho segue o cursor
      target.set((mx - W / 2) * pxw, -(my - H / 2) * pxw, 6);
      helper.position.copy(it.holder.position);
      helper.lookAt(target);
      it.holder.quaternion.slerp(helper.quaternion, 0.12);

      // gira com a velocidade do scroll
      it.roll += (clamp(scrollVel * 0.02, -0.8, 0.8) - it.roll) * 0.08;
      it.g.rotation.z = it.roll + Math.sin(t * 0.8 + i) * 0.12;
    });
    if (any) renderer.render(scene, camera);
    else renderer.clear();
  }
  requestAnimationFrame(frame);
}

/* ---------- Início ---------- */
try {
  if (root.classList.contains('has-3d')) {
    initJourney();
    initGuaranaLayer();
    root.classList.add('is-3d-ready');
  }
} catch (err) {
  console.error(err);
  root.classList.remove('has-3d');
}
