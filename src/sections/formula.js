/* ============================================================
   FORMULA — white. A specification sheet, not a list.

   Fifteen components banded into four labelled groups, each
   band carrying its own count on the right-hand numeric axis.
   Four axes now, not three: index / name / quantity / form.

   ON THE QUANTITIES — read before touching this file.
   Only two per-ingredient amounts are verifiable from the
   source product page: potassium 610mg and sodium 200mg
   (they live in content.js as cellScience.ratio). The rest of
   the Supplement Facts panel was not extractable, so NOTHING
   else gets a number and nothing gets a placeholder dash
   either — an em-dash in a quantity column reads as missing
   data, and an invented milligram figure would be a fabricated
   supplement fact. The chemical FORM is the data column; the
   band counts and the two verified amounts are the numerals.
   If more amounts are ever verified, add them to content.js
   and they will render here automatically.

   The bone -> white boundary is owned here: a single full-bleed
   hairline that draws across as the section arrives, then a
   deliberate void of white before anything is said.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/scroll.js';
import { revealLines, revealRise, revealMedia, EASE, DUR, START } from '../lib/reveal.js';
import { formula, cellScience, comparison } from '../data/content.js';

const pad = (i) => String(i + 1).padStart(2, '0');
const LETTERS = ['A', 'B', 'C', 'D'];

/* "Magnesium (citrate, glycinate, malate, taurate)"
   -> { name: 'Magnesium', form: 'citrate, glycinate, malate, taurate' }
   Presentation only — the strings themselves are untouched. */
function splitIngredient(s) {
  const m = s.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { name: m[1], form: m[2] } : { name: s, form: '' };
}

/* Panel groupings. Presentation only — the ingredient strings and their order
   in content.js are untouched; this only brackets them.

   TAXONOMY — read before editing either regex.
   #pillars states the verified product claim: "5 Electrolytes — potassium,
   sodium, magnesium, calcium, chloride". This ledger used to head a band
   "ELECTROLYTES 03" (chloride, sodium, potassium) and file magnesium and
   calcium under MINERALS, so one page carried two different answers to
   "how many electrolytes are in this?" two sections apart. The pillars figure
   is the product claim and cannot move, so the grouping is what gives:
   calcium and magnesium are counted where the product counts them, and the
   band now reads ELECTROLYTES 05 against the pillars' 5. What is left in
   MINERALS is the trace/cofactor set.

   Consequence: the bands are no longer contiguous runs of the source list, so
   the index column is numbered by position in THIS ledger (see `ledgerRows`)
   rather than by position in the source array — otherwise the column would
   read 01,02,03 | 06..10 | 04,05,11..13 | 14,15 down the page. The index was
   always a decorative, aria-hidden counter; it is now honestly a count of the
   sheet you are reading. */
const GROUPS = [
  { id: 'vitamins', title: 'Vitamins', test: (n) => /^(Niacin|Vitamin)\b/.test(n) },
  {
    id: 'minerals',
    title: 'Minerals',
    test: (n) => /^(Zinc|Copper|Manganese|Chromium|Molybdenum)\b/.test(n),
  },
  {
    id: 'electrolytes',
    title: 'Electrolytes',
    test: (n) => /^(Chloride|Sodium|Potassium|Magnesium|Calcium)\b/.test(n),
  },
  { id: 'other', title: 'Other', test: () => true },
];

/* The one plate in the section. Product first, texture as the fallback. */
const PLATE = '/media/product-scoop.png';
const PLATE_FALLBACK = '/media/still-texture-salt.png';

/* The only two amounts the source page states. Unit comes from the
   comparison table so even that is not restated here. */
const UNIT = comparison.rows.find((r) => r.key === 'potassium')?.unit || 'mg';
const AMOUNTS = {
  Potassium: cellScience.ratio.potassium,
  Sodium: cellScience.ratio.sodium,
};

