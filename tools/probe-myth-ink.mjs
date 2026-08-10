#!/usr/bin/env node
/* Does the 98% stat's INK escape its mask, and at which viewports?

   Box geometry says it fits; the client sees it chopped. Boxes are the wrong
   unit here — two separate effects push PAINT outside a box that measures fine:

     vertical    --lh-mega is 0.84, so the line box is ~16% shorter than the
                 font's em box and the glyph ink hangs out top and bottom.
     horizontal  --ls-mega is -0.045em, and letter-spacing is applied AFTER the
                 last character too. The advance box of the trailing "%" is
                 therefore ~0.045em narrower than the glyph actually paints.

   Both get clipped by `overflow: hidden` on .myth__stat-mask. So measure the
   ink: read the real font metrics out of canvas TextMetrics, reconstruct the
   baseline from the line box, and compare every painted edge with the clip rect.

   Runs a viewport ladder because --myth-mega derives from BOTH the content row
   width and svh, so the numeral grows with the window while nothing else does.

   NB the selectors below are the real ones: .myth__stat-n / .myth__stat-u. An
   earlier revision of this probe queried [data-statnum] and .myth__statunit,
   which have never existed in myth.js — it reported "no box overflow" at every
   viewport because it was measuring nothing. If this probe ever goes quiet,
   check that it still resolves its nodes before believing it. */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'build-notes', 'shots', 'mythink');
await mkdir(OUT, { recursive: true });

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1680, height: 1050 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 1920, height: 1200 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
];

