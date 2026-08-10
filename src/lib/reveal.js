/* ============================================================
   REVEAL — shared entrance vocabulary.
   Every section uses these so the whole page moves as ONE system.
   Do not invent new easing/duration in a section; extend here.
   ============================================================ */

import SplitType from 'split-type';
import { gsap, ScrollTrigger, prefersReducedMotion } from './scroll.js';

/* Re-exported: reveal.js is the motion module, so sections naturally reach for
   this here rather than in scroll.js. Without it, `import { prefersReducedMotion }
   from '../lib/reveal.js'` throws at mount and takes the whole section down. */
export { prefersReducedMotion, gsap, ScrollTrigger };

/* The house curve. Matches --e-out in tokens.css. */
export const EASE = 'expo.out';
export const EASE_MASK = 'power4.inOut';

export const DUR = {
  fast: 0.55,
  mid: 0.95,
  slow: 1.35,
};

/* Standard trigger position — content begins revealing when its top
   crosses 82% of viewport height. Consistent everywhere = coherent page. */
export const START = 'top 82%';

/* ---- shared resize bus ----
   One listener for the whole page instead of one per revealLines() call.
   With 15 sections the per-call version leaked a listener each, and every
   one of them re-split text on every resize. */
const resizeSubs = new Set();
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeSubs.forEach((fn) => {
      try { fn(); } catch (e) { console.error('[reveal] resize handler', e); }
    });
    ScrollTrigger.refresh();
  }, 240);
});

export function onResize(fn) {
  resizeSubs.add(fn);
  return () => resizeSubs.delete(fn);
}

/**
 * Split an element into masked lines and stagger them up.
 * This is THE headline reveal for the whole site.
 */
export function revealLines(el, opts = {}) {
  if (!el) return null;
  if (prefersReducedMotion) {
    gsap.set(el, { opacity: 1 });
    return null;
  }

  const split = new SplitType(el, { types: 'lines', lineClass: 'split-line' });

  // Wrap each line so it can be masked by overflow hidden.
  const wrapLines = () => {
    split.lines.forEach((line) => {
      if (line.parentNode?.classList?.contains('line-mask')) return;
      const shell = document.createElement('span');
      shell.className = 'line-mask';
      line.parentNode.insertBefore(shell, line);
      shell.appendChild(line);
    });
  };
  wrapLines();

  el.classList.add('gsap-managed');

  const tween = gsap.fromTo(
    split.lines,
    // 128, not 100: .line-mask carries 0.18em of bottom padding to save
    // descenders from the clip, and the offset must clear that too.
    { yPercent: 128, opacity: 0 },
    {
      yPercent: 0,
      opacity: 1,
      duration: opts.duration ?? DUR.slow,
      ease: opts.ease ?? EASE,
      stagger: opts.stagger ?? 0.085,
      scrollTrigger: opts.trigger === false ? undefined : {
        trigger: opts.triggerEl ?? el,
        start: opts.start ?? START,
        once: true,
      },
      delay: opts.delay ?? 0,
      paused: opts.paused ?? false,
    }
  );

  /* Re-split on resize so line breaks stay correct. SplitType regenerates the
     DOM from its stored HTML, which destroys the .line-mask shells we inserted
     — so re-wrap and restore the resolved end state, or headlines silently
     lose their masks (and can revert to hidden) after any resize. */
  onResize(() => {
    split.split({ types: 'lines' });
    wrapLines();
    gsap.set(split.lines, { yPercent: 0, opacity: 1 });
  });

  return tween;
}

/** Simple staggered rise for cards, list items, meta rows. */
export function revealRise(targets, opts = {}) {
  const els = gsap.utils.toArray(targets);
  if (!els.length) return null;
  if (prefersReducedMotion) {
    gsap.set(els, { opacity: 1, y: 0 });
    return null;
  }

  return gsap.fromTo(
    els,
    { y: opts.distance ?? 34, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: opts.duration ?? DUR.mid,
      ease: opts.ease ?? EASE,
      stagger: opts.stagger ?? 0.07,
      // `trigger: false` runs immediately — for above-the-fold load sequences
      // that must not wait on a scroll position that is already passed.
      scrollTrigger: opts.trigger === false ? undefined : {
        trigger: opts.triggerEl ?? els[0],
        start: opts.start ?? START,
        once: true,
      },
      delay: opts.delay ?? 0,
    }
  );
}

