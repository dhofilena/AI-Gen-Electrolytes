/* ============================================================
   FAQ — light surface. A sticky index column beside a very
   quiet hairline accordion.

   Deliberate decisions:
   - ONE panel open at a time. Six questions with everything open
     is a wall; a single open answer keeps the section calm and
     keeps the page height from lurching.
   - Height is animated by GSAP against the *measured* content
     height, then released to `auto` on complete so reflow and
     resize can never desync it.
   - Full WAI-ARIA accordion pattern: real <button> inside a real
     heading, aria-expanded / aria-controls, labelled panels,
     Arrow/Home/End roving, and collapsed panels taken out of the
     a11y tree via visibility so they are never tabbable.
   - The index counter has a real resting state. Closed it reads
     "06 · Questions"; open it reads "03 · of 06" with the track
     filled to that position. It used to rest on "00 —— 06",
     which is a placeholder showing through, not a state.
   - The sticky column carries a lede and a behaviour hint so it
     is not a headline stranded above 600px of empty white.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/scroll.js';
import { revealLines, revealRise, EASE, EASE_MASK, DUR, START } from '../lib/reveal.js';
import { faqs } from '../data/content.js';

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const pad = (n) => String(n).padStart(2, '0');

export default function mount(root) {
  const total = faqs.length;

  root.innerHTML = `
    <div class="wrap faq__wrap">

      <header class="faq__intro">
        <p class="t-eyebrow faq__eyebrow">FAQ</p>
        <h2 class="t-h1 faq__head">Questions,<br>answered.</h2>
        <p class="faq__lede">Timing, fasting, taste, stimulants, and the potassium question.</p>
        <p class="faq__meta" aria-hidden="true">
          <span class="num faq__meta-cur">${pad(total)}</span>
          <span class="faq__meta-track"><span class="faq__meta-fill"></span></span>
          <span class="faq__meta-label">Questions</span>
        </p>
        <!-- The keyboard sentence is a second span, not part of the string,
             because it is only true where there is a keyboard. It used to read
             "Arrow keys move between questions" on a phone, which is advice a
             touch device cannot take. CSS hides it on coarse pointers and at
             phone widths; nothing here is UA-sniffed, and keyboard users on a
             narrow window still get the real roving-focus behaviour whether or
             not the sentence is on screen. -->
        <p class="faq__hint">One answer opens at a time.<span class="faq__hint-keys"> Arrow keys move between questions.</span></p>
      </header>

      <div class="faq__col">
        <ul class="faq__list">
          ${faqs
            .map(
              (f, i) => `
            <li class="faq__item" data-open="false">
              <span class="faq__rule" aria-hidden="true"></span>
              <h3 class="faq__h">
                <button class="faq__q" type="button"
                        id="faq-q-${i}"
                        aria-expanded="false"
                        aria-controls="faq-a-${i}">
                  <span class="faq__idx num" aria-hidden="true">${pad(i + 1)}</span>
                  <span class="faq__qt">${esc(f.q)}</span>
                  <span class="faq__mark" aria-hidden="true">
                    <i class="faq__bar faq__bar--h"></i>
                    <i class="faq__bar faq__bar--v"></i>
                  </span>
                </button>
              </h3>
              <div class="faq__panel" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}">
                <div class="faq__panel-in">
                  <p class="faq__a">${esc(f.a)}</p>
                </div>
              </div>
            </li>`
            )
            .join('')}
        </ul>
        <span class="faq__rule faq__rule--end" aria-hidden="true"></span>
      </div>

    </div>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  const items = qa('.faq__item');
  const btns = qa('.faq__q');
  const rules = qa('.faq__rule');

  const cur = q('.faq__meta-cur');
  const metaLabel = q('.faq__meta-label');
  const metaFill = q('.faq__meta-fill');

  /* The counter's resting state is a statement, not a placeholder. Closed it
     reads "06 · Questions" against an empty track; open it becomes
     "03 · of 06" with the track filled to that position. It never shows the
     "00 —— 06" non-value the previous version rested on. */
  function setMeta(i) {
    const open = i > -1;
    cur.textContent = pad(open ? i + 1 : total);
    metaLabel.textContent = open ? `of ${pad(total)}` : 'Questions';

    const to = open ? (i + 1) / total : 0;
    if (prefersReducedMotion) gsap.set(metaFill, { scaleX: to });
    else gsap.to(metaFill, { scaleX: to, duration: DUR.mid, ease: EASE, overwrite: true });
  }

  /* ---------- panel mechanics ---------- */

  // Opening/closing changes document height; ScrollTrigger needs to
  // re-measure, but only once the motion has settled.
  let rid;
  const refresh = () => {
    clearTimeout(rid);
    rid = setTimeout(() => ScrollTrigger.refresh(), 90);
  };

  let openIndex = -1;

  function setOpen(i, open, { animate = true } = {}) {
    const item = items[i];
    if (!item) return;

    const panel = item.querySelector('.faq__panel');
    const inner = item.querySelector('.faq__panel-in');

    item.dataset.open = String(open);
    btns[i].setAttribute('aria-expanded', String(open));

    gsap.killTweensOf([panel, inner]);

    if (!animate || prefersReducedMotion) {
      panel.style.visibility = open ? 'visible' : 'hidden';
      gsap.set(panel, { height: open ? 'auto' : 0 });
      gsap.set(inner, { opacity: open ? 1 : 0, y: 0 });
      refresh();
      return;
    }

    if (open) {
      panel.style.visibility = 'visible';
      // Measure the real content height — inner is unconstrained even
      // while the panel is clipped to 0.
      const target = inner.offsetHeight;
      gsap.fromTo(
        panel,
        { height: panel.offsetHeight },
        {
          height: target,
          // The panel is a state swap, not an entrance: --e-in-out /
          // power4.inOut. expo.out would fling it 46% open in the first
          // 50ms and read as a snap.
          duration: DUR.fast,
          ease: EASE_MASK,
          onComplete: () => {
            panel.style.height = 'auto'; // survive reflow / resize
            refresh();
          },
        }
      );
      gsap.fromTo(
        inner,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: DUR.mid, ease: EASE, delay: 0.08 }
      );
    } else {
      gsap.to(panel, {
        height: 0,
        duration: DUR.fast,
        ease: EASE_MASK,
        onComplete: () => {
          panel.style.visibility = 'hidden';
          refresh();
        },
      });
      gsap.to(inner, { opacity: 0, duration: DUR.fast * 0.55, ease: EASE_MASK });
    }
  }

  function toggle(i) {
    const wasOpen = openIndex === i;
    // One at a time — close the incumbent first.
    if (openIndex > -1 && openIndex !== i) setOpen(openIndex, false);
    setOpen(i, !wasOpen);
    openIndex = wasOpen ? -1 : i;
    setMeta(openIndex);
  }

  // Collapsed is the resting state; establish it without animation.
  items.forEach((_, i) => setOpen(i, false, { animate: false }));
  gsap.set(metaFill, { scaleX: 0 });

  btns.forEach((btn, i) => {
    btn.addEventListener('click', () => toggle(i));

    // WAI-ARIA accordion keyboard support (Enter/Space come free with <button>).
    btn.addEventListener('keydown', (e) => {
      const to =
        e.key === 'ArrowDown' ? i + 1 :
        e.key === 'ArrowUp' ? i - 1 :
        e.key === 'Home' ? 0 :
        e.key === 'End' ? btns.length - 1 : null;
      if (to === null) return;
      e.preventDefault();
      btns[(to + btns.length) % btns.length].focus();
    });
  });

  /* ---------- entrance ---------- */

  revealLines(q('.faq__head'));
  revealRise(qa('.faq__eyebrow'), { distance: 18, triggerEl: q('.faq__intro') });
  revealRise(qa('.faq__lede, .faq__meta, .faq__hint'), {
    distance: 18,
    delay: 0.16,
    triggerEl: q('.faq__intro'),
  });
  revealRise(items, { triggerEl: q('.faq__list') });

  if (!prefersReducedMotion) {
    gsap.fromTo(
      rules,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: DUR.slow,
        ease: EASE,
        stagger: 0.07,
        scrollTrigger: { trigger: q('.faq__list'), start: START, once: true },
      }
    );
  }
}
