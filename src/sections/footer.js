/* ============================================================
   FOOTER — dark surface. The page does not trail off: it closes
   on the product name at display scale, then resolves into a
   structured band and a single hairline of small print.

   Structure (top to bottom):
     seam ─────────────────────────────────────────────────
     CLOSE     tagline + product name at display scale,
               with the certification marks bottom-anchored to
               its right so the wordmark is not left floating in
               half a viewport of empty black.
     RULE ROW  brand ──────────────────────────── back to top
     BAND      guarantee (promoted) / sections / stay-in-touch
     LEGAL     FDA statement + copyright + concept disclosure

   Content rules honoured here:
   - Wordmark, section links, guarantee, certifications and the
     FDA disclaimer all come from content.js. Nothing about the
     product is written here.
   - No invented address, phone, email, or legal pages. The only
     links are the in-page anchors that genuinely exist, and the
     email field is a non-functional design element that says so
     in its own label — twice, and again in the legal row.
   - product.disclaimer is required by law on a supplement page:
     it is set small but at --fg-mute on --ink (~6.9:1), well past
     the 4.5:1 floor. It is never the faint tier.
   - The descender rescue on .footer__name is base.css's job and
     base.css's alone — see the note above .footer__name in the
     stylesheet. Never set padding-bottom/margin-bottom here.
   ============================================================ */

import { gsap, prefersReducedMotion } from '../lib/scroll.js';
import { revealLines, revealRise, EASE, DUR, START } from '../lib/reveal.js';
import { product, nav, guarantee, formula } from '../data/content.js';

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* The email field is decoration. These two strings are the only place the
   footer speaks in the first person, and both of them exist to say that
   nothing is collected. */
const SIGNUP_REST = 'Concept build — this field is a design element and sends nothing.';
const SIGNUP_ACK = 'Nothing was submitted. No address was collected or stored.';

export default function mount(root) {
  // "365-day money-back guarantee" → the figure is lifted out so it can carry
  // the one accent in the section at display weight, without rewriting the line.
  const days = String(guarantee.days);
  const guaranteeRest = guarantee.title.startsWith(days)
    ? guarantee.title.slice(days.length)
    : ` ${guarantee.title}`;

  root.innerHTML = `
    <span class="footer__seam" aria-hidden="true"></span>

    <div class="wrap footer__wrap">

      <div class="footer__close">
        <div class="footer__lede">
          <p class="t-eyebrow footer__kicker">${esc(product.tagline)}</p>
          <p class="footer__name t-display">${product.name.split(' ').map(esc).join('<br>')}</p>
        </div>

        <div class="footer__marks">
          <p class="t-eyebrow footer__label">Tested &amp; certified</p>
          <ul class="footer__certs">
            ${formula.certs.map((c) => `<li class="footer__cert">${esc(c)}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="footer__rule-row">
        <p class="footer__wordmark">${esc(product.brand)}</p>
        <span class="footer__hair" aria-hidden="true"></span>
        <a class="footer__top" href="#hero">
          <span class="footer__top-t">Back to top</span>
          <span class="footer__arrow" aria-hidden="true"></span>
        </a>
      </div>

      <div class="footer__band">

        <div class="footer__pledge">
          <p class="t-eyebrow footer__label">The guarantee</p>
          <p class="footer__pledge-line">
            <span class="num accent footer__pledge-n">${esc(days)}</span
            ><span class="footer__pledge-t">${esc(guaranteeRest)}</span>
          </p>
          <!-- guarantee.body is NOT restated here. #proof gives it a full
               viewport with a 365 at --fs-mega and the terms in full; the
               footer repeating the same four sentences verbatim two screens
               later made the promise sound like boilerplate instead of like
               a promise. The footer states the fact and lets #proof own the
               terms. -->
        </div>

        <nav class="footer__nav" aria-label="Page sections">
          <p class="t-eyebrow footer__label">Sections</p>
          <ul class="footer__links">
            ${nav
              .map(
                (n) => `<li><a class="footer__link" href="${esc(n.href)}">
                  <span class="footer__link-t">${esc(n.label)}</span>
                </a></li>`
              )
              .join('')}
          </ul>
        </nav>

        <form class="footer__signup" novalidate>
          <p class="t-eyebrow footer__label">Stay in the loop</p>
          <div class="footer__field">
            <label class="u-sr" for="footer-email">Email address (concept build — not collected)</label>
            <input
              class="footer__input"
              id="footer-email"
              type="email"
              name="email"
              placeholder="Email address"
              autocomplete="email"
              spellcheck="false" />
            <button class="footer__submit" type="submit">
              <span class="u-sr">Sign up</span>
              <span class="footer__arrow footer__arrow--r" aria-hidden="true"></span>
            </button>
          </div>
          <p class="footer__signup-note" role="status">${SIGNUP_REST}</p>
        </form>

      </div>

      <div class="footer__legal">
        <p class="footer__disclaimer">${esc(product.disclaimer)}</p>
        <div class="footer__fine">
          <p class="footer__copy num">&copy; ${new Date().getFullYear()} ${esc(product.brand)}</p>
          <p class="footer__note">Concept build. Links navigate within this page only.</p>
        </div>
      </div>

    </div>
  `;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  /* ---------- the email field goes nowhere, on purpose ---------- */

  const form = q('.footer__signup');
  const note = q('.footer__signup-note');
  let noteTimer;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    note.textContent = SIGNUP_ACK;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { note.textContent = SIGNUP_REST; }, 5200);
  });

  /* ---------- entrance ---------- */

  /* The footer is the last thing in the document, so anything low in it
     can never cross the standard 82% line on its own. Everything triggers
     off the footer root instead and is offset in time — the landing stays
     sequenced, and nothing can be left stranded un-revealed at page end. */
  const seq = { triggerEl: root, start: START };

  revealRise(qa('.footer__kicker'), { ...seq, distance: 18 });

  revealLines(q('.footer__name'), { ...seq, delay: 0.08 });

  revealRise([q('.footer__marks')], { ...seq, distance: 20, delay: 0.26 });

  revealRise([q('.footer__wordmark'), q('.footer__top')], {
    ...seq,
    distance: 18,
    delay: 0.36,
  });

  revealRise([q('.footer__pledge'), q('.footer__nav'), q('.footer__signup')], {
    ...seq,
    distance: 24,
    delay: 0.44,
  });

  revealRise(qa('.footer__legal'), { ...seq, distance: 16, delay: 0.6 });

  if (!prefersReducedMotion) {
    gsap.fromTo(
      qa('.footer__seam, .footer__hair'),
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: DUR.slow,
        ease: EASE,
        stagger: 0.09,
        scrollTrigger: { trigger: root, start: START, once: true },
      }
    );
  }
}
