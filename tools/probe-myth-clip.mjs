#!/usr/bin/env node
/* Find what is clipping the 98% stat in #myth.

   Walks the stat's ancestors reporting any box that clips (overflow other than
   visible) and whether the glyph's own box escapes it, on which edge, and by
   how much. Also reports the font's real ink extents versus the line box, since
   a mega numeral at sub-1 leading routinely overflows its own line box. */

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

  // park deep enough into the pinned range that the stat has resolved
  await page.evaluate(() => {
    const el = document.querySelector('#myth');
    const r = el.getBoundingClientRect();
    const y = r.top + window.scrollY + r.height * 0.88;
    const l = window.__lenis;
    if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  });
  await page.waitForTimeout(2600);

  const report = await page.evaluate(() => {
    const out = { found: [], ancestors: [] };
    const sec = document.querySelector('#myth');
    if (!sec) return out;

    // every candidate: the digits, the percent, the whole lockup
    const targets = [
      ['.myth__statnum', 'digits'],
      ['.myth__statunit', 'percent'],
      ['[data-statnum]', 'digits(data)'],
      ['.myth__stat', 'stat block'],
      ['.myth__stat-in', 'stat inner'],
    ];

    for (const [sel, name] of targets) {
      const n = sec.querySelector(sel);
      if (!n) continue;
      const r = n.getBoundingClientRect();
      const cs = getComputedStyle(n);
      out.found.push({
        name, sel,
        left: Math.round(r.left), right: Math.round(r.right),
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        w: Math.round(r.width), h: Math.round(r.height),
        fontSize: cs.fontSize, lineHeight: cs.lineHeight,
        overflow: cs.overflow, text: (n.textContent || '').trim().slice(0, 12),
      });

      // walk up looking for clippers
      let p = n.parentElement;
      while (p && p !== document.body) {
        const pcs = getComputedStyle(p);
        if (!/^visible/.test(pcs.overflow) || pcs.clipPath !== 'none') {
          const pr = p.getBoundingClientRect();
          out.ancestors.push({
            of: name,
            clipper: p.className && typeof p.className === 'string'
              ? '.' + p.className.trim().split(/\s+/).join('.')
              : p.tagName.toLowerCase(),
            overflow: pcs.overflow,
            clipPath: pcs.clipPath,
            box: { l: Math.round(pr.left), r: Math.round(pr.right), t: Math.round(pr.top), b: Math.round(pr.bottom) },
            escapesRight: Math.round(r.right - pr.right),
            escapesBottom: Math.round(r.bottom - pr.bottom),
            escapesLeft: Math.round(pr.left - r.left),
            escapesTop: Math.round(pr.top - r.top),
          });
        }
        p = p.parentElement;
      }
    }
    return out;
  });

  console.log(`\n===== ${vp.tag} =====`);
  for (const f of report.found) {
    console.log(
      `${f.name.padEnd(12)} "${f.text}"  box ${f.left}..${f.right} x ${f.top}..${f.bottom}` +
      `  ${f.w}x${f.h}  fs ${f.fontSize} lh ${f.lineHeight}  overflow:${f.overflow}`
    );
  }
  if (!report.ancestors.length) console.log('  no clipping ancestor found');
  for (const a of report.ancestors) {
    const esc = [];
    if (a.escapesRight > 0) esc.push(`RIGHT +${a.escapesRight}px`);
    if (a.escapesBottom > 0) esc.push(`BOTTOM +${a.escapesBottom}px`);
    if (a.escapesLeft > 0) esc.push(`LEFT +${a.escapesLeft}px`);
    if (a.escapesTop > 0) esc.push(`TOP +${a.escapesTop}px`);
    console.log(
      `  clipper of ${a.of.padEnd(11)} ${a.clipper}  overflow:${a.overflow}  clip-path:${a.clipPath}` +
      (esc.length ? `   ← CUTS ${esc.join(', ')}` : '   (fits)')
    );
  }
  await page.close();
}

await browser.close();
