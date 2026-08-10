#!/usr/bin/env node
/* One-off: mark assets whose _raw original already exists as optimized,
   so the new manifest-flag logic does not re-encode them (which would
   compound compression artifacts). Skips anything currently regenerating. */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'tools', 'media.manifest.json');
const m = JSON.parse(await readFile(MANIFEST, 'utf8'));

for (const a of m.assets) {
  if (a.kind !== 'video') continue;
  const raw = path.join(ROOT, 'public', 'media', '_raw', `${a.name}.mp4`);
  const live = path.join(ROOT, 'public', 'media', `${a.name}.mp4`);
  // Only if it is finished AND both the raw backup and the live file exist.
  if (a.done && existsSync(raw) && existsSync(live)) {
    a.optimized = true;
    console.log(`${a.name}: marked optimized`);
  } else if (!a.done) {
    delete a.optimized;
    console.log(`${a.name}: pending regeneration, flag cleared`);
  }
}

await writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log('done.');
