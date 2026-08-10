/* ============================================================
   PILLARS — bone. Four magnitudes as ONE drawn field.

   The section is a measured plate, not a list of four rows:
   a 2x2 field divided by TWO vertical accent axes that are
   actually drawn. Every figure is right-aligned so it hangs
   off one of those axes, and its detail line hangs off the
   same axis underneath it — so the alignment idea is visible
   instead of implied. The name sits flush on the opposite
   edge, which spans each cell edge to edge.

   The `zeroes` are the same instrument inverted: horizontal
   instead of vertical, one band instead of a field, figure
   and word on one baseline instead of stacked, and at a
   deliberately different rung of the scale ladder
   (272 / 89 / 63 / 26 / 14 / 11).
   ============================================================ */

import { gsap, prefersReducedMotion } from '../lib/scroll.js';
import { revealRise, countUp, EASE, EASE_MASK, DUR, START } from '../lib/reveal.js';
import { pillars, zeroes } from '../data/content.js';

const pad = (i) => String(i + 1).padStart(2, '0');

export default function mount(root) {
  root.innerHTML = `
    <div class="wrap pil">

      <header class="pil__head">
        <p class="t-eyebrow">Present</p>
        <p class="pil__tally num" aria-hidden="true">${pad(pillars.length - 1)} — Formulation</p>
      </header>

      <div class="pil__ledger">
        <span class="pil__open" aria-hidden="true"><i></i></span>
        <span class="pil__axis pil__axis--a" aria-hidden="true"><i></i></span>
        <span class="pil__axis pil__axis--b" aria-hidden="true"><i></i></span>

        <ol class="pil__rows">
          ${pillars
            .map(
              (p, i) => `
            <li class="pil__row">
              <span class="pil__idx num" aria-hidden="true">${pad(i)}</span>
              <p class="pil__figure">
                <span class="pil__mask"><span class="pil__n num" data-to="${p.n}">${p.n}</span></span>
              </p>
              <h3 class="pil__label">${p.label}</h3>
              <p class="pil__sub">${p.sub}</p>
              <span class="pil__rule" aria-hidden="true"></span>
            </li>`
            )
            .join('')}
        </ol>
      </div>

      <section class="pil__absent">
        <p class="t-eyebrow pil__absentEyebrow">Absent</p>
        <ul class="pil__zeroes">
          ${zeroes
            .map(
              (z) => `
            <li class="pil__zero">
              <span class="pil__zk num">${z.k}</span>
              <span class="pil__zv">${z.v}</span>
            </li>`
            )
            .join('')}
        </ul>
      </section>

    </div>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => Array.from(root.querySelectorAll(s));

  /* ---- header ---- */
  revealRise(qa('.pil__head > *'), { distance: 18, stagger: 0.08 });

  /* ---- the two axes: one continuous measure binding the whole field ---- */
  const axes = qa('.pil__axis i');
  const ledger = q('.pil__ledger');

  if (prefersReducedMotion) {
    gsap.set(axes, { scaleY: 1 });
  } else {
    gsap.fromTo(
      axes,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: 'none',
        transformOrigin: '50% 0%',
        scrollTrigger: {
          trigger: ledger,
          start: 'top 78%',
          end: 'bottom 72%',
          scrub: true,
        },
      }
    );
  }

  /* ---- the opening rule of the field ---- */
  const open = q('.pil__open i');
  if (prefersReducedMotion) {
    gsap.set(open, { scaleX: 1 });
  } else {
    gsap.fromTo(
      open,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: DUR.slow,
        ease: EASE_MASK,
        transformOrigin: '0% 50%',
        scrollTrigger: { trigger: ledger, start: START, once: true },
      }
    );
  }

  /* ---- each magnitude resolves as its cell enters ---- */
  qa('.pil__row').forEach((row) => {
    const rule = row.querySelector('.pil__rule');
    const numEl = row.querySelector('.pil__n');
    const to = Number(numEl.dataset.to);

    if (prefersReducedMotion) {
      gsap.set(rule, { scaleX: 1 });
      gsap.set(numEl, { yPercent: 0 });
    } else {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: row, start: START, once: true },
      });

      tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: DUR.slow, ease: EASE_MASK }, 0)
        .fromTo(numEl, { yPercent: 106 }, { yPercent: 0, duration: DUR.slow, ease: EASE }, 0.04)
        .fromTo(
          [row.querySelector('.pil__idx'), row.querySelector('.pil__label'), row.querySelector('.pil__sub')],
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: DUR.mid, ease: EASE, stagger: 0.08 },
          0.16
        );
    }

    countUp(numEl, to, {
      triggerEl: row,
      start: START,
      duration: 1.6,
      format: (v) => String(Math.round(v)),
    });
  });

  /* ---- the counterweight ---- */
  revealRise(qa('.pil__absentEyebrow, .pil__zero'), {
    distance: 16,
    stagger: 0.07,
    triggerEl: q('.pil__absent'),
  });
}
