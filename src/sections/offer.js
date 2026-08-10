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
import { product, flavors, guarantee, gallery } from '../data/content.js';

/* THE PACK SHOT. This frame used to run the three flavour fruit macros — a
   citrus close-up standing in for the product on the one screen where the
   customer is being asked to buy it, on a page that never showed the tub, the
   powder or a scoop anywhere across thirteen sections. It then ran an
   unbranded generated tub, because we did not have the real packaging.

   Both are superseded: the client supplied the real packaging, so the frame no longer
   needs an unbranded stand-in. It now shows the ACTUAL packet for the selected
   flavour, and changing flavour changes the product on screen rather than just
   the light in the room.

   Two sources per flavour, in order of preference:
     shot   — a composed hero render built FROM the real packet (Higgsfield),
              fills the frame edge to edge.
     packet — the supplied transparent cut-out. Always on disk, so the frame is
              never empty. Rendered `contain` on a lit ground, not `cover`,
              because a cut-out cropped to fill would slice the packaging.
   `.is-packet` on the figure switches the frame between those two treatments. */
const packFor = (f) => ({
  src: f.shot,
  fallbackSrc: f.packet,
  alt: `${product.name} ${f.name} stick packet`,
});

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
          <!-- Slide 0 is the flavour pack shot and re-sources when the flavour
               changes; the rest are the shared brand slides from content.js.
               Missing files are dropped at mount, never rendered broken. -->
          <div class="offer__gallery" role="group" aria-roledescription="carousel"
               aria-label="${product.name} product images">
            <ul class="offer__slides" data-slides>
              <li class="offer__slide is-on" data-slide="0" role="group"
                  aria-roledescription="slide" aria-label="1 of 1">
                <span class="media-inner offer__inner">
                  <img class="fill offer__shot" src="${packFor(flavors[0]).src}"
                       alt="${packFor(flavors[0]).alt}" decoding="async" />
                </span>
              </li>
            </ul>
          </div>

          <button class="offer__arrow offer__arrow--prev" type="button" data-prev
                  aria-label="Previous image" hidden>
            <span class="offer__chev" aria-hidden="true"></span>
          </button>
          <button class="offer__arrow offer__arrow--next" type="button" data-next
                  aria-label="Next image" hidden>
            <span class="offer__chev" aria-hidden="true"></span>
          </button>

          <!-- Selection still has a visible consequence on the frame: the
               accent light in the room crosses over with the flavour, on the
               same curve #flavors uses. -->
          <span class="offer__wash" aria-hidden="true"></span>
          <span class="offer__scrim" aria-hidden="true"></span>

          <figcaption class="offer__foot">
            <span class="offer__cap">
              <span class="offer__capname t-h4">${flavors[0].name}</span>
              <span class="offer__capnote t-micro">${flavors[0].note}</span>
            </span>

            <span class="offer__thumbs" data-thumbs hidden></span>

            <span class="offer__pick" role="group" aria-labelledby="offer-picklabel">
              <span class="offer__picklabel t-eyebrow t-eyebrow--bare" id="offer-picklabel">
                Choose your flavor
              </span>
              <span class="offer__picklist">
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

  /* The composed hero render may not exist for a given flavour yet. Fall back
     to that flavour's real packet cut-out and switch the frame to `contain` so
     the packaging is shown whole rather than cropped. Per-flavour, not once
     globally — each swap re-arms, since one flavour having a shot says nothing
     about the others. Guarded so a missing packet cannot loop. */
  function setShot(f) {
    if (!shot) return;
    const p = packFor(f);
    shot.dataset.fallen = '';
    shot.alt = p.alt;
    media?.classList.remove('is-packet');

    shot.onerror = () => {
      if (shot.dataset.fallen === '1') { shot.onerror = null; return; }
      shot.dataset.fallen = '1';
      media?.classList.add('is-packet');
      shot.src = p.fallbackSrc;
    };

    shot.src = p.src;
  }

  setShot(flavors[0]);

  /* ---------- gallery ---------- */

  const slidesEl = q('[data-slides]');
  const thumbsEl = q('[data-thumbs]');
  const prevBtn = q('[data-prev]');
  const nextBtn = q('[data-next]');

  let extra = [];   // brand slides that actually resolved
  let index = 0;
  let shownFlavor = state.flavor;  // which flavour the gallery is currently showing

  /* Probe each file before building a slide for it. A 404 in this section is a
     dead frame in the middle of the buy flow, so the gallery only ever contains
     images that are genuinely on disk. */
  const exists = (src) =>
    new Promise((res) => {
      const im = new Image();
      im.onload = () => res(true);
      im.onerror = () => res(false);
      im.src = src;
    });

  function slideCount() { return 1 + extra.length; }

  function renderGallery() {
    if (!slidesEl) return;
    const single = slideCount() < 2;

    // slide 0 already exists; append the resolved brand slides once
    slidesEl.querySelectorAll('[data-extra]').forEach((n) => n.remove());
    extra.forEach((g, i) => {
      const li = document.createElement('li');
      li.className = 'offer__slide';
      li.dataset.slide = String(i + 1);
      li.dataset.extra = '1';
      li.setAttribute('role', 'group');
      li.setAttribute('aria-roledescription', 'slide');
      const im = document.createElement('img');
      im.className = 'fill offer__still';
      im.src = g.src;
      im.alt = g.alt;
      im.decoding = 'async';
      im.loading = 'lazy';
      li.appendChild(im);
      slidesEl.appendChild(li);
    });

    [...slidesEl.children].forEach((li, i) =>
      li.setAttribute('aria-label', `${i + 1} of ${slideCount()}`)
    );

    if (thumbsEl) {
      thumbsEl.hidden = single;
      thumbsEl.innerHTML = '';
      if (!single) {
        for (let i = 0; i < slideCount(); i++) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'offer__thumb' + (i === index ? ' is-on' : '');
          b.dataset.go = String(i);
          b.setAttribute('aria-label', i === 0 ? 'Product' : extra[i - 1].label);
          b.innerHTML = `<span class="offer__thumbbar" aria-hidden="true"></span><span class="offer__thumblabel">${
            i === 0 ? 'Product' : extra[i - 1].label
          }</span>`;
          thumbsEl.appendChild(b);
        }
      }
    }

    if (prevBtn) prevBtn.hidden = single;
    if (nextBtn) nextBtn.hidden = single;
    show(index);
  }

  function show(i) {
    if (!slidesEl) return;
    const n = slideCount();
    index = ((i % n) + n) % n;
    [...slidesEl.children].forEach((li, k) => li.classList.toggle('is-on', k === index));
    thumbsEl?.querySelectorAll('.offer__thumb').forEach((b, k) => {
      b.classList.toggle('is-on', k === index);
      b.setAttribute('aria-current', k === index ? 'true' : 'false');
    });
    media?.classList.toggle('is-still', index !== 0);
  }

  prevBtn?.addEventListener('click', () => show(index - 1));
  nextBtn?.addEventListener('click', () => show(index + 1));
  thumbsEl?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) show(Number(b.dataset.go));
  });

  /* Arrow keys while the gallery has focus. */
  q('.offer__gallery')?.closest('.offer__media')?.addEventListener('keydown', (e) => {
    if (slideCount() < 2) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
  });

  /* Horizontal swipe. Vertical drags are left alone so the page still scrolls. */
  let sx = 0, sy = 0, tracking = false;
  slidesEl?.addEventListener('pointerdown', (e) => {
    if (slideCount() < 2) return;
    sx = e.clientX; sy = e.clientY; tracking = true;
  });
  slidesEl?.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
  });

  Promise.all(gallery.map((g) => exists(g.src))).then((ok) => {
    extra = gallery.filter((_, i) => ok[i]);
    renderGallery();
  });

  function sync() {
    const f = currentFlavor();
    const p = currentPlan();

    /* One attribute re-themes the frame's accent light — and now the product
       on screen changes too, not just the light. */
    if (media) media.dataset.flavor = f.id;
    setShot(f);

    /* Snap back to the pack shot when the FLAVOUR changes. Picking a flavour
       while parked on the Supplement Facts slide otherwise leaves you staring
       at the same panel with no sign the choice registered. Guarded on the
       flavour actually changing, so switching delivery plan does not yank the
       gallery out from under someone mid-read. */
    if (shownFlavor !== f.id) {
      shownFlavor = f.id;
      show(0);
    }

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
