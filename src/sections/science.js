/* ============================================================
   SCIENCE — the mechanism explainer.

   The idea: draw ONE measuring instrument whose zero line is the
   cell membrane, and put BOTH masses on the SAME vertical axis.
   One continuous column crosses the membrane: one part measured
   up and out (sodium), three parts measured down and in
   (potassium). The gridlines are one sodium-serving apart and
   are drawn OVER the column, so the reader can literally count
   three sodiums into one potassium on a single line.

   The film is not a backdrop. It is clipped to the region below
   the membrane — it IS the cytosol, and it runs off the right
   edge of the screen because the inside of a cell is a place.

   Nothing here is claimed that is not in `cellScience`.
   ============================================================ */

import { gsap, prefersReducedMotion } from '../lib/scroll.js';
import {
  revealLines,
  revealRise,
  seamlessLoop,
  countUp,
  EASE,
  EASE_MASK,
  DUR,
} from '../lib/reveal.js';
import { cellScience, product } from '../data/content.js';

/* Opacity of a sentence that has not been reached yet. */
const DIM = 0.3;
const ION_COUNT = 14;

/* Deterministic pseudo-random so the ion field is identical every load. */
function rnd(i, seed) {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const isNaIon = (i) => i % 5 === 0;

export default function mount(root) {
  const { eyebrow, headline, body, ratio } = cellScience;
  const K = ratio.potassium; // 610
  const NA = ratio.sodium; //  200

  /* The body paragraph is the script. Each sentence is one beat of the
     diagram — split, never rewritten. */
  const steps = body
    .split(/\.\s+/)
    .filter(Boolean)
    .map((s) => (s.endsWith('.') ? s : `${s}.`));

  /* "3:1 potassium-to-sodium" -> figure + name, no invented copy. */
  const labelParts = ratio.label.split(' ');
  const ratioFig = labelParts[0];
  const ratioName = labelParts.slice(1).join(' ');

  /* Gridlines are one sodium-serving apart: 200 / 400 / 600 inside, plus the
     mirrored one outside — which is exactly where the sodium column caps.
     The outside line carries NO numeral: it is the same 200 the axis already
     states, and printing it twice made the reader hit "200" twice on one
     axis. The line alone still proves the spacing. */
  const ticksIn = [];
  for (let v = NA; v <= K; v += NA) ticksIn.push(v);

  const stepsHTML = steps
    .map(
      (s) => `
      <p class="sci__step">
        <span class="sci__step-r"><i class="sci__step-rk"></i></span>
        <span class="sci__step-t">${s}</span>
      </p>`
    )
    .join('');

  const ticksHTML = [
    ...ticksIn.map(
      (v) => `
      <span class="sci__tick sci__tick--in" style="--tv:${v}">
        <span class="sci__tick-l num">${v}</span>
        <i class="sci__tick-c"></i>
      </span>`
    ),
    `<span class="sci__tick sci__tick--out" style="--tv:${NA}"></span>`,
  ].join('');

  /* Ions cross the membrane while the cell fills. They are a transitional
     actor — they clear completely before the masses resolve, so nothing is
     left on screen at 0.3 opacity pretending to be a layer. */
  const ionsHTML = Array.from({ length: ION_COUNT }, (_, i) => {
    const x = 10 + rnd(i, 1) * 78;
    const s = 0.62 + rnd(i, 2) * 0.8;
    return `<span class="sci__ion${isNaIon(i) ? ' sci__ion--na' : ''}" style="--ix:${x.toFixed(
      2
    )}%;--is:${s.toFixed(2)}"></span>`;
  }).join('');

  root.innerHTML = `
    <div class="sci__stage grain">
      <div class="sci__inner wrap">
        <div class="sci__grid grid12">

          <div class="sci__copy">
            <p class="t-eyebrow sci__eyebrow">${eyebrow}</p>
            <h2 class="t-h2 sci__head">${headline}</h2>
            <div class="sci__steps">${stepsHTML}</div>
          </div>

          <figure class="sci__viz">
            <div class="sci__plot">
              <div class="sci__field">

                <div class="sci__cyto" aria-hidden="true">
                  <div class="sci__film vloop" data-src="/media/cellular.mp4" data-poster="/media/cellular.jpg"></div>
                </div>

                <div class="sci__ions" aria-hidden="true">${ionsHTML}</div>

                <div class="sci__col sci__col--na" aria-hidden="true"><span class="sci__bar"></span></div>
                <div class="sci__col sci__col--k" aria-hidden="true"><span class="sci__bar"></span></div>

                ${ticksHTML}

                <span class="sci__mem" aria-hidden="true"></span>
                <p class="sci__memlab">Cell membrane</p>

                <div class="sci__val sci__val--na">
                  <p class="sci__val-n"><span class="num" data-n="na">0</span><span class="sci__val-u">mg</span></p>
                  <p class="sci__val-name">Sodium</p>
                </div>
                <div class="sci__val sci__val--k">
                  <p class="sci__val-n"><span class="num" data-n="k">0</span><span class="sci__val-u">mg</span></p>
                  <p class="sci__val-name">Potassium</p>
                </div>

                <p class="sci__zone sci__zone--out">Outside</p>
                <p class="sci__zone sci__zone--in">Inside</p>
              </div>
            </div>

            <figcaption class="sci__foot">
              <span class="sci__serve t-micro">Per serving — ${product.servingSize}</span>
              <span class="sci__ratio">
                <span class="sci__ratio-n num">${ratioFig}</span>
                <span class="sci__ratio-l">${ratioName}</span>
              </span>
              <span class="u-sr">Potassium ${K} mg and sodium ${NA} mg per serving — a ${ratio.label} ratio, drawn to scale on one axis: one part measured out of the cell, three parts measured into it.</span>
            </figcaption>
          </figure>

        </div>
      </div>
    </div>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => Array.from(root.querySelectorAll(s));

  /* Geometry is driven by the real numbers, not by taste. */
  root.style.setProperty('--sci-k-mg', String(K));
  root.style.setProperty('--sci-na-mg', String(NA));

  const stage = q('.sci__stage');
  const film = q('.sci__film');
  const viz = q('.sci__viz');
  const field = q('.sci__field');
  const mem = q('.sci__mem');
  const memlab = q('.sci__memlab');
  const cyto = q('.sci__cyto');
  const ionWrap = q('.sci__ions');
  const ionEls = qa('.sci__ion');
  const ticks = qa('.sci__tick');
  const colNa = q('.sci__col--na');
  const colK = q('.sci__col--k');
  const vals = qa('.sci__val');
  const zones = qa('.sci__zone');
  const foot = q('.sci__foot');
  const stepEls = qa('.sci__step');
  const stepRules = qa('.sci__step-rk');
  const nNa = q('[data-n="na"]');
  const nK = q('[data-n="k"]');

  /* cellular.mp4 is a 5s clip; a bare `loop` jump-cuts inside the cell.
     seamlessLoop crossfades two layers and owns its own in-view play/pause. */
  const loop = seamlessLoop(film, { objectPosition: '50% 46%' });

  /* Film not delivered: fall back to a designed cytosol glow, not a dead
     black rectangle. */
  if (loop) {
    loop.layers.forEach((v) =>
      v.addEventListener('error', () => root.classList.add('sci--nofilm'), { once: true })
    );
  } else {
    root.classList.add('sci--nofilm');
  }

  /* Entrances — shared vocabulary, fired off the section itself so the
     pin never distorts their trigger maths. */
  revealRise(q('.sci__eyebrow'), { triggerEl: root, start: 'top 74%', distance: 18 });
  revealLines(q('.sci__head'), { triggerEl: root, start: 'top 70%' });
  revealRise(q('.sci__steps'), { triggerEl: root, start: 'top 64%', delay: 0.1 });

  /* CSS holds the RESOLVED state, so reduced motion needs nothing but
     the final numbers. */
  if (prefersReducedMotion) {
    nK.textContent = String(K);
    nNa.textContent = String(NA);
    return;
  }

  /* Ion travel is measured off the live DOM so it survives resize;
     ScrollTrigger re-evaluates these on refresh. */
  const memPx = () => mem.offsetTop;
  const fieldH = () => field.offsetHeight;
  const startY = (i) => -(memPx() * (0.45 + rnd(i, 3) * 0.7));
  /* Potassium crosses in. Sodium drifts toward the membrane but stays out. */
  const endY = (i) =>
    isNaIon(i)
      ? -(memPx() * (0.08 + rnd(i, 6) * 0.26))
      : (fieldH() - memPx()) * (0.12 + rnd(i, 4) * 0.7);
  const xOff = (i) => (rnd(i, 5) - 0.5) * 46;

  const mm = gsap.matchMedia(root);

  /* ---------- DESKTOP: pinned, scrubbed, outside -> inside ---------- */
  mm.add('(min-width: 861px)', () => {
    /* Function form, re-read on every refresh, so a pin-spacer that appears
       or resizes ABOVE this section (#myth also pins) can never leave a
       cached pixel length behind. Paired with invalidateOnRefresh below.
       There is deliberately no `anticipatePin` here: it was the only use on
       the page and it engaged the pin ahead of the real start at speed. */
    const pinLen = () => Math.round(window.innerHeight * 1.65);

    gsap.set(stepEls, { opacity: DIM });
    gsap.set(stepRules, { scaleX: 0 });
    gsap.set([memlab, foot, ...ticks, ...vals, ...zones], { opacity: 0 });
    gsap.set(ionWrap, { opacity: 0 });
    gsap.set(cyto, { clipPath: 'inset(0% 0% 100% 0%)' });
    /* The clip's own subject is a round bubble — pushed to the far edge of
       the frame so the cell interior reads as matter, not as a second,
       circular cell arguing with the rectangular one. */
    gsap.set(film, { scale: 1.34, xPercent: 15 });
    gsap.set(mem, { scaleX: 0 });
    gsap.set([colNa, colK], { scaleY: 0 });
    gsap.set(vals, { y: 14 });
    gsap.set(foot, { y: 18 });

    /* The readouts are TWEENS ON THE SCRUBBED TIMELINE, not a time-based
       side effect fired at a progress threshold. Same start, same duration
       and same linear ease as the bar each one labels — so the number and
       the mass are one animation, and scrubbing back retracts both. */
    const countNa = countUp(nNa, NA, { trigger: false, duration: 1.3, ease: 'none' });
    const countK = countUp(nK, K, { trigger: false, duration: 1.9, ease: 'none' });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => '+=' + pinLen(),
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        /* Below default (0), so this trigger is always recalculated AFTER
           the pinned section above it has re-inserted its own spacer. */
        refreshPriority: -1,
      },
    });

    /* Act I — the stage opens and the membrane is drawn across the frame,
       carrying its own labels with it. */
    tl.to(mem, { scaleX: 1, duration: 1.2 }, 0)
      .to([memlab, zones[0]], { opacity: 1, duration: 0.6, stagger: 0.1 }, 0.5)

      /* Act II — the cell fills: the cytosol wipes open below the membrane
         and the film inside it is the cytosol, not a backdrop. */
      .to(cyto, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6 }, 1.0)
      .to(film, { scale: 1.16, xPercent: 7, duration: 5.0 }, 1.0)
      .to(ionWrap, { opacity: 1, duration: 0.5 }, 1.3)
      .fromTo(
        ionEls,
        { y: startY, x: xOff, opacity: 0 },
        { y: endY, opacity: 1, duration: 2.2, stagger: { each: 0.08, from: 'random' } },
        1.3
      )
      .to(zones[1], { opacity: 1, duration: 0.6 }, 1.9)

      /* Act III — one scale, one axis, and the two masses resolve on it. */
      .to(ticks, { opacity: 1, duration: 0.7, stagger: 0.08 }, 3.0)
      /* The readouts arrive WITH their masses, not before them: a label that
         lands early sits parked on "0 mg" beside a bar of zero height. */
      .to(vals, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, 3.6)
      .to(colNa, { scaleY: 1, duration: 1.3 }, 3.6)
      .to(colK, { scaleY: 1, duration: 1.9 }, 3.6)
      .to(ionEls, { opacity: 0, duration: 0.9, stagger: 0.03 }, 4.6)
      .to(foot, { opacity: 1, y: 0, duration: 0.9 }, 5.6);

    if (countNa) tl.add(countNa, 3.6);
    if (countK) tl.add(countK, 3.6);

    /* Hold — a short dwell on the resolved frame, then release. Long enough
       to land the reading, short enough that no captured frame repeats.
       This used to be 2.7 of a 10-unit timeline: 27% of the pin, ~535px of
       scroll in which literally nothing moved. */
    tl.to({}, { duration: 0.8 }, 6.5);

    /* Sentences assemble cumulatively across the sequence. */
    const lastLight = 3.4;
    stepEls.forEach((el, i) => {
      const at = stepEls.length > 1 ? (i / (stepEls.length - 1)) * lastLight : 0;
      tl.to(el, { opacity: 1, duration: 0.5 }, at);
      if (stepRules[i]) tl.to(stepRules[i], { scaleX: 1, duration: 0.7 }, at);
    });
  });

  /* ---------- MOBILE: no pin, one stacked reveal ---------- */
  mm.add('(max-width: 860px)', () => {
    gsap.set(stepEls, { opacity: 1 });
    gsap.set(stepRules, { scaleX: 0 });
    gsap.set([memlab, foot, ...ticks, ...vals, ...zones], { opacity: 0 });
    gsap.set(ionWrap, { opacity: 0 });
    gsap.set(cyto, { clipPath: 'inset(0% 0% 100% 0%)' });
    gsap.set(film, { scale: 1.06 });
    gsap.set(mem, { scaleX: 0 });
    gsap.set([colNa, colK], { scaleY: 0 });

    const countNa = countUp(nNa, NA, { trigger: false, duration: DUR.slow, ease: EASE });
    const countK = countUp(nK, K, { trigger: false, duration: DUR.slow + 0.3, ease: EASE });

    const tl = gsap.timeline({
      defaults: { ease: EASE },
      scrollTrigger: { trigger: viz, start: 'top 78%', once: true },
    });

    tl.to(mem, { scaleX: 1, duration: DUR.slow, ease: EASE_MASK }, 0)
      .to(cyto, { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.slow, ease: EASE_MASK }, 0.15)
      .to(film, { scale: 1, duration: DUR.slow * 2.4 }, 0.15)
      .to([memlab, zones[0], zones[1]], { opacity: 1, duration: DUR.mid, stagger: 0.06 }, 0.3)
      .to(ionWrap, { opacity: 1, duration: DUR.mid }, 0.25)
      .fromTo(
        ionEls,
        { y: startY, x: xOff, opacity: 0 },
        {
          y: endY,
          opacity: 1,
          duration: DUR.slow * 1.5,
          stagger: { each: 0.05, from: 'random' },
        },
        0.25
      )
      .to(ticks, { opacity: 1, duration: DUR.mid, stagger: 0.06 }, 0.7)
      .to(vals, { opacity: 1, duration: DUR.mid, stagger: 0.1 }, 0.85)
      .to(colNa, { scaleY: 1, duration: DUR.slow }, 0.9)
      .to(colK, { scaleY: 1, duration: DUR.slow + 0.3 }, 0.9)
      .to(stepRules, { scaleX: 1, duration: DUR.mid, stagger: 0.08 }, 0.2)
      .to(ionEls, { opacity: 0, duration: DUR.mid }, 1.9)
      .to(foot, { opacity: 1, duration: DUR.mid }, 2.0);

    if (countNa) tl.add(countNa, 0.9);
    if (countK) tl.add(countK, 0.9);
  });

  /* NOTE: no ScrollTrigger.refresh() here. main.js sorts + refreshes across
     two frames after every section mounts, and scroll.js watches document
     height with a ResizeObserver for late media. A third, section-local
     refresh only adds another race. */
}
