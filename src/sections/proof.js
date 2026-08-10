/* ============================================================
   PROOF — trust, immediately before the ask.

   EVERYTHING in this section is verifiable:
     • the 365-day money-back guarantee (content.js → guarantee)
     • the certifications (content.js → formula.certs)
     • the development record (three years / hundreds of formulas)

   There is deliberately NO social proof here. No testimonials,
   no customer names, no star ratings, no review counts, no
   "as seen in" logos. None of those could be verified from the
   source product page, and fabricated reviews are unlawful in
   several jurisdictions. The empty review slot below is marked
   in the markup for when real, attributable reviews exist.
   ============================================================ */

import { gsap, prefersReducedMotion } from '../lib/scroll.js';
import { revealLines, revealRise, parallax, countUp } from '../lib/reveal.js';
import { guarantee, formula, research } from '../data/content.js';

const TICKS = 13; // 13 marks = 12 intervals = one year

/* The monument already says the number. Strip the leading "365-day" from the
   heading so the figure is stated once, not twice within 300px — derived from
   content.js, never retyped. The verbatim title stays in the DOM for screen
   readers so the accessible name is unchanged. */
function headingTail(title, days) {
  const tail = title.replace(new RegExp(`^\\s*${days}\\s*-?\\s*days?\\s+`, 'i'), '');
  return tail === title ? title : tail;
}

