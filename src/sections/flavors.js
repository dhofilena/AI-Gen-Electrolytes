/* ============================================================
   FLAVORS — the configurator.
   A sticky full-viewport stage that re-themes itself around ONE
   flavor at a time. Three states, driven by scroll OR by the
   tablist. The colour swap (wash / film / type accent) is the
   payoff: slow, weighted, on --e-in-out.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReducedMotion, getLenis } from '../lib/scroll.js';
import { revealMedia, revealRise, EASE, EASE_MASK, DUR } from '../lib/reveal.js';
import { flavors, nav } from '../data/content.js';

/* Scroll ranges each flavor owns inside the sticky track, and the
   point within that range a click/keyboard jump lands on. */
const RANGES = [
  [0.0, 0.3],
  [0.3, 0.64],
  [0.64, 1.0],
];
const LANDING = [0.13, 0.47, 0.86];

const pad2 = (n) => String(n).padStart(2, '0');
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function mount(root) {
  if (!flavors.length) return;

  const label = (nav.find((n) => n.href === '#flavors') || {}).label || 'Flavors';

  /* Names are two words ("Thrive Lemonade"); the last word gets its own
     masked line so the display type always reads as a stacked lockup. */
  const nameLines = (name) => {
    const w = name.trim().split(/\s+/);
    return w.length > 1 ? [w.slice(0, -1).join(' '), w[w.length - 1]] : w;
  };
  const mask = (text) => `<span class="line-mask"><span>${text}</span></span>`;

  root.innerHTML = `
    <div class="flv" data-flavor="${flavors[0].id}">
      <div class="flv__track">
        <div class="flv__stage">

          <div class="flv__scrim" aria-hidden="true"></div>
          <div class="flv__wash" aria-hidden="true"></div>
          <!-- Adaptive: the scrim is tuned for dark films and collapses on a
               bright one. This carries the extra ink a pale film needs, at a
               per-flavor strength, on the same curve as the colour swap. -->
          <div class="flv__lift" aria-hidden="true"></div>

          <div class="wrap grid12 flv__inner">

            <div class="flv__col flv__col--film">
              <div class="flv__film media-frame grain" data-media-reveal>
                <div class="media-inner">
                  ${flavors
                    .map(
                      (f, i) => `
                  <div class="flv__cell${i === 0 ? ' is-active' : ''}" data-flavor="${f.id}" data-i="${i}">
                    <img class="fill flv__still" src="${f.img}" alt="" />
                    <video class="fill flv__vid" data-src="${f.video}" poster="${f.img}"
                           muted playsinline loop preload="none" tabindex="-1" aria-hidden="true"></video>
                  </div>`
                    )
                    .join('')}
                </div>
              </div>

              <!-- The detail plate. It used to be a bare 158px square floating
                   in the corner with nothing to say what it was — an ornament,
                   not a second scale. It is now a mounted plate: hairline ring,
                   a caption strip on its own ink so it is legible over any of
                   the three films, and the flavour name crossfading on the
                   same curve as the image inside it. That binds it to the
                   selection instead of leaving it orphaned. -->
              <figure class="flv__inset" aria-hidden="true">
                <span class="flv__inset-frame">
                  ${flavors
                    .map(
                      (f, i) =>
                        `<img class="flv__inset-img${i === 0 ? ' is-active' : ''}" data-flv="${f.id}" src="${f.img}" alt="" />`
                    )
                    .join('')}
                </span>
                <figcaption class="flv__inset-cap">
                  <span class="flv__inset-k">Detail</span>
                  <span class="flv__inset-vs">
                    ${flavors
                      .map(
                        (f, i) =>
                          `<span class="flv__inset-v${i === 0 ? ' is-active' : ''}" data-flv="${f.id}">${f.short}</span>`
                      )
                      .join('')}
                  </span>
                </figcaption>
              </figure>
            </div>

            <div class="flv__col flv__col--copy">

              <div class="flv__meta">
                <p class="t-eyebrow flv__eyebrow">${label}</p>
                <span class="flv__meta-rule" aria-hidden="true"></span>
                <p class="flv__count num" aria-hidden="true">
                  <span class="flv__count-now"
                    ><span class="flv__count-d">${pad2(1)}</span
                    ><span class="flv__count-d">${pad2(1)}</span
                  ></span><span class="flv__count-tot">/${pad2(flavors.length)}</span>
                </p>
              </div>

              <div class="flv__lower">
                <div class="flv__panel" id="flv-panel" role="tabpanel" tabindex="0"
                     aria-labelledby="flv-tab-${flavors[0].id}">
                  ${flavors
                    .map(
                      (f, i) => `
                  <div class="flv__copy${i === 0 ? ' is-active' : ''}" data-i="${i}"${i === 0 ? '' : ' aria-hidden="true"'}>
                    <h2 class="flv__name t-display">${nameLines(f.name).map(mask).join('')}</h2>
                    <p class="flv__note">${mask(f.note)}</p>
                    <p class="flv__desc">${mask(f.desc)}</p>
                  </div>`
                    )
                    .join('')}
                </div>

                <div class="flv__tabs" role="tablist" aria-label="Choose a flavor">
                  ${flavors
                    .map(
                      (f, i) => `
                  <button class="flv__tab${i === 0 ? ' is-active' : ''}" type="button" role="tab"
                          id="flv-tab-${f.id}" aria-controls="flv-panel"
                          aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">
                    <span class="flv__tab-track"><span class="flv__tab-fill"></span></span>
                    <span class="flv__tab-n num">${pad2(i + 1)}</span>
                    <span class="flv__tab-label">${f.short}</span>
                  </button>`
                    )
                    .join('')}
                </div>
              </div>

            </div>
          </div>

          <p class="u-sr flv__status" role="status" aria-live="polite"></p>
        </div>
      </div>
    </div>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  const flv = q('.flv');
  const track = q('.flv__track');
  const stage = q('.flv__stage');
  const film = q('.flv__film');
  const panel = q('.flv__panel');
  const status = q('.flv__status');
  const tablist = q('.flv__tabs');

  const cells = qa('.flv__cell');
  const digits = qa('.flv__count-d');
  const copies = qa('.flv__copy');
  const tabs = qa('.flv__tab');
  const fills = qa('.flv__tab-fill');
  const insets = qa('.flv__inset-img');
  const insetNames = qa('.flv__inset-v');
  const videos = qa('.flv__vid');
  const stills = qa('.flv__still');
  const inset = q('.flv__inset');

  const linesOf = (el) => el.querySelectorAll('.line-mask > span');

  let active = 0;
  let armed = false;
  let inView = false;
  let holdUntil = 0; /* suppresses scroll-driven swaps during a click-jump */

  /* ---------- initial motion state ---------- */
  gsap.set(copies, { autoAlpha: 0 });
  gsap.set(copies[0], { autoAlpha: 1 });
  gsap.set(digits[1], { autoAlpha: 0 });

  if (prefersReducedMotion) {
    gsap.set(qa('.flv__copy .line-mask > span'), { yPercent: 0, autoAlpha: 1 });
    armed = true;
  } else {
    gsap.set(qa('.flv__copy .line-mask > span'), { yPercent: 108, autoAlpha: 0 });
  }

  /* ---------- video: lazy source, explicit play/pause ---------- */
  videos.forEach((v) => {
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    v.addEventListener('error', () => v.classList.add('is-failed'), { once: true });
  });

  function attach(v, eager) {
    if (!v || v.dataset.attached || !v.dataset.src) return;
    v.dataset.attached = '1';
    v.preload = eager ? 'auto' : 'metadata';
    v.src = v.dataset.src;
  }

  function syncVideo() {
    videos.forEach((v, n) => {
      if (n === active && inView && !prefersReducedMotion) {
        attach(v, true);
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }

  let warmed = false;
  function warmNeighbours() {
    if (warmed) return;
    warmed = true;
    /* Buffer the other two once the section is on screen so a switch
       never lands on a black frame. */
    setTimeout(() => videos.forEach((v, n) => n !== active && attach(v, false)), 1400);
  }

  /* ---------- copy swap: masked lines out, masked lines in ---------- */
  function swapCopy(from, to, dir) {
    const outEl = copies[from];
    const inEl = copies[to];

    if (prefersReducedMotion) {
      gsap.set(copies, { autoAlpha: 0 });
      gsap.set(inEl, { autoAlpha: 1 });
      gsap.set(linesOf(inEl), { yPercent: 0, autoAlpha: 1 });
      return;
    }

    gsap.killTweensOf(linesOf(outEl));
    gsap.killTweensOf(linesOf(inEl));
    gsap.set(inEl, { autoAlpha: 1 });

    gsap.to(linesOf(outEl), {
      yPercent: -108 * dir,
      autoAlpha: 0,
      duration: DUR.fast * 0.66,
      ease: EASE_MASK,
      stagger: 0.035,
      onComplete: () => {
        if (copies[active] !== outEl) gsap.set(outEl, { autoAlpha: 0 });
      },
    });

    gsap.fromTo(
      linesOf(inEl),
      { yPercent: 108 * dir, autoAlpha: 0 },
      {
        yPercent: 0,
        autoAlpha: 1,
        duration: DUR.mid,
        ease: EASE,
        stagger: 0.075,
        delay: DUR.fast * 0.28,
      }
    );
  }

  /* ---------- counter: the same masked swap the copy uses ----------
     The digit used to be a textContent assignment, so it landed on the
     new flavor the instant the scroll range flipped while the copy and
     the film were still 818ms from arriving — a configurator whose
     selector disagrees with its stage reads as broken. Two stacked
     digits rolled on the copy's own curve and timing keep them together. */
  let digitSlot = 0;
  function rollCount(to, dir) {
    const next = pad2(to + 1);
    const outEl = digits[digitSlot];
    digitSlot = 1 - digitSlot;
    const inEl = digits[digitSlot];
    inEl.textContent = next;

    if (prefersReducedMotion) {
      gsap.set(outEl, { autoAlpha: 0 });
      gsap.set(inEl, { autoAlpha: 1, yPercent: 0 });
      return;
    }

    gsap.killTweensOf([outEl, inEl]);
    gsap.to(outEl, {
      yPercent: -108 * dir,
      autoAlpha: 0,
      duration: DUR.fast * 0.66,
      ease: EASE_MASK,
    });
    gsap.fromTo(
      inEl,
      { yPercent: 108 * dir, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: DUR.mid, ease: EASE, delay: DUR.fast * 0.28 }
    );
  }

  /* ---------- the state change ---------- */
  function setFlavor(i) {
    i = Math.max(0, Math.min(flavors.length - 1, i));
    if (i === active) return;

    const dir = i > active ? 1 : -1;
    const prev = active;
    active = i;
    const f = flavors[i];

    /* One attribute re-themes the whole subtree: wash, lift, tint, tabs, film. */
    flv.dataset.flavor = f.id;
    rollCount(i, dir);

    cells.forEach((c, n) => c.classList.toggle('is-active', n === i));
    insets.forEach((c, n) => c.classList.toggle('is-active', n === i));
    insetNames.forEach((c, n) => c.classList.toggle('is-active', n === i));
    copies.forEach((c, n) => {
      c.classList.toggle('is-active', n === i);
      if (n === i) c.removeAttribute('aria-hidden');
      else c.setAttribute('aria-hidden', 'true');
    });
    tabs.forEach((t, n) => {
      const on = n === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });

    panel.setAttribute('aria-labelledby', `flv-tab-${f.id}`);
    status.textContent = `${f.name}. ${f.note}`;

    if (armed) swapCopy(prev, i, dir);
    syncVideo();
  }

  /* ---------- entrance ---------- */
  function arm() {
    if (armed) return;
    armed = true;
    const el = copies[active];
    gsap.set(el, { autoAlpha: 1 });
    gsap.fromTo(
      linesOf(el),
      { yPercent: 108, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: DUR.slow, ease: EASE, stagger: 0.085 }
    );
  }

  /* The film is now the whole stage, so it has to be painted BEFORE the
     stage slides into view — at 'top 62%' the section opened on ~405px of
     empty near-black. Wiping it at 98% means the entry is film from the
     first pixel. The copy still arms later, once the stage is actually on
     screen, so its reveal is not spent off the bottom edge. */
  revealMedia(film, { start: 'top 98%' });
  revealRise([q('.flv__meta'), tablist], { triggerEl: track, start: 'top 52%', stagger: 0.09 });
  ScrollTrigger.create({ trigger: track, start: 'top 46%', once: true, onEnter: arm });

  /* ---------- scroll drives the progression ---------- */
  const indexAt = (p) => {
    for (let i = RANGES.length - 1; i >= 0; i -= 1) if (p >= RANGES[i][0]) return i;
    return 0;
  };
  const localAt = (p, i) => clamp01((p - RANGES[i][0]) / (RANGES[i][1] - RANGES[i][0]));

  const setStillScale = gsap.quickSetter(stills, 'scale');
  const setInsetY = inset ? gsap.quickSetter(inset, 'y', 'px') : null;

  /* Progress is read from live geometry rather than a cached trigger, so
     media loading elsewhere on the page can never desync the sequence.
     The sticky stage is exactly one viewport, so the travel inside the
     track is trackHeight - stageHeight. */
  function progress() {
    const dist = track.offsetHeight - stage.offsetHeight;
    if (dist <= 0) return 0;
    return clamp01(-track.getBoundingClientRect().top / dist);
  }

  function onScroll() {
    if (!inView) return;
    const p = progress();
    const i = indexAt(p);

    if (performance.now() < holdUntil) {
      if (i === active) holdUntil = 0; /* the jump arrived — hand control back */
    } else {
      setFlavor(i);
    }

    const local = localAt(p, active);
    fills.forEach((el, n) => {
      el.style.setProperty('--flv-fill', n === active ? local.toFixed(4) : '0');
    });

    if (!prefersReducedMotion) {
      setStillScale(1 + p * 0.045); /* slow push-in, tied to real scroll distance */
      /* +-12px, not +-17. The plate is anchored to the foot of the stage and
         the drift is the only thing that can push it into the edge; halving it
         keeps the whole mount inside the frame at every scroll position and
         every viewport height the section supports. */
      if (setInsetY) setInsetY((p - 0.5) * -24);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* Visibility drives playback. An observer is used rather than a
     ScrollTrigger so late layout shifts elsewhere on the page can never
     leave the film paused on a stale trigger position. */
  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        inView = entries[entries.length - 1].isIntersecting;
        if (inView) {
          warmNeighbours();
          onScroll();
        }
        syncVideo();
      },
      { threshold: 0 }
    );
    observer.observe(stage);
  } else {
    inView = true;
    syncVideo();
  }

  /* ---------- click / keyboard drive the same progression ---------- */
  function goTo(i, focusTab) {
    i = Math.max(0, Math.min(flavors.length - 1, i));
    /* A tap on the selector is proof the section is on screen. */
    inView = true;
    warmNeighbours();
    setFlavor(i);
    syncVideo();
    if (focusTab) tabs[i].focus();

    const dist = track.offsetHeight - stage.offsetHeight;
    if (dist <= 0) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const y = Math.round(top + LANDING[i] * dist);

    holdUntil = performance.now() + 1600;

    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 1.15 });
    else window.scrollTo({ top: y, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => goTo(i, false)));

  tablist.addEventListener('keydown', (e) => {
    let n = -1;
    if (e.key === 'ArrowRight') n = (active + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (active - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    else return;
    e.preventDefault();
    goTo(n, true);
  });

  /* ---------- swipe, for the phone ---------- */
  let tx = 0;
  let ty = 0;
  stage.addEventListener(
    'touchstart',
    (e) => {
      tx = e.changedTouches[0].clientX;
      ty = e.changedTouches[0].clientY;
    },
    { passive: true }
  );
  stage.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 52 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      goTo(active + (dx < 0 ? 1 : -1), false);
    },
    { passive: true }
  );
}
