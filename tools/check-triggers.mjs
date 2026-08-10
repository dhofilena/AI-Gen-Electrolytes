#!/usr/bin/env node
/* Compares every ScrollTrigger's cached start/end against its trigger
   element's REAL document position.

   Pinned sections insert pin-spacers that grow the document. Any trigger
   created or refreshed before those spacers exist keeps a start value that
   is short by the spacer height — so sections below the pins fire early,
   `onLeave` runs before you arrive, and state machines never activate.
   A screenshot cannot show this; only the numbers can. */

import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(4000);

const rows = await page.evaluate(() => {
  const ST = window.ScrollTrigger || (window.gsap && window.gsap.core && window.ScrollTrigger);
  if (!ST) return { error: 'ScrollTrigger not exposed on window' };
  return ST.getAll().map((t) => {
    const el = t.trigger;
    const r = el ? el.getBoundingClientRect() : null;
    const realTop = r ? Math.round(r.top + window.scrollY) : null;
    const sec = el ? (el.closest('[data-module]')?.id || el.id || '?') : '?';
    return {
      sec,
      pin: !!t.pin,
      start: Math.round(t.start),
      realTop,
      drift: realTop === null ? null : Math.round(t.start - realTop),
    };
  });
});

if (rows.error) { console.log(rows.error); await browser.close(); process.exit(1); }

/* A trigger's start legitimately differs from the element top by the start
   offset (e.g. "top 82%" = -0.82 * viewportHeight). Group by section and
   report the SPREAD of drift within a section — a consistent offset is a
   start-string, a big inconsistent one is stale geometry. */
const bySec = {};
for (const r of rows) {
  if (r.drift === null) continue;
  (bySec[r.sec] ??= []).push(r.drift);
}

console.log('section      triggers   drift range (start - elementTop)');
let suspect = 0;
for (const [sec, ds] of Object.entries(bySec)) {
  const min = Math.min(...ds), max = Math.max(...ds);
  // -900..0 is the normal band for start strings on a 900px viewport.
  const odd = min < -1000 || max > 200;
  if (odd) suspect++;
  console.log(`${sec.padEnd(12)} ${String(ds.length).padStart(3)}      ${String(min).padStart(6)} .. ${String(max).padStart(6)}${odd ? '   ← SUSPECT' : ''}`);
}

const docH = await page.evaluate(() => document.body.scrollHeight);
console.log(`\ndocument height ${docH}px`);
console.log(suspect ? `${suspect} section(s) with suspect trigger geometry.` : 'trigger geometry looks consistent.');

await browser.close();
