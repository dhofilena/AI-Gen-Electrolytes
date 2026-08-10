/* ============================================================
   OFFER — the ask.

   Verified commercial facts only, all of them out of content.js:
     the client's real bundle tiers off one typed list price
     · subscribe & save 12% · free shipping over $99 · 365-day guarantee.

   NOT ONE PRICE, PERCENTAGE OR PER-BOX FIGURE IS TYPED HERE. Every number
   this file renders comes back from priceView(), and so does the row
   marker — see bestPerBoxQty(). A struck price beside a live one is a
   claim, and the only way it stays true through a plan switch is if the
   section cannot state it independently of the model.

   ONE DECISION STACK. Flavour, then supply, then subscribe, then the
   button, in the order the customer makes them, all in one column. On a
   phone that whole stack is co-visible in a single screen below the
   gallery; the nav's "Buy" anchor lands at offerTop: 0 and the frame is
   the only thing between the reader and it.

   HONESTY: there is no commerce backend, and the button says so before
   you press it, not after. It confirms a selection; it never simulates
   a purchase or a checkout redirect.
   ============================================================ */

import { gsap, prefersReducedMotion, lockScroll, unlockScroll, getLenis } from '../lib/scroll.js';
import { revealLines, revealRise, revealMedia, EASE_MASK, DUR, START } from '../lib/reveal.js';
import { product, flavors, guarantee, gallery, pricing, priceView } from '../data/content.js';

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

const PLAN_NAME = {
  once: 'One-time',
  sub: `Subscribe & save ${product.subscribeSavePct}%`,
};

/* THE ROW MARKER. It used to read "Popular", keyed to pricing.popularQty — a
   claim about what other customers do, which we have no data for. This says the
   one directional thing the price list can prove on its own: which tier has the
   lowest cost per box. DERIVED under the live plan, never typed, so it cannot
   end up on the wrong row when the subscribe switch re-prices everything.
   `popularQty` still chooses the row that starts selected; it no longer makes
   a claim. */
const FLAG_LABEL = 'Best price per box';

function bestPerBoxQty(plan) {
  return pricing.tiers.reduce((best, t) =>
    priceView(t, plan).perBox < priceView(best, plan).perBox ? t : best
  ).qty;
}

