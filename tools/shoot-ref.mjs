#!/usr/bin/env node
/* ============================================================
   Capture the REFERENCE sites so critics can compare real pixels
   side by side instead of comparing against a memory of them.

     node tools/shoot-ref.mjs

   Output: build-notes/shots/ref/<site>-<nn>.png
   Public marketing pages, captured for design comparison only.
   ============================================================ */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'build-notes', 'shots', 'ref');
await mkdir(OUT, { recursive: true });

const TARGETS = [
  { name: 'oura', url: 'https://ouraring.com/product/rings/oura-ring-4', frames: 7 },
  { name: 'polestar', url: 'https://www.polestar.com/us/polestar-3/', frames: 7 },
];

const browser = await chromium.launch();

for (const t of TARGETS) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  });

  try {
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    // Dismiss the most common consent patterns so they do not cover the design.
    for (const sel of [
      'button:has-text("Accept")', 'button:has-text("Allow all")',
      'button:has-text("Agree")', '#onetrust-accept-btn-handler',
      '[aria-label*="accept" i]',
    ]) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 800 })) { await el.click({ timeout: 1500 }); break; }
      } catch {}
    }
    await page.waitForTimeout(1500);

    const total = await page.evaluate(() => document.body.scrollHeight);
    const step = Math.min(Math.floor(total / t.frames), 1400);

    for (let i = 0; i < t.frames; i++) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), i * step);
      await page.waitForTimeout(2200);
      await page.screenshot({ path: path.join(OUT, `${t.name}-${String(i).padStart(2, '0')}.png`) });
      process.stdout.write(`  ref/${t.name}-${String(i).padStart(2, '0')}.png\n`);
    }
  } catch (e) {
    console.log(`  ${t.name}: FAILED — ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

await browser.close();
console.log('\nreference capture done.');
