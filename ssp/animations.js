// Easing presets
const EASE_OUT_QUART = 'cubic-bezier(0.25, 1, 0.5, 1)';
const EASE_IN_OUT    = 'cubic-bezier(0.4, 0, 0.2, 1)';
const EASE_SPRING    = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

 // ─── CONFIG ───────────────────────────────
  const REDIRECT_URL  = 'https://docs.google.com/forms/d/e/1FAIpQLSfRrsOsijDV05JGNnRzP-Ach7mRci7980qrvOxf6oAu8vY0zA/viewform?usp=publish-editor';
  const redirect_name = 'Formulir Pendaftaran SSP 2026';
  const COUNTDOWN_SEC = 2;
  // ──────────────────────────────────────────

  // Tampilkan URL tujuan
  document.getElementById('dest-url').textContent =
    redirect_name.replace(/^https?:\/\//, '');

  // Progress bar via JS animation
  const bar    = document.getElementById('progress-bar');
  const countEl = document.getElementById('countdown');
  let remaining  = COUNTDOWN_SEC;
  let cancelled  = false;
  let tickInterval;

  // Jalankan progress bar (WAAPI)
  function startProgressBar() {
    bar.animate([
      { width: '0%' },
      { width: '100%' },
    ], {
      duration: COUNTDOWN_SEC * 1000,
      easing: 'linear',
      fill: 'forwards',
    });
  }

  // Countdown tick
  function startCountdown() {
    tickInterval = setInterval(() => {
      if (cancelled) return clearInterval(tickInterval);
      remaining--;
      countEl.textContent = remaining;

      // Flash animasi angka (dari animations.js)
      if (window.Anim) window.Anim.flashCountdown();

      if (remaining <= 0) {
        clearInterval(tickInterval);
        window.location.href = REDIRECT_URL;
      }
    }, 1000);
  }

  // Batalkan redirect
  function cancelRedirect() {
    cancelled = true;
    clearInterval(tickInterval);

    // Animasi cancel (dari animations.js)
    if (window.Anim) window.Anim.animateCancel();

    document.querySelector('.countdown-text').textContent = 'Redirect dibatalkan.';
    document.querySelector('.cancel-link').style.display = 'none';
    document.querySelector('.redirect-label').textContent = '✕ Dibatalkan';
  }

  document.getElementById('cancel-btn').addEventListener('click', cancelRedirect);

  // Mulai setelah DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(startProgressBar, 50);
    startCountdown();
  });
/* ─────────────────────────────────────────────
   1. HEADING: animasi per karakter
   ───────────────────────────────────────────── */

function animateHeadingChars(startDelay = 200) {
  const h1 = document.querySelector('.middle h1');
  if (!h1) return;

  const originalText = h1.textContent.trim();
  h1.textContent = '';
  h1.style.opacity = '1';

  // Bungkus tiap karakter dalam <span>
  [...originalText].forEach((char, i) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.cssText = `
      display: inline-block;
      opacity: 0;
      transform: translateY(20px) scale(0.85);
      will-change: transform, opacity;
    `;
    h1.appendChild(span);

    // Animasi tiap span dengan delay bertahap
    const delay = startDelay + i * 45;
    span.animate([
      { opacity: 0, transform: 'translateY(22px) scale(0.8)' },
      { opacity: 1, transform: 'translateY(0)   scale(1)'   },
    ], {
      duration: 550,
      delay,
      fill: 'forwards',
      easing: EASE_SPRING,
    });
  });

  // Setelah semua karakter muncul, tambahkan efek glow shimmer pada h1
  const totalDuration = startDelay + originalText.length * 45 + 550;
  setTimeout(() => runHeadingGlow(h1), totalDuration);
}

// Glow shimmer loop pada heading
function runHeadingGlow(el) {
  el.animate([
    { textShadow: '0 0 0px rgba(245,200,66,0)'    },
    { textShadow: '0 0 20px rgba(245,200,66,0.45)' },
    { textShadow: '0 0 0px rgba(245,200,66,0)'    },
  ], {
    duration: 3000,
    iterations: Infinity,
    easing: 'ease-in-out',
  });
}


/* ─────────────────────────────────────────────
   2. ENTRANCE ANIMATIONS (elemen lainnya)
   ───────────────────────────────────────────── */

