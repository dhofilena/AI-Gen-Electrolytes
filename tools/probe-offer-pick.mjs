#!/usr/bin/env node
/* Click each flavour tile in #offer and verify it actually selects:
   radio checked, is-on class, media + caption swap, accent retarget,
   and the resting contrast of selected vs unselected labels. */

import { chromium } from 'playwright';
import path from 'node:path';

const MOBILE = process.argv.includes('--mobile');
const VIEW = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const OUT = path.resolve(import.meta.dirname, '..', 'build-notes', 'shots', MOBILE ? 'mobile' : 'desktop', 'pick');

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: VIEW });
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

const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// hit area check
const sizes = await page.evaluate(() =>
  [...document.querySelectorAll('#offer .offer__swatch')].map((s) => {
    const r = s.getBoundingClientRect();
    return { name: s.querySelector('.offer__swatchname').textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) };
  })
);
console.log('tile hit areas:');
sizes.forEach((s) => console.log(`  ${s.name.padEnd(12)} ${s.w} x ${s.h}px  ${s.h >= 44 ? 'ok (>=44px)' : '← under 44px touch target'}`));

for (const id of ['lemonade', 'tropical', 'berry']) {
  await page.click(`#offer .offer__swatch[data-flavor="${id}"]`);
  await page.waitForTimeout(1400);

  const st = await page.evaluate((sel) => {
    const sec = document.querySelector('#offer');
    const tile = sec.querySelector(`.offer__swatch[data-flavor="${sel}"]`);
    const media = sec.querySelector('.offer__media');
    const on = [...sec.querySelectorAll('.offer__swatch.is-on')].map((s) => s.dataset.flavor);
    const nameEl = tile.querySelector('.offer__swatchname');
    const px = (el) => {
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const cx = c.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, 1, 1);
      cx.fillStyle = getComputedStyle(el).color; cx.fillRect(0, 0, 1, 1);
      return [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const plate = (el) => {
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const cx = c.getContext('2d'); cx.fillStyle = '#0b0d12'; cx.fillRect(0, 0, 1, 1);
      cx.fillStyle = getComputedStyle(el).backgroundColor; cx.fillRect(0, 0, 1, 1);
      return [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const other = sec.querySelector(`.offer__swatch:not([data-flavor="${sel}"])`);
    return {
      checked: tile.querySelector('input').checked,
      onList: on,
      mediaFlavor: media?.dataset.flavor,
      caption: sec.querySelector('.offer__capname')?.textContent.trim(),
      selColor: px(nameEl), selPlate: plate(tile),
      offColor: px(other.querySelector('.offer__swatchname')), offPlate: plate(other),
      accent: getComputedStyle(tile).getPropertyValue('--accent').trim(),
    };
  }, id);

  await page.screenshot({ path: path.join(OUT, `${id}.png`) });
  console.log(
    `\n${id}: checked=${st.checked} is-on=[${st.onList}] media=${st.mediaFlavor} caption="${st.caption}"\n` +
    `   selected label ${ratio(st.selColor, st.selPlate).toFixed(2)}:1   unselected label ${ratio(st.offColor, st.offPlate).toFixed(2)}:1`
  );
}

console.log('\npage errors:', errs.length ? errs.join(' | ') : 'none');
await browser.close();
