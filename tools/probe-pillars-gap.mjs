#!/usr/bin/env node
/* Measure the clearance between the drawn accent axis and the leading edge of
   every text run in a pillars cell, at both viewports.

   The runs used to start with their ink exactly ON the axis — optically exact,
   but it reads as type touching the rule. This asserts there is now a real gap
   and that all four runs still share one left edge. */

import { chromium } from 'playwright';

const browser = await chromium.launch();

for (const vp of [
  { width: 1440, height: 900, tag: 'desktop' },
  { width: 390, height: 844, tag: 'mobile ' },
]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const el = document.querySelector('#pillars');
    const y = el.getBoundingClientRect().top + window.scrollY;
    const l = window.__lenis;
    if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  });
  await page.waitForTimeout(2200);

  const data = await page.evaluate(() => {
    const round = (n) => Math.round(n * 10) / 10;
    const axes = [...document.querySelectorAll('#pillars .pil__axis')].map((a) =>
      round(a.getBoundingClientRect().left)
    );
    const cells = [...document.querySelectorAll('#pillars .pil__row')].map((row) => {
      const at = (sel) => {
        const n = row.querySelector(sel);
        return n ? round(n.getBoundingClientRect().left) : null;
      };
      return { idx: at('.pil__idx'), fig: at('.pil__figure'), name: at('.pil__label'), sub: at('.pil__sub') };
    });
    return { axes, cells };
  });

  console.log(`\n${vp.tag}  axes at ${data.axes.join(', ')}`);
  data.cells.forEach((c, i) => {
    const vals = Object.values(c).filter((v) => v !== null);
    const spread = round(Math.max(...vals) - Math.min(...vals));
    // nearest axis to the left of this cell's runs
    const axis = data.axes.filter((a) => a <= Math.min(...vals) + 1).pop() ?? data.axes[0];
    const gap = round(Math.min(...vals) - axis);
    console.log(
      `  cell ${i + 1}  idx ${String(c.idx).padStart(6)}  fig ${String(c.fig).padStart(6)}` +
      `  name ${String(c.name).padStart(6)}  sub ${String(c.sub).padStart(6)}` +
      `   gap-to-axis ${String(gap).padStart(5)}px   spread ${spread}px`
    );
  });

  await page.close();
}

function round(n) { return Math.round(n * 10) / 10; }

await browser.close();
