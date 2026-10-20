/* Tour Gastronômico de Maués · Aura Amazônia
   Tudo o que muda com frequência fica em CONFIG. */
const CONFIG = {
  whatsapp: '555191911504',
  // Fim das inscrições (horário de Manaus, UTC-4)
  deadline: '2026-11-05T23:59:59-04:00',
  vagasTotal: 22,
  // Atualize conforme as vendas. Com valor menor que o total, aparece "Restam X vagas" + barra.
  vagasRestantes: 20,
  // URL do Apps Script que grava os leads na planilha (ver scripts/planilha-leads.gs)
  leadEndpoint: '',
  // Dados da empresa: aparecem no rodapé e no bloco "Compra segura" quando preenchidos
  cnpj: '',
  cadastur: '',
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
    // Meta: eventos padrão para lead e contato; personalizados para etapa 1 e lead qualificado
    const META = { lead: ['track', 'Lead'], whatsapp_click: ['track', 'Contact'], lead_iniciado: ['trackCustom', 'LeadIniciado'], lead_qualificado: ['trackCustom', 'LeadQualificado'] };
    const GA = { lead: 'generate_lead', whatsapp_click: 'contact', lead_iniciado: 'lead_iniciado', lead_qualificado: 'lead_qualificado' };
    if (typeof window.fbq === 'function' && META[evt]) window.fbq(META[evt][0], META[evt][1], data || {});
    if (typeof window.gtag === 'function' && GA[evt]) window.gtag('event', GA[evt], data || {});
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
      txt.innerHTML = rest === 1 ? "Resta <b>1</b> vaga" : `Restam <b>${rest}</b> vagas`;
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
  const floaters = $$('[data-floater]');
  const mouse = { x: 0, y: 0 };
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

    if (!reduced) {
      // guaranás reais: sobem em velocidade própria, inclinam e seguem levemente o mouse
      floaters.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -300 || r.top > vh + 300) return;
        const d = parseFloat(el.dataset.depth || '0.6');
        const c = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(${(mouse.x * 18 * d).toFixed(1)}px, ${(c * -120 * d + mouse.y * 12 * d).toFixed(1)}px, 0) rotate(${(c * 24 * (i % 2 ? -1 : 1) + mouse.x * 6).toFixed(1)}deg)`;
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
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = (e.clientY / innerHeight) * 2 - 1;
    requestTick();
  }, { passive: true });
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

  /* ---------- Dados da empresa ---------- */
  const company = [CONFIG.cnpj && `CNPJ ${CONFIG.cnpj}`, CONFIG.cadastur && `Cadastur ${CONFIG.cadastur}`].filter(Boolean).join(' · ');
  if (company) {
    $$('[data-company]').forEach((el) => { el.hidden = false; });
    $$('[data-company-txt]').forEach((el) => { el.textContent = el.closest('.footer') ? `Aura Amazônia · ${company}` : company; });
  }

  /* ---------- Formulários de lead ---------- */
  const utm = {};
  new URLSearchParams(location.search).forEach((v, k) => { if (/^utm_|^gclid$|^fbclid$/.test(k)) utm[k] = v; });
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  // grava (ou completa) o lead na planilha; a mesma id atualiza a mesma linha
  const saveLead = (lead) => {
    if (!CONFIG.leadEndpoint) return;
    fetch(CONFIG.leadEndpoint, {
      method: 'POST', mode: 'no-cors', keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ pagina: location.href }, utm, lead)),
    }).catch(() => {});
  };

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
  // valida os campos obrigatórios de um trecho do formulário; devolve o primeiro inválido
  const validate = (scope) => {
    let firstBad = null;
    $$('input[required]', scope).forEach((inp) => {
      const valid = (validators[inp.name] || ((v) => v.trim().length >= 2))(inp.value);
      inp.closest('.field').classList.toggle('has-error', !valid);
      if (!valid && !firstBad) firstBad = inp;
    });
    $$('[data-required-group]', scope).forEach((g) => {
      const valid = !!$('input:checked', g);
      g.classList.toggle('has-error', !valid);
      if (!valid && !firstBad) firstBad = $('input', g);
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  };
  const prepare = (form) => {
    $$('input[type="tel"]', form).forEach(maskPhone);
    $$('input', form).forEach((inp) => {
      const clear = () => inp.closest('.field').classList.remove('has-error');
      inp.addEventListener('input', clear);
      inp.addEventListener('change', clear);
    });
  };
  const finish = (form, url) => {
    // abre o WhatsApp no mesmo gesto do clique (evita bloqueio de pop-up)
    window.open(url, '_blank', 'noopener');
    $$('[data-wpp-after]', form).forEach((a) => { a.href = url; });
    store.set('leadSent', '1');
    form.classList.add('is-sent');
  };

  /* Formulário principal, em 2 etapas */
  const main = $('[data-lead-form="oferta"]');
  if (main) {
    prepare(main);
    main.dataset.leadId = newId();
    const step1 = $('[data-step="1"]', main), step2 = $('[data-step="2"]', main);
    const label = $('[data-step-label]', main);
    const go = (n) => {
      step1.hidden = n !== 1; step2.hidden = n !== 2;
      label.textContent = `Etapa ${n} de 2`;
      const first = $(n === 1 ? 'input' : 'input:not([type=radio])', n === 1 ? step1 : step2);
      if (first) first.focus({ preventScroll: true });
    };
    $('[data-step-back]', main).addEventListener('click', () => go(1));
    main.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const data = Object.fromEntries(new FormData(main).entries());
      if (!step1.hidden) {
        if (!validate(step1)) return;
        // etapa 1 concluída: o contato já fica salvo, mesmo que a pessoa desista depois
        saveLead({ id: main.dataset.leadId, etapa: '1 · contato', formulario: 'oferta', nome: data.nome, email: data.email, whatsapp: data.whatsapp });
        if (!main.dataset.started) { main.dataset.started = '1'; track('lead_iniciado', { origem: 'oferta' }); }
        go(2);
        return;
      }
      if (!validate(step2)) return;
      // lead qualificado = pode viajar nas datas e o valor cabe no planejamento
      const qualificado = data.disponibilidade === 'Sim' && data.investimento !== 'Não no momento';
      saveLead({ id: main.dataset.leadId, etapa: '2 · completo', formulario: 'oferta', ...data, qualificado: qualificado ? 'sim' : 'não' });
      track('lead', { origem: 'oferta', disponibilidade: data.disponibilidade, investimento: data.investimento, qualificado });
      if (qualificado) track('lead_qualificado', { origem: 'oferta' });
      finish(main, wppUrl([
        `Olá! Sou ${data.nome} e quero garantir minha vaga no Tour Gastronômico de Maués (25 a 30/11).`,
        `E-mail: ${data.email}`,
        `Cidade: ${data.cidade}`,
        `Disponibilidade de 25 a 30/11: ${data.disponibilidade}`,
        `Investimento de R$ 11.999 no planejamento: ${data.investimento}`,
        `WhatsApp: ${data.whatsapp}`,
      ].join('\n')));
    });
  }

  /* Formulário curto do topo: salva o contato e leva para a etapa seguinte do formulário principal */
  const mini = $('[data-mini-form]');
  if (mini && main) {
    prepare(mini);
    mini.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!validate(mini)) return;
      const data = Object.fromEntries(new FormData(mini).entries());
      saveLead({ id: main.dataset.leadId, etapa: '1 · contato (topo)', formulario: 'topo', nome: data.nome, whatsapp: data.whatsapp });
      if (!main.dataset.started) { main.dataset.started = '1'; track('lead_iniciado', { origem: 'topo' }); }
      $('#f-nome', main).value = data.nome;
      $('#f-wpp', main).value = data.whatsapp;
      const offer = $('#vagas');
      scrollTo({ top: main.getBoundingClientRect().top + scrollY - 140, behavior: 'smooth' });
      setTimeout(() => $('#f-email', main).focus({ preventScroll: true }), 700);
      if (offer) offer.classList.add('is-highlight');
    });
  }

  /* Formulário do pop-up de saída */
  $$('[data-lead-form="saida"]').forEach((form) => {
    prepare(form);
    const id = newId();
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!validate(form)) return;
      const data = Object.fromEntries(new FormData(form).entries());
      saveLead({ id, etapa: 'pop-up de saída', formulario: 'saida', nome: data.nome, whatsapp: data.whatsapp });
      track('lead', { origem: 'saida' });
      finish(form, wppUrl([
        `Olá! Sou ${data.nome} e quero receber o roteiro completo do Tour Gastronômico de Maués (25 a 30/11).`,
        `WhatsApp: ${data.whatsapp}`,
      ].join('\n')));
    });
  });

  /* ---------- Pop-up de intenção de saída ---------- */
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
  const armedAt = Date.now() + (matchMedia('(pointer: fine)').matches ? 12000 : 25000);
  if (matchMedia('(pointer: fine)').matches) {
    // computador: o mouse sai pela parte de cima da janela
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget && e.clientY <= 0 && Date.now() > armedAt) openModal();
    });
  } else {
    // celular: rolagem rápida para cima depois de ver boa parte da página
    let lastY = scrollY, lastT = performance.now(), maxY = 0;
    addEventListener('scroll', () => {
      const y = scrollY, t = performance.now();
      maxY = Math.max(maxY, y);
      const speed = (lastY - y) / Math.max(1, t - lastT); // px/ms subindo
      const seenEnough = maxY > document.documentElement.scrollHeight * 0.45;
      const formInView = main && main.getBoundingClientRect().top < innerHeight && main.getBoundingClientRect().bottom > 0;
      if (speed > 2.2 && seenEnough && !formInView && Date.now() > armedAt) openModal();
      lastY = y; lastT = t;
    }, { passive: true });
  }
})();
