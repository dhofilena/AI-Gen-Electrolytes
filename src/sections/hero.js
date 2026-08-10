/* ============================================================
   HERO — one film, one headline, one hanging spec block.

   ONE ALIGNMENT LOGIC. Every edge in this frame is justified by
   another edge:

     · headline optical ink edge  ─┐
     · aside rule left            ─┼─ the 12-col grid (1/9)
     · spec label left            ─┘
     · aside rule right           ─┐
     · spec value right           ─┼─ the grid's right margin (12)
     · link arrow right           ─┘
     · aside rule y   ── cap-line of "made"
     · link underline ── baseline of "whole."

   The last two are measured from live font metrics at mount and
   re-measured on resize, so they stay exact at every viewport
   instead of being eyeballed once at 1440.

   Load:  film curtain-wipes open -> headline lines -> the aside
          rule draws left-to-right -> the meta hangs off it.
   Exit:  scrubbed. Type leads out, the film lags and swells, an
          ink veil closes so #myth arrives out of black.
   ============================================================ */

import { gsap, prefersReducedMotion } from '../lib/scroll.js';
import {
  revealLines,
  revealRise,
  revealMedia,
  seamlessLoop,
  onResize,
  DUR,
  EASE,
} from '../lib/reveal.js';
import { product, cellScience } from '../data/content.js';

/* The one original line on the page. Water is the solvent; the
   full mineral spectrum is what completes it. Said plainly. */
const HEADLINE = 'Water, made whole.';
const LINK_LABEL = 'See the science';

/* ---- loop window ----
   hero-dissolve.mp4 is 5.04s. It opens on a small plume and ends
   as a full-frame dust haze; a bare `loop` hard-cut between those
   two states is the most visible flaw on the page.

   seamlessLoop plays [0, duration - TAIL_TRIM] and crossfades the
   last FADE seconds into a second layer restarting at 0, so:
     window = 0 -> 3.59s   the plume is a defined silhouette the
                           whole way; the haze phase (t > 3.8) that
                           flattens the frame is never reached
     period = 2.49s        long enough to read as one continuous
                           billow, short enough that the dissolve
                           always lands mid-bloom rather than on a
                           recognisable frame
   Powder has no landmark features, so a crossfaded re-bloom is
   perceptually seamless — there is no cut left to see. */
const TAIL_TRIM = 1.45;
const FADE = 1.1;

/* Fallbacks if TextMetrics is unavailable. Neue Haas Unica, measured. */
const FALLBACK = { cap: 0.7105, asc: 1.1667, desc: 0.342 };

let scratch;
function metricsCtx() {
  if (!scratch) scratch = document.createElement('canvas').getContext('2d');
  return scratch;
}