function runEntranceAnimations() {

  function animateIn(selector, keyframes, options) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.style.opacity = '0';
    el.animate(keyframes, {
      ...options,
      fill: 'forwards',
      easing: options.easing ?? EASE_OUT_QUART,
    });
  }

  // ── Logo (slide dari kiri) ──
  animateIn('.topleft', [
    { opacity: 0, transform: 'translateX(-28px)' },
    { opacity: 1, transform: 'translateX(0)' },
  ], { duration: 700, delay: 0 });

  // ── Label organisasi ──
  animateIn('.topleft2', [
    { opacity: 0, transform: 'translateX(-24px)' },
    { opacity: 0.9, transform: 'translateX(0)' },
  ], { duration: 700, delay: 120 });

  // ── Heading: animasi per karakter ──
  animateHeadingChars(200);

  // ── Subtitle ──
  animateIn('.subtitle', [
    { opacity: 0, transform: 'translateY(20px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 700, delay: 480 });

  // ── Garis HR (expand dari tengah) ──
  animateIn('hr', [
    { opacity: 0, width: '0px' },
    { opacity: 1, width: '60px' },
  ], { duration: 600, delay: 600, easing: EASE_IN_OUT });

  // ── Redirect card ──
  animateIn('.redirect-card', [
    { opacity: 0, transform: 'translateY(24px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 800, delay: 700 });

  // ── Copyright bawah ──
  animateIn('.bottomleft', [
    { opacity: 0 },
    { opacity: 0.4 },
  ], { duration: 1000, delay: 1000, easing: 'ease' });
}


/* ─────────────────────────────────────────────
   3. LOGO PULSE
   ───────────────────────────────────────────── */

function runLogoPulse() {
  const logo = document.querySelector('.logo');
  if (!logo) return;

  logo.animate([
    { boxShadow: '0 0 0 4px rgba(245,200,66,0.15)' },
    { boxShadow: '0 0 0 10px rgba(245,200,66,0.2), 0 0 28px rgba(245,200,66,0.25)' },
    { boxShadow: '0 0 0 4px rgba(245,200,66,0.15)' },
  ], {
    duration: 3000,
    delay: 1500,
    iterations: Infinity,
    easing: 'ease-in-out',
  });
}


/* ─────────────────────────────────────────────
   4. PARTIKEL MENGAMBANG
   ───────────────────────────────────────────── */

function spawnParticles() {
  const bg = document.getElementById('bg');
  if (!bg) return;

  const COUNT = 22;
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('div');
    const size   = Math.random() * 5 + 2;
    const left   = Math.random() * 100;
    const bottom = Math.random() * 45;
    const dur    = Math.random() * 6000 + 4000;
    const delay  = Math.random() * 6000;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      position: absolute;
      left: ${left}%;
      bottom: ${bottom}%;
      border-radius: 50%;
      background: #f5c842;
      pointer-events: none;
      z-index: 1;
      opacity: 0;
    `;
    bg.appendChild(p);

    p.animate([
      { opacity: 0,    transform: 'translateY(0px)    scale(0.5)' },
      { opacity: 0.45, transform: 'translateY(-40px)  scale(0.9)', offset: 0.2 },
      { opacity: 0.2,  transform: 'translateY(-90px)  scale(1.1)', offset: 0.8 },
      { opacity: 0,    transform: 'translateY(-130px) scale(1.3)' },
    ], {
      duration: dur,
      delay,
      iterations: Infinity,
      easing: 'ease-in-out',
    });
  }
}


/* ─────────────────────────────────────────────
   5. COUNTDOWN FLASH
   ───────────────────────────────────────────── */

function flashCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  el.animate([
    { opacity: 1,   transform: 'scale(1.5)', color: '#ffffff' },
    { opacity: 0.8, transform: 'scale(1)',   color: '#f5c842' },
  ], {
    duration: 350,
    easing: EASE_OUT_QUART,
    fill: 'forwards',
  });
}


/* ─────────────────────────────────────────────
   6. ANIMASI CANCEL
   ───────────────────────────────────────────── */

function animateCancel() {
  const card = document.querySelector('.redirect-card');
  const bar  = document.getElementById('progress-bar');

  if (card) {
    card.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(0)' },
    ], { duration: 400, easing: 'ease-in-out' });
  }

  if (bar) {
    bar.animate([
      { width: bar.style.width || '50%', background: '#f5c842' },
      { width: '0%',                     background: 'rgba(255,255,255,0.2)' },
    ], { duration: 500, easing: EASE_IN_OUT, fill: 'forwards' });
  }
}


/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  runEntranceAnimations();
  runLogoPulse();
  spawnParticles();
});

window.Anim = { flashCountdown, animateCancel };
