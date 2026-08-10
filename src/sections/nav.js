/* ============================================================
   NAV — fixed, scroll-aware page chrome.

   Transparent over the hero, resolving into a blurred ink bar once
   the hero is behind you. Calm hide-on-scroll-down (threshold-based,
   never twitchy). Active section driven by ScrollTrigger as a
   hairline, not a pill. Under 1024px it collapses to a full-screen
   panel with large type, a staggered reveal, a focus trap and a
   scroll lock.

   The wordmark is type, not an image: Neue Haas Unica Bold, tight
   tracking, paired with a hairline-separated product label.
   ============================================================ */

import {
  gsap,
  ScrollTrigger,
  prefersReducedMotion,
  lockScroll,
  unlockScroll,
  getLenis,
} from '../lib/scroll.js';
import { DUR, EASE, EASE_MASK } from '../lib/reveal.js';
import { nav as navLinks, product } from '../data/content.js';

/* Scroll thresholds — calm, not twitchy. */
const HIDE_AFTER = 120; // px of continuous downward travel before the bar retracts
const SHOW_AFTER = 80;  // px of upward travel before it comes back
const REVEAL_FALLBACK = 2600; // ms — nav must never stay invisible if the preloader dies

const money = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export default function mount(root) {
  const price = money(product.priceSale);
  const pad = (i) => String(i + 1).padStart(2, '0');

  root.innerHTML = `
    <div class="nav__shell">
      <nav class="nav__bar" aria-label="Primary">
        <a class="nav__brand" href="#hero">
          <span class="nav__wordmark">${product.brand}</span>
          <span class="nav__brandrule" aria-hidden="true"></span>
          <span class="nav__product">${product.name}</span>
        </a>

        <ul class="nav__links">
          ${navLinks
            .map(
              (l) =>
                `<li><a class="nav__link" href="${l.href}" data-nav="${l.href}">${l.label}</a></li>`
            )
            .join('')}
        </ul>

        <div class="nav__actions">
          <a class="nav__cta" href="#offer">
            <span>Buy</span><span class="nav__cta-price num">${price}</span>
          </a>
          <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-panel">
            <span class="u-sr">Menu</span>
            <span class="nav__toggle-bars" aria-hidden="true"><i></i><i></i></span>
          </button>
        </div>
      </nav>
    </div>

    <div class="nav__panel" id="nav-panel" aria-hidden="true">
      <ul class="nav__plist">
        ${navLinks
          .map(
            (l, i) => `
          <li class="nav__pitem">
            <a class="nav__plink" href="${l.href}">
              <span class="nav__pidx num">${pad(i)}</span>
              <span class="nav__plabel">${l.label}</span>
            </a>
          </li>`
          )
          .join('')}
      </ul>

      <div class="nav__pfoot">
        <a class="nav__cta nav__cta--block" href="#offer">
          <span>Buy</span><span class="nav__cta-price num">${price}</span>
        </a>
        <p class="nav__pnote"><span class="num">${product.guaranteeDays}</span>-day money-back guarantee</p>
      </div>
    </div>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  const shell = q('.nav__shell');
  const panel = q('.nav__panel');
  const toggle = q('.nav__toggle');
  const links = qa('.nav__link');
  const pitems = qa('.nav__plink');
  const pfoot = q('.nav__pfoot');

  /* ================= entrance — handed off by the preloader ================= */

  let revealed = false;

  function revealNav() {
    if (revealed) return;
    revealed = true;

    /* Visibility is a class, not a tween — a stalled ticker can never
       leave the page without navigation. GSAP only adds the motion. */
    root.classList.add('is-revealed');

    if (prefersReducedMotion) {
      gsap.set(shell, { yPercent: 0 });
      return;
    }

    gsap.fromTo(shell, { yPercent: -100 }, { yPercent: 0, duration: DUR.mid, ease: EASE });
  }

  if (document.documentElement.dataset.preloader) {
    revealNav();
  } else {
    document.addEventListener('preloader:lift', revealNav, { once: true });
    setTimeout(revealNav, REVEAL_FALLBACK);
  }

  /* ================= mobile panel ================= */

  let open = false;
  let savedY = 0;
  let visTimer = 0;

  const panelTl = prefersReducedMotion
    ? null
    : gsap
        .timeline({ paused: true })
        .fromTo(
          panel,
          { clipPath: 'inset(0% 0% 100% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.fast, ease: EASE_MASK },
          0
        )
        .fromTo(
          pitems,
          { yPercent: 112, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: DUR.mid, ease: EASE, stagger: 0.065 },
          DUR.fast * 0.45
        )
        .fromTo(
          pfoot,
          { yPercent: 30, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: DUR.mid, ease: EASE },
          DUR.fast * 0.45 + 0.12
        );

  /* Wall-clock length of the reversed panel timeline, plus slack. */
  const CLOSE_MS = panelTl ? (panelTl.duration() / 1.5) * 1000 + 80 : 0;

  function focusables() {
    return [toggle, ...panel.querySelectorAll('a[href], button:not([disabled])')];
  }

  function setOpen(next) {
    if (open === next) return;
    open = next;

    root.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));

    clearTimeout(visTimer);

    if (open) {
      savedY = window.scrollY || document.documentElement.scrollTop || 0;
      panel.style.visibility = 'visible';
      setHidden(false);
      lockScroll();
      if (panelTl) panelTl.timeScale(1).play();
      /* Synchronous — the panel is already visible, and a rAF here would
         never land in a tab whose ticker is asleep. */
      const first = panel.querySelector('a[href]');
      if (first) first.focus({ preventScroll: true });
    } else {
      unlockScroll();
      /* body.is-locked collapses document height, so the browser may clamp
         the scroll position to 0. Put it back before anything else runs. */
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(savedY, { immediate: true, force: true });
      else window.scrollTo(0, savedY);

      if (panelTl) panelTl.timeScale(1.5).reverse();

      /* Timer, not an animation callback — the panel must always end up
         out of the hit-test tree even if the ticker is asleep. */
      visTimer = setTimeout(() => {
        if (!open) panel.style.visibility = '';
      }, CLOSE_MS);
    }
  }

  toggle.addEventListener('click', () => setOpen(!open));

  /* Close on link click — synchronously, so the shared anchor handler in
     scroll.js finds Lenis already running and can route the scroll. */
  panel.addEventListener('click', (e) => {
    if (e.target.closest('a[href]')) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (!open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      toggle.focus({ preventScroll: true });
      return;
    }

    if (e.key !== 'Tab') return;

    const ring = focusables();
    if (!ring.length) return;
    const first = ring[0];
    const last = ring[ring.length - 1];
    const active = document.activeElement;

    if (!ring.includes(active)) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus({ preventScroll: true });
    }
  });

  /* Never leave the panel open across a breakpoint change. */
  const wide = window.matchMedia('(min-width: 1025px)');
  const onWide = (e) => {
    if (e.matches && open) setOpen(false);
  };
  if (wide.addEventListener) wide.addEventListener('change', onWide);

  /* ================= scroll state ================= */

  let hidden = false;

  function setHidden(next) {
    if (hidden === next) return;
    hidden = next;
    if (prefersReducedMotion) {
      gsap.set(shell, { yPercent: next ? -101 : 0 });
      return;
    }
    gsap.to(shell, {
      yPercent: next ? -101 : 0,
      duration: DUR.fast,
      ease: EASE_MASK,
      overwrite: 'auto',
    });
  }

  function setActive(href) {
    links.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === href));
  }

  /* Transparent over the hero, solid once it is behind you. */
  const hero = document.querySelector('#hero');
  if (hero) {
    ScrollTrigger.create({
      trigger: hero,
      start: 'bottom top+=1',
      onEnter: () => root.classList.add('is-solid'),
      onLeaveBack: () => {
        root.classList.remove('is-solid');
        setActive(null);
      },
    });
  }

  /* Active section — subtle, hairline only. */
  navLinks.forEach(({ href }) => {
    const el = document.querySelector(href);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => {
        if (self.isActive) setActive(href);
      },
    });
  });

  /* Calm hide-on-down / show-on-up: needs sustained travel, not a flick. */
  let lastY = 0;
  let acc = 0;
  let dir = 0;

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      const dy = y - lastY;
      lastY = y;

      if (open) return;

      /* Always visible while the hero is on screen. */
      if (y < window.innerHeight * 0.9) {
        acc = 0;
        setHidden(false);
        return;
      }

      const sign = Math.sign(dy);
      if (sign === 0) return;
      if (sign !== dir) {
        dir = sign;
        acc = 0;
      }
      acc += dy;

      if (acc > HIDE_AFTER) setHidden(true);
      else if (acc < -SHOW_AFTER) setHidden(false);
    },
  });
}
