#!/usr/bin/env node
/* Read every price the #offer section actually renders, one-time and
   subscribed, and check each against the client's published figures.

   A struck price that does not match the price beside it is worse than no
   struck price at all, so this asserts the rendered DOM rather than the model. */

import { chromium } from 'playwright';

const EXPECT = {
  once: {
    5: { was: '$124.95', now: '$99.96', per: '$19.99', save: 'Save 20%' },
    3: { was: '$74.97', now: '$63.72', per: '$21.24', save: 'Save 15%' },
    1: { was: null, now: '$24.99', per: '$24.99', save: '' },
  },
  sub: {
    5: { was: '$124.95', now: '$84.97', per: '$16.99', save: 'Save 32%' },
    3: { was: '$74.97', now: '$54.73', per: '$18.24', save: 'Save 27%' },
    1: { was: '$24.99', now: '$21.99', per: '$21.99', save: 'Save 12%' },
  },
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
await page.waitForTimeout(2200);

const read = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('#offer .offer__tier')].map((r) => {
      const t = (sel) => {
        const n = r.querySelector(sel);
        if (!n) return null;
        if (n.hidden) return null;
        return n.textContent.replace(/Regular price|Your price/g, '').trim();
      };
      return {
        qty: Number(r.dataset.qty),
        was: t('[data-was]'),
        now: t('[data-now]'),
        per: t('[data-perbox]'),
        perWas: t('[data-perwas]'),
        save: (r.querySelector('[data-save]')?.textContent || '').trim(),
        on: r.classList.contains('is-on'),
      };
    })
  );

let fails = 0;
for (const plan of ['once', 'sub']) {
  if (plan === 'sub') {
    await page.click('#offer .offer__sub');
    await page.waitForTimeout(900);
  }
  const rows = await read();
  console.log(`\n--- ${plan === 'once' ? 'ONE-TIME' : 'SUBSCRIBED'} ---`);
  for (const r of rows) {
    const e = EXPECT[plan][r.qty];
    const ok =
      r.now === e.now && r.per === e.per && r.save === e.save && r.was === e.was;
    if (!ok) fails++;
    console.log(
      `  ${r.qty} box  was=${String(r.was).padEnd(8)} now=${String(r.now).padEnd(8)} ` +
      `per=${String(r.per).padEnd(8)} ${r.save.padEnd(9)} ${ok ? 'ok' : `← expected was=${e.was} now=${e.now} per=${e.per} "${e.save}"`}`
    );
  }
}

const ctaPrice = await page.$eval('#offer [data-ctaprice]', (n) => n.textContent.trim()).catch(() => null);
console.log(`\nCTA price (3-box subscribed): ${ctaPrice} ${ctaPrice === '$54.73' ? 'ok' : '← expected $54.73'}`);
if (ctaPrice !== '$54.73') fails++;

console.log(errs.length ? `page errors: ${errs.join(' | ')}` : 'page errors: none');
console.log(fails ? `\n${fails} mismatch(es).` : '\nevery rendered price matches the published figures.');
await browser.close();
