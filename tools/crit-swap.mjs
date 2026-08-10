#!/usr/bin/env node
/* Catch the flavor crossover mid-flight: cross the 0.3 boundary with real
   wheel input and shoot every ~120ms so the transition itself is visible,
   not just its endpoints. */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'build-notes', 'shots', 'crit2', 'swap');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);
await page.mouse.move(720, 450);

// Park just before the 01 -> 02 boundary using lenis, then cross with the wheel.
const top = await page.evaluate(() => {
  const r = document.querySelector('#flavors').getBoundingClientRect();
  return r.top + window.scrollY;
});
const pre = Math.round(top + 2700 * 0.30) - 130;
await page.evaluate((y) => window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y), pre);
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, 'x-00-before.png') });

// Cross the boundary with a couple of real wheel ticks, then film the swap.
for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(30); }
for (let i = 1; i <= 8; i++) {
  await page.waitForTimeout(115);
  await page.screenshot({ path: path.join(OUT, `x-${String(i).padStart(2, '0')}.png`) });
}
await page.waitForTimeout(1600);
await page.screenshot({ path: path.join(OUT, 'x-99-settled.png') });
console.log('done, pre=', pre);
await browser.close();