const browser = await chromium.launch();
let failures = 0;

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2400);

  /* Park by ScrollTrigger PROGRESS, not by a fraction of the section.

     The section's scroll height includes the pin spacer, so "50% down #myth"
     lands mid-scrub with .myth__stat-in still translated down by the reveal —
     measuring there reports the animation itself as a clipping bug, which is
     what the previous revision of this probe was doing. The lockup lands at
     7.7/10 of the timeline, so past ~0.85 is the resting composition. Below
     861px there is no pin and no scrub, so centre the stat instead. */
  const parked = await page.evaluate((target) => {
    const ST = window.ScrollTrigger;
    const stat = document.querySelector('#myth .myth__stat');
    if (!stat) return null;
    const goto = (y) => {
      const l = window.__lenis;
      if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    };
    const st = ST && ST.getAll().find((t) => t.pin && t.trigger && t.trigger.closest('#myth'));
    if (st) {
      goto(st.start + (st.end - st.start) * target);
      return { mode: `progress ${target}` };
    }
    const r = stat.getBoundingClientRect();
    goto(r.top + window.scrollY - (innerHeight - r.height) / 2);
    return { mode: 'flat' };
  }, 0.93);
  if (!parked) { console.log(`${vp.width}x${vp.height}  stat not found`); await page.close(); continue; }
  await page.waitForTimeout(1900);

  /* Do not believe any measurement taken before the reveal has settled. */
  const settled = await page.evaluate(() => {
    const inner = document.querySelector('#myth .myth__stat-in');
    const m = new DOMMatrixReadOnly(getComputedStyle(inner).transform);
    return { ty: Math.round(m.f * 10) / 10 };
  });
  if (Math.abs(settled.ty) > 1) {
    console.log(`${vp.width}x${vp.height}  reveal not settled (translateY ${settled.ty}px) — not measured`);
    failures++;
    await page.close();
    continue;
  }

  const geo = await page.evaluate(() => {
    const pick = (s) => document.querySelector('#myth ' + s);
    const mask = pick('.myth__stat-mask');
    const num = pick('.myth__stat-n');
    const unit = pick('.myth__stat-u');
    if (!mask || !num || !unit) {
      return { error: `missing node: mask=${!!mask} num=${!!num} unit=${!!unit}` };
    }

    /* Painted extents of one run, in viewport coordinates.

       TextMetrics' fontBoundingBox* fields are not trustworthy here — they put
       the reconstructed baseline ~280px below where it actually sits at this
       size. So take two independent ground truths instead:

         baseline  an empty zero-size inline-block appended to the run. Its
                   bottom edge sits ON the baseline by definition of
                   vertical-align: baseline, so its rect gives us the real one.
         ink       redraw the same string into an offscreen canvas at the same
                   font and letter-spacing, then scan the pixels. Whatever the
                   font actually paints is what we measure — no metrics
                   involved, and it captures the letter-spacing overhang that
                   actualBoundingBoxRight ignores. */
    const ink = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const text = (el.textContent || '').trim();
      const fontSize = parseFloat(cs.fontSize);

      // --- real baseline, via a strut ---
      const strut = document.createElement('span');
      strut.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0';
      el.appendChild(strut);
      const baseline = strut.getBoundingClientRect().bottom;
      strut.remove();

      // --- real ink, via pixels ---
      const pad = Math.ceil(fontSize);
      const c = document.createElement('canvas');
      c.width = Math.ceil(r.width) + pad * 2;
      c.height = Math.ceil(fontSize * 2.5);
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff';
      const originX = pad;
      const originY = Math.round(fontSize * 1.6);
      ctx.fillText(text, originX, originY);

      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (px[(y * c.width + x) * 4 + 3] > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const hasInk = minX !== Infinity;

      return {
        text,
        fontSize,
        lineHeight: parseFloat(cs.lineHeight) || r.height,
        box: { l: r.left, r: r.right, t: r.top, b: r.bottom },
        // canvas origin maps to (content-box left, baseline) on the page
        inkLeft: hasInk ? r.left + (minX - originX) : r.left,
        inkRight: hasInk ? r.left + (maxX - originX) : r.right,
        inkTop: hasInk ? baseline + (minY - originY) : r.top,
        inkBottom: hasInk ? baseline + (maxY - originY) : r.bottom,
        letterSpacing: cs.letterSpacing,
      };
    };

    const mr = mask.getBoundingClientRect();
    return {
      mask: { l: mr.left, r: mr.right, t: mr.top, b: mr.bottom },
      maskOverflow: getComputedStyle(mask).overflow,
      num: ink(num),
      unit: ink(unit),
    };
  });

  const name = `${vp.width}x${vp.height}`;
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });

  if (geo.error) {
    console.log(`${name.padEnd(11)} PROBE BROKEN — ${geo.error}`);
    failures++;
    await page.close();
    continue;
  }

  const px = (n) => Math.round(n * 10) / 10;
  const cuts = [];
  const check = (run, label) => {
    if (run.inkTop < geo.mask.t) cuts.push(`${label} TOP -${px(geo.mask.t - run.inkTop)}px`);
    if (run.inkBottom > geo.mask.b) cuts.push(`${label} BOTTOM +${px(run.inkBottom - geo.mask.b)}px`);
    if (run.inkRight > geo.mask.r) cuts.push(`${label} RIGHT +${px(run.inkRight - geo.mask.r)}px`);
    if (run.inkLeft < geo.mask.l) cuts.push(`${label} LEFT -${px(geo.mask.l - run.inkLeft)}px`);
  };
  check(geo.num, 'digits');
  check(geo.unit, 'percent');
  if (cuts.length) failures++;

  console.log(
    `${name.padEnd(11)} ${parked.mode}  fs ${px(geo.num.fontSize)}/lh ${px(geo.num.lineHeight)} ls ${geo.num.letterSpacing}  ` +
    `mask ${px(geo.mask.l)}..${px(geo.mask.r)} x ${px(geo.mask.t)}..${px(geo.mask.b)}\n` +
    `            digits ink ${px(geo.num.inkLeft)}..${px(geo.num.inkRight)} x ${px(geo.num.inkTop)}..${px(geo.num.inkBottom)}   ` +
    `percent ink ${px(geo.unit.inkLeft)}..${px(geo.unit.inkRight)} x ${px(geo.unit.inkTop)}..${px(geo.unit.inkBottom)}\n` +
    `            ${cuts.length ? '← CLIPPED  ' + cuts.join(', ') : 'ink clears the mask on every edge'}`
  );

  /* The other half of the trade: padding lives INSIDE the clip region, so
     widening it lowers the edge the lockup has to start below. If the hidden
     yPercent in myth.js no longer clears mask height + padding, the numeral
     peeks under the accent rule before its beat. statIn runs 6.3 -> 7.7 of 10,
     so at progress 0.58 nothing of it may be painted. */
  if (parked.mode.startsWith('progress')) {
    await page.evaluate((target) => {
      const ST = window.ScrollTrigger;
      const st = ST.getAll().find((t) => t.pin && t.trigger && t.trigger.closest('#myth'));
      const y = st.start + (st.end - st.start) * target;
      const l = window.__lenis;
      if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
    }, 0.58);
    await page.waitForTimeout(1500);

    const peek = await page.evaluate(() => {
      const mask = document.querySelector('#myth .myth__stat-mask');
      const inner = document.querySelector('#myth .myth__stat-in');
      const mr = mask.getBoundingClientRect();
      const ir = inner.getBoundingClientRect();
      // how far the lockup's top edge sits below the clip region's bottom
      return Math.round((ir.top - mr.bottom) * 10) / 10;
    });
    if (peek < 0) {
      console.log(`            ← PEEKS  lockup is ${-peek}px inside the clip region before its beat`);
      failures++;
    }
  }

  await page.close();
}

await browser.close();
console.log(`\ncaptures in build-notes/shots/mythink/  —  ${failures ? failures + ' viewport(s) clipping' : 'all clear'}`);
process.exit(failures ? 1 : 0);
