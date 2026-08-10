/* ============================================================
   SCROLL ENGINE — Lenis + GSAP ScrollTrigger
   One instance, owned here. Sections never construct their own.
   ============================================================ */

import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;

export function initScroll() {
  if (prefersReducedMotion) {
    // No smooth scroll, but ScrollTrigger still drives layout-safe reveals.
    ScrollTrigger.refresh();
    return null;
  }

  lenis = new Lenis({
    /* Weighted, cinematic feel. Higher duration = more glide.
       Polestar/Oura sit around 1.1–1.4s with a strong expo-out. */
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 0.92,
    touchMultiplier: 1.6,
    syncTouch: false,
    lerp: null,
  });

  lenis.on('scroll', ScrollTrigger.update);

  // Exposed so the headless capture harness (tools/shoot.mjs) can drive
  // scroll deterministically — Lenis owns wheel input, so window.scrollTo
  // alone would fight it and produce torn frames mid-capture.
  window.__lenis = lenis;
  window.ScrollTrigger = ScrollTrigger; // read-only, for tools/check-triggers.mjs

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.defaults({
    // Sections opt into markers locally during dev only.
    invalidateOnRefresh: true,
  });

  // Anchor links route through Lenis so they inherit the same easing.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: 0, duration: 1.5 });
  });

  return lenis;
}

export function getLenis() {
  return lenis;
}

export function lockScroll() {
  if (lenis) lenis.stop();
  document.body.classList.add('is-locked');
}

export function unlockScroll() {
  if (lenis) lenis.start();
  document.body.classList.remove('is-locked');
}

/* Refresh after fonts + media settle so pinned trigger math is correct.

   Pinned sections insert pin-spacers, which grow the document AFTER their
   triggers are created. A single refresh is not enough: refreshing computes
   positions, which creates/resizes spacers, which invalidates the positions
   just computed. Measured symptom before this fix — every section below the
   two pins had a start 1890–2385px early (a normal start sits within one
   viewport of its element top), so `onLeave` fired before the reader arrived
   and any onToggle state machine below the pins never activated.

   ScrollTrigger.sort() orders triggers by document position; refreshing twice
   in a row lets the second pass see the spacers the first pass produced. The
   staged repeats catch late media and matchMedia contexts that register after
   load. */
function settle() {
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  ScrollTrigger.refresh();
}

export function refreshWhenReady() {
  const refresh = () => settle();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refresh);
  }
  window.addEventListener('load', () => {
    refresh();
    [120, 600, 1600].forEach((ms) => setTimeout(refresh, ms));
  });
  // Media that loads late shifts layout; catch it.
  document.querySelectorAll('video').forEach((v) => {
    v.addEventListener('loadedmetadata', refresh, { once: true });
  });
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(refresh, 180);
  });

  /* Media that resolves after `load` (posters swapping to video, late images,
     a section that grows when its film finally decodes) shifts document height
     without firing resize — and every ScrollTrigger below it silently desyncs,
     which can strand a pinned section at progress 1. Watch the document box. */
  if ('ResizeObserver' in window) {
    let rt;
    let last = document.body.scrollHeight;
    new ResizeObserver(() => {
      const h = document.body.scrollHeight;
      if (Math.abs(h - last) < 4) return;
      last = h;
      clearTimeout(rt);
      rt = setTimeout(refresh, 200);
    }).observe(document.body);
  }
}

export { gsap, ScrollTrigger };
