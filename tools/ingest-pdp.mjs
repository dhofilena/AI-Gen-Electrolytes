#!/usr/bin/env node
/* List whatever is sitting in public/img/_inbox so the images can be
   identified and renamed into their gallery slots.

     node tools/ingest-pdp.mjs                 # list what is waiting
     node tools/ingest-pdp.mjs <file> <slot>   # move one into place

   Slots: facts | missing | natural | dissolves | daypart
   The gallery reads /img/pdp-<slot>.<ext>; nothing else needs changing. */

import { readdir, rename, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const INBOX = path.join(ROOT, 'public', 'img', '_inbox');
const IMG = path.join(ROOT, 'public', 'img');

const SLOTS = {
  facts: 'Supplement Facts panel',
  missing: "What your hydration's been missing (3:1 / 5 / 4 / 9+)",
  natural: 'Nothing artificial. Nothing unnecessary.',
  dissolves: 'Dissolves quickly',
  daypart: 'Hydration for every part of your day',
};

await mkdir(INBOX, { recursive: true });
const [file, slot] = process.argv.slice(2);

if (file && slot) {
  if (!SLOTS[slot]) {
    console.error(`unknown slot "${slot}". Use one of: ${Object.keys(SLOTS).join(', ')}`);
    process.exit(1);
  }
  const src = path.isAbsolute(file) ? file : path.join(INBOX, file);
  if (!existsSync(src)) { console.error(`not found: ${src}`); process.exit(1); }
  const ext = path.extname(src).toLowerCase() || '.png';
  const dest = path.join(IMG, `pdp-${slot}${ext}`);
  await rename(src, dest);
  console.log(`${path.basename(src)} -> ${path.relative(ROOT, dest)}  (${SLOTS[slot]})`);
  process.exit(0);
}

const files = (await readdir(INBOX)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
if (!files.length) {
  console.log('inbox is empty — drop the five images into public/img/_inbox/');
} else {
  console.log(`${files.length} file(s) waiting in public/img/_inbox:\n`);
  for (const f of files) {
    const s = await stat(path.join(INBOX, f));
    console.log(`  ${f.padEnd(46)} ${Math.round(s.size / 1024)} KB`);
  }
  console.log('\nslots:');
  for (const [k, v] of Object.entries(SLOTS)) console.log(`  ${k.padEnd(10)} ${v}`);
}

console.log('\nalready in place:');
const live = (await readdir(IMG)).filter((f) => /^pdp-/.test(f));
console.log(live.length ? '  ' + live.join('\n  ') : '  (none of the client PDP graphics yet)');
