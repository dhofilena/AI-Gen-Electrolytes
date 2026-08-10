/* ============================================================
   PILLARS — bone. Four magnitudes as ONE drawn field.

   The section is a measured plate, not a list of four rows:
   a 2x2 field whose two columns each open on a DRAWN vertical
   accent axis. Each cell is ONE LEFT SPINE with four runs
   hanging off it at four sizes — index, figure, name, detail —
   and it is their INK that sits on the line, not their glyph
   boxes (see inkLead below). Under each figure a second drawn
   hairline runs from the spine out to the cell's far edge: the
   figure sits in a drawn corner, and because all four cells are
   the same height the two cells of a row put their hairlines on
   one continuous line across the measure.

   Nothing aligns to the rules on the trailing side. They are
   dividers, and every cell keeps a real gutter clear of them.

   Reading order is therefore literal: number, then what it is,
   then what it contains — top to bottom on one spine.

   The `zeroes` are the same instrument inverted: horizontal
   instead of vertical, one band instead of a field, figure
   and word on one baseline instead of stacked, and at a
   deliberately different rung of the scale ladder
   (272 / 89 / 63 / 26 / 14 / 11).
   ============================================================ */

import { gsap, prefersReducedMotion } from '../lib/scroll.js';
import { revealRise, countUp, onResize, EASE, EASE_MASK, DUR, START } from '../lib/reveal.js';
import { pillars, zeroes } from '../data/content.js';

const pad = (i) => String(i + 1).padStart(2, '0');

/* ---- optical lead-in ----------------------------------------------------
   Four runs at four sizes share one left spine, so it has to be their INK that
   lands on it, not their glyph boxes. Left side bearings are not uniform and
   they scale with size: measured on the real face, the figures alone run 4px
   on 4 and 9, 13px on 5 and 26px on the 1 of 12 at 272px, so box alignment
   would present the reader with four different left edges in the same cell.

   So measure it, per run, from the font itself: canvas reports the ink
   bounding box for the exact computed font and tracking. It is returned as a
   RATIO of the font size, which is a property of the outline and therefore
   constant across the whole fluid ramp — CSS multiplies it back out, so this
   runs once and stays correct at every viewport. Returns 0 if the platform
   has no ink metrics, which simply restores box alignment. */
function inkLead(el, text) {
  try {
    const ctx = (inkLead._c ||= document.createElement('canvas')).getContext('2d');
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    if (!ctx || !size) return 0;
    ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    const m = ctx.measureText(text);
    if (typeof m.actualBoundingBoxLeft !== 'number') return 0;
    return -m.actualBoundingBoxLeft / size;
  } catch {
    return 0;
  }
}

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
                <span class="pil__mask"><span class="pil__n num t-mega" data-to="${p.n}">${p.n}</span></span>
              </p>
              <span class="pil__base" aria-hidden="true"></span>
              <h3 class="pil__label t-h2">${p.label}</h3>
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

  /* ---- land every run's ink on the spine it leads from ----
     Re-run once the webfont has resolved, and on resize, because the ratio is
     read off whatever face is actually painting. The figure is measured from
     data-to rather than its text, because countUp owns that text from zero. */
  const setLead = () => {
    qa('.pil__row').forEach((row) => {
      const numEl = row.querySelector('.pil__n');
      const runs = [
        [row.querySelector('.pil__figure'), numEl, numEl.dataset.to],
        [row.querySelector('.pil__idx'), row.querySelector('.pil__idx'), null],
        [row.querySelector('.pil__label'), row.querySelector('.pil__label'), null],
        [row.querySelector('.pil__sub'), row.querySelector('.pil__sub'), null],
      ];
      runs.forEach(([box, typeEl, text]) => {
        if (!box || !typeEl) return;
        box.style.setProperty('--pil-lead', inkLead(typeEl, text ?? typeEl.textContent.trim()));
      });
    });
  };
  setLead();
  if (document.fonts?.ready) document.fonts.ready.then(setLead).catch(() => {});
  onResize(setLead);

  /* ---- each magnitude resolves as its cell enters ----
     Both hairlines draw LEFT TO RIGHT, out of the axis the figure
     leads from, so the alignment is seen being made. */
  qa('.pil__row').forEach((row) => {
    const rule = row.querySelector('.pil__rule');
    const base = row.querySelector('.pil__base');
    const numEl = row.querySelector('.pil__n');
    const to = Number(numEl.dataset.to);

    if (prefersReducedMotion) {
      gsap.set([rule, base], { scaleX: 1 });
      gsap.set(numEl, { yPercent: 0 });
    } else {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: row, start: START, once: true },
      });

      tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: DUR.slow, ease: EASE_MASK }, 0)
        .fromTo(numEl, { yPercent: 106 }, { yPercent: 0, duration: DUR.slow, ease: EASE }, 0.04)
        .fromTo(base, { scaleX: 0 }, { scaleX: 1, duration: DUR.slow, ease: EASE_MASK }, 0.12)
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
