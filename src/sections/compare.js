/* ============================================================
   COMPARE — the head-to-head spec table.
   A real <table> (caption, scoped headers, explicit ARIA roles so
   the semantics survive the mobile card re-layout), animated as a
   piece of scrolled data: each line resolves as it enters.

   TWO honesty rules are enforced here.

   1. ONE SCALE. Every bar on a line is a fraction of the SAME track —
      `--cmp-plot`, measured in JS from the NARROWEST data cell and
      written once on the section. Bars used to be a percentage of
      their own cell, and the "us" column is deliberately wider, so a
      losing 5 drew 160px against the winner's 140px. Length is the
      dominant visual channel; it now means exactly one thing.

   2. `better: 'low'` rows (sodium) invert. Bar LENGTH is always the
      listed amount, but low-is-better bars run right-to-left and are
      ticked rather than solid, and the "best on this line" emphasis
      follows `better`, so LMNT's 1000mg sodium is never dressed up
      as a win.

   Emphasis discipline: the us column carries exactly ONE accent
   device — the rule capping its head. No wash, no verticals.
   ============================================================ */

import { gsap, ScrollTrigger, prefersReducedMotion } from '../lib/scroll.js';
import { revealLines, revealRise, countUp, onResize, START, EASE, EASE_MASK, DUR } from '../lib/reveal.js';
import { comparison } from '../data/content.js';

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* `{token}` → value. Keeps counted copy in content.js instead of the template. */
const fill = (tpl, vars) =>
  String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

