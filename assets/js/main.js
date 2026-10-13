/* Tour Gastronômico de Maués · Aura Amazônia
   Tudo o que muda com frequência fica em CONFIG. */
const CONFIG = {
  whatsapp: '555191911504',
  // Fim das inscrições (horário de Manaus, UTC-4)
  deadline: '2026-10-20T23:59:59-04:00',
  vagasTotal: 22,
  // Atualize conforme as vendas. Com valor menor que o total, aparece "Restam X de 22" + barra.
  vagasRestantes: 22,
  // Opcional: URL que recebe os leads em JSON (Google Apps Script, Zapier, Make, RD Station…)
  leadEndpoint: '',
};

(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* sem storage */ } },
  };
  const track = (evt, data) => {
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: evt }, data || {}));
    if (typeof window.fbq === 'function') window.fbq('track', evt === 'lead' ? 'Lead' : 'Contact');
    if (typeof window.gtag === 'function') window.gtag('event', evt === 'lead' ? 'generate_lead' : 'contact', data || {});
  };
  const wppUrl = (msg) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

  /* ---------- Altura da barra de urgência ---------- */
  const topbar = $('.topbar');
  const setTopbar = () => root.style.setProperty('--topbar-h', topbar.offsetHeight + 'px');
  setTopbar();
  addEventListener('resize', setTopbar);

  /* ---------- Hero: entrada ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));

  /* ---------- Links de WhatsApp ---------- */
  $$('[data-wpp]').forEach((a) => {
    a.href = wppUrl(a.dataset.wpp);
    a.addEventListener('click', () => track('whatsapp_click', { origem: a.className }));
  });

  /* ---------- Prazo ---------- */
  const deadline = new Date(CONFIG.deadline).getTime();
  const deadlineText = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Manaus' })
    .format(new Date(CONFIG.deadline));
  $$('[data-deadline-text]').forEach((el) => { el.textContent = deadlineText; });

  const pad = (n) => String(n).padStart(2, '0');
  const countdowns = $$('[data-countdown]');
  const inlines = $$('[data-countdown-inline]');
  let last = {};
  const tickCountdown = () => {
    const diff = deadline - Date.now();
    if (diff <= 0) {
      countdowns.forEach((c) => { c.classList.add('is-closed'); c.textContent = 'Inscrições encerradas · fale com a Aura para entrar na lista de espera'; });
      inlines.forEach((el) => { el.textContent = 'encerradas'; });
      return false;
    }
    const s = Math.floor(diff / 1000);
    const u = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
    countdowns.forEach((c) => {
      $$('[data-u]', c).forEach((el) => {
        const k = el.dataset.u, v = pad(u[k]);
        if (el.textContent !== v) {
          el.textContent = v;
          if (!reduced && last[k] !== undefined) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
        }
      });
    });
    last = u;
    const txt = `${u.d}d ${pad(u.h)}h ${pad(u.m)}m ${pad(u.s)}s`;
    inlines.forEach((el) => { el.textContent = txt; });
    return true;
  };
  if (tickCountdown()) {
    const iv = setInterval(() => { if (!tickCountdown()) clearInterval(iv); }, 1000);
  }

  /* ---------- Vagas ---------- */
  const total = CONFIG.vagasTotal, rest = clamp(CONFIG.vagasRestantes, 0, total);
  $$('[data-vagas]').forEach((v) => {
    const txt = $('[data-vagas-txt]', v), fill = $('[data-vagas-fill]', v);
    if (rest <= 0) {
      txt.innerHTML = '<b>Vagas esgotadas</b> · entre na lista de espera';
      fill.dataset.w = '100%';
    } else if (rest < total) {
      txt.innerHTML = `Restam <b>${rest}</b> de ${total} vagas`;
      fill.dataset.w = `${((total - rest) / total) * 100}%`;
    } else {
      txt.innerHTML = `Turma única: <b>apenas ${total} vagas</b>`;
      v.classList.add('no-bar');
    }
  });

  /* ---------- Revelar ao rolar ---------- */
  const countUp = (el) => {
    const to = +el.dataset.count;
    if (reduced || to < 2) return;
    const t0 = performance.now(), dur = 1200;
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('is-in');
      $$('[data-count]', el).forEach(countUp);
      $$('[data-vagas-fill]', el).forEach((f) => { if (f.dataset.w) f.style.width = f.dataset.w; });
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal], [data-clip], [data-vagas]').forEach((el) => io.observe(el));

  /* ---------- Vídeos: carregar sob demanda e pausar fora da tela ---------- */
  const saveData = navigator.connection && navigator.connection.saveData;
  const videos = $$('video');
  const vio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.hasAttribute('data-lazy-video') && !v.dataset.loaded) {
          if (saveData) return;
          $$('source[data-src]', v).forEach((s) => { s.src = s.dataset.src; });
          v.dataset.loaded = '1';
          v.load();
        }
        if (!reduced) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      } else {
        v.pause();
      }
    });
  }, { rootMargin: '200px 0px' });
  videos.forEach((v) => { if (reduced) { v.removeAttribute('autoplay'); v.pause(); } vio.observe(v); });

  /* ---------- Galeria horizontal ---------- */
  const hs = $('[data-hscroll]');
  const hsTrack = $('[data-hscroll-track]');
  const hsBar = $('[data-hscroll-bar]');
  let hsDist = 0, hsActive = false;
  const setupHs = () => {
    hsActive = !reduced && innerWidth > 860;
    hs.classList.toggle('is-native', !hsActive);
    if (!hsActive) { hs.style.height = ''; hsTrack.style.transform = ''; return; }
    hsTrack.style.transform = 'none';
    hsDist = Math.max(0, hsTrack.scrollWidth - innerWidth + 24);
    hs.style.height = `${innerHeight + hsDist}px`;
  };

  /* ---------- Loop de scroll ---------- */
  const progress = $('.progress');
  const header = $('.header');
  const parallax = $$('[data-parallax]');
  const timeline = $('[data-timeline]');
  const tItems = timeline ? $$('li', timeline) : [];
  const mobileBar = $('[data-mobile-bar]');
  const hero = $('.hero');
  const offer = $('#vagas');
  const marquees = $$('[data-marquee]');
  const marqueeBox = $('.marquee');
  let marqueeVisible = false;

  const onScroll = () => {
    const y = scrollY, vh = innerHeight;
    const docH = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;
    header.classList.toggle('is-solid', y > 40);

    if (!reduced) {
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const p = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
        el.style.setProperty('--py', `${(-p * parseFloat(el.dataset.parallax) * r.height).toFixed(1)}px`);
      });
    }

    if (hsActive) {
      const r = hs.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh), 0, 1);
      hsTrack.style.transform = `translate3d(${-p * hsDist}px,0,0)`;
      hsBar.style.transform = `scaleX(${p})`;
    }

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const mark = vh * 0.62;
      timeline.style.setProperty('--p', clamp((mark - r.top) / r.height, 0, 1).toFixed(3));
      tItems.forEach((li) => li.classList.toggle('is-active', li.getBoundingClientRect().top < mark));
    }

    const heroGone = hero.getBoundingClientRect().bottom < 0;
    const ro = offer.getBoundingClientRect();
    const inOffer = ro.top < vh && ro.bottom > 0;
    const showBar = heroGone && !inOffer;
    mobileBar.classList.toggle('is-on', showBar);
    document.body.classList.toggle('has-mobile-bar', showBar);
  };

  let ticking = false;
  const requestTick = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  };
  addEventListener('scroll', requestTick, { passive: true });
  addEventListener('resize', () => { setupHs(); requestTick(); });
  addEventListener('load', () => { setupHs(); requestTick(); });
  setupHs();
  onScroll();

  /* ---------- Marquee (movimento contínuo + acelera com o scroll) ---------- */
  if (!reduced && marqueeBox) {
    new IntersectionObserver(([e]) => { marqueeVisible = e.isIntersecting; if (marqueeVisible) requestAnimationFrame(loopMarquee); })
      .observe(marqueeBox);
    let t0 = performance.now();
    function loopMarquee(t) {
      if (!marqueeVisible) return;
      const shift = (t - t0) * 0.03 + scrollY * 0.45;
      marquees.forEach((row) => {
        const half = row.scrollWidth / 2;
        const x = shift % half;
        row.style.transform = `translate3d(${row.dataset.marquee === '1' ? x - half : -x}px,0,0)`;
      });
      requestAnimationFrame(loopMarquee);
    }
  }

  /* ---------- WhatsApp flutuante ---------- */
  const float = $('[data-wpp-float]');
  if (!store.get('wppBubbleClosed')) {
    setTimeout(() => {
      float.classList.add('show-bubble');
      setTimeout(() => float.classList.remove('show-bubble'), 10000);
    }, 7000);
  }
  $('[data-wpp-close]').addEventListener('click', () => {
    float.classList.remove('show-bubble');
    store.set('wppBubbleClosed', '1');
  });

  /* ---------- Formulários de lead ---------- */
  const utm = {};
  new URLSearchParams(location.search).forEach((v, k) => { if (/^utm_|^gclid$|^fbclid$/.test(k)) utm[k] = v; });

  const maskPhone = (input) => {
    input.addEventListener('input', () => {
      let d = input.value.replace(/\D/g, '');
      if (d.startsWith('55') && d.length > 11) d = d.slice(2);
      d = d.slice(0, 11);
      let out = d;
      if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length > 7) out = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
      input.value = out;
    });
  };
  const validators = {
    nome: (v) => v.trim().length >= 2,
    whatsapp: (v) => v.replace(/\D/g, '').length >= 10,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  };

  $$('[data-lead-form]').forEach((form) => {
    $$('input[type="tel"]', form).forEach(maskPhone);
    $$('input', form).forEach((inp) => inp.addEventListener('input', () => inp.closest('.field').classList.remove('has-error')));

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      let ok = true, firstBad = null;
      $$('input[required]', form).forEach((inp) => {
        const valid = (validators[inp.name] || ((v) => v.trim() !== ''))(inp.value);
        inp.closest('.field').classList.toggle('has-error', !valid);
        if (!valid) { ok = false; firstBad = firstBad || inp; }
      });
      if (!ok) { firstBad.focus(); return; }

      const data = Object.fromEntries(new FormData(form).entries());
      const origem = form.dataset.leadForm;
      const lead = Object.assign({ origem, pagina: location.href, data: new Date().toISOString() }, data, utm);

      const linhas = origem === 'saida'
        ? [`Olá! Sou ${data.nome} e quero receber o roteiro completo do Tour Gastronômico de Maués (25 a 30/11).`]
        : [
          `Olá! Sou ${data.nome} e quero garantir minha vaga no Tour Gastronômico de Maués (25 a 30/11).`,
          `Pessoas: ${data.pessoas === '1' ? 'só eu' : data.pessoas}`,
          `E-mail: ${data.email}`,
        ];
      linhas.push(`WhatsApp: ${data.whatsapp}`);
      const url = wppUrl(linhas.join('\n'));

      // Abre o WhatsApp no mesmo gesto do clique (evita bloqueio de pop-up)
      window.open(url, '_blank', 'noopener');
      $$('[data-wpp-after]', form).forEach((a) => { a.href = url; });

      if (CONFIG.leadEndpoint) {
        fetch(CONFIG.leadEndpoint, {
          method: 'POST', mode: 'no-cors', keepalive: true,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(lead),
        }).catch(() => {});
      }
      track('lead', { origem, pessoas: data.pessoas || '1' });
      store.set('leadSent', '1');
      form.classList.add('is-sent');
    });
  });

  /* ---------- Modal de intenção de saída (desktop) ---------- */
  const modal = $('[data-exit-modal]');
  let lastFocus = null;
  const openModal = () => {
    if (store.get('exitShown') || store.get('leadSent')) return;
    store.set('exitShown', '1');
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('input', modal).focus(), 300);
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (lastFocus) lastFocus.focus();
  };
  $('[data-modal-close]').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });
  if (matchMedia('(pointer: fine)').matches) {
    const armedAt = Date.now() + 12000;
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget && e.clientY <= 0 && Date.now() > armedAt) openModal();
    });
  }
})();
