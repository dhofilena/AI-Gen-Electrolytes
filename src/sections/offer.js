/* ============================================================
   OFFER — the ask.

   Verified commercial facts only (content.js → product):
     regular $40.00 · sale $32.00 (20% off) · subscribe & save 12%
     · free shipping over $99 · 365-day guarantee.
   No bundle tiers are shown because none could be verified.
   The subscription discount is disclosed as applied at checkout
   rather than shown as a derived dollar figure we cannot confirm.

   THE ASK IS ON THE FIRST SCREEN. The nav's "Buy $32" anchors here and
   lands at offerTop: 0, so everything the customer needs to act —
   name, price, delivery, flavour, button — resolves inside the first
   viewport of the section. The old build put the button 951px down.

   CHROME: one selector floating on the product image (Oura's move), one
   hairline delivery row, one button. No radio cards, no chip row, no
   corner radii — the rest of the page is hairlines and square corners
   and this section now speaks the same language.

   HONESTY: there is no commerce backend, and the button says so before
   you press it, not after. It confirms a selection; it never simulates
   a purchase or a checkout redirect.
   ============================================================ */

import { gsap, prefersReducedMotion } from '../lib/scroll.js';
import { revealLines, revealRise, revealMedia, EASE_MASK, DUR, START } from '../lib/reveal.js';
import { product, flavors, guarantee } from '../data/content.js';

/* THE PACK SHOT. This frame used to run the three flavour fruit macros — a
   citrus close-up standing in for the product on the one screen where the
   customer is being asked to buy it, on a page that never showed the tub, the
   powder or a scoop anywhere across thirteen sections.

   The tub still is rendering. If it has not landed, the frame falls back to
   the prepared-drink still that is already on disk — so this section shows the
   real product either way and the layout is final now, not conditionally.
   Both are deliberately UNBRANDED: we do not have the real packaging, and a
   plausible fake label would put invented branding on screen. */
const PACK = {
  src: '/media/product-tub.png',
  alt: 'A tub of the powder with a scoop, on a dark surface',
  fallbackSrc: '/media/still-hero-glass.png',
  fallbackAlt: 'A full glass of the prepared drink in daylight',
};

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const PLANS = [
  { id: 'once', name: 'One-time', note: 'A single delivery.' },
  {
    id: 'sub',
    name: `Subscribe & save ${product.subscribeSavePct}%`,
    note: `An extra ${product.subscribeSavePct}% off every delivery, applied at checkout.`,
  },
];

