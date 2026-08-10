/* ============================================================
   RITUAL — the human beat. After the flavour configurator, the page
   goes quiet and the type falls to the floor of the frame.

   ROUND 4 — re-anchored. #flavors (immediately above) is a dark
   full-bleed film with an eyebrow-rule + huge headline lockup in the
   TOP-LEFT. This section was the same arrangement on the same surface
   one viewport later, so the two read as one section repeated. The fix
   is compositional, not cosmetic:

     - the lockup moved to the FOOT of the frame, echoing the hero's
       bottom-anchored composition, so the page runs A/B across the two
       dark films instead of AA;
     - the statement is one WIDE line (t-h1) sitting on a full-width
       hairline record, not a stacked two-line block in a column;
     - the caption keeps its Polestar leader rule but is now the only
       thing in the middle of the frame — annotation floating on the
       film, the rule running out of it into the picture;
     - the eyebrow left the top-left entirely and became the label of
       the record at the very foot;
     - the scrim inverted: ink pools at the floor and clears upward,
       so the top 40% of the film is untouched.

   Atmosphere and habit only — no efficacy claims. servingSize is the
   one number and it comes from content.js.
   ============================================================ */

import {
  revealLines,
  revealRise,
  revealMedia,
  seamlessLoop,
  parallax,
  EASE,
  DUR,
  START,
} from '../lib/reveal.js';
import { gsap, prefersReducedMotion } from '../lib/scroll.js';
import { product } from '../data/content.js';

const SPEC = [
  { k: 'Serving', v: product.servingSize },
  { k: 'How often', v: 'Once daily' },
  { k: 'When', v: 'Morning, afternoon or evening' },
];

export default function mount(root) {
  root.innerHTML = `
    <figure class="rit__stage">

      <div class="vloop rit__film"
           data-src="/media/athlete-breath.mp4"
           data-poster="/media/athlete-breath.jpg"
           aria-hidden="true"></div>

      <span class="rit__scrim" aria-hidden="true"></span>

      <figcaption class="wrap rit__field">

        <!-- Annotation on the picture. Sits alone in the middle of the
             frame; the leader runs out of it and dies inside the image. -->
        <div class="rit__note">
          <p class="rit__body" data-reveal="rise">
            A scoop, a full glass of water, and about ten seconds of your day.
            Small enough that you keep doing it — which is the entire point of a ritual.
          </p>
          <span class="rit__leader" aria-hidden="true"></span>
        </div>

        <!-- The foot lockup: one wide line of display type standing on the
             habit record. Everything above it is film. -->
        <div class="rit__foot">
          <h2 class="t-h1 rit__head">One glass, once a day.</h2>

          <div class="rit__plinth">
            <p class="t-eyebrow rit__eyebrow" data-reveal="rise">The daily ritual</p>
            <dl class="rit__spec">
              ${SPEC.map(
                (s) => `
              <div class="rit__spec-item">
                <dt class="t-eyebrow t-eyebrow--bare rit__spec-k">${s.k}</dt>
                <dd class="rit__spec-v num">${s.v}</dd>
              </div>`
              ).join('')}
            </dl>
          </div>
        </div>

      </figcaption>
    </figure>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  const stage = q('.rit__stage');
  const film = q('.rit__film');
  const note = q('.rit__note');
  const foot = q('.rit__foot');
  const leader = q('.rit__leader');

  /* Two crossfaded layers instead of a bare `loop` attribute — every
     generated clip is ~5s and `loop` jump-cuts on the 5s mark, which on a
     full-viewport held image is the only thing you would look at.

     The crop lives in ritual.css now, not here. At every viewport this page
     supports, a 16:9 clip in a taller-than-16:9 frame is scaled to HEIGHT, so
     the vertical term of object-position is a no-op and the only real lever is
     the horizontal pan — which has to differ between the portrait phone crop
     and the desktop one. An inline style could not carry that. */
  const loop = seamlessLoop(film);

  /* ---- keep the loop alive on live geometry ----
     seamlessLoop gates playback on its own ScrollTrigger, and every trigger
     on this page below the two pinned sections is measured ~1,485px early:
     this host sits at 13373–15173 but its trigger reads 11888–13688 (see
     report — shared bug, not fixable from a section file). The practical
     effect is that onLeave fires BEFORE you ever reach the section, so both
     layers are paused by the time the film is on screen and #ritual failed
     tools/check-loop.mjs 14/14.

     An IntersectionObserver answers "is this on screen" from the real
     compositor rather than from cached scroll math, and the pause listener
     re-arms the loop if the stale trigger stops it behind our back. Remove
     both once trigger positions are trustworthy. */
  if (loop && !prefersReducedMotion) {
    let visible = false;

    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) loop.start();
        else loop.stop();
      },
      { threshold: 0 }
    ).observe(stage);

    loop.layers.forEach((v) =>
      v.addEventListener('pause', () => {
        // Ignore the outgoing layer of a crossfade — that pause is correct.
        if (!visible || parseFloat(getComputedStyle(v).opacity) < 0.5) return;
        loop.start();
      })
    );
  }

  /* Curtain-wipe the whole frame open, film scaling down inside it.
     The media line ('top 88%'), same as every other frame on the page. */
  revealMedia(stage);

  /* Two content triggers, both on START — the page has exactly one content
     line. They differ only in WHICH element crosses it, which is the point
     of a two-beat composition: the annotation arrives while the frame is
     still sliding up, the foot lockup lands once the film fills the screen. */
  revealRise([q('.rit__body')], { triggerEl: note });

  revealLines(q('.rit__head'), { triggerEl: foot });
  revealRise([q('.rit__eyebrow'), ...qa('.rit__spec-item')], {
    triggerEl: foot,
    stagger: 0.08,
    delay: 0.18,
  });

  /* The leader rule draws out of the caption and into the image — the one
     piece of motion that says "this text belongs to that picture". */
  if (prefersReducedMotion) {
    gsap.set(leader, { scaleX: 1 });
  } else {
    gsap.fromTo(
      leader,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: DUR.slow,
        ease: EASE,
        delay: 0.2,
        scrollTrigger: { trigger: note, start: START, once: true },
      }
    );
  }

  /* Slow drift on the film only. The layers carry 10% of vertical headroom
     (see .rit__film .vloop__layer) so nothing ever exposes an edge. */
  (loop?.layers ?? []).forEach((v) => parallax(v, { amount: 7, triggerEl: stage }));
}
