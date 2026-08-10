/* ============================================================
   MYTH — the argumentative turn of the page.

   Two beats, one reframe:
     01  THE CLAIM      salt macro, the category's sodium story
     02  THE CORRECTION pure ink, one enormous number

   Desktop pins the stage and scrubs between the beats so the
   rug is pulled by the scroll itself. Under 861px — or with
   reduced motion at any width — the same three beats degrade
   to a stacked reveal, no pin, same vocabulary.

   Every word comes from `thesis` in content.js. The three
   sentences of `thesis.body` are distributed across the beats;
   nothing is rewritten, rounded or added.
   ============================================================ */

import { gsap, prefersReducedMotion } from '../lib/scroll.js';
import {
  revealLines,
  revealRise,
  revealMedia,
  countUp,
  DUR,
  EASE,
  START,
} from '../lib/reveal.js';
import { thesis, sources } from '../data/content.js';

/* Macro salt crystals on black. May not have rendered yet — the CSS
   chiaroscuro fallback carries the frame until it lands. */
const SALT = '/media/still-texture-salt.png';

/* Pin length as a multiple of viewport height. */
const PIN_LEN = 2.1;

/* Nominal timeline length. `scrub` normalises it to the pin distance,
   so these numbers are proportions, not seconds. */
const T = 10;

/* The count is driven BY THE SCRUB, not by a time tween — a 1.9s tween
   fired at 0.67 rendered digits sliced by the mask that was still
   clearing. The window may only open once the lockup has fully cleared
   `.myth__stat-mask`, so the numeral is whole for every frame in which
   it is changing. Keep COUNT_FROM >= the moment statIn lands.

   The lockup lands at 7.7 / 10 = 0.77 (see the timeline below). It used
   to land at 0.83 against a window opening at 0.84, which left the frame
   holding a fully-formed, full-viewport "00%" across ~170px of scroll —
   long enough to read as broken or unloaded rather than as an odometer
   waiting to roll, and exactly where a mid-section capture lands. The
   lockup now rises faster and the digits start moving 0.02 after it
   arrives, so "00" is never the resting state of a finished frame. */
const COUNT_FROM = 0.79;
const COUNT_TO = 0.94;

const DESKTOP = '(min-width: 861px) and (prefers-reduced-motion: no-preference)';
const FLAT = '(max-width: 860px), (prefers-reduced-motion: reduce)';

/* Two-digit odometer so the numeral does not change width mid-count. */
const pad2 = (v) => String(Math.round(v)).padStart(2, '0');

/* Split the thesis into sentences without altering a single word. */
function sentences(str) {
  return (str.match(/[^.]+\.\s*/g) || [str]).map((s) => s.trim()).filter(Boolean);
}

