#!/usr/bin/env node
/* ============================================================
   Headless capture harness.

     node tools/shoot.mjs                     desktop, all sections
     node tools/shoot.mjs --mobile            390x844
     node tools/shoot.mjs --section hero      one section
     node tools/shoot.mjs --sweep             every 0.8vh down the page

   Exists because the in-app Browser pane does not composite frames in
   this environment, so no agent can actually SEE the page. Critics must
   judge pixels, never a builder's description.

   Output: build-notes/shots/<viewport>/<name>.png
   ============================================================ */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const URL_BASE = process.env.SHOOT_URL || 'http://localhost:5273';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : d;
};

const MOBILE = has('--mobile');
const VIEW = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const LABEL = MOBILE ? 'mobile' : 'desktop';
const OUT = path.join(ROOT, 'build-notes', 'shots', LABEL);

const SECTIONS = [
  'hero', 'myth', 'science', 'pillars', 'formula', 'flavors',
  'ritual', 'compare', 'benefits', 'proof', 'offer', 'faq', 'footer',
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({
  viewport: VIEW,
  deviceScaleFactor: MOBILE ? 2 : 1,
  reducedMotion: 'no-preference',
});

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

await page.goto(URL_BASE, { waitUntil: 'networkidle', timeout: 60000 });

// Let the preloader resolve and fonts settle.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3200);

/* Drive scroll through Lenis so its internal position stays in sync with
   ScrollTrigger; a raw window.scrollTo desyncs pinned sections. */
async function scrollTo(y) {
  await page.evaluate((target) => {
    const l = window.__lenis;
    if (l) l.scrollTo(target, { immediate: true });
    else window.scrollTo(0, target);
  }, y);
  /* Settle. This MUST outlast the longest entrance on the page or captures
     land mid-animation — countUp runs 1.9s, revealLines 1.35s. A 900ms wait
     photographed "604mg" instead of the real 610mg and would have sent
     critics chasing a data bug that did not exist. */
  await page.waitForTimeout(2800);
}

async function shoot(name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  process.stdout.write(`  ${LABEL}/${name}.png\n`);
}

const only = val('--section', null);

if (has('--sweep')) {
  const total = await page.evaluate(() => document.body.scrollHeight);
  const step = Math.round(VIEW.height * 0.8);
  let i = 0;
  for (let y = 0; y < total - VIEW.height * 0.5; y += step, i++) {
    await scrollTo(y);
    await shoot(`sweep-${String(i).padStart(2, '0')}`);
  }
} else {
  const measure = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector('#' + s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: r.height };
    }, sel);

  const list = only ? [only] : SECTIONS;
  for (const id of list) {
    let box = await measure(id);
    if (!box) { console.log(`  (no #${id})`); continue; }

    // Land on the section's own top edge.
    await scrollTo(box.top + 2);
    await shoot(id);

    /* RE-MEASURE before the mid frame. Pinned sections above this one insert
       pin-spacers as they activate, so the offset captured before scrolling is
       stale by the time we get here — which was landing "<id>-mid" inside a
       completely different section and would mislead any critic reading it. */
    box = await measure(id);
    if (box && box.height > VIEW.height * 1.6) {
      await scrollTo(box.top + box.height * 0.55);

      // Verify we actually ended up inside the intended section.
      const inside = await page.evaluate((s) => {
        const el = document.querySelector('#' + s);
        const r = el.getBoundingClientRect();
        return r.top <= window.innerHeight * 0.5 && r.bottom >= window.innerHeight * 0.5;
      }, id);

      await shoot(inside ? `${id}-mid` : `${id}-mid-UNRELIABLE`);
      if (!inside) console.log(`    ! mid frame drifted out of #${id}`);
    }
  }
}

const report = {
  viewport: VIEW,
  url: URL_BASE,
  capturedAt: new Date().toISOString(),
  consoleErrors: [...new Set(consoleErrors)],
  horizontalOverflow: await page.evaluate(() => {
    const d = document.documentElement;
    return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, overflows: d.scrollWidth > d.clientWidth + 1 };
  }),
};

await writeFile(path.join(OUT, '_report.json'), JSON.stringify(report, null, 2));
console.log('\nconsole errors:', report.consoleErrors.length);
report.consoleErrors.slice(0, 12).forEach((e) => console.log('  ! ' + e.slice(0, 180)));
console.log('h-overflow:', report.horizontalOverflow.overflows,
  `(${report.horizontalOverflow.scrollWidth} vs ${report.horizontalOverflow.clientWidth})`);

await browser.close();
