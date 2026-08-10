#!/usr/bin/env node
/* Leaner real-input pin test. One programmatic jump to a parking spot a full
   viewport ABOVE the section (approach is what matters, and the jump lands
   well clear of it), then every scroll that touches the pin is real
   page.mouse.wheel — down through, past the end, and back up again.

     node tools/crit-wheel2.mjs --section flavors --passes 4 [--mobile]        */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };

const MOBILE = has('--mobile');
const VIEW = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const SECTION = val('--section', 'flavors');
const PASSES = Number(val('--passes', 4));
const PREV = { myth: 'hero', flavors: 'formula' }[SECTION];
const NEXT = { myth: 'science', flavors: 'ritual' }[SECTION];
const OUT = path.join(ROOT, 'build-notes', 'shots', 'crit2', 'wheel2', SECTION + (MOBILE ? '-m' : ''));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));

await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);
await page.mouse.move(VIEW.width / 2, VIEW.height / 2);

const probeFn = ([sel, prev, next]) => {
  const el = document.querySelector('#' + sel);
  const r = el.getBoundingClientRect();
  const pinInner = el.querySelector('[data-pin], .flv__stage');
  let pinned = false;
  if (pinInner) {
    const pr = pinInner.getBoundingClientRect();
    pinned = Math.abs(pr.top) < 3 && pr.height > window.innerHeight * 0.8;
  }
  const box = (id) => {
    const e = document.querySelector('#' + id);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom) };
  };
  const p = box(prev); const n = box(next);
  /* Is anything at all painted in the frame? A void frame has no element
     whose box intersects the viewport other than the section itself. */
  const painted = [...document.querySelectorAll('#' + sel + ' h1, #' + sel + ' h2, #' + sel + ' p, #' + sel + ' img, #' + sel + ' video')]
    .filter((e) => {
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return b.bottom > 0 && b.top < window.innerHeight && b.width > 2 && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.02;
    }).length;
  return {
    y: Math.round(window.scrollY),
    rectTop: Math.round(r.top), rectBottom: Math.round(r.bottom),
    pinned, painted,
    gapAbove: p ? Math.round(r.top - p.bottom) : null,
    gapBelow: n ? Math.round(n.top - r.bottom) : null,
  };
};

const rows = [];
const violations = [];

async function tick(dir, n = 1) {
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dir * 200); await page.waitForTimeout(26); }
}

async function record(pass, dir, tag, shot) {
  await page.waitForTimeout(230);
  const p = await page.evaluate(probeFn, [SECTION, PREV, NEXT]);
  p.pass = pass; p.dir = dir; p.tag = tag;
  rows.push(p);
  if (p.pinned && p.rectTop > 4) violations.push({ ...p, kind: 'EARLY_PIN' });
  if (p.gapAbove !== null && p.gapAbove > 8) violations.push({ ...p, kind: 'GAP_ABOVE' });
  if (p.gapBelow !== null && p.gapBelow < -8) violations.push({ ...p, kind: 'OVERLAP_BELOW' });
  // Inside the section's own range there must always be something on screen.
  if (p.rectTop < VIEW.height * 0.4 && p.rectBottom > VIEW.height * 0.6 && p.painted === 0) {
    violations.push({ ...p, kind: 'VOID_FRAME' });
  }
  if (shot) await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  return p;
}

const g0 = await page.evaluate(probeFn, [SECTION, PREV, NEXT]);
const top = g0.y + g0.rectTop;
const bottom = g0.y + g0.rectBottom;
const park = Math.max(0, top - Math.round(VIEW.height * 1.25));
console.log(`#${SECTION} top=${top} bottom=${bottom} park=${park}`);

let clean = 0;
for (let pass = 1; pass <= PASSES; pass++) {
  const before = violations.length;

  await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)), park);
  await page.waitForTimeout(1400);

  // DOWN — wheel all the way through and one viewport past the end.
  const need = bottom + VIEW.height * 0.5 - park;
  const ticks = Math.ceil(need / 200) + 12;
  const marks = 14;
  for (let m = 1; m <= marks; m++) {
    await tick(1, Math.ceil(ticks / marks));
    await record(pass, 'down', `p${pass}-d-${String(m).padStart(2, '0')}`, pass === 1);
  }
  // UP — come back.
  for (let m = 1; m <= marks; m++) {
    await tick(-1, Math.ceil(ticks / marks));
    await record(pass, 'up', `p${pass}-u-${String(m).padStart(2, '0')}`, pass === 2);
  }

  if (violations.length === before) clean++;
  console.log(`  pass ${pass}: ${violations.length === before ? 'clean' : 'VIOLATIONS +' + (violations.length - before)}`);
}

await writeFile(path.join(OUT, '_wheel.json'), JSON.stringify(
  { section: SECTION, view: VIEW, top, bottom, passes: PASSES, clean, violations, rows, errs: [...new Set(errs)] }, null, 2));

console.log(`\nRESULT ${SECTION}${MOBILE ? ' (mobile)' : ''}: ${clean}/${PASSES} clean, ${violations.length} violations`);
if (violations.length) {
  const k = {}; violations.forEach((v) => { k[v.kind] = (k[v.kind] || 0) + 1; });
  console.log('  ', JSON.stringify(k), '\n   first:', JSON.stringify(violations[0]));
}
console.log('console errors:', [...new Set(errs)].length);
await browser.close();
