#!/usr/bin/env node
/* Capture one section at arbitrary progress fractions through its own height.
   Pinned sections need this — a single mid frame lands wherever the scrub
   happens to be, which is not necessarily where the payload resolves.

     node tools/shoot-at.mjs myth 0.5 0.85 0.95 [--mobile] */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const MOBILE = args.includes('--mobile');
const [id, ...fracs] = args.filter((a) => a !== '--mobile');
const VIEW = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const OUT = path.join(ROOT, 'build-notes', 'shots', MOBILE ? 'mobile' : 'desktop', 'at');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: VIEW });
await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3200);

for (const f of fracs.map(Number)) {
  await page.evaluate(({ sec, frac }) => {
    const el = document.querySelector('#' + sec);
    const r = el.getBoundingClientRect();
    const y = r.top + window.scrollY + r.height * frac;
    const l = window.__lenis;
    if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  }, { sec: id, frac: f });
  await page.waitForTimeout(2600);
  const name = `${id}-${String(Math.round(f * 100)).padStart(3, '0')}.png`;
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('  ' + (MOBILE ? 'mobile' : 'desktop') + '/at/' + name);
}

await browser.close();
