#!/usr/bin/env node
/* Names the elements causing horizontal overflow, and which section owns them.
   `body { overflow-x: hidden }` hides the symptom, so this walks geometry
   instead of trusting the scrollbar.

     node tools/find-overflow.mjs [--mobile] */

import { chromium } from 'playwright';

const MOBILE = process.argv.includes('--mobile');
const VIEW = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEW });
await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);

const report = await page.evaluate((vw) => {
  const out = [];
  const seen = new Set();
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const right = r.right + window.scrollX;
    const left = r.left + window.scrollX;
    if (right <= vw + 1 && left >= -1) return;

    /* Ignore elements clipped by a real ancestor — but NOT by <body>/<html>.
       body carries `overflow-x: hidden`, so counting it would mark every
       element on the page as clipped and report nothing. body hides the
       scrollbar; it does not stop the element from widening the document. */
    let p = el.parentElement, clipped = false;
    while (p && p !== document.body && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      if (/hidden|clip|auto|scroll/.test(cs.overflowX)) { clipped = true; break; }
      p = p.parentElement;
    }
    if (clipped) return;

    const section = el.closest('[data-module]')?.id || el.closest('section,header,footer')?.id || '(page)';
    const sel = el.tagName.toLowerCase() +
      (el.id ? '#' + el.id : '') +
      (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    const key = section + '|' + sel;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ section, sel, left: Math.round(left), right: Math.round(right) });
  });
  return out;
}, VIEW.width);

const doc = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));

console.log(`viewport ${VIEW.width}  document ${doc.scrollWidth} vs ${doc.clientWidth}` +
  (doc.scrollWidth > doc.clientWidth + 1 ? '  ← OVERFLOWS' : '  ok'));

if (!report.length) console.log('no unclipped offenders found');
for (const r of report.slice(0, 25)) {
  console.log(`  #${r.section.padEnd(10)} ${r.sel.padEnd(42)} x ${r.left} → ${r.right}`);
}

await browser.close();
