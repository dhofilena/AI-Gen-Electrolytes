#!/usr/bin/env node
/* Promote text-carrying uses of --fg-faint (alpha 0.34, ~2.0–2.5:1) to
   --fg-mute (~5.2:1+).

   The faint tier is documented in tokens.css as decorative-only, but it kept
   leaking onto real text. The worst case was #compare's direction legend:
   "LESS IS BETTER" at 2.06:1 is precisely the label that stops the sodium row
   being read as more-is-better, on the one section whose entire argument is
   that the numbers are legible and honest.

   Only TEXT colours are promoted. Uses of --fg-faint for borders, rules and
   backgrounds are left alone — a hairline is genuinely ornament. */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const TARGETS = [
  // file, 1-indexed line, what it is
  ['src/styles/sections/compare.css', 131, 'table caption'],
  ['src/styles/sections/compare.css', 156, 'corner header cell'],
  ['src/styles/sections/compare.css', 221, 'direction legend (MORE/LESS IS BETTER)'],
  ['src/styles/sections/compare.css', 271, 'unit (mg)'],
  ['src/styles/sections/benefits.css', 166, 'ledger index numeral'],
  // Flavour configurator: a control's label must be readable when inactive.
  ['src/styles/sections/flavors.css', 323, 'flavour counter 01/03'],
  ['src/styles/sections/flavors.css', 450, 'tab numeral'],
  ['src/styles/sections/flavors.css', 460, 'tab label (inactive)'],
  // Science: these are CHART labels. An axis whose ticks and series names sit
  // at 2:1 is not a data visualisation, it is a picture of one.
  ['src/styles/sections/science.css', 245, 'axis tick labels 200/400/600'],
  ['src/styles/sections/science.css', 323, 'zone label (Outside)'],
  ['src/styles/sections/science.css', 509, 'series name (POTASSIUM / SODIUM)'],
];

const byFile = {};
for (const [f, line, what] of TARGETS) (byFile[f] ??= []).push([line, what]);

for (const [f, entries] of Object.entries(byFile)) {
  const p = path.join(ROOT, f);
  const lines = (await readFile(p, 'utf8')).split(/\r?\n/);
  let changed = 0;
  for (const [n, what] of entries) {
    const i = n - 1;
    if (!lines[i] || !lines[i].includes('--fg-faint')) {
      console.log(`  ${f}:${n} — no --fg-faint on that line, SKIPPED (${what})`);
      continue;
    }
    if (!/color\s*:/.test(lines[i])) {
      console.log(`  ${f}:${n} — not a color declaration, SKIPPED (${what})`);
      continue;
    }
    lines[i] = lines[i].replace('--fg-faint', '--fg-mute');
    changed++;
    console.log(`  ${f}:${n} — promoted (${what})`);
  }
  if (changed) await writeFile(p, lines.join('\n'));
}

console.log('\ndone.');
