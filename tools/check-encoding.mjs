#!/usr/bin/env node
/* Find UTF-8 text that was re-encoded as if it were Latin-1 (mojibake).

   PowerShell 5.1's `Set-Content -Encoding utf8` round-trips existing UTF-8
   bytes through the ANSI codepage, turning an em-dash into "â€”"
   and similar. That shipped a literal 'Demo build a€" this records your choice'
   into the offer section. Scan for the signature byte runs, and for a stray BOM.

   Usage: node tools/check-encoding.mjs [--fix]
*/

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FIX = process.argv.includes('--fix');

/* mojibake -> what it should have been */
const REPAIRS = [
  ['â€”', '—'], // em dash
  ['â€“', '–'], // en dash
  ['â€™', '’'], // right single quote
  ['â€œ', '“'], // left double quote
  ['â€', '”'], // right double quote
  ['â€¦', '…'], // ellipsis
  ['Ã©', 'é'],       // e-acute
  ['â†’', '→'], // right arrow
  ['Â·', '·'],      // middot
  ['Â»', '»'],
  ['Â«', '«'],
  ['Â ', ' '],  // non-breaking space
];

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (/\.(js|css|html|json|md)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = [
  ...(await walk(path.join(ROOT, 'src'))),
  ...(await walk(path.join(ROOT, 'tools'))),
  path.join(ROOT, 'index.html'),
];

let bad = 0;
for (const f of files) {
  let raw;
  try { raw = await readFile(f, 'utf8'); } catch { continue; }

  const hadBom = raw.charCodeAt(0) === 0xfeff;
  let text = hadBom ? raw.slice(1) : raw;

  const found = REPAIRS.filter(([m]) => text.includes(m));
  if (!found.length && !hadBom) continue;

  bad++;
  const rel = path.relative(ROOT, f);
  const parts = [];
  if (found.length) parts.push(found.map(([m, r]) => `${JSON.stringify(m)}->${JSON.stringify(r)}`).join(', '));
  if (hadBom) parts.push('BOM');
  console.log(`${rel.padEnd(42)} ${parts.join(' | ')}`);

  if (FIX) {
    for (const [m, r] of REPAIRS) text = text.split(m).join(r);
    await writeFile(f, text, 'utf8'); // node writes UTF-8 without BOM
  }
}

console.log(bad ? `\n${bad} file(s) ${FIX ? 'repaired' : 'affected — re-run with --fix'}` : '\nno encoding damage found.');