export default function mount(root) {
  /* Breaking after "Hydration" kills the stranded ampersand and the
     two-word runt the old 26ch measure produced. Derived from the
     data string, never retyped. */
  const tagline = product.tagline.replace(' & ', '<br>& ');

  const r = cellScience.ratio;
  const spec = [
    ['Potassium', `${r.potassium} mg`],
    ['Sodium', `${r.sodium} mg`],
    ['Ratio', r.label.split(' ')[0]],
  ];

  root.innerHTML = `
    <div class="hero__frame grain">
      <div class="hero__stage">
        <div class="hero__film">
          <div class="hero__vloop vloop media-inner"
               data-src="/media/hero-dissolve.mp4"
               data-poster="/media/hero-dissolve.jpg"></div>
        </div>
      </div>
      <div class="hero__grade" aria-hidden="true"></div>
      <div class="hero__veil" aria-hidden="true"></div>
    </div>

    <div class="wrap hero__wrap">
      <div class="hero__inner grid12">
        <h1 class="t-display hero__head" data-reveal="fade">${HEADLINE}</h1>

        <div class="hero__aside">
          <span class="hero__rule" aria-hidden="true"></span>

          <p class="t-small hero__tag" data-reveal="rise">${tagline}</p>

          <dl class="hero__spec" data-reveal="rise">
            ${spec
              .map(
                ([k, v]) => `
              <div class="hero__spec-row">
                <dt class="hero__spec-k">${k}</dt>
                <dd class="hero__spec-v num">${v}</dd>
              </div>`
              )
              .join('')}
          </dl>

          <a class="hero__link" href="#science" data-reveal="rise">
            <span>${LINK_LABEL}</span>
            <svg class="hero__link-arrow" viewBox="0 0 12 12" width="12" height="12"
                 aria-hidden="true" focusable="false">
              <path d="M6 1.5v9M2.2 6.9 6 10.7l3.8-3.8"
                    fill="none" stroke="currentColor" stroke-width="1.1"
                    stroke-linecap="square" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  `;

  const q = (s) => root.querySelector(s);

  const frame = q('.hero__frame');
  const stage = q('.hero__stage');
  const veil = q('.hero__veil');
  const inner = q('.hero__inner');
  const head = q('.hero__head');
  const rule = q('.hero__rule');

  /* ---------- FILM ---------- */

  const loop = seamlessLoop(q('.hero__vloop'), { fade: FADE, tailTrim: TAIL_TRIM });

  /* ---- WORKAROUND, not a preference ----
     seamlessLoop's fade-out tween ends with `onComplete: () => front.pause()`,
     but `front` is reassigned by the swap on the very next line — so the
     tween pauses the layer that just faded IN. Measured on the rendered
     page: the visible layer stalled at 1.08s of a 3.59s window and held
     there, i.e. the hero was a still frame for roughly two thirds of every
     cycle. Reported for a fix in lib/reveal.js; until then this reads the
     layer opacities to tell which pause was the wrong one, resumes the
     visible layer and pauses the one that should have stopped. */
  if (loop && loop.layers && !prefersReducedMotion) {
    const onScreen = () => {
      const rect = root.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    };
    loop.layers.forEach((v, i) => {
      const other = loop.layers[1 - i];
      v.addEventListener('pause', () => {
        /* Offscreen stop() pauses both on purpose — leave it alone. */
        if (!onScreen() || v.ended) return;
        /* A faded-out layer is correctly paused. */
        if (parseFloat(getComputedStyle(v).opacity) < 0.5) return;
        v.play().catch(() => {});
        if (other && !other.paused) other.pause();
      });
    });
  }

  /* The page opens on the house curtain-wipe: the film unrolls
     downward while the plume settles back out of an oversize. */
  revealMedia(frame, { start: 'top bottom' });

  /* ---------- MEASURED TYPOGRAPHY ----------

     Two things the eye reads as "broken" if they are approximate:
     a ragged optical left edge, and a caption that nearly — but not
     quite — lines up with the headline. Both are solved by measuring
     the actual face rather than guessing ems. */

  function faceMetrics() {
    const cs = getComputedStyle(head);
    const fs = parseFloat(cs.fontSize) || 0;
    const lh = parseFloat(cs.lineHeight) || 0;
    const ctx = metricsCtx();
    /* Measure at 1000px so the integer-ish TextMetrics values carry
       three useful decimals once normalised back to em. */
    const REF = 1000;
    ctx.font = `${cs.fontWeight} ${REF}px ${cs.fontFamily}`;
    let m = null;
    try {
      m = ctx.measureText('H');
    } catch (e) {
      /* fall through to the measured constants */
    }
    const em = (v, fb) => (typeof v === 'number' && v > 0 ? v / REF : fb);
    return {
      ctx,
      fs,
      lh,
      cap: em(m && m.actualBoundingBoxAscent, FALLBACK.cap) * fs,
      asc: em(m && m.fontBoundingBoxAscent, FALLBACK.asc) * fs,
      desc: em(m && m.fontBoundingBoxDescent, FALLBACK.desc) * fs,
    };
  }

  /* ---- optical left edge ----
     "Water," and "whole." start on a diagonal that reaches the origin;
     "made" starts on a stem with a real left side bearing, so its ink
     began 8px inside the other two at 1440. Pull every line back by its
     own bearing so all three ink edges land on one line. */
  function opticalAlign(mx) {
    const lines = head.querySelectorAll('.split-line');
    if (!lines.length) return null;

    const REF = 1000;
    const bearing = [...lines].map((line) => {
      const t = (line.textContent || '').trim();
      if (!t) return 0;
      try {
        return -mx.ctx.measureText(t[0]).actualBoundingBoxLeft / REF;
      } catch (e) {
        return 0;
      }
    });

    const base = Math.min(...bearing);
    lines.forEach((line, i) => {
      /* Clamped: a bearing this large would be a metrics failure, and
         a runaway negative margin is worse than a ragged edge. */
      const shift = Math.min(Math.max(bearing[i] - base, 0), 0.09);
      line.style.marginLeft = shift ? `${(-shift).toFixed(4)}em` : '';
    });
    return bearing;
  }

  /* ---- the aside hangs off the headline ----
     rule y  = cap-line of the second-to-last headline line ("made")
     block bottom (the link's underline) = baseline of the last line
                                           ("whole.")
     Distance between those two is exactly one line pitch plus one
     cap height, whatever the viewport does to --fs-display. */
  function alignAside(mx) {
    if (!mx.fs || !mx.lh) return null;

    const h = head.getBoundingClientRect().height;
    const n = head.querySelectorAll('.split-line').length || Math.max(1, Math.round(h / mx.lh));

    /* Half-leading is negative at 0.88 line-height — the line box is
       shorter than the em box — so the baseline sits high in the box. */
    const half = (mx.lh - (mx.asc + mx.desc)) / 2;
    const lastBaseline = (n - 1) * mx.lh + half + mx.asc;
    const drop = h - lastBaseline; // headline box bottom -> last baseline
    const span = mx.lh + mx.cap; // cap-line of line n-1 -> baseline of line n

    root.style.setProperty('--hero-aside-h', `${(span + drop).toFixed(2)}px`);
    root.style.setProperty('--hero-aside-drop', `${drop.toFixed(2)}px`);
    return { drop, span, n };
  }

  /* ---- mobile: the film's bottom edge IS the aside's rule ----
     One line doing two jobs instead of two lines nearly agreeing.
     The grade reaches solid ink on the same y, so the band has no
     visible edge — the plume simply dissolves into the rule. */
  function bandToRule() {
    if (!window.matchMedia('(max-width: 860px)').matches) {
      root.style.removeProperty('--film-h');
      return;
    }
    const y = rule.getBoundingClientRect().top - frame.getBoundingClientRect().top;
    if (y > 0) root.style.setProperty('--film-h', `${y.toFixed(1)}px`);
  }

  function measure() {
    const mx = faceMetrics();
    opticalAlign(mx);
    alignAside(mx);
    bandToRule();
  }

  /* ---------- ENTRANCE ---------- */

  const revealType = () => {
    /* revealLines splits first; the measurements below need those lines. */
    revealLines(head, {
      trigger: false,
      delay: 0.58,
      duration: DUR.slow,
      stagger: 0.09,
    });

    measure();

    /* Registered after revealLines' own resize handler, so it re-applies
       on top of the fresh split rather than being wiped by it. */
    onResize(measure);

    if (prefersReducedMotion) {
      gsap.set(rule, { scaleX: 1 });
    } else {
      gsap.fromTo(
        rule,
        { scaleX: 0 },
        { scaleX: 1, duration: DUR.slow, ease: EASE, delay: 1.0 }
      );
    }

    revealRise(root.querySelectorAll('.hero__aside > [data-reveal]'), {
      triggerEl: root,
      delay: 1.18,
      stagger: 0.08,
      distance: 22,
    });
  };

  /* Line breaks and side bearings are both font-dependent — wait for
     the face. The CSS pre-reveal state holds everything hidden. */
  const fontsReady =
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  Promise.race([fontsReady, new Promise((res) => setTimeout(res, 1400))]).then(revealType);

  /* ---------- SCROLL-OUT CHOREOGRAPHY ---------- */

  if (prefersReducedMotion) return;

  /* Scrubbed against the real distance from hero-top to hero-bottom.
     Type leaves first and fastest; the film lags and swells behind it;
     the ink veil closes so the next section arrives out of black. */
  gsap
    .timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    })
    .to(inner, { yPercent: -26 }, 0)
    /* holds its full weight for the first beat, then leaves */
    .to(inner, { opacity: 0, duration: 0.58 }, 0.18)
    /* scale outruns the shift, so the frame is never uncovered */
    .to(stage, { yPercent: 6, scale: 1.16 }, 0)
    .to(veil, { opacity: 0.92 }, 0);
}
