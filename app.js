// Clínica Ariane Tessmann — prévia conceitual (Bruno Luque).
// Ideia: o losango do símbolo organiza o rosto inteiro. Ele desenha a janela do retrato (hero),
// divide a consulta em quatro etapas (cena presa) e enquadra as imagens da página.
//
// Camadas de motion
//   Assinatura: hero (contorno → losango → janela do retrato; inclinação com o ponteiro)
//               e a cena "Do primeiro olhar ao plano" (quatro triângulos que se preenchem).
//   Narrativa:  faixa vinho que se abre em losango; títulos em máscara; fotos que assentam
//               no enquadramento; imagens das etapas (celular) que saem do losango.
//   Interface:  botões com pressão, trilho de etapas, CTA magnético, barra de agendamento.
// O conteúdo funciona sem este arquivo: estados escondidos só existem depois de `motion-ready`.

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const deskMQ = matchMedia('(min-width: 861px)');
const reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

/* tokens (espelham as variáveis de style.css) */
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const EO_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)';
const D = { press: 0.14, ctrl: 0.2, panel: 0.32 };
const SPRING_TILT = { stiffness: 70, damping: 14 };
const SPRING_MAGNET = { stiffness: 220, damping: 18 };

const DIA0 = 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)';
const DIA = 'polygon(50% 0%, 50% 0%, 100% 50%, 100% 50%, 50% 100%, 50% 100%, 0% 50%, 0% 50%)';
const CHAM = 'polygon(7% 0%, 93% 0%, 100% 7%, 100% 93%, 93% 100%, 7% 100%, 0% 93%, 0% 7%)';
const DIA4_0 = 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)';
const DIA4 = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ------------------------------------------------------------------ */
/* Mola vetorial interrompível (preserva velocidade entre alvos)       */
/* ------------------------------------------------------------------ */
function springVec(apply, { stiffness = 170, damping = 20 } = {}) {
  const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, last: 0 };
  const tick = (t) => {
    const dt = Math.min(0.032, (t - (s.last || t)) / 1000 || 0.016); s.last = t;
    for (const k of ['x', 'y']) {
      const v = 'v' + k, tk = 't' + k;
      s[v] += (-stiffness * (s[k] - s[tk]) - damping * s[v]) * dt;
      s[k] += s[v] * dt;
    }
    apply(s.x, s.y);
    if (Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) + Math.abs(s.vx) + Math.abs(s.vy) > 0.001) s.raf = requestAnimationFrame(tick);
    else { s.raf = 0; s.last = 0; }
  };
  const set = (x, y) => { s.tx = x; s.ty = y; if (!s.raf) s.raf = requestAnimationFrame(tick); };
  set.stop = () => { cancelAnimationFrame(s.raf); s.raf = 0; };
  return set;
}

