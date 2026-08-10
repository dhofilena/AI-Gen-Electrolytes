#!/usr/bin/env node
/* Catch elements that carry data-reveal but were never handed to GSAP.

   base.css holds [data-reveal] at opacity 0 until a reveal helper takes
   ownership and adds .gsap-managed / animates it. Forget one and it is simply
   invisible — no error, no warning, just missing content. That happened to the
   flavour selector the moment it moved between columns.

   Parks in each section and reports anything still at opacity 0 that is not
   inside a deliberately hidden subtree. */

import { chromium } from 'playwright';

const SECTIONS = ['hero','myth','science','pillars','formula','flavors','ritual','compare','benefits','proof','offer','faq','footer'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);

let bad = 0;
for (const id of SECTIONS) {
  const ok = await page.evaluate((sec) => !!document.querySelector('#' + sec), id);
  if (!ok) continue;

  await page.evaluate((sec) => {
    const el = document.querySelector('#' + sec);
    const r = el.getBoundingClientRect();
    const y = r.top + window.scrollY + Math.min(r.height * 0.4, window.innerHeight * 0.4);
    const l = window.__lenis;
    if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  }, id);
  await page.waitForTimeout(2200);

  const stuck = await page.evaluate((sec) => {
    const el = document.querySelector('#' + sec);
    return [...el.querySelectorAll('[data-reveal]')]
      .filter((n) => {
        if (n.closest('[hidden], [aria-hidden="true"]')) return false;
        const r = n.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        return parseFloat(getComputedStyle(n).opacity) < 0.05;
      })
      .map((n) => n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/)[0] : ''));
  }, id);

  if (stuck.length) {
    bad++;
    console.log(`${id.padEnd(10)} ← ${stuck.length} stuck at opacity 0: ${[...new Set(stuck)].join(', ')}`);
  } else {
    console.log(`${id.padEnd(10)} ok`);
  }
}

console.log(bad ? `\n${bad} section(s) with unwired data-reveal elements.` : '\nevery data-reveal element is wired to a reveal call.');
await browser.close();
