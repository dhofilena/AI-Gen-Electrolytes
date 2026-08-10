#!/usr/bin/env node
/* Reset one asset so `media.mjs submit` regenerates it.
   Usage: node tools/reset-asset.mjs <name> ["new prompt"] */

import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'tools', 'media.manifest.json');

const [name, newPrompt] = process.argv.slice(2);
if (!name) {
  console.error('usage: node tools/reset-asset.mjs <name> ["new prompt"]');
  process.exit(1);
}

const m = JSON.parse(await readFile(MANIFEST, 'utf8'));
const a = m.assets.find((x) => x.name === name);
if (!a) {
  console.error(`no asset named "${name}"`);
  process.exit(1);
}

a.jobId = null;
a.done = false;
delete a.file;
delete a.error;
/* Must clear this too, or the freshly downloaded render inherits the previous
   take's "already optimized" flag and ships uncompressed with a stale poster. */
delete a.optimized;
if (newPrompt && newPrompt !== '--fast') a.prompt = newPrompt;

/* --fast: seedance 'std' at 1080p has been queueing for hours on some jobs.
   'fast' mode caps at 720p, which is fine for background film that sits
   under a scrim anyway, and returns in minutes. */
if (process.argv.includes('--fast') && a.params) {
  a.params.mode = 'fast';
  a.params.resolution = '720p';
}

await writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');

/* Clear derived files so the optimizer reprocesses the new render.
   OneDrive holds transient locks on files in this tree, so a failed unlink
   must not abort the reset — the manifest is already saved by this point
   and the job would otherwise be resubmitted without its cleanup. */
for (const f of [
  path.join(ROOT, 'public', 'media', '_raw', `${name}.mp4`),
  path.join(ROOT, 'public', 'media', `${name}.jpg`),
]) {
  try {
    await rm(f, { force: true });
  } catch (e) {
    console.warn(`  ! could not remove ${path.basename(f)} (${e.code}) — remove it by hand or the optimizer will skip this asset`);
  }
}

const changed = newPrompt && newPrompt !== '--fast';
const fast = process.argv.includes('--fast');
console.log(`${name}: reset${changed ? ' with new prompt' : ''}${fast ? ' (fast/720p)' : ''}`);
