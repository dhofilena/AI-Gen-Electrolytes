#!/usr/bin/env node
/* Verify the #offer gallery: slide count, arrows, thumbs, keyboard, and that
   changing flavour re-sources slide 0 without disturbing the brand slides. */

import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:5273', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const el = document.querySelector('#offer');
  const y = el.getBoundingClientRect().top + window.scrollY;
  const l = window.__lenis;
  if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
});
await page.waitForTimeout(2500);

const read = () =>
  page.evaluate(() => {
    const sec = document.querySelector('#offer');
    const slides = [...sec.querySelectorAll('.offer__slide')];
    const on = slides.findIndex((s) => s.classList.contains('is-on'));
    return {
      slides: slides.length,
      active: on,
      activeSrc: (slides[on]?.querySelector('img')?.currentSrc || '').split('/').pop(),
      thumbs: sec.querySelectorAll('.offer__thumb').length,
      thumbsHidden: sec.querySelector('[data-thumbs]')?.hidden,
      arrowsHidden: sec.querySelector('[data-prev]')?.hidden,
      isStill: sec.querySelector('.offer__media')?.classList.contains('is-still'),
    };
  });

console.log('initial  ', JSON.stringify(await read()));

const n = (await read()).slides;
if (n > 1) {
  await page.click('#offer [data-next]');
  await page.waitForTimeout(700);
  console.log('after >  ', JSON.stringify(await read()));

  await page.click('#offer [data-next]');
  await page.waitForTimeout(700);
  console.log('after >> ', JSON.stringify(await read()));

  await page.click('#offer [data-prev]');
  await page.waitForTimeout(700);
  console.log('after <  ', JSON.stringify(await read()));

  const last = await page.$$('#offer .offer__thumb');
  if (last.length) {
    await last[last.length - 1].click();
    await page.waitForTimeout(700);
    console.log('thumb end', JSON.stringify(await read()));
  }

  // flavour change must reset to slide 0 and re-source the pack shot
  await page.click('#offer .offer__swatch[data-flavor="berry"]');
  await page.waitForTimeout(1200);
  console.log('flavour  ', JSON.stringify(await read()));
} else {
  console.log('only one slide — brand artwork not on disk yet (arrows/thumbs correctly hidden)');
}

console.log('page errors:', errs.length ? errs.join(' | ') : 'none');
await browser.close();