export default function mount(root) {
  const sale = usd.format(product.priceSale);
  const regular = usd.format(product.priceRegular);
  const ship = usd0.format(product.freeShipOver);

  root.innerHTML = `
    <div class="wrap offer__wrap">
      <div class="offer__panel">

        <header class="offer__head">
          <p class="t-eyebrow offer__eyebrow" data-reveal="fade">Order</p>
          <h2 class="offer__title t-h2">${product.name}</h2>
          <p class="offer__tag" data-reveal="fade">${product.tagline}</p>
        </header>

        <figure class="offer__media grain" data-flavor="${flavors[0].id}">
          <span class="media-inner offer__inner">
            <img class="fill offer__shot" src="${PACK.src}" alt="${PACK.alt}"
                 decoding="async" loading="lazy" />
          </span>
          <!-- Selection still has a visible consequence on the frame: the
               accent light in the room crosses over with the flavour, on the
               same curve #flavors uses. Tinting the product itself would be
               dressing an unbranded tub up as three different SKUs. -->
          <span class="offer__wash" aria-hidden="true"></span>
          <span class="offer__scrim" aria-hidden="true"></span>

          <figcaption class="offer__foot">
            <span class="offer__cap">
              <span class="offer__capname t-h4">${flavors[0].name}</span>
              <span class="offer__capnote t-micro">${flavors[0].note}</span>
            </span>

            <span class="offer__pick" role="group" aria-label="Flavor">
              ${flavors
                .map(
                  (f, i) => `
                <label class="offer__swatch${i === 0 ? ' is-on' : ''}" data-flavor="${f.id}">
                  <input class="offer__radio u-sr" type="radio" name="offer-flavor"
                         value="${f.id}" aria-label="${f.name}"${i === 0 ? ' checked' : ''} />
                  <span class="offer__dot" aria-hidden="true"></span>
                  <span class="offer__swatchname">${f.short}</span>
                </label>`
                )
                .join('')}
            </span>
          </figcaption>
        </figure>

        <div class="offer__buy">

          <div class="offer__price" data-reveal="rise">
            <p class="offer__now num"><span class="u-sr">Sale price </span>${sale}</p>
            <p class="offer__meta">
              <s class="offer__was num"><span class="u-sr">Regular price </span>${regular}</s>
              <span class="offer__save num">Save ${product.discountPct}%</span>
            </p>
          </div>

          <p class="offer__serving" data-reveal="fade">${product.servingSize}</p>

          <fieldset class="offer__plan" data-reveal="rise">
            <legend class="t-eyebrow t-eyebrow--bare offer__legend">Delivery</legend>
            <div class="offer__opts">
              ${PLANS.map(
                (p, i) => `
                <label class="offer__opt${i === 0 ? ' is-on' : ''}">
                  <input class="offer__radio u-sr" type="radio" name="offer-plan"
                         value="${p.id}"${i === 0 ? ' checked' : ''} />
                  <span class="offer__optname">${p.name}</span>
                </label>`
              ).join('')}
            </div>
            <p class="offer__planline">${PLANS[0].note}</p>
          </fieldset>

          <!-- THE ASK.
               It was a full-width saturated orange bar — the one object on a
               page of hairlines and square corners that looked bought rather
               than drawn. Re-treated in the page's own language: a plate held
               by a hairline, capped by the SAME 2px accent rule that caps the
               "us" column in #compare and marks the chosen delivery option
               eight lines above, drawn across on entry. It is still the widest,
               tallest, only plated object in its viewport; the saturation is
               now the response to the press, not the resting state. -->
          <div class="offer__act" data-reveal="rise">
            <button class="offer__cta" type="button" data-cta>
              <span class="offer__ctarule" aria-hidden="true"></span>
              <span class="offer__ctalabel">Confirm your selection</span>
              <span class="offer__ctaprice num">${sale}</span>
            </button>

            <p class="offer__note">
              Demo build — this records your choice. No checkout is connected.
            </p>

            <p class="offer__status t-small" role="status" aria-live="polite"></p>
          </div>

        </div>

        <!-- The section used to stop at the foot of the two columns and leave
             ~100px of flat ink before the white cut of #faq. The two things
             true of every order close the panel instead, on a full-measure
             hairline record — the same instrument as #ritual's plinth — so the
             remaining space below is the seam it is supposed to be. -->
        <footer class="offer__close">
          <p class="t-eyebrow t-eyebrow--bare offer__closelabel">Every order</p>
          <ul class="offer__assure">
            <li class="offer__assureitem">
              <span class="num">${guarantee.days}</span>-day money-back guarantee
            </li>
            <li class="offer__assureitem">
              Free shipping over <span class="num">${ship}</span>
            </li>
          </ul>
        </footer>
      </div>
    </div>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  const media = q('.offer__media');
  const shot = q('.offer__shot');
  const capName = q('.offer__capname');
  const capNote = q('.offer__capnote');
  const planLine = q('.offer__planline');
  const status = q('.offer__status');
  const cta = q('[data-cta]');
  const ctaLabel = q('.offer__ctalabel');
  const buy = q('.offer__buy');

  const state = { plan: PLANS[0].id, flavor: flavors[0].id, confirmed: false };

  const currentFlavor = () => flavors.find((f) => f.id === state.flavor) || flavors[0];
  const currentPlan = () => PLANS.find((p) => p.id === state.plan) || PLANS[0];

  /* ---------- selection → visible consequence ---------- */

  /* One swap only, then give up — never leave a broken node in the ask. */
  if (shot) {
    shot.addEventListener(
      'error',
      () => {
        shot.src = PACK.fallbackSrc;
        shot.alt = PACK.fallbackAlt;
      },
      { once: true }
    );
  }

  function sync() {
    const f = currentFlavor();
    const p = currentPlan();

    /* One attribute re-themes the frame's accent light. */
    if (media) media.dataset.flavor = f.id;

    qa('.offer__swatch').forEach((c) =>
      c.classList.toggle('is-on', c.dataset.flavor === f.id)
    );
    qa('.offer__opt').forEach((o) =>
      o.classList.toggle('is-on', o.querySelector('input').value === p.id)
    );

    capName.textContent = f.name;
    capNote.textContent = f.note;
    planLine.textContent = p.note;
  }

  function setConfirmed(on) {
    if (state.confirmed === on) return;
    state.confirmed = on;

    cta.classList.toggle('is-confirmed', on);
    ctaLabel.textContent = on ? 'Selection confirmed' : 'Confirm your selection';

    if (on) {
      const f = currentFlavor();
      const p = currentPlan();
      status.textContent =
        `${f.name} · ${p.name} · ${usd.format(product.priceSale)} — saved to your selection.`;
    } else {
      status.textContent = '';
    }
    status.classList.toggle('is-on', on);
  }

  root.addEventListener('change', (e) => {
    const input = e.target.closest('input[type="radio"]');
    if (!input) return;
    if (input.name === 'offer-plan') state.plan = input.value;
    if (input.name === 'offer-flavor') state.flavor = input.value;
    setConfirmed(false); // changing the order invalidates the confirmation
    sync();
  });

  cta.addEventListener('click', () => setConfirmed(!state.confirmed));

  sync();

  /* ---------- entrances: shared vocabulary only ---------- */

  revealLines(q('.offer__title'), { triggerEl: q('.offer__head') });
  revealRise([q('.offer__eyebrow'), q('.offer__tag')], { triggerEl: q('.offer__head') });
  revealMedia(media);
  revealRise(
    [q('.offer__price'), q('.offer__serving'), q('.offer__plan'), q('.offer__act')],
    { triggerEl: buy, stagger: 0.08 }
  );
  revealRise([q('.offer__closelabel'), ...qa('.offer__assureitem')], {
    triggerEl: q('.offer__close'),
    distance: 18,
    stagger: 0.07,
  });

  /* The accent rule draws across the ask — the page's one entrance for a
     rule, shared with #compare's column cap and #pillars' opening measure. */
  const ctaRule = q('.offer__ctarule');
  if (prefersReducedMotion) {
    gsap.set(ctaRule, { scaleX: 1 });
  } else {
    gsap.fromTo(
      ctaRule,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: DUR.slow,
        ease: EASE_MASK,
        scrollTrigger: { trigger: q('.offer__act'), start: START, once: true },
      }
    );
  }
}
