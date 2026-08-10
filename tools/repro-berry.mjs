#!/usr/bin/env node
/* Reproduce "berry shows the still instead of the film".
   Hypothesis: the flavour films lazy-load their src, so arriving at berry
   WITHOUT scrolling through lemonade/tropical first (tab click, deep link,
   fast scroll) leaves the berry video with no src, exposing the still beneath.

   Tests three arrival paths at two viewports. */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'build-notes', 'shots', 'repro');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function state(page) {
  return page.evaluate(() => {
    const sec = document.querySelector('#flavors');
    const vids = [...sec.querySelectorAll('video')]
      .filter((v) => v.getBoundingClientRect().width > 600)
      .map((v) => ({
        src: (v.currentSrc || v.getAttribute('src') || '(NO SRC)').split('/').pop(),
        lazy: v.dataset.src ? v.dataset.src.split('/').pop() : null,
        ready: v.readyState,
        paused: v.paused,
        op: +getComputedStyle(v).opacity,
      }));
    return vids;
  });
}

for (const vw of [1440, 1920]) {
  for (const mode of ['scroll-through', 'tab-click', 'fast-jump']) {
    const page = await browser.newPage({ viewport: { width: vw, height: 900 } });
    await page.goto('http://localhost:5273', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const box = await page.evaluate(() => {
      const r = document.querySelector('#flavors').getBoundingClientRect();
      return { top: r.top + window.scrollY, height: r.height };
    });

    if (mode === 'scroll-through') {
      for (const f of [0.1, 0.3, 0.5, 0.7, 0.85]) {
        await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true }), box.top + box.height * f);
        await page.waitForTimeout(900);
      }
    } else if (mode === 'tab-click') {
      await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true }), box.top + 120);
      await page.waitForTimeout(1500);
      const tab = page.locator('#flavors [role="tab"]').nth(2);
      if (await tab.count()) await tab.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(1800);
    } else {
      // land deep in the berry range immediately, no warm-up
      await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true }), box.top + box.height * 0.85);
      await page.waitForTimeout(1200);
    }

    const s = await state(page);
    const berry = s.find((v) => /berry/.test(v.src) || /berry/.test(v.lazy || ''));
    const playing = s.find((v) => !v.paused && v.op > 0.5);
    console.log(`\n${vw}px / ${mode}`);
    s.forEach((v) => console.log(`   ${String(v.src).padEnd(22)} lazy=${v.lazy ?? '-'} ready=${v.ready} paused=${v.paused} op=${v.op.toFixed(2)}`));
    console.log(`   -> berry film loaded: ${berry ? (berry.ready >= 2 ? 'YES' : 'NO (ready=' + berry.ready + ')') : 'NO ELEMENT'}`);

    await page.screenshot({ path: path.join(OUT, `${vw}-${mode}.png`) });
    await page.close();
  }
}

await browser.close();
console.log('\nshots in build-notes/shots/repro/');