export default function mount(root) {
  const parts = sentences(thesis.body);

  /* 1 — what the category sells.  2 — the turn.  3 — supplies the
     "About" qualifier; the fact itself is stated at full scale by
     the stat block, so the sentence is not repeated. */
  const claimLine = parts[0] || thesis.body;
  const pivotLine = parts[1] || '';
  const qualifier = ((parts[2] || '').match(/^([A-Za-z]+)\s+\d/) || [])[1] || '';

  const stat = thesis.stat;

  root.innerHTML = `
    <div class="myth__pin" data-pin>

      <!-- 01 — THE CLAIM -->
      <div class="myth__beat myth__beat--claim">
        <div class="myth__bg grain" data-bg aria-hidden="true">
          <div class="myth__bg-inner" data-bg-inner>
            <img class="fill myth__bg-img" data-bg-img src="${SALT}" alt="" decoding="async" />
          </div>
          <div class="myth__veil"></div>
          <div class="myth__blackout" data-blackout></div>
          <div class="myth__glow" data-glow></div>
        </div>

        <div class="wrap myth__in" data-in-claim>
          <div class="myth__meta">
            <p class="t-eyebrow myth__eyebrow" data-eyebrow>${thesis.eyebrow}</p>
            <p class="t-lead myth__claim" data-claim>${claimLine}</p>
          </div>
          <h2 class="t-display myth__head" data-head>${thesis.headline}</h2>
        </div>
      </div>

      <!-- 02 — THE TURN -->
      <div class="myth__beat myth__beat--pivot">
        <div class="wrap myth__in">
          <div class="myth__pivot-mask">
            <p class="t-display myth__pivot" data-pivot>${pivotLine}</p>
          </div>
        </div>
      </div>

      <!-- 02b — THE PAYLOAD -->
      <div class="myth__beat myth__beat--stat">
        <div class="wrap myth__in">
          <p class="u-sr">${qualifier ? qualifier + ' ' : ''}${stat.value}${stat.unit} ${stat.label}</p>
          <div class="myth__statwrap" data-statwrap aria-hidden="true">
            <span class="myth__sweep" data-sweep></span>
            <div class="myth__lockup">
              <p class="myth__stat"><span class="myth__stat-mask"><span class="myth__stat-in" data-stat-in><span class="myth__kicker" data-kicker>${qualifier}</span><span class="myth__stat-n num" data-count>00</span><span class="myth__stat-u">${stat.unit}</span></span></span></p>
              <p class="t-h3 myth__statlabel" data-statlabel>${stat.label}</p>
          <p class="myth__statsource" data-statsource>${sources.potassiumShortfall}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="myth__rail" aria-hidden="true">
        <span class="myth__rail-track"><span class="myth__rail-fill" data-rail></span></span>
      </div>
    </div>
  `;

  const q = (s) => root.querySelector(s);

  const pinEl = q('[data-pin]');
  const bgEl = q('[data-bg]');
  const bgImg = q('[data-bg-img]');
  const bgInner = q('[data-bg-inner]');
  const blackout = q('[data-blackout]');
  const glowEl = q('[data-glow]');
  const claimIn = q('[data-in-claim]');
  const eyebrowEl = q('[data-eyebrow]');
  const headEl = q('[data-head]');
  const claimEl = q('[data-claim]');
  const pivotEl = q('[data-pivot]');
  const statWrap = q('[data-statwrap]');
  const sweepEl = q('[data-sweep]');
  const statInEl = q('[data-stat-in]');
  const countEl = q('[data-count]');
  const labelEl = q('[data-statlabel]');
  const sourceEl = q('[data-statsource]');
  const railEl = q('[data-rail]');

  /* If the salt macro has not finished rendering, drop it and let the
     CSS fallback hold the frame rather than showing a broken node. */
  if (bgImg) {
    bgImg.addEventListener('error', () => bgImg.classList.add('is-missing'), { once: true });
  }

  /* ---------- entrances (identical at every breakpoint) ---------- */
  revealMedia(bgEl);
  revealLines(headEl);
  revealRise([eyebrowEl, claimEl], { triggerEl: claimIn });

  /* ---------- choreography ---------- */
  const mm = gsap.matchMedia();

  /* DESKTOP — pinned, scrubbed, two beats and a rug pull. */
  mm.add(DESKTOP, () => {
    const len = () => window.innerHeight * PIN_LEN;

    /* The odometer is a pure function of pin progress. No tween, no
       trigger, nothing to desync: every frame in which a digit changes
       is a frame the mask has already cleared. */
    const softEase = gsap.parseEase('power2.out') || ((v) => v);
    let shown = -1;
    const paintCount = (p) => {
      const t = (p - COUNT_FROM) / (COUNT_TO - COUNT_FROM);
      const k = t <= 0 ? 0 : t >= 1 ? 1 : softEase(t);
      const v = Math.round(stat.value * k);
      if (v === shown) return;
      shown = v;
      countEl.textContent = pad2(v);
    };
    paintCount(0);

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: pinEl,
        start: 'top top',
        end: () => '+=' + len(),
        pin: true,
        scrub: true,
        onUpdate: (self) => paintCount(self.progress),
        onRefresh: (self) => paintCount(self.progress),
      },
    });

    tl
      /* progress hairline runs the whole length */
      .fromTo(railEl, { scaleX: 0 }, { scaleX: 1, duration: T }, 0)
      /* the salt never stops moving — the material is alive for the
         whole pin, not just its first beat */
      .to(bgInner, { scale: 1.16, duration: 7.8 }, 0)
      .to(claimIn, { yPercent: -8, autoAlpha: 0, duration: 2.1 }, 0.9)
      /* ink floods the image but does NOT extinguish it: the blackout is
         a radial, so beat two still happens on lit material rather than
         on a flat void. */
      .fromTo(blackout, { opacity: 0 }, { opacity: 1, duration: 2.4 }, 1.1)
      .fromTo(glowEl, { opacity: 0 }, { opacity: 0.62, duration: 2.6 }, 1.4)
      /* the turn, held, then cleared upward */
      .fromTo(pivotEl, { yPercent: 115 }, { yPercent: 0, duration: 2.0 }, 2.4)
      .to(pivotEl, { yPercent: -115, duration: 1.6 }, 5.5)
      /* the payload — the rule caps the frame, the lockup rises under it */
      .fromTo(sweepEl, { scaleX: 0 }, { scaleX: 1, duration: 1.3 }, 6.0)
      /* 1.4, not 2.0: this lands the lockup at 7.7 so the odometer window
         (COUNT_FROM above) can open immediately after, instead of leaving
         a resolved "00%" sitting in the frame. */
      .fromTo(statInEl, { yPercent: 118 }, { yPercent: 0, duration: 1.4 }, 6.3)
      /* THIRD MOVEMENT (0.78 -> 1.0): the ground comes back up under the
         monument, the accent blooms, the digits resolve on the scrub and
         the label writes in beside them. */
      .to(blackout, { opacity: 0.82, duration: 2.2 }, 7.8)
      .to(glowEl, { opacity: 1, duration: 2.2 }, 7.8)
      .to(bgInner, { scale: 1.24, duration: 2.2 }, 7.8)
      .fromTo([labelEl, sourceEl], { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 1.5, stagger: 0.12 }, 8.5)
      .to(statWrap, { y: -24, duration: 2.2 }, 7.8);
  });

  /* FLAT — no pin. The same three beats, stacked, revealed on entry. */
  mm.add(FLAT, () => {
    revealLines(pivotEl);

    if (!prefersReducedMotion) {
      gsap.fromTo(
        sweepEl,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: DUR.slow,
          ease: EASE,
          scrollTrigger: { trigger: sweepEl, start: START, once: true },
        }
      );
      gsap.fromTo(
        statInEl,
        { yPercent: 118 },
        {
          yPercent: 0,
          duration: DUR.slow,
          ease: EASE,
          scrollTrigger: { trigger: statWrap, start: START, once: true },
        }
      );
    }

    /* The kicker now rides inside the mask as part of the lockup, so it
       is revealed by the stat slide, not separately. */
    revealRise([labelEl, sourceEl], { triggerEl: statWrap });

    /* Hold the count until the lockup has finished clearing the mask —
       otherwise the digits change while they are still being sliced. */
    countUp(countEl, stat.value, {
      format: pad2,
      triggerEl: statWrap,
      delay: prefersReducedMotion ? 0 : DUR.slow * 0.72,
    });
  });
}
