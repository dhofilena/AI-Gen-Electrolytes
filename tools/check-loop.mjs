#!/usr/bin/env node
/* Proves seamlessLoop actually keeps a video PLAYING across its crossfade.
   The first implementation paused the wrong layer after each swap, so the
   hero was a frozen frame ~2/3 of every cycle while still looking "fine"
   in a single screenshot. Sample over time or you will not catch it. */

import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(process.env.SHOOT_URL || 'http://localhost:5273', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);

/* seamlessLoop only runs while its host is on screen, so a stationary sampler
   reports every offscreen section as "paused" — which is correct behaviour,
   not a bug. Scroll each host into view and sample it there. */
/* Look hosts up by their owning section id, re-querying every sample: a
   section re-rendering under HMR replaces its DOM, so any handle or data
   attribute captured up front goes stale mid-run. */
const ids = await page.evaluate(() =>
  [...document.querySelectorAll('.vloop')].map((h) => h.closest('[data-module]')?.id || '?')
);

const probe = (id) =>
  page.evaluate((sec) => {
    const h = document.querySelector(`#${sec} .vloop`);
    if (!h) return null;
    const ls = [...h.querySelectorAll('video')];
    if (!ls.length) return null;
    const vis = ls
      .map((v) => ({ o: +getComputedStyle(v).opacity, t: v.currentTime, paused: v.paused }))
      .sort((a, b) => b.o - a.o)[0];
    return { ...vis, sum: ls.reduce((s, v) => s + +getComputedStyle(v).opacity, 0) };
  }, id);

const byId = {};
for (const id of ids) {
  if (id === '?') continue;
  await page.evaluate((sec) => {
    const el = document.querySelector(`#${sec} .vloop`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.25;
    const l = window.__lenis;
    if (l) l.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  }, id);
  await page.waitForTimeout(1600);

  byId[id] = [];
  for (let i = 0; i < 14; i++) {
    const s = await probe(id);
    if (s) byId[id].push(s);
    await page.waitForTimeout(450);
  }
  if (!byId[id].length) delete byId[id];
}

let bad = 0;
for (const [id, rows] of Object.entries(byId)) {
  const stalls = rows.filter((r) => r.paused).length;
  const times = rows.map((r) => r.t);
  const advanced = times.some((t, i) => i > 0 && Math.abs(t - times[i - 1]) > 0.05);
  const sumOk = rows.every((r) => Math.abs(r.sum - 1) < 0.06);
  const ok = stalls === 0 && advanced && sumOk;
  if (!ok) bad++;
  console.log(
    `${id.padEnd(10)} visible-layer paused ${stalls}/${rows.length}  time advances: ${advanced}  opacity-sum≈1: ${sumOk}  ${ok ? 'OK' : '← FAIL'}`
  );
}

console.log(bad ? `\n${bad} looping section(s) failing.` : '\nall seamless loops healthy.');
await browser.close();