export default function mount(root) {
  /* `note` is the provenance line. A citation COUNT with no citations anywhere
     on the page is the one unsupported assertion in a section whose entire job
     is verification — so the figure now says where the eighteen actually live.
     The string is content.js -> research.referencesNote; nothing is retyped. */
  const facts = [
    { value: research.years, display: String(research.years), label: 'years of development in the BIO Lab' },
    { value: null, display: research.formulations, label: 'of formulations tested and rejected' },
    {
      value: research.references,
      display: String(research.references),
      label: 'peer-reviewed references cited',
      note: research.referencesNote,
    },
  ];

  root.innerHTML = `
    <div class="proof__bg" aria-hidden="true">
      <img src="/media/still-texture-salt.png" alt="" decoding="async" loading="lazy" />
    </div>

    <div class="wrap proof__wrap">

      <section class="proof__block proof__block--guarantee" aria-labelledby="proof-guarantee-title">
        <p class="t-eyebrow proof__eyebrow" data-reveal="fade">The guarantee</p>

        <div class="proof__lead">
          <p class="proof__figure" aria-hidden="true">
            <span class="proof__num num">${guarantee.days}</span>
            <span class="proof__unit">days</span>
          </p>

          <div class="proof__say">
            <h2 class="proof__title t-h3" id="proof-guarantee-title">
              <span class="u-sr">${guarantee.title}</span>
              <span class="proof__titletext" aria-hidden="true">${headingTail(guarantee.title, guarantee.days)}</span>
            </h2>
            <p class="proof__body t-body">${guarantee.body}</p>
          </div>
        </div>

        <div class="proof__year" aria-hidden="true">
          <div class="proof__track">
            <span class="proof__rule"></span>
            <span class="proof__draw"></span>
            <span class="proof__ticks">
              ${Array.from({ length: TICKS }, (_, i) =>
                `<i class="proof__tick${i === 0 || i === TICKS - 1 ? ' is-end' : ''}"></i>`
              ).join('')}
            </span>
          </div>
          <p class="proof__ends t-micro">
            <span class="num">Day 1</span>
            <span class="num">Day ${guarantee.days}</span>
          </p>
        </div>
      </section>

      <!-- ==================================================================
           REAL CUSTOMER REVIEWS GO HERE — INTENTIONALLY EMPTY.

           No verified testimonials, customer names, star ratings or review
           counts could be extracted from the source product page. Nothing
           has been invented to fill this space: fabricated reviews are
           illegal in several jurisdictions and would discredit every other
           claim on this page.

           When the client supplies real, attributable reviews, render them
           here. Do NOT populate this slot with placeholder people.
           ================================================================== -->

      <!-- THE RECORD.
           Three verifiable facts about how the formula was made, set on the
           SAME instrument as the guarantee directly above: figure left at
           display scale, the words it belongs to on the right-hand text axis,
           sharing one baseline, one hairline per fact. Previously this was a
           three-column hairline grid with the figures at --fs-h2 (63px) — a
           quarter of the 365 monument 300px above them and a sixth of the
           98% in #myth — which read as a fact sheet dropped into the page at
           the point of maximum persuasive load. The page already runs a
           display-numeral ladder (272 mega / 137 display); the record now
           sits on its second rung instead of off it. -->
      <section class="proof__block proof__block--record" aria-labelledby="proof-record-title">
        <p class="t-eyebrow proof__eyebrow" data-reveal="fade" id="proof-record-title">The record</p>
        <ol class="proof__facts">
          ${facts.map((f) => `
            <li class="proof__fact" data-reveal="rise">
              <p class="proof__factfig">
                <span class="proof__factn num${f.value === null ? ' proof__factn--word' : ''}"${
                  f.value === null ? '' : ` data-to="${f.value}"`
                }>${f.display}</span>
              </p>
              <div class="proof__factsay">
                <p class="proof__factl">${f.label}</p>
                ${f.note ? `<p class="proof__factnote">${f.note}</p>` : ''}
              </div>
            </li>
          `).join('')}
        </ol>
      </section>

      <section class="proof__block proof__block--certs" aria-labelledby="proof-certs-title">
        <p class="t-eyebrow proof__eyebrow" data-reveal="fade" id="proof-certs-title">Tested &amp; certified</p>
        <ul class="proof__certs">
          ${formula.certs.map((c) => `
            <li class="proof__cert" data-reveal="fade"><span>${c}</span></li>
          `).join('')}
        </ul>
      </section>

    </div>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  /* ---------- background texture: slow, subtle parallax ---------- */
  parallax(q('.proof__bg img'), { amount: 8, triggerEl: root });

  /* ---------- the guarantee ---------- */
  const lead = q('.proof__lead');
  revealLines(q('.proof__title'), { triggerEl: lead });
  revealRise([q('.proof__block--guarantee .proof__eyebrow'), q('.proof__figure')], {
    triggerEl: lead,
  });
  revealRise([q('.proof__body')], { triggerEl: lead, delay: 0.18 });

  countUp(q('.proof__num'), guarantee.days, { triggerEl: lead });

  /* ---------- the year, drawn by real scroll distance ---------- */
  const year = q('.proof__year');
  const draw = q('.proof__draw');
  const ticks = qa('.proof__tick');

  if (prefersReducedMotion) {
    gsap.set(draw, { scaleX: 1 });
    gsap.set(ticks, { opacity: 1 });
  } else {
    gsap.set(draw, { scaleX: 0 });
    gsap.set(ticks, { opacity: 0 });

    gsap.timeline({
      scrollTrigger: {
        trigger: year,
        start: 'top 92%',
        end: 'top 46%',
        scrub: true,
      },
    })
      .to(draw, { scaleX: 1, ease: 'none' }, 0)
      .to(ticks, { opacity: 1, ease: 'none', stagger: 0.06 }, 0);
  }

  /* ---------- the record ---------- */
  const record = q('.proof__block--record');
  revealRise([q('.proof__block--record .proof__eyebrow'), ...qa('.proof__fact')], {
    triggerEl: record,
  });

  /* Driven off data-to rather than nth-child, so the word ("Hundreds") can
     never be handed to a counter if the order of `facts` ever changes. */
  qa('.proof__factn[data-to]').forEach((el) =>
    countUp(el, Number(el.dataset.to), { triggerEl: record })
  );

  /* ---------- certifications ---------- */
  const certs = q('.proof__block--certs');
  revealRise([q('.proof__block--certs .proof__eyebrow'), ...qa('.proof__cert')], {
    triggerEl: certs,
    distance: 18,
    stagger: 0.05,
  });
}
