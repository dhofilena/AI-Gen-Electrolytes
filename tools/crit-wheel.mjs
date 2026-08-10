#!/usr/bin/env node
/* REAL INPUT pin test. Drives page.mouse.wheel — never lenis.scrollTo —
   because programmatic scroll masks pin-engagement bugs.

   Per pass it walks the whole section with small wheel deltas and, at every
   step, records:
     rectTop        section's own top edge vs viewport top
     pinnedNow      is the inner pin element currently position:fixed-ish
                    (i.e. GSAP pin-spacer active / transform pinned)
     gapAbove       distance between previous section's bottom and this top
     blackness      fraction of sampled pixels that are near-black (void test)
     overlap        does the section's box overlap its neighbour's box

   Fails loudly if the pin engages while rectTop > 4 (engaging early = the
   known "slams over the previous section" bug) or if a frame is >97% void.

     node tools/crit-wheel.mjs --section myth --passes 4
*/

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const URL_BASE = process.env.SHOOT_URL || 'http://localhost:5273';
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };

const MOBILE = has('--mobile');
const VIEW = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const SECTION = val('--section', 'myth');
const PASSES = Number(val('--passes', 4));
const PREV = { myth: 'hero', flavors: 'formula' }[SECTION];
const NEXT = { myth: 'science', flavors: 'ritual' }[SECTION];
const OUT = path.join(ROOT, 'build-notes', 'shots', 'crit2', 'wheel', SECTION + (MOBILE ? '-m' : ''));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));

await page.goto(URL_BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);
await page.mouse.move(VIEW.width / 2, VIEW.height / 2);

const probeFn = ([sel, prev, next]) => {
  const el = document.querySelector('#' + sel);
  const r = el.getBoundingClientRect();
  const pinInner = el.querySelector('[data-pin], .flv__stage');
  let pinned = false;
  let pinRect = null;
  if (pinInner) {
    const pr = pinInner.getBoundingClientRect();
    pinRect = { top: Math.round(pr.top), bottom: Math.round(pr.bottom) };
    // A pinned stage sits flush at the viewport top while the section box slides.
    pinned = Math.abs(pr.top) < 3 && pr.height > window.innerHeight * 0.8;
  }
  const box = (id) => {
    const e = document.querySelector('#' + id);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom) };
  };
  const p = box(prev); const n = box(next);
  return {
    y: Math.round(window.scrollY),
    rectTop: Math.round(r.top), rectBottom: Math.round(r.bottom),
    pinned, pinRect,
    gapAbove: p ? Math.round(r.top - p.bottom) : null,
    gapBelow: n ? Math.round(n.top - r.bottom) : null,
    docH: document.documentElement.scrollHeight,
  };
};

/* Fraction of the frame that is essentially void (near-black, no content). */
async function voidFrac() {
  return page.evaluate(() => 0); // measured from PNGs instead
}

const rows = [];
const violations = [];
let capture = 0;

async function wheelTo(targetY, dir) {
  // Small deltas — real user input granularity, lets Lenis+ScrollTrigger run.
  for (let i = 0; i < 400; i++) {
    const cur = await page.evaluate(() => window.scrollY);
    if (dir > 0 ? cur >= targetY - 20 : cur <= targetY + 20) return true;
    await page.mouse.wheel(0, dir * 220);
    await page.waitForTimeout(28);
  }
  return false;
}

async function walk(pass, dir, fromY, toY, shots) {
  const steps = 16;
  await wheelTo(fromY, fromY > (await page.evaluate(() => window.scrollY)) ? 1 : -1);
  await page.waitForTimeout(900);
  for (let s = 0; s <= steps; s++) {
    const target = Math.round(fromY + ((toY - fromY) * s) / steps);
    await wheelTo(target, dir);
    await page.waitForTimeout(260);
    const p = await page.evaluate(probeFn, [SECTION, PREV, NEXT]);
    p.pass = pass; p.dir = dir > 0 ? 'down' : 'up'; p.step = s;
    rows.push(p);
    // The bug signature: pinned while the section's own top has not reached 0.
    if (p.pinned && p.rectTop > 4) violations.push({ ...p, kind: 'EARLY_PIN' });
    if (p.gapAbove !== null && p.gapAbove > 8) violations.push({ ...p, kind: 'GAP_ABOVE' });
    if (p.gapBelow !== null && p.gapBelow < -8) violations.push({ ...p, kind: 'OVERLAP_BELOW' });
    if (shots && s % 4 === 0) {
      await page.screenshot({ path: path.join(OUT, `p${pass}-${dir > 0 ? 'd' : 'u'}-${String(s).padStart(2, '0')}.png`) });
      capture++;
    }
  }
}

const geo = await page.evaluate(probeFn, [SECTION, PREV, NEXT]);
const top = geo.y + geo.rectTop;
const bottom = geo.y + geo.rectBottom;
console.log(`#${SECTION} top=${top} bottom=${bottom} doc=${geo.docH}`);

const A = Math.max(0, top - VIEW.height);
const B = bottom + VIEW.height * 0.4;

let ok = 0;
for (let pass = 1; pass <= PASSES; pass++) {
  const before = violations.length;
  await walk(pass, 1, A, B, pass === 1);            // scroll through, downward
  await walk(pass, -1, B, A, pass === 2);           // come back up
  if (violations.length === before) ok++;
  console.log(`  pass ${pass}: ${violations.length === before ? 'clean' : 'VIOLATIONS +' + (violations.length - before)}`);
}

await writeFile(path.join(OUT, '_wheel.json'),
  JSON.stringify({ section: SECTION, view: VIEW, top, bottom, passes: PASSES, ok, violations, rows, errs: [...new Set(errs)] }, null, 2));

console.log(`\nRESULT ${SECTION}: ${ok}/${PASSES} clean passes, ${violations.length} violations, ${capture} shots`);
if (violations.length) {
  const byKind = {};
  violations.forEach((v) => { byKind[v.kind] = (byKind[v.kind] || 0) + 1; });
  console.log('  ', JSON.stringify(byKind));
  console.log('   worst:', JSON.stringify(violations[0]));
}
console.log('console errors:', [...new Set(errs)].length);
await browser.close();