/** Curtain-wipe a media frame open while its inner media scales down. */
export function revealMedia(frame, opts = {}) {
  if (!frame) return null;
  const inner = frame.querySelector('img, video, .media-inner');
  if (prefersReducedMotion) {
    gsap.set([frame, inner], { clipPath: 'none', scale: 1 });
    return null;
  }

  const tl = gsap.timeline({
    delay: opts.delay ?? 0,
    scrollTrigger: opts.trigger === false ? undefined : {
      trigger: frame,
      start: opts.start ?? 'top 88%',
      once: true,
    },
  });

  tl.fromTo(
    frame,
    { clipPath: 'inset(0% 0% 100% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.slow, ease: EASE_MASK }
  );

  if (inner) {
    tl.fromTo(
      inner,
      { scale: 1.28 },
      { scale: 1, duration: DUR.slow + 0.35, ease: EASE },
      0
    );
  }

  return tl;
}

/** Parallax an element within its scroll range. Subtle only — max ~12%. */
export function parallax(el, opts = {}) {
  if (!el || prefersReducedMotion) return null;
  const amount = opts.amount ?? 10;
  return gsap.fromTo(
    el,
    { yPercent: -amount / 2 },
    {
      yPercent: amount / 2,
      ease: 'none',
      scrollTrigger: {
        trigger: opts.triggerEl ?? el.parentElement ?? el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: opts.scrub ?? true,
      },
    }
  );
}

/** Count a number up when it enters. Used for stats. */
export function countUp(el, to, opts = {}) {
  if (!el) return null;
  const obj = { v: opts.from ?? 0 };
  const decimals = opts.decimals ?? 0;
  const format = opts.format ?? ((v) => v.toFixed(decimals));

  if (prefersReducedMotion) {
    el.textContent = format(to);
    return null;
  }

  el.textContent = format(obj.v);

  return gsap.to(obj, {
    v: to,
    duration: opts.duration ?? 1.9,
    ease: opts.ease ?? 'power3.out',
    delay: opts.delay ?? 0,
    onUpdate: () => { el.textContent = format(obj.v); },
    /* START, not its own 'top 85%'. A counter is an ENTRANCE, so it belongs
       on the same line as revealLines and revealRise. The page only has two
       legitimate trigger lines — START for content and 'top 88%' for media
       (revealMedia below) — and offering a third from the shared library is
       what sent sections off inventing 78% / 86% / 90% / 92% of their own. */
    scrollTrigger: opts.trigger === false ? undefined : {
      trigger: opts.triggerEl ?? el,
      start: opts.start ?? START,
      once: true,
    },
  });
}

/**
 * Seamless looping video.
 *
 * Every generated clip is ~5s and a bare `loop` attribute snaps from the last
 * frame back to the first — on the hero that is a visible jump-cut on the
 * single most important element of the page. This stacks two copies of the
 * same file and crossfades A→B before A ends, so the loop point is a dissolve
 * instead of a cut.
 *
 * Markup: give the container a `.vloop` class; this creates the layers.
 *   <div class="vloop" data-src="/media/hero-dissolve.mp4" data-poster="…"></div>
 *
 * @param {HTMLElement} host   container (position:relative, overflow:hidden)
 * @param {object} opts        { fade = 0.8, tailTrim = 0.25, objectPosition }
 */
export function seamlessLoop(host, opts = {}) {
  if (!host) return null;
  const src = opts.src ?? host.dataset.src;
  if (!src) return null;

  const fade = opts.fade ?? 0.8;
  // Trim a little off the end — generated clips often drift or flash on the
  // final frames, and we want to be fully crossfaded before that happens.
  const tailTrim = opts.tailTrim ?? 0.25;

  const make = () => {
    const v = document.createElement('video');
    v.src = src;
    v.muted = true;
    v.playsInline = true;
    v.loop = false;
    v.preload = 'auto';
    if (opts.poster ?? host.dataset.poster) v.poster = opts.poster ?? host.dataset.poster;
    v.className = 'vloop__layer fill';
    if (opts.objectPosition) v.style.objectPosition = opts.objectPosition;
    host.appendChild(v);
    return v;
  };

  const a = make();
  const b = make();
  b.style.opacity = '0';

  let front = a, back = b, timer = null, stopped = false;

  const duration = () => (a.duration && isFinite(a.duration) ? a.duration : 5);

  function cycle() {
    if (stopped) return;
    const d = duration() - tailTrim;
    const wait = Math.max(120, (d - fade) * 1000);

    timer = setTimeout(() => {
      if (stopped) return;

      /* Capture BOTH layers before the swap. The onComplete closure reads the
         `front` binding, not its value at schedule time — so after the swap on
         the line below it would pause the layer that just faded IN, stalling
         the visible video ~2/3 of every cycle. */
      const outgoing = front;
      const incoming = back;

      incoming.currentTime = 0;
      incoming.play().catch(() => {});
      gsap.to(incoming, { opacity: 1, duration: fade, ease: 'none' });
      gsap.to(outgoing, {
        opacity: 0,
        duration: fade,
        ease: 'none',
        onComplete: () => { outgoing.pause(); },
      });

      [front, back] = [incoming, outgoing];
      cycle();
    }, wait);
  }

  function start() {
    if (prefersReducedMotion) { a.pause(); return; }
    stopped = false;
    front.play().catch(() => {});
    clearTimeout(timer);
    cycle();
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
    a.pause();
    b.pause();
  }

  a.addEventListener('loadedmetadata', () => { host.dataset.ready = '1'; }, { once: true });

  // Only run while on screen.
  ScrollTrigger.create({
    trigger: host,
    start: 'top bottom',
    end: 'bottom top',
    onEnter: start,
    onEnterBack: start,
    onLeave: stop,
    onLeaveBack: stop,
  });

  if (prefersReducedMotion) {
    a.addEventListener('loadeddata', () => { a.currentTime = duration() * 0.5; }, { once: true });
  }

  return { start, stop, layers: [a, b] };
}

/** Lazily play/pause a video only while it is on screen. Saves GPU. */
export function autoplayInView(video) {
  if (!video) return;
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.preload = 'metadata';

  ScrollTrigger.create({
    trigger: video,
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => video.play().catch(() => {}),
    onEnterBack: () => video.play().catch(() => {}),
    onLeave: () => video.pause(),
    onLeaveBack: () => video.pause(),
  });
}