export default function mount(root) {
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
                  <!-- draggable=false or the browser starts a native image
                       drag on pointerdown, fires pointercancel, and the swipe
                       and tap handlers below never see a pointerup. -->
                  <img class="fill offer__shot" src="${packFor(flavors[0]).src}"
                       alt="${packFor(flavors[0]).alt}" decoding="async" draggable="false" />
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

          <!-- READ IT, OR DO NOT SHOW IT. The brand slides are 2000px squares
               whose type is baked into the artwork; the Supplement Facts panel
               sets its table at ~28px of a 2000px canvas. In a 350px phone
               frame that is a 5px row — a slide nobody can read is worse than
               no slide. This opens the artwork full-screen at a width where the
               panel is actually legible, and you pan it. Shown on the brand
               slides only; the pack shot has nothing to magnify. -->
          <button class="offer__zoombtn" type="button" data-zoomopen
                  aria-label="View image full size" hidden>
            <span class="offer__zoomglass" aria-hidden="true"></span>
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
          </figcaption>
        </figure>

        <div class="offer__buy">

          <!-- Flavour lives in the buy column, not on the pack shot. Every
               decision the customer makes now sits in one place and reads in
               the order it is made: which flavour, how many, how often. The
               image still labels itself via the caption, and still re-sources
               when the flavour changes. -->
          <fieldset class="offer__pick" data-reveal="rise">
            <legend class="t-eyebrow t-eyebrow--bare offer__legend">Choose your flavor</legend>
            <div class="offer__picklist">
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
            </div>
          </fieldset>

          <!-- BUNDLE TIERS. Every struck price, per-box figure and SAVE badge
               is derived by priceView() from one typed list price, so the
               saving shown is always arithmetically true. -->
          <fieldset class="offer__tiers" data-reveal="rise">
            <legend class="t-eyebrow t-eyebrow--bare offer__legend">Choose your supply</legend>
            <div class="offer__tierlist" data-tierlist>
              ${pricing.tiers
                .map((t) => {
                  const v = priceView(t, 'once');
                  const start = t.qty === pricing.popularQty;
                  const best = t.qty === bestPerBoxQty('once');
                  return `
                <label class="offer__tier${start ? ' is-on' : ''}${t.qty === 1 ? ' is-single' : ''}" data-qty="${t.qty}">
                  <input class="offer__radio u-sr" type="radio" name="offer-qty"
                         value="${t.qty}"${start ? ' checked' : ''} />
                  <span class="offer__tiermark" aria-hidden="true"></span>

                  <span class="offer__tiermain">
                    <span class="offer__tierline">
                      <span class="offer__tierqty num">${t.qty}</span>
                      <span class="offer__tierunit">${t.qty === 1 ? 'box' : 'boxes'}<span class="offer__tierfor"> for</span></span>
                      <s class="offer__tierlist-was num" data-was><span class="u-sr">Regular price </span>${usd.format(v.list)}</s>
                      <span class="offer__tiernow num" data-now><span class="u-sr">Your price </span>${usd.format(v.price)}</span>
                    </span>
                    <!-- Suppressed on the single box, where the per-box figure
                         IS the total and the row would print the same pair of
                         numbers twice. Kept in the DOM and kept current so the
                         price audit still reads it. -->
                    <span class="offer__tiersub num">
                      <s class="offer__perwas" data-perwas${v.discounted ? '' : ' hidden'}>${usd.format(pricing.listPerBox)}</s>
                      <span data-perbox>${usd.format(v.perBox)}</span> /box
                    </span>
                  </span>

                  <span class="offer__tierright">
                    <span class="offer__tierflag" data-flag${best ? '' : ' hidden'}>${FLAG_LABEL}</span>
                    <span class="offer__tiersave num" data-save>${v.savePct > 0 ? `Save ${v.savePct}%` : ''}</span>
                  </span>
                </label>`;
                })
                .join('')}
            </div>
          </fieldset>

          <!-- Subscribe toggle. A real checkbox with a switch drawn on it —
               it re-prices every tier above rather than being a separate
               delivery choice, which is how the client's own checkout works. -->
          <div class="offer__subwrap" data-reveal="rise">
            <label class="offer__sub">
              <input class="offer__radio u-sr" type="checkbox" data-sub />
              <span class="offer__switch" aria-hidden="true"><span class="offer__knob"></span></span>
              <span class="offer__subtext">
                <span class="offer__subname">Subscribe &amp; save</span>
                <span class="offer__subnote">Extra ${product.subscribeSavePct}% on any option. Cancel anytime.</span>
              </span>
            </label>
          </div>

          <p class="offer__serving" data-reveal="fade">${product.servingSize}</p>

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
              <span class="offer__ctaprice num" data-ctaprice>${usd.format(
                priceView(pricing.tiers.find((t) => t.qty === pricing.popularQty), 'once').price
              )}</span>
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
  const status = q('.offer__status');
  const cta = q('[data-cta]');
  const ctaLabel = q('.offer__ctalabel');
  const buy = q('.offer__buy');
  const subInput = q('[data-sub]');

  const state = {
    qty: pricing.popularQty,
    plan: 'once',
    flavor: flavors[0].id,
    confirmed: false,
  };

  const currentFlavor = () => flavors.find((f) => f.id === state.flavor) || flavors[0];
  const currentTier = () =>
    pricing.tiers.find((t) => t.qty === state.qty) || pricing.tiers[0];
  const currentView = () => priceView(currentTier(), state.plan);

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
  const zoomBtn = q('[data-zoomopen]');

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
      im.draggable = false; // see the note on slide 0's <img>
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
    if (zoomBtn) zoomBtn.hidden = index === 0;
  }

  /* ---------- full-size viewer ---------- */

  /* Lives on <body>, not in the figure: the frame clips its own overflow and
     the section owns a stacking context, so a viewer parked inside either one
     could not cover the page. It carries data-surface so the shared tokens
     resolve exactly as they do inside #offer. */
  document.querySelector('.offer__viewer')?.remove(); // a re-mount must not stack them
  const viewer = document.createElement('div');
  viewer.className = 'offer__viewer';
  viewer.dataset.surface = 'dark';
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', `${product.name} image, full size`);
  viewer.hidden = true;
  viewer.innerHTML = `
    <div class="offer__viewerbar">
      <p class="offer__viewerlabel t-eyebrow t-eyebrow--bare" data-vlabel></p>
      <button class="offer__viewerclose" type="button" data-vclose aria-label="Close image">
        <span class="offer__viewerx" aria-hidden="true"></span>
      </button>
    </div>
    <div class="offer__viewerscroll" data-vscroll>
      <img class="offer__viewerimg" data-vimg alt="" decoding="async" />
    </div>
  `;
  document.body.appendChild(viewer);

  const vImg = viewer.querySelector('[data-vimg]');
  const vLabel = viewer.querySelector('[data-vlabel]');
  const vScroll = viewer.querySelector('[data-vscroll]');
  let viewerOpener = null;
  let viewerY = 0;

  function openViewer(i) {
    const g = extra[i - 1];
    if (!g) return;
    viewerOpener = document.activeElement;
    viewerY = window.scrollY || document.documentElement.scrollTop || 0;
    vImg.src = g.src;
    vImg.alt = g.alt;
    vLabel.textContent = g.label;
    viewer.hidden = false;
    lockScroll();
    vScroll.scrollTop = 0;
    vScroll.scrollLeft = 0;
    viewer.querySelector('[data-vclose]').focus({ preventScroll: true });
  }

  function closeViewer() {
    if (viewer.hidden) return;
    viewer.hidden = true;
    unlockScroll();
    /* body.is-locked collapses document height, so the browser can clamp the
       scroll position to 0 while the viewer is open. Put it back. */
    const l = getLenis();
    if (l) l.scrollTo(viewerY, { immediate: true, force: true });
    else window.scrollTo(0, viewerY);
    viewerOpener?.focus?.({ preventScroll: true });
    viewerOpener = null;
  }

  /* Tap anywhere to dismiss, drag to pan. Closing only on the ground around the
     artwork is a desktop assumption: at 390px the image is wider than the
     screen, so there IS no ground and the X button became the only way out.
     Same tap-versus-drag test the slides use, so the two gestures agree. */
  let vx = 0, vy = 0, vtrack = false;
  vScroll.addEventListener('pointerdown', (e) => { vx = e.clientX; vy = e.clientY; vtrack = true; });
  vScroll.addEventListener('pointerup', (e) => {
    if (!vtrack) return;
    vtrack = false;
    if (Math.abs(e.clientX - vx) < 10 && Math.abs(e.clientY - vy) < 10) closeViewer();
  });

  viewer.addEventListener('click', (e) => {
    if (e.target.closest('[data-vclose]')) closeViewer();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !viewer.hidden) { e.preventDefault(); closeViewer(); }
  });

  zoomBtn?.addEventListener('click', () => openViewer(index));

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
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) { show(index + (dx < 0 ? 1 : -1)); return; }
    /* A tap that went nowhere, on a brand slide, is a request to read it —
       the same gesture every phone gallery answers with a full-size view. */
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && index !== 0) openViewer(index);
  });

  Promise.all(gallery.map((g) => exists(g.src))).then((ok) => {
    extra = gallery.filter((_, i) => ok[i]);
    renderGallery();
  });

  /* Re-price every tier row for the current plan. Struck list price, live
     price, per-box figure and SAVE badge all come from priceView(), so a
     subscribe toggle can never leave a stale number beside a fresh one. */
  function repriceTiers() {
    /* Re-derived every time, under the plan actually selected, so the marker
       can never sit on a row that is no longer the cheapest per box. */
    const bestQty = bestPerBoxQty(state.plan);

    qa('.offer__tier').forEach((row) => {
      const qty = Number(row.dataset.qty);
      const tier = pricing.tiers.find((t) => t.qty === qty);
      if (!tier) return;
      const v = priceView(tier, state.plan);

      row.classList.toggle('is-on', qty === state.qty);
      row.classList.toggle('is-listprice', !v.discounted);

      const flag = row.querySelector('[data-flag]');
      if (flag) flag.hidden = qty !== bestQty;

      const was = row.querySelector('[data-was]');
      const now = row.querySelector('[data-now]');
      const per = row.querySelector('[data-perbox]');
      const save = row.querySelector('[data-save]');

      if (now) now.innerHTML = `<span class="u-sr">Your price </span>${usd.format(v.price)}`;
      if (per) per.textContent = usd.format(v.perBox);

      const perWas = row.querySelector('[data-perwas]');
      if (perWas) {
        perWas.textContent = usd.format(pricing.listPerBox);
        perWas.hidden = !v.discounted;
      }

      /* Hide the strike-through when nothing is actually struck — one box
         bought outright IS list price, and rendering "$24.99 $24.99" would be
         a fabricated saving, which is the opposite of the point. */
      if (was) {
        was.innerHTML = `<span class="u-sr">Regular price </span>${usd.format(v.list)}`;
        was.hidden = !v.discounted;
      }
      if (save) save.textContent = v.savePct > 0 ? `Save ${v.savePct}%` : '';
    });

    /* The button carries the total for what is actually selected, so the price
       you press is the price you chose. */
    const ctaPrice = q('[data-ctaprice]');
    if (ctaPrice) ctaPrice.textContent = usd.format(currentView().price);
  }

  function sync() {
    const f = currentFlavor();

    repriceTiers();

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

    capName.textContent = f.name;
    capNote.textContent = f.note;
  }

  function setConfirmed(on) {
    if (state.confirmed === on) return;
    state.confirmed = on;

    cta.classList.toggle('is-confirmed', on);
    ctaLabel.textContent = on ? 'Selection confirmed' : 'Confirm your selection';

    if (on) {
      const f = currentFlavor();
      const v = currentView();
      status.textContent =
        `${f.name} · ${v.qty} ${v.qty === 1 ? 'box' : 'boxes'} · ${PLAN_NAME[state.plan]} · ` +
        `${usd.format(v.price)} (${usd.format(v.perBox)} per box) — saved to your selection. ` +
        `This is a demo build: no checkout is connected.`;
    } else {
      status.textContent = '';
    }
    status.classList.toggle('is-on', on);
  }

  root.addEventListener('change', (e) => {
    const input = e.target.closest('input');
    if (!input) return;

    if (input.name === 'offer-qty') state.qty = Number(input.value);
    if (input.name === 'offer-flavor') state.flavor = input.value;
    /* The subscribe switch is not a delivery option sitting beside the tiers —
       it re-prices all of them, exactly as the client's own checkout does. */
    if (input === subInput) state.plan = input.checked ? 'sub' : 'once';

    setConfirmed(false); // changing the order invalidates the confirmation
    sync();
  });

  cta.addEventListener('click', () => setConfirmed(!state.confirmed));

  sync();

  /* ---------- entrances: shared vocabulary only ---------- */

  revealLines(q('.offer__title'), { triggerEl: q('.offer__head') });
  revealRise([q('.offer__eyebrow'), q('.offer__tag')], { triggerEl: q('.offer__head') });
  revealMedia(media);
  /* Filter nulls: the price block and delivery fieldset were replaced by the
     tier list and subscribe switch, and gsap throws on a null target. */
  /* Every element carrying data-reveal MUST appear here — base.css holds
     [data-reveal] at opacity 0 until GSAP takes it over, so one omitted from
     this list is simply invisible. The flavour fieldset was, when it moved
     into this column. */
  revealRise(
    [
      q('.offer__pick'),
      q('.offer__tiers'),
      q('.offer__subwrap'),
      q('.offer__serving'),
      q('.offer__act'),
    ].filter(Boolean),
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