export default function mount(root) {
  const rows = formula.ingredients.map((s, i) => {
    const r = splitIngredient(s);
    return { ...r, i, amount: AMOUNTS[r.name] ?? null };
  });

  const banded = GROUPS.map((g) => ({
    ...g,
    items: rows.filter((r) => GROUPS.find((x) => x.test(r.name)) === g),
  })).filter((g) => g.items.length);

  /* Renumber the index column by ledger position — see the TAXONOMY note above
     GROUPS. Mutating `.i` here is safe: `rows` is built fresh from
     formula.ingredients on every mount and nothing else reads it. */
  banded.flatMap((g) => g.items).forEach((r, n) => { r.i = n; });

  const rowMarkup = (r) => `
    <li class="for__row${r.form ? '' : ' for__row--solo'}">
      <span class="for__idx num" aria-hidden="true">${pad(r.i)}</span>
      <span class="for__name">${r.name}</span>
      ${
        r.amount
          ? `<span class="for__qty num">${r.amount}<i>${UNIT}</i></span>`
          : '<span class="for__qty" aria-hidden="true"></span>'
      }
      ${r.form ? `<span class="for__form">${r.form}</span>` : ''}
    </li>`;

  root.innerHTML = `
    <span class="for__seam" aria-hidden="true"><i></i></span>

    <div class="wrap wrap--narrow for">

      <header class="for__head">
        <p class="t-eyebrow">${formula.eyebrow}</p>
        <h2 class="for__title">${formula.headline}</h2>
        <p class="for__body">${formula.body}</p>
      </header>

      <section class="for__spec">
        <div class="for__specHead">
          <p class="t-eyebrow t-eyebrow--bare">Composition</p>
          <p class="for__specCount num">${formula.ingredients.length}</p>
          <p class="for__specNote">Listed components</p>

          <ul class="for__legend">
            ${banded
              .map(
                (g, i) => `
              <li class="for__legendItem" data-group="${g.id}"${i === 0 ? ' data-active' : ''}>
                <span class="for__legendMark" aria-hidden="true"></span>
                <span class="for__legendName">${g.title}</span>
                <span class="for__legendN num">${pad(g.items.length - 1)}</span>
              </li>`
              )
              .join('')}
          </ul>
        </div>

        <div class="for__sheet">
          ${banded
            .map(
              (g, gi) => `
            <section class="for__group" data-group="${g.id}">
              <header class="for__band">
                <span class="for__bandIdx" aria-hidden="true">${LETTERS[gi] || ''}</span>
                <h3 class="for__bandName">${g.title}</h3>
                <span class="for__bandN num">${pad(g.items.length - 1)}</span>
              </header>
              <ol class="for__rows">
                ${g.items.map(rowMarkup).join('')}
              </ol>
            </section>`
            )
            .join('')}

          <p class="for__note">
            Potassium and sodium amounts are stated per serving. The complete
            Supplement Facts panel, with every amount and % daily value, is
            printed on the product label.
          </p>
        </div>
      </section>

      <section class="for__sweet">
        <figure class="for__figure media-frame" data-media-reveal>
          <!-- The product still, where the page previously had none. The macro
               scoop is being rendered; if it has not landed the onerror below
               falls back to the mineral texture this frame shipped with, so the
               layout is final either way and the frame is never broken. -->
          <img src="${PLATE}" data-fallback="${PLATE_FALLBACK}"
               alt="Macro detail of the powder's crystalline texture"
               decoding="async" loading="lazy" />
        </figure>
        <div class="for__sweetBody">
          <p class="t-eyebrow">Sweetener</p>
          <h3 class="for__sweetTitle">${formula.sweeteners.title}</h3>
          <p class="for__sweetText">${formula.sweeteners.body}</p>
        </div>
      </section>

      <!-- The certification marks used to close this section as well. They are
           stated in full in #proof ("Tested & certified") and again in the
           footer, so on one read-through the same six names appeared three
           times inside four screens. #proof owns them: that is the section
           whose whole job is verification, and its treatment is the strongest.
           Removing them here also takes the only saturated accent out of a
           light section that does not need one. The strings are untouched in
           content.js and still render twice. -->

    </div>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => Array.from(root.querySelectorAll(s));

  /* ---- the boundary: bone -> white, drawn deliberately ---- */
  const seam = q('.for__seam i');
  if (prefersReducedMotion) {
    gsap.set(seam, { scaleX: 1 });
  } else {
    gsap.fromTo(
      seam,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        transformOrigin: '0% 50%',
        scrollTrigger: {
          trigger: root,
          start: 'top bottom',
          end: 'top 64%',
          scrub: true,
        },
      }
    );
  }

  /* ---- header ---- */
  revealRise(qa('.for__head > .t-eyebrow'), { distance: 16 });
  revealLines(q('.for__title'));
  revealRise(qa('.for__body'), { distance: 20, delay: 0.12 });

  /* ---- spec sheet: the label holds while the sheet runs past it ---- */
  revealRise(qa('.for__specHead > *'), { distance: 16, stagger: 0.08, triggerEl: q('.for__specHead') });

  /* Each band resolves on its own, so the stagger stays short no matter how
     many components a group holds. */
  qa('.for__group').forEach((group) => {
    const items = [group.querySelector('.for__band'), ...group.querySelectorAll('.for__row')];
    if (prefersReducedMotion) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }
    gsap.fromTo(
      items,
      { y: 18, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: DUR.mid,
        ease: EASE,
        stagger: 0.06,
        scrollTrigger: { trigger: group, start: START, once: true },
      }
    );
  });

  revealRise(qa('.for__note'), { distance: 14 });

  /* ---- the legend tracks the sheet: the sticky column stops being three
     dead lines and becomes the reader's position in the document ---- */
  const legendItems = qa('.for__legendItem');
  const groups = qa('.for__group');
  if (legendItems.length && groups.length) {
    /* Resolved from geometry on every update rather than from per-group
       enter/leave callbacks: an instant scroll jump (the capture harness, an
       anchor link, a restored scroll position) teleports past the crossings
       and leaves callback-driven state stale. */
    const sync = () => {
      const line = window.innerHeight * 0.45;
      let id = groups[0].dataset.group;
      groups.forEach((g) => {
        if (g.getBoundingClientRect().top <= line) id = g.dataset.group;
      });
      legendItems.forEach((el) => el.toggleAttribute('data-active', el.dataset.group === id));
    };

    ScrollTrigger.create({
      trigger: q('.for__spec'),
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: sync,
      onRefresh: sync,
    });
  }

  /* ---- the one plate in the section. Curtain-wipe + inner scale-down. ----
     One swap only: if the product still is not on disk yet, drop to the
     texture the frame shipped with rather than rendering a broken image. */
  const plate = q('.for__figure img');
  if (plate) {
    plate.addEventListener(
      'error',
      () => { if (plate.dataset.fallback) plate.src = plate.dataset.fallback; },
      { once: true }
    );
  }
  revealMedia(q('.for__figure'));

  revealRise(qa('.for__sweetBody > .t-eyebrow'), { distance: 16, triggerEl: q('.for__sweetBody') });
  revealLines(q('.for__sweetTitle'));
  revealRise(qa('.for__sweetText'), { distance: 18, delay: 0.1 });
}
