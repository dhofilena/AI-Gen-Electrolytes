#!/usr/bin/env node
/* ============================================================
   SEAM GAPS — the vertical rhythm of the whole page.

     node tools/check-seams.mjs [--mobile]

   Prints every run of >90px with no text and no non-background
   media in it, and names the boundary it falls across. Exists
   because nine section boundaries had nine different gaps
   (189/200/257/259/263/286/324/332/360px) and no screenshot of
   any single section could show it — only reading the numbers
   down the page does.

   Seams should land on the --seam-* ladder in tokens.css:
   ~135 tight / ~200 default / ~290 open, plus or minus the
   section's own internal headroom. Anything outside that set is
   a section that has invented its own idea of a top margin.

   NOTE: pinned/sticky sections (#myth, #science, #flavors) are
   measured at scroll 0, so their four-figure "gaps" are pin
   travel, not slack. Ignore those three rows.
   ============================================================ */
import { chromium } from 'playwright';
const MOBILE = process.argv.includes('--mobile');
const VIEW = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: VIEW, deviceScaleFactor: 1 });
await p.goto('http://localhost:5273', { waitUntil: 'networkidle', timeout: 60000 });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(3000);
await p.evaluate(async () => {
  const l = window.__lenis; const H = document.body.scrollHeight;
  for (let y = 0; y < H; y += 500) { l ? l.scrollTo(y, {immediate:true}) : window.scrollTo(0,y); await new Promise(r=>setTimeout(r,50)); }
});
await p.waitForTimeout(1200);
await p.evaluate(() => { const l = window.__lenis; l ? l.scrollTo(0,{immediate:true}) : window.scrollTo(0,0); });
await p.waitForTimeout(1200);

const data = await p.evaluate(() => {
  const ids = ['hero','myth','science','pillars','formula','flavors','ritual','compare','benefits','proof','offer','faq','footer'];
  const sy = window.scrollY;
  // collect ink intervals from TEXT only (plus non-fullbleed media)
  const iv = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue;
    const par = n.parentElement;
    if (!par || par.closest('.preloader, .nav, .u-sr')) continue;
    const cs = getComputedStyle(par);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.02) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    for (const rect of r.getClientRects()) {
      if (rect.height < 1) continue;
      iv.push([rect.top + sy, rect.bottom + sy]);
    }
  }
  // non-fullbleed visible media / rules
  document.querySelectorAll('img, video, svg, hr, canvas').forEach((el) => {
    if (el.closest('.preloader, .nav')) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.height < 1 || r.width < 1) return;
    if (r.width >= window.innerWidth * 0.98 && r.height >= window.innerHeight * 0.85) return; // full-bleed bg
    iv.push([r.top + sy, r.bottom + sy]);
  });
  iv.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [a, z] of iv) {
    if (merged.length && a <= merged[merged.length - 1][1] + 1) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], z);
    else merged.push([a, z]);
  }
  const secs = ids.map((id) => {
    const el = document.getElementById(id);
    const host = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
    const r = host.getBoundingClientRect();
    return { id, top: Math.round(r.top + sy), bottom: Math.round(r.bottom + sy), surface: el.dataset.surface };
  });
  // gaps > 90px
  const gaps = [];
  for (let i = 1; i < merged.length; i++) {
    const g = merged[i][0] - merged[i - 1][1];
    if (g > 90) gaps.push({ from: Math.round(merged[i-1][1]), to: Math.round(merged[i][0]), size: Math.round(g) });
  }
  return { secs, gaps, docH: document.body.scrollHeight };
});

const where = (y) => { const s = data.secs.find(s => y >= s.top && y < s.bottom); return s ? s.id : '?'; };
console.log('doc', data.docH, '\n');
console.log('SECTIONS'); data.secs.forEach(s => console.log(' ', s.id.padEnd(9), (s.surface||'').padEnd(6), String(s.top).padStart(6), '->', String(s.bottom).padStart(6), '  h='+(s.bottom-s.top)));
console.log('\nVERTICAL VOIDS > 90px (no text, no non-bg media)');
for (const g of data.gaps) {
  const a = where(g.from), z = where(g.to);
  const cross = a !== z ? `  <<< SEAM ${a} -> ${z}` : `  (inside ${a})`;
  console.log('  ', String(g.size).padStart(5) + 'px', String(g.from).padStart(6), '->', String(g.to).padStart(6), cross);
}
await b.close();
