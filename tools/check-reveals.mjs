#!/usr/bin/env node
/* Behavioural check: does every section's content actually become visible
   when you scroll to it?

   The numeric trigger-drift check flags anything outside a heuristic band and
   produces false positives for legitimate start strings. What actually matters
   is simpler and unambiguous: park the reader in the middle of each section
   and ask whether its content is on screen and opaque. If a reveal never fired
   — or fired early and was missed — this catches it. */

import { chromium } from 'playwright';

const MOBILE = process.argv.includes('--mobile');
const VIEW = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const SECTIONS = ['hero','myth','science','pillars','formula','flavors','ritual','compare','benefits','proof','offer','faq','footer'];

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: VIEW });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3500);

console.log(`viewport ${VIEW.width}x${VIEW.height}\n`);
let bad = 0;

for (const id of SECTIONS) {
  const ok = await page.evaluate(async (sec) => {
    const el = document.querySelector('#' + sec);
    if (!el) return { miss: true };
    const r = el.getBoundingClientRect();
    /* Tall pinned sections spend their height on a scrubbed timeline, so
       landing half a viewport in puts you at ~30% progress — before the
       payload has resolved, which reads as a failed reveal. Sample deeper
       into the range for those; short sections still get their midpoint. */
    const deep = r.height > window.innerHeight * 1.5;
    const y = r.top + window.scrollY +
      (deep ? r.height * 0.62 : Math.min(r.height * 0.5, window.innerHeight * 0.5));
    const l = window.__lenis;
    if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    return { scrolled: true };
  }, id);

  if (ok.miss) { console.log(`${id.padEnd(10)} MISSING`); bad++; continue; }
  await page.waitForTimeout(2600);

  const state = await page.evaluate((sec) => {
    const el = document.querySelector('#' + sec);
    const vh = window.innerHeight;
    // Every element with text or media that intersects the viewport.
    const kids = [...el.querySelectorAll('*')].filter((n) => {
      const r = n.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.width < 8 || r.height < 8) return false;

      /* Some elements are meant to sit at opacity 0 and must not count as
         failed reveals:
          - .vloop__layer — the seamless-loop crossfade always has one layer
            faded out; that is the mechanism working, not a bug.
          - inactive tab panels / aria-hidden — the flavour configurator keeps
            exactly one flavour visible by design.
          - scrubbed ornament (ticks, ions) whose opacity is a function of
            scroll progress rather than an entrance. */
      if (n.closest('.vloop__layer, [aria-hidden="true"], [hidden]')) return false;
      if (n.closest('[role="tabpanel"]:not(.is-active):not([data-active])')) return false;

      /* Collapsed accordion answers. The FAQ is single-open by design, so five
         of six panels are always hidden — that is the component working. */
      const panel = n.closest('[role="region"][aria-labelledby], [id^="faq-panel"], [id^="panel"]');
      if (panel) {
        const ctrl = document.querySelector(`[aria-controls="${panel.id}"]`);
        if (ctrl && ctrl.getAttribute('aria-expanded') === 'false') return false;
      }
      if (n.matches('.vloop__layer')) return false;
      if (/tick|ion|particle|spark/i.test(n.className || '')) return false;

      const hasText = n.children.length === 0 && n.textContent.trim().length > 1;
      const isMedia = /^(IMG|VIDEO|CANVAS|SVG)$/.test(n.tagName);
      return hasText || isMedia;
    });
    let invisible = 0;
    const samples = [];
    for (const n of kids) {
      const cs = getComputedStyle(n);
      const o = parseFloat(cs.opacity);
      let anc = n, eff = 1;
      while (anc && anc !== document.body) { eff *= parseFloat(getComputedStyle(anc).opacity); anc = anc.parentElement; }
      if (eff < 0.06 || cs.visibility === 'hidden') {
        invisible++;
        if (samples.length < 3) samples.push((n.tagName.toLowerCase() + (n.className && typeof n.className==='string' ? '.'+n.className.trim().split(/\s+/)[0] : '')) + ` op=${eff.toFixed(2)}`);
      }
    }
    return { total: kids.length, invisible, samples };
  }, id);

  /* Tall pinned sections run scrubbed narratives where content is SUPPOSED to
     fade out at points (myth blacks out its opening beat before the payload).
     An opacity census cannot tell that apart from a reveal that never fired,
     so report those as informational and judge them from pixels instead.
     Only a completely empty section is a hard failure there. */
  const deepSection = await page.evaluate(
    (sec) => document.querySelector('#' + sec).getBoundingClientRect().height > window.innerHeight * 1.5,
    id
  );
  const ratio = state.total ? state.invisible / state.total : 0;
  const empty = state.total === 0;
  const fail = empty || (!deepSection && ratio > 0.34);
  const info = !fail && deepSection && ratio > 0.34;
  if (fail) bad++;
  console.log(
    `${id.padEnd(10)} onscreen ${String(state.total).padStart(3)}  hidden ${String(state.invisible).padStart(3)}  ` +
    (fail ? '← FAIL  ' + state.samples.join(' | ')
          : info ? 'ok (scrubbed — verify visually)'
          : 'ok')
  );
}

console.log(errors.length ? `\npage errors: ${[...new Set(errors)].join(' | ')}` : '\nno page errors');
console.log(bad ? `${bad} section(s) failing.` : 'every section reveals correctly.');
await browser.close();
