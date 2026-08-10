/* ============================================================
   BENEFITS — eight systems, read as an index, not a card grid.
   A sticky ledger (eyebrow / headline / 01–08 odometer / progress)
   sits against a hairline-ruled editorial list, joined by a vertical
   index rail that runs the whole length of the claims. Each benefit
   resolves as it reaches the reading line.

   The ledger is the section's idea, so it is never switched off: under
   1100px the odometer + progress rule relocate into a sticky strip at
   the head of the list instead of being display:none'd into a plain
   numbered list.

   COMPLIANCE: every title and body string is printed verbatim from
   content.js. Never paraphrase, never strengthen a verb. The FDA
   disclaimer closes the section. Claim bodies and the disclaimer sit
   at --fg-mute or better at ALL times — --fg-faint is decorative-only
   (see tokens.css) and regulated text has to be legible, not
   atmospheric. Rows still resolve to full ink on the reading line.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/scroll.js';
import { revealLines, revealRise, onResize, START } from '../lib/reveal.js';
import { benefits, product } from '../data/content.js';

const pad = (n) => String(n).padStart(2, '0');

/* Below this the 12-column ledger has no room, and the meter relocates. */
const STACK = '(max-width: 1100px)';

export default function mount(root) {
  root.innerHTML = `
    <div class="wrap ben">
      <div class="ben__grid">

        <header class="ben__ledger">
          <div class="ben__say">
            <p class="t-eyebrow ben__eyebrow" data-reveal="rise">Full-spectrum support</p>
            <h2 class="t-h2 ben__title" data-reveal="fade">What one serving supports.</h2>
          </div>

          <div class="ben__meter" aria-hidden="true">
            <div class="ben__counter">
              <span class="ben__odo num">
                <span class="ben__odo-track">
                  ${benefits.map((_, i) => `<span>${pad(i + 1)}</span>`).join('')}
                </span>
              </span>
              <span class="ben__total num">/ ${pad(benefits.length)}</span>
            </div>

            <div class="ben__progress">
              <span class="ben__progress-bar"></span>
            </div>
          </div>
        </header>

        <div class="ben__rail" aria-hidden="true">
          <span class="ben__railline"></span>
          <span class="ben__railfill"></span>
          <ol class="ben__railticks">
            ${benefits
              .map(
                (_, i) => `
              <li class="ben__railtick">
                <span class="ben__railnum num">${pad(i + 1)}</span>
                <i class="ben__railmark"></i>
              </li>`
              )
              .join('')}
          </ol>
        </div>

        <div class="ben__col">
          <ol class="ben__list">
            ${benefits
              .map(
                (b, i) => `
              <li class="ben__row" data-i="${i}">
                <span class="ben__mark" aria-hidden="true"></span>
                <h3 class="ben__row-title">${b.title}</h3>
                <p class="ben__row-body">${b.body}</p>
              </li>`
              )
              .join('')}
          </ol>

          <p class="ben__disclaimer">${product.disclaimer}</p>

          <!-- Stacked, the meter docks here and rides the foot of the
               viewport — the same place it sits on desktop, and clear of
               the fixed nav, which hides on the exact scroll direction
               you read this list in. -->
          <div class="ben__meterslot"></div>
        </div>

      </div>
    </div>
  `;

  const q = (s) => root.querySelector(s);
  const rows = [...root.querySelectorAll('.ben__row')];
  const ticks = [...root.querySelectorAll('.ben__railtick')];
  const track = q('.ben__odo-track');
  const bar = q('.ben__progress-bar');
  const fill = q('.ben__railfill');
  const list = q('.ben__list');
  const rail = q('.ben__rail');
  const meter = q('.ben__meter');
  const ledger = q('.ben__ledger');
  const slot = q('.ben__meterslot');

  /* ---------- the meter lives in two places ----------
     Desktop: inside the sticky ledger. Stacked: inside a sticky strip at
     the head of the list, where it can still travel with the claims it
     counts. One node, moved — never a second copy and never hidden. */
  const stack = window.matchMedia(STACK);

  /* Re-queried on every call, never cached across the section's lifetime:
     a refresh can now land at any moment (scroll.js watches document height
     with a ResizeObserver, main.js re-sorts across two frames), and a stale
     node reference here took the whole mount down with
     "Cannot read properties of null (reading 'appendChild')" — which in turn
     collapsed the page scroll position by ~12,000px. Missing node = no-op. */
  const placeMeter = () => {
    const meterEl = root.querySelector('.ben__meter');
    const host = root.querySelector(stack.matches ? '.ben__meterslot' : '.ben__ledger');
    if (!meterEl || !host) return;
    if (meterEl.parentElement !== host) host.appendChild(meterEl);
  };
  placeMeter();
  if (stack.addEventListener) stack.addEventListener('change', () => {
    placeMeter();
    ScrollTrigger.refresh();
  });

  /* ---------- index rail ----------
     Ticks are pinned to the real vertical centre of each row, so the rail
     is a measured index of the list rather than eight evenly-spaced marks.
     offsetTop is used deliberately: it is layout-based, so GSAP's entrance
     transforms cannot poison the measurement. */
  const placeTicks = () => {
    if (!rail) return;
    const base = rail.offsetTop;
    ticks.forEach((t, i) => {
      const row = rows[i];
      if (!row) return;
      t.style.top = `${row.offsetTop + row.offsetHeight / 2 - base}px`;
    });
  };
  placeTicks();
  onResize(placeTicks);

  /* ---------- entrances ---------- */
  revealLines(q('.ben__title'));
  revealRise([q('.ben__eyebrow'), meter], {
    triggerEl: ledger,
    stagger: 0.09,
  });

  /* Each row carries its own trigger so the list arrives in sequence
     with the scroll rather than all at once. */
  rows.forEach((row) => revealRise(row, { start: START, distance: 26 }));

  revealRise([q('.ben__disclaimer')], { start: START });

  /* ---------- the reading line ----------
     Exactly one row is "current" at a time: the one crossing 58% of the
     viewport. Its type resolves to full ink and the ledger counts.

     Measured from live rects on every update rather than from cached
     ScrollTrigger ranges. This page is assembled from many sections whose
     heights settle late, and its trigger positions currently run ~2,400px
     stale for every section from #pillars down (see report) — against
     cached ranges the ledger simply never counted. Real geometry cannot
     go stale. */
  let current = -2;

  const setCurrent = (i) => {
    if (i === current) return;
    current = i;
    rows.forEach((r, n) => r.classList.toggle('is-current', n === i));
    ticks.forEach((t, n) => {
      t.classList.toggle('is-current', n === i);
      t.classList.toggle('is-done', n < i);
    });
    track.style.setProperty('--i', String(Math.max(i, 0)));
  };

  if (prefersReducedMotion) {
    rows.forEach((r) => r.classList.add('is-current'));
    ticks.forEach((t) => t.classList.add('is-done'));
    gsap.set(bar, { scaleX: 1 });
    gsap.set(fill, { scaleY: 1 });
  } else {
    let lastListH = 0;

    const evaluate = () => {
      const box = list.getBoundingClientRect();
      if (!box.height) return;

      /* Ticks are layout-derived, so re-place them whenever the list
         actually changes size — late media, a resize, a font swap. */
      if (Math.abs(box.height - lastListH) > 1) {
        lastListH = box.height;
        placeTicks();
      }

      const line = window.innerHeight * 0.58;

      let i = -1;
      if (box.top <= line) {
        i = rows.length - 1;
        for (let n = 0; n < rows.length; n++) {
          if (line < rows[n].getBoundingClientRect().bottom) { i = n; break; }
        }
      }
      setCurrent(i);

      /* The horizontal rule in the meter and the vertical fill on the rail
         are the same measurement drawn two ways. */
      const p = Math.min(1, Math.max(0, (line - box.top) / box.height));
      bar.style.transform = `scaleX(${p})`;
      fill.style.transform = `scaleY(${p})`;
    };

    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: evaluate,
      onRefresh: evaluate,
    });

    evaluate();
  }
}