export default function mount(root) {
  const { rows, brands, copy } = comparison;
  if (!rows?.length || !brands?.length || !copy) return;

  /* ---------- derive per-line facts from the data (never hand-typed) ---------- */
  const meta = rows.map((row) => {
    if (row.better === 'bool') {
      const yes = brands.filter((b) => b[row.key] === true).length;
      return {
        bool: true,
        caption: fill(copy.dirBool, { yes, total: brands.length }),
        max: 0,
        best: null,
        digits: 1,
      };
    }
    const vals = brands.map((b) => Number(b[row.key]));
    const max = Math.max(...vals);
    const best = row.better === 'low' ? Math.min(...vals) : max;
    /* Widest figure on the line sets the numeral slot, so 1000 and 55 end
       on one axis and their units start on another. Tabular figures make
       the slot exact. */
    const digits = brands.reduce((n, b) => Math.max(n, String(b[row.key]).length), 1);
    return {
      bool: false,
      caption: row.better === 'low' ? copy.dirLow : copy.dirHigh,
      max,
      best,
      digits,
    };
  });

  /* Unitless 0–1 ratio, resolved to pixels in CSS against the shared track. */
  const ratio = (v, max) => (max > 0 ? v / max : 0);

  /* ---------- head ---------- */
  const headHtml = `
    <header class="cmp__head">
      <p class="t-eyebrow cmp__eyebrow">${esc(copy.eyebrow)}</p>
      <h2 class="t-h1 cmp__title">${esc(copy.headline)}</h2>
      <p class="t-body cmp__lead">${esc(
        fill(copy.lead, { metrics: rows.length, labels: brands.length })
      )}</p>
    </header>`;

  /* ---------- table head ---------- */
  const theadHtml = `
    <thead role="rowgroup">
      <tr role="row">
        <th scope="col" role="columnheader" class="cmp__corner">${esc(copy.corner)}</th>
        ${brands
          .map(
            (b) =>
              `<th scope="col" role="columnheader" class="cmp__brand${b.us ? ' cmp__brand--us' : ''}">
                 ${b.us ? '<span class="cmp__rule" aria-hidden="true"></span>' : ''}
                 <span class="cmp__brand-name">${esc(b.name)}</span>
               </th>`
          )
          .join('')}
      </tr>
    </thead>`;

  /* ---------- body ---------- */
  const tbodyHtml = `
    <tbody role="rowgroup">
      ${rows
        .map((row, ri) => {
          const m = meta[ri];
          const mod =
            row.better === 'low' ? ' cmp__row--low' : m.bool ? ' cmp__row--bool' : '';

          const cells = brands
            .map((b) => {
              const v = b[row.key];
              const isUs = !!b.us;
              const isBest = m.bool ? v === true : Number(v) === m.best;
              const cls = [
                'cmp__cell',
                isUs ? 'cmp__cell--us' : '',
                isBest ? 'cmp__cell--lead' : '',
                m.bool ? 'cmp__cell--bool' : '',
              ]
                .filter(Boolean)
                .join(' ');

              if (m.bool) {
                const inner = v
                  ? `<span class="cmp__mark"><svg class="cmp__check" viewBox="0 0 16 12" width="16" height="12" aria-hidden="true" focusable="false"><path d="M1 6.2 L5.7 10.9 L15 1.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg></span>`
                  : `<span class="cmp__mark"><span class="cmp__dash"></span></span>`;
                return `<td role="cell" class="${cls}" data-brand="${esc(b.name)}">
                    <span class="u-sr">${v ? 'Yes' : 'No'}</span>
                    <span aria-hidden="true">${inner}</span>
                  </td>`;
              }

              /* --r is the amount as a fraction of the line's highest figure.
                 It becomes a length only against --cmp-plot, which is one
                 shared track for the whole table — see measurePlot(). */
              const r = ratio(Number(v), m.max).toFixed(4);
              const srUnit = row.unit ? ` ${row.unit}` : '';
              const srBest = isBest ? ', best on this line' : '';
              return `<td role="cell" class="${cls}" data-brand="${esc(b.name)}">
                  <span class="u-sr">${v}${srUnit}${srBest}</span>
                  <span class="cmp__figure" aria-hidden="true">
                    <span class="cmp__val num" data-to="${v}">${v}</span>${
                row.unit ? `<span class="cmp__unit">${esc(row.unit)}</span>` : ''
              }
                  </span>
                  <span class="cmp__bar" aria-hidden="true"><span class="cmp__fill" style="--r:${r}"></span></span>
                </td>`;
            })
            .join('');

          return `
            <tr role="row" class="cmp__row${mod}" style="--digits:${m.digits}">
              <th scope="row" role="rowheader" class="cmp__metric">
                <span class="cmp__metric-name">${esc(row.label)}</span>
                <span class="cmp__metric-dir">${esc(m.caption)}</span>
              </th>
              ${cells}
            </tr>`;
        })
        .join('')}
    </tbody>`;

  /* ---------- foot ---------- */
  const footHtml = `
    <footer class="cmp__foot">
      <ul class="cmp__legend">
        <li class="cmp__legend-item">
          <span class="cmp__key cmp__key--solid" aria-hidden="true"></span>
          ${esc(copy.legendScale)}
        </li>
        <li class="cmp__legend-item">
          <span class="cmp__key cmp__key--tick" aria-hidden="true"></span>
          ${esc(copy.legendTicked)}
        </li>
      </ul>
      <p class="cmp__note t-micro">${esc(copy.note)}</p>
    </footer>`;

  root.innerHTML = `
    <div class="wrap cmp__wrap">
      ${headHtml}
      <div class="cmp__tablewrap">
        <table class="cmp__table" role="table">
          <caption class="cmp__caption">${esc(copy.caption)}</caption>
          <colgroup>
            <col class="cmp__c-metric" />
            <col class="cmp__c-us" />
            <col span="${brands.length - 1}" />
          </colgroup>
          ${theadHtml}
          ${tbodyHtml}
        </table>
      </div>
      ${footHtml}
    </div>`;

  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];

  /* GSAP warns "target not found" on an empty list, and a spec table has
     rows with no bars and rows with no checkmarks by construction. Never
     hand it a list without checking it first. */
  const set = (els, vars) => (els.length ? gsap.set(els, vars) : null);
  const add = (tl, els, vars, at) => (els.length ? tl.to(els, vars, at) : tl);

  /* ============================================================
     ONE SHARED PIXEL SCALE
     The us column is wider than the field for typographic emphasis.
     That must not reach the chart: every fill is measured against the
     NARROWEST data cell, shrunk by --cmp-plot-scale so a line's leader
     draws a bar rather than a full-width rule.
     ============================================================ */

  const dataCells = qa('.cmp__cell');

  function measurePlot() {
    if (!dataCells.length) return;
    let min = Infinity;
    for (const cell of dataCells) {
      const cs = getComputedStyle(cell);
      const inner =
        cell.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      if (inner > 0 && inner < min) min = inner;
    }
    if (!Number.isFinite(min)) return;
    const scale = parseFloat(getComputedStyle(root).getPropertyValue('--cmp-plot-scale')) || 1;
    root.style.setProperty('--cmp-plot', `${Math.round(min * scale)}px`);
  }

  measurePlot();
  if (document.fonts?.ready) document.fonts.ready.then(measurePlot);
  onResize(measurePlot);
  ScrollTrigger.addEventListener('refresh', measurePlot);

  /* ============================================================
     CHOREOGRAPHY
     ============================================================ */

  revealLines(q('.cmp__title'));
  revealRise([q('.cmp__eyebrow'), q('.cmp__lead')].filter(Boolean), {
    triggerEl: q('.cmp__head'),
    distance: 22,
    delay: 0.12,
  });

  const tableWrap = q('.cmp__tablewrap');
  const rowEls = qa('.cmp__row');

  /* --- the one accent device: the rule capping the us column draws across --- */
  const rule = q('.cmp__rule');
  if (rule) {
    if (prefersReducedMotion) {
      gsap.set(rule, { scaleX: 1 });
    } else {
      gsap.fromTo(
        rule,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: DUR.slow,
          ease: EASE_MASK,
          scrollTrigger: { trigger: tableWrap, start: START, once: true },
        }
      );
    }
  }

  /* --- brand columns arrive --- */
  revealRise(qa('.cmp__brand-name'), {
    triggerEl: tableWrap,
    distance: 16,
    stagger: 0.055,
  });

  /* --- each metric line resolves as it enters, staggering down the table --- */
  rowEls.forEach((rowEl, i) => {
    const figures = [...rowEl.querySelectorAll('.cmp__figure, .cmp__mark')];
    const fills = [...rowEl.querySelectorAll('.cmp__fill')];
    const strokes = [...rowEl.querySelectorAll('.cmp__check path')];
    const dashes = [...rowEl.querySelectorAll('.cmp__dash')];

    // Counters share the row's trigger so a line lands as one unit.
    rowEl.querySelectorAll('.cmp__val[data-to]').forEach((el) => {
      const to = Number(el.dataset.to);
      countUp(el, to, {
        triggerEl: rowEl,
        start: START,
        duration: to >= 100 ? DUR.slow : DUR.mid,
      });
    });

    if (prefersReducedMotion) {
      set(fills, { scaleX: 1 });
      set(dashes, { scaleX: 1 });
      set(strokes, { attr: { 'stroke-dashoffset': 0 } });
      return;
    }

    set(figures, { y: 16, opacity: 0 });
    set(fills, { scaleX: 0 });
    set(dashes, { scaleX: 0 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: rowEl, start: START, once: true },
      delay: Math.min(i, 6) * 0.05,
    });

    add(tl, figures, { y: 0, opacity: 1, duration: DUR.mid, ease: EASE, stagger: 0.055 }, 0);
    add(tl, fills, { scaleX: 1, duration: DUR.slow, ease: EASE, stagger: 0.055 }, 0.07);
    add(tl, dashes, { scaleX: 1, duration: DUR.mid, ease: EASE, stagger: 0.055 }, 0.07);
    add(tl, strokes, { attr: { 'stroke-dashoffset': 0 }, duration: DUR.slow, ease: EASE }, 0.14);
  });

  /* --- footnote --- */
  revealRise(qa('.cmp__legend-item, .cmp__note'), {
    triggerEl: q('.cmp__foot'),
    distance: 18,
    stagger: 0.06,
  });
}
