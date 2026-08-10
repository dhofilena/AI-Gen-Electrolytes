/* ============================================================
   PRELOADER — brand load sequence, then a curtain hand-off.

   Design intent: a hairline progress rule that tracks REAL asset
   readiness (fonts + the hero video's first frame), the wordmark
   resolving above it, then the whole panel lifting away like a
   curtain so the hero can continue the same upward gesture.

   Rules it obeys:
   - Fast. ~1.3s on a warm load. Never longer than HARD_TIMEOUT.
   - Locks scroll via the shared lock helpers, always unlocks.
   - Runs once per session; no-ops for prefers-reduced-motion.
   - Broadcasts `preloader:lift` (curtain starts moving — hero may
     begin) and `preloader:done` (scroll released), and mirrors the
     state onto <html data-preloader> for late-mounting listeners.
   ============================================================ */

import {
  gsap,
  ScrollTrigger,
  prefersReducedMotion,
  lockScroll,
  unlockScroll,
} from '../lib/scroll.js';
import { DUR, EASE, EASE_MASK } from '../lib/reveal.js';
import { product } from '../data/content.js';

/* Engineering ceilings, not motion values. */
const HARD_TIMEOUT = 2500; // ms — the page can never hang behind the curtain
const FONT_GATE = 420;     // ms — longest we wait on webfonts before showing the mark
const VIDEO_LOOKUP = 500;  // ms — longest we wait for the hero to mount its <video>
const VIDEO_MAX = 1200;    // ms — longest we wait for its first frame to decode
const SEEN_KEY = 'eb:preloaded';

/* Held just long enough for the wordmark to settle. Derived from the
   shared reveal vocabulary — not an invented duration. */
const MIN_HOLD = DUR.fast * 0.8;

/* Wall-clock length of the exit timeline, plus slack. Used only as a
   failsafe: GSAP is rAF-driven, so in a backgrounded tab its callbacks
   never fire. The curtain must still come down. */
const EXIT_MS = (0.3 + DUR.fast) * 1000 + 200;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function seenThisSession() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberSession() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* private mode — the preloader simply runs again next load */
  }
}

/* Resolves when the hero's first video frame is decodable. If the hero
   has not mounted a <video> within VIDEO_LOOKUP, we stop caring. */
function heroFrameReady() {
  return new Promise((resolve) => {
    const t0 = performance.now();

    const attach = (v) => {
      if (v.readyState >= 2) return resolve();
      v.addEventListener('loadeddata', () => resolve(), { once: true });
      v.addEventListener('error', () => resolve(), { once: true });
    };

    /* setTimeout, not rAF — a backgrounded tab freezes rAF and this poll
       would never terminate on its own. */
    const look = () => {
      const v = document.querySelector('#hero video');
      if (v) return attach(v);
      if (performance.now() - t0 > VIDEO_LOOKUP) return resolve();
      setTimeout(look, 40);
    };

    look();
  });
}

export default function mount(root) {
  const html = document.documentElement;

  const announce = (state) => {
    html.dataset.preloader = state;
    document.dispatchEvent(new CustomEvent(`preloader:${state}`));
  };

  /* ---------- skip paths: reduced motion, or already seen ---------- */
  if (prefersReducedMotion || seenThisSession()) {
    root.hidden = true;
    root.innerHTML = '';
    announce('lift');
    announce('done');
    return;
  }

  rememberSession();

  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');

  root.innerHTML = `
    <div class="pre__panel grain">
      <div class="pre__stage">
        <span class="pre__mask"><span class="pre__mark">${product.brand}</span></span>
        <span class="pre__mask pre__mask--sub"><span class="pre__sub">${product.name}</span></span>
      </div>
      <div class="pre__rule" aria-hidden="true"><span class="pre__fill"></span></div>
    </div>
    <span class="u-sr">Loading</span>
  `;

  const q = (s) => root.querySelector(s);
  const panel = q('.pre__panel');
  const stage = q('.pre__stage');
  const mark = q('.pre__mark');
  const sub = q('.pre__sub');
  const rule = q('.pre__rule');
  const fill = q('.pre__fill');

  lockScroll();

  /* ---------- honest progress ----------
     The rule only ever advances on a real signal. It never reaches
     the end until the curtain is actually about to lift. */
  let p = 0;
  const advance = (target) => {
    if (target <= p) return;
    p = target;
    gsap.to(fill, { scaleX: p, duration: DUR.fast, ease: EASE, overwrite: 'auto' });
  };

  advance(0.1); // something is happening, from the first frame

  /* ---------- the wordmark resolving ---------- */
  const intro = gsap.timeline({ paused: true });
  intro
    .fromTo(mark, { yPercent: 106 }, { yPercent: 0, duration: DUR.fast, ease: EASE }, 0)
    .fromTo(
      sub,
      { yPercent: 106, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: DUR.fast, ease: EASE },
      0.09
    );

  const fontsReady =
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  /* Webfonts use font-display: block, so hold the mark until the face
     lands (or we give up) — otherwise it animates while invisible. */
  const fontGate = Promise.race([fontsReady, wait(FONT_GATE)]);

  fontGate.then(() => {
    advance(0.46);
    intro.play();
  });

  /* setTimeout, not gsap.delayedCall — this gate must tick even when the
     tab is in the background and the rAF ticker is asleep. */
  const held = fontGate.then(() => wait(MIN_HOLD * 1000));
  /* A stalled decode (throttled tab, slow network) must not eat the whole
     budget — the video channel gives up on its own, well before HARD_TIMEOUT. */
  const videoReady = Promise.race([heroFrameReady(), wait(VIDEO_MAX)]);
  const assets = Promise.all([fontsReady, videoReady]).then(() => advance(0.9));

  /* ---------- the curtain ---------- */
  let exited = false;
  let finished = false;

  /* Idempotent, and never dependent on an animation callback. */
  const finish = () => {
    if (finished) return;
    finished = true;
    if (html.dataset.preloader !== 'lift') announce('lift');
    root.hidden = true;
    unlockScroll();
    ScrollTrigger.refresh();
    announce('done');
  };

  const exit = () => {
    if (exited) return;
    exited = true;

    const tl = gsap.timeline({ onComplete: finish });

    tl.to(fill, { scaleX: 1, duration: DUR.fast * 0.5, ease: EASE, overwrite: 'auto' }, 0)
      .to(
        [mark, sub],
        { yPercent: -22, opacity: 0, duration: DUR.fast, ease: EASE, stagger: 0.05 },
        0.05
      )
      .to(rule, { opacity: 0, duration: DUR.fast * 0.4, ease: EASE }, 0.28)
      /* The hero starts its reveal underneath while the curtain is still
         travelling — one continuous gesture, not two events. */
      .add(() => announce('lift'), 0.3)
      .to(stage, { yPercent: -18, duration: DUR.fast, ease: EASE_MASK }, 0.3)
      .to(panel, { yPercent: -100, duration: DUR.fast, ease: EASE_MASK }, 0.3);

    setTimeout(finish, EXIT_MS);
  };

  Promise.race([Promise.all([held, assets]), wait(HARD_TIMEOUT)]).then(exit);

  /* Absolute ceiling. Whatever happens above, the page is never trapped. */
  setTimeout(finish, HARD_TIMEOUT + EXIT_MS);
}