/* pequena interpolação por rAF (para atributos SVG) */
function tween(ms, onUpdate, delay = 0) {
  return new Promise((res) => {
    let start = 0;
    const step = (t) => {
      if (!start) start = t + delay;
      const k = clamp((t - start) / ms);
      if (t >= start) onUpdate(easeOut3(k));
      if (k < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}

/* ------------------------------------------------------------------ */
/* Topo e barra de agendamento (celular)                               */
/* ------------------------------------------------------------------ */
const top = $('[data-top]');
const dock = $('[data-dock]');
const onScrollUI = () => {
  top.classList.toggle('is-solid', scrollY > 24);
  dock && dock.classList.toggle('is-on', scrollY > innerHeight * 0.75);
};
addEventListener('scroll', onScrollUI, { passive: true }); onScrollUI();

/* ------------------------------------------------------------------ */
/* Rolagem contínua (Lenis) — roda do mouse; toque segue nativo         */
/* ------------------------------------------------------------------ */
let lenis = null;
function startLenis() {
  if (reduce || !window.Lenis || lenis) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else addEventListener('load', startLenis, { once: true });
reduceMQ.addEventListener('change', () => { if (reduceMQ.matches && lenis) { lenis.destroy(); lenis = null; } });

function goTo(y) {
  if (lenis) lenis.scrollTo(y, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = id === '#inicio' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  const y = id === '#inicio' ? 0 : target.getBoundingClientRect().top + scrollY - (id === '#metodo' ? 0 : top.offsetHeight + 8);
  goTo(y);
  if (id !== '#inicio') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
});

/* ------------------------------------------------------------------ */
/* CTA magnético (só ponteiro fino; usa `translate`, livre do :active) */
/* ------------------------------------------------------------------ */
if (!reduce && fineMQ.matches) {
  $$('[data-magnetic]').forEach((b) => {
    const set = springVec((x, y) => { b.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`; }, SPRING_MAGNET);
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      set((e.clientX - r.left - r.width / 2) * 0.16, (e.clientY - r.top - r.height / 2) * 0.28);
    });
    b.addEventListener('pointerleave', () => set(0, 0));
  });
}

/* ------------------------------------------------------------------ */
/* Cena: elementos e funções (usadas com ou sem Motion)                */
/* ------------------------------------------------------------------ */
const scene = $('[data-scene]');
const quads = $$('[data-q]');
const labels = $$('.dia__lbl');
const seal = $('[data-seal]');
const steps = $$('[data-step]');
const stageImgs = $$('[data-stage] img');
const railBtns = $$('[data-go]');
const railFill = $('[data-rail-fill]');
const STEP_AT = (i) => 0.03 + i * 0.235;   // início de cada etapa na rolagem da cena
const pinned = () => !reduce && root.classList.contains('motion-ready') && deskMQ.matches;

function setQuad(i, v) {
  const s = v.toFixed(3);
  if (quads[i]._s !== s) { quads[i]._s = s; quads[i].setAttribute('transform', `scale(${s})`); }
}
function fillAll() {
  quads.forEach((_, i) => setQuad(i, 1));
  if (seal) { seal.style.opacity = ''; seal.style.transform = ''; }
}

railBtns.forEach((b) => b.addEventListener('click', () => {
  const i = +b.dataset.go;
  if (pinned()) {
    const top0 = scene.getBoundingClientRect().top + scrollY;
    goTo(top0 + (scene.offsetHeight - innerHeight) * (STEP_AT(i) + 0.13));
  } else {
    goTo(steps[i].getBoundingClientRect().top + scrollY - top.offsetHeight - 16);
  }
}));

/* ------------------------------------------------------------------ */
/* Motion: coreografia                                                  */
/* ------------------------------------------------------------------ */
// Motion 11.11.17 (UMD local em vendor/, global `Motion`); módulos rodam depois dos scripts defer.
const M = window.Motion || null;
if (!M) console.warn('Motion indisponível; página segue estática.');

if (M && reduce) root.classList.add('motion-ready');

if (M && !reduce) {
  const { animate, scroll, inView, stagger } = M;
  const prog = (p) => (typeof p === 'number' ? p : p?.y?.progress ?? 0);

  const frame = $('[data-frame]');
  const portraitImg = $('img', frame);
  const outline = $('[data-outline]');
  const outlineRect = $('rect', outline);
  const field = $('[data-field]');
  const cap = $('.portrait__cap');

  outlineRect.style.strokeDasharray = '1';
  outlineRect.style.strokeDashoffset = '1';
  root.classList.add('motion-ready');

  /* ---- HERO: o contorno se desenha, gira 45° e vira a janela do retrato ---- */
  const outlineScale = deskMQ.matches ? 1.36 : 1.24;
  animate('.hero__title .line > span', { transform: ['translateY(108%)', 'translateY(0%)'] }, { duration: 1, delay: stagger(0.08), ease: EASE_OUT });
  animate('.hero__lead, .hero__actions, .hero__place', { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0)'] }, { duration: 0.8, delay: stagger(0.08, { startDelay: 0.3 }), ease: EASE_OUT });
  // SVG: WAAPI direto no traço (Motion gravaria atributo; o estado inicial está em style inline)
  outlineRect.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1000, delay: 120, easing: EO_CSS, fill: 'both' });
  animate(outline, { transform: ['rotate(0deg) scale(1)', 'rotate(45deg) scale(1)'] }, { duration: 0.85, delay: 0.85, ease: EASE_IN_OUT })
    .then(() => animate(outline, { transform: `rotate(45deg) scale(${outlineScale})` }, { duration: 1.1, delay: 0.55, ease: EASE_OUT }));
  animate(frame, { clipPath: [DIA0, DIA] }, { duration: 0.7, delay: 1.5, ease: EASE_OUT })
    .then(() => animate(frame, { clipPath: CHAM }, { duration: 1.05, delay: 0.2, ease: EASE_IN_OUT }));
  animate(portraitImg, { transform: ['scale(1.28)', 'scale(1)'] }, { duration: 2.4, delay: 1.5, ease: EASE_OUT });
  animate(cap, { opacity: [0, 1], transform: ['translateX(-14px)', 'translateX(0)'] }, { duration: 0.7, delay: 2.6, ease: EASE_OUT });

  /* o losango-moldura se inclina com o ponteiro (mola); pausa fora do hero */
  if (fineMQ.matches) {
    const tilt = springVec((x, y) => {
      outline.style.rotate = `${(x * 4).toFixed(2)}deg`;
      outline.style.translate = `${(x * 10).toFixed(1)}px ${(y * 10).toFixed(1)}px`;
      field.style.translate = `${(-x * 18).toFixed(1)}px calc(-50% + ${(-y * 18).toFixed(1)}px)`;
    }, SPRING_TILT);
    const art = $('[data-hero-art]');
    addEventListener('pointermove', (e) => {
      if (scrollY > innerHeight) return;
      const r = art.getBoundingClientRect();
      tilt(clamp((e.clientX - (r.left + r.width / 2)) / (innerWidth / 2), -1, 1), clamp((e.clientY - (r.top + r.height / 2)) / (innerHeight / 2), -1, 1));
    }, { passive: true });
    document.addEventListener('pointerleave', () => tilt(0, 0));
  }

  /* saída do hero ligada à rolagem */
  const portrait = $('[data-portrait]');
  scroll((p) => {
    const t = prog(p);
    portrait.style.translate = `0 ${(t * -6).toFixed(2)}%`;
    field.style.rotate = `${(t * 22).toFixed(2)}deg`;
  }, { target: $('[data-hero]'), offset: ['start start', 'end start'] });

  /* ---- CENA: quatro triângulos se preenchem; a foto troca dentro do losango ---- */
  let current = 0, swapToken = 0;
  const swapPhoto = (i, dir) => {
    const token = ++swapToken;
    stageImgs.forEach((im, k) => { im.style.zIndex = k === i ? 2 : 1; });
    const next = stageImgs[i];
    animate(next, { clipPath: [DIA4_0, DIA4], transform: [`scale(${dir > 0 ? 1.18 : 0.9})`, 'scale(1)'] }, { duration: 0.75, ease: EASE_IN_OUT })
      .then(() => { if (token === swapToken) stageImgs.forEach((im, k) => { if (k !== i) im.style.clipPath = DIA4_0; }); });
  };
  const showStep = (i) => {
    if (i === current) return;
    const prev = steps[current], next = steps[i], dir = i > current ? 1 : -1;
    current = i;
    animate(prev, { opacity: 0, transform: `translateY(${-14 * dir}px)` }, { duration: 0.24, ease: EASE_OUT })
      .then(() => { if (steps[current] !== prev) prev.style.visibility = 'hidden'; });
    next.style.visibility = 'visible';
    animate(next, { opacity: [0, 1], transform: [`translateY(${18 * dir}px)`, 'translateY(0px)'] }, { duration: 0.5, delay: 0.06, ease: EASE_OUT });
    const t = $('.step__t', next);
    animate(t, { clipPath: ['inset(0% 0% 100% 0%)', 'inset(0% 0% -15% 0%)'] }, { duration: 0.6, delay: 0.06, ease: EASE_OUT });
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    railBtns.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    swapPhoto(i, dir);
  };
  const enterPinned = () => {
    steps.forEach((s, i) => { s.style.opacity = i === current ? 1 : 0; s.style.visibility = i === current ? 'visible' : 'hidden'; s.style.transform = ''; });
    stageImgs.forEach((im, k) => { im.style.clipPath = k === current ? DIA4 : DIA4_0; im.style.zIndex = k === current ? 2 : 1; });
  };
  const leavePinned = () => {
    steps.forEach((s) => { s.style.opacity = ''; s.style.visibility = ''; s.style.transform = ''; });
    labels.forEach((l) => { l.style.opacity = ''; });
    fillAll();
  };
  const renderScene = (p) => {
    if (!pinned()) return;
    quads.forEach((_, i) => setQuad(i, easeOut3(clamp((p - STEP_AT(i)) / 0.17))));
    labels.forEach((l, i) => l.classList.toggle('is-filled', p - STEP_AT(i) > 0.09));
    const s = clamp((p - 0.92) / 0.06);
    seal.style.opacity = s.toFixed(3);
    seal.style.transform = `scale(${(0.6 + 0.4 * easeOut3(s)).toFixed(3)})`;
    labels.forEach((l) => { l.style.opacity = (1 - s).toFixed(3); });
    railFill.style.transform = `scaleY(${p.toFixed(4)})`;
    showStep(Math.min(3, Math.floor(clamp((p - STEP_AT(0)) / 0.94, 0, 0.999) * 4)));
  };
  let lastP = 0;
  if (pinned()) { enterPinned(); renderScene(0); }
  scroll((p) => { lastP = prog(p); renderScene(lastP); }, { target: scene, offset: ['start start', 'end end'] });
  deskMQ.addEventListener('change', () => { if (pinned()) { enterPinned(); renderScene(lastP); } else leavePinned(); });

  /* celular: o losango se completa ao entrar; cada foto de etapa sai do losango */
  if (!deskMQ.matches) {
    quads.forEach((_, i) => setQuad(i, 0));
    seal.style.opacity = 0;
    inView($('.metodo__art'), () => {
      quads.forEach((_, i) => tween(520, (k) => { if (!pinned()) setQuad(i, k); }, i * 300));
      tween(500, (k) => { seal.style.opacity = k.toFixed(3); seal.style.transform = `scale(${(0.6 + 0.4 * k).toFixed(3)})`; }, 1350);
    }, { amount: 0.5 });
  }
  $$('.step__img').forEach((fig) => {
    if (deskMQ.matches || fig.getBoundingClientRect().top < innerHeight) return;
    fig.style.clipPath = DIA;
    const img = $('img', fig);
    img.style.transform = 'scale(1.16)';
    inView(fig.parentElement, () => {
      animate(fig, { clipPath: [DIA, CHAM] }, { duration: 1, ease: EASE_IN_OUT });
      animate(img, { transform: 'scale(1)' }, { duration: 1.4, ease: EASE_OUT });
    }, { amount: 0.3 });
  });

  /* ---- FAIXA: o vinho se abre em losango a partir do centro ---- */
  const band = $('.band__inner');
  scroll((p) => {
    const r = 14 + 100 * easeOut3(prog(p));
    band.style.clipPath = r >= 113 ? 'none' : `polygon(50% ${50 - r}%, ${50 + r}% 50%, 50% ${50 + r}%, ${50 - r}% 50%)`;
  }, { target: $('[data-band]'), offset: ['start end', 'center center'] });

  /* ---- Títulos de seção: revelação por máscara ---- */
  $$('[data-mask]').forEach((h) => {
    if (h.getBoundingClientRect().top < innerHeight) return;
    h.style.clipPath = 'inset(0% 0% 100% 0%)';
    h.style.transform = 'translateY(26px)';
    // observa o pai: alvo recortado por clip-path não conta como visível para o IntersectionObserver
    inView(h.parentElement, () => {
      animate(h, { clipPath: ['inset(0% 0% 100% 0%)', 'inset(0% 0% -14% 0%)'], transform: 'translateY(0px)' }, { duration: 0.95, ease: EASE_OUT });
    }, { amount: 0.25 });
  });

  /* ---- Fotos que assentam no enquadramento ---- */
  $$('[data-zoom]').forEach((fig) => {
    const img = $('img', fig);
    scroll((p) => { img.style.transform = `scale(${(1.16 - 0.16 * easeOut3(prog(p))).toFixed(4)})`; }, { target: fig, offset: ['start end', 'center center'] });
  });

  /* ---- Guias dos cartões: o losango e as linhas se desenham ---- */
  $$('.card__guide').forEach((svg) => {
    const paths = $$('path', svg);
    paths.forEach((p) => { p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1'; });
    inView(svg.closest('.card'), () => {
      paths.forEach((p, i) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: i ? 700 : 1100, delay: i ? 500 + i * 140 : 0, easing: EO_CSS, fill: 'both' }));
    }, { amount: 0.35 });
  });
}
