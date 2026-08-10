#!/usr/bin/env node
/* Why is the berry flavour showing a still instead of its film?
   Walks the flavors track to each flavour and reports what the film layer
   actually holds: element type, resolved src, readyState, error code, and
   whether anything is painted over it. */

import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const netFails = [];
page.on('requestfailed', (r) => netFails.push(`${r.url().split('/').pop()} — ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400 && /media|img/.test(r.url())) netFails.push(`${r.status()} ${r.url().split('/').pop()}`); });

await page.goto('http://localhost:5273', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);

const box = await page.evaluate(() => {
  const el = document.querySelector('#flavors');
  const r = el.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height };
});

for (const [label, frac] of [['lemonade', 0.12], ['tropical', 0.45], ['berry', 0.80]]) {
  await page.evaluate((y) => {
    const l = window.__lenis;
    if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  }, box.top + box.height * frac);
  await page.waitForTimeout(2200);

  const info = await page.evaluate(() => {
    const sec = document.querySelector('#flavors');
    const active = sec.getAttribute('data-flavor');
    const vids = [...sec.querySelectorAll('video')].map((v) => ({
      tag: 'video',
      src: (v.currentSrc || v.getAttribute('src') || v.dataset.src || '(none)').split('/').pop(),
      ready: v.readyState,
      paused: v.paused,
      err: v.error ? v.error.code : null,
      opacity: +getComputedStyle(v).opacity,
      w: Math.round(v.getBoundingClientRect().width),
    }));
    const imgs = [...sec.querySelectorAll('img')].map((i) => ({
      tag: 'img',
      src: (i.currentSrc || i.src).split('/').pop(),
      opacity: +getComputedStyle(i).opacity,
      w: Math.round(i.getBoundingClientRect().width),
    }));
    return { active, vids, imgs };
  });

  console.log(`\n--- at ${label} (data-flavor="${info.active}") ---`);
  for (const v of info.vids) {
    console.log(`  video  ${v.src.padEnd(24)} ready=${v.ready} paused=${v.paused} err=${v.err ?? '-'} opacity=${v.opacity.toFixed(2)} w=${v.w}`);
  }
  for (const i of info.imgs) {
    console.log(`  img    ${i.src.padEnd(24)} opacity=${i.opacity.toFixed(2)} w=${i.w}`);
  }
}

console.log('\nnetwork failures:', netFails.length ? [...new Set(netFails)].join(' | ') : 'none');
await browser.close();
