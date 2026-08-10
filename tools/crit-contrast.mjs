#!/usr/bin/env node
/* Measure real rendered contrast for the mobile flavors copy, which sits
   directly on the film. Samples the composited pixels UNDER each text run by
   screenshotting the element box with the text hidden, then comparing the
   mean backdrop luminance to the text colour. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'build-notes', 'shots', 'crit2', 'contrast');
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const scratch = await browser.newPage();
await scratch.goto('about:blank');
await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);

const lum = (r, g, b) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const top = await page.evaluate(() => document.querySelector('#flavors').getBoundingClientRect().top + window.scrollY);
const track = await page.evaluate(() => {
  const t = document.querySelector('.flv__track'); const s = document.querySelector('.flv__stage');
  return t.offsetHeight - s.offsetHeight;
});

const results = [];
for (const [name, p] of [['lemonade', 0.13], ['tropical', 0.47], ['berry', 0.86]]) {
  await page.evaluate((y) => window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y), Math.round(top + track * p));
  await page.waitForTimeout(2600);

  for (const sel of ['.flv__copy.is-active .flv__note', '.flv__copy.is-active .flv__desc']) {
    const info = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      /* Resolve the text colour to real sRGB by painting it, instead of
         regex-scraping the computed string. `color` can come back as
         `oklab(0.807 0.072 0.075)` — scraping digits out of that yielded
         "rgb(0.807, 0.072, 0.075)", i.e. near-black, and every contrast
         number derived from it was meaningless. */
      const cs = getComputedStyle(el);
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const cx = c.getContext('2d');
      cx.fillStyle = '#000';
      cx.fillRect(0, 0, 1, 1);
      cx.fillStyle = cs.color;
      cx.fillRect(0, 0, 1, 1);
      const [cr, cg, cb] = cx.getImageData(0, 0, 1, 1).data;
      return {
        box: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
        color: cs.color,
        rgb: [cr, cg, cb],
        opacity: cs.opacity,
      };
    }, sel);
    if (!info || info.box.width < 4) continue;

    // hide the copy column's text so we photograph only what is behind it
    await page.evaluate(() => { document.querySelector('.flv__col--copy').style.visibility = 'hidden'; });
    await page.waitForTimeout(120);
    const buf = await page.screenshot({ clip: info.box });
    await page.evaluate(() => { document.querySelector('.flv__col--copy').style.visibility = ''; });

    /* Decode in a scratch page — no native image deps in this repo. */
    const px = await scratch.evaluate(async (dataUrl) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let sr = 0, sg = 0, sb = 0, n = 0;
      const L = (r, gg, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
      let maxL = 0;
      for (let i = 0; i < d.length; i += 4) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++; maxL = Math.max(maxL, L(d[i], d[i + 1], d[i + 2])); }
      return { sr: sr / n, sg: sg / n, sb: sb / n, maxL };
    }, 'data:image/png;base64,' + buf.toString('base64'));
    const sr = px.sr, sg = px.sg, sb = px.sb, n = 1, maxL = px.maxL;
    const bg = lum(sr, sg, sb);
    const m = info.rgb;
    // approximate the element's own opacity against the mean backdrop
    const op = Number(info.opacity);
    const fg = lum(m[0] * op + sr * (1 - op), m[1] * op + sg * (1 - op), m[2] * op + sb * (1 - op));
    results.push({
      flavor: name, sel, color: info.color, opacity: op,
      meanBackdrop: [Math.round(sr), Math.round(sg), Math.round(sb)],
      contrastMean: +ratio(fg, bg).toFixed(2),
      contrastWorst: +ratio(fg, maxL).toFixed(2),
    });
    await writeFile(path.join(OUT, `${name}-${sel.includes('note') ? 'note' : 'desc'}.png`), buf);
  }
}
console.log(JSON.stringify(results, null, 2));
await writeFile(path.join(OUT, '_contrast.json'), JSON.stringify(results, null, 2));
await browser.close();
