#!/usr/bin/env node
/* Critic-owned variant of shoot.mjs: walks a pinned section's FULL scroll
   range in N steps so the sequence is visible, not one frame.
     node tools/crit-scrub.mjs --section myth --steps 8
     node tools/crit-scrub.mjs --section flavors --steps 10 --mobile      */

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
const LABEL = MOBILE ? 'mobile' : 'desktop';
const SECTION = val('--section', 'myth');
const STEPS = Number(val('--steps', 8));
const OUT = path.join(ROOT, 'build-notes', 'shots', 'crit2', LABEL, SECTION);

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1, reducedMotion: 'no-preference' });

const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));

await page.goto(URL_BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3200);

async function scrollTo(y) {
  await page.evaluate((t) => {
    const l = window.__lenis;
    if (l) l.scrollTo(t, { immediate: true }); else window.scrollTo(0, t);
  }, y);
  await page.waitForTimeout(1400);
}

const box = await page.evaluate((sel) => {
  const el = document.querySelector('#' + sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
}, SECTION);
if (!box) { console.log('no section'); await browser.close(); process.exit(1); }

console.log(`#${SECTION} top=${Math.round(box.top)} height=${Math.round(box.height)} vh=${VIEW.height}`);

// Walk from 1 viewport BEFORE the section top to 0.5vh past its bottom.
const start = box.top - VIEW.height * 0.55;
const end = box.top + box.height - VIEW.height * 0.45;
const meta = [];
for (let i = 0; i <= STEPS; i++) {
  const y = Math.round(start + ((end - start) * i) / STEPS);
  await scrollTo(y);
  const probe = await page.evaluate((sel) => {
    const el = document.querySelector('#' + sel);
    const r = el.getBoundingClientRect();
    return { rectTop: Math.round(r.top), rectBottom: Math.round(r.bottom), scrollY: Math.round(window.scrollY) };
  }, SECTION);
  const name = `${String(i).padStart(2, '0')}`;
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  meta.push({ frame: name, requestedY: y, ...probe });
  console.log(`  ${name}.png  y=${y} rectTop=${probe.rectTop}`);
}

await writeFile(path.join(OUT, '_meta.json'), JSON.stringify({ box, view: VIEW, meta, errs: [...new Set(errs)] }, null, 2));
console.log('errors:', [...new Set(errs)].length);
await browser.close();
