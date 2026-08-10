#!/usr/bin/env node
/* Post-process Higgsfield renders for the web:
     - extract a poster JPG (so video never flashes empty)
     - re-encode to a sane web bitrate with faststart
   Idempotent: skips anything already processed. Originals kept in _raw/. */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, mkdir, rename, stat, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

/* Headless Chromium (the capture harness) and OneDrive both take transient
   locks on files in this tree. A single EPERM used to abort the whole run and,
   worse, "already optimized" was inferred from the existence of the _raw copy —
   so a half-finished asset looked done forever. Retry, and track state
   explicitly in the manifest instead. */
async function withRetry(fn, label, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
}

const exec = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const MEDIA = path.join(ROOT, 'public', 'media');
const RAW = path.join(MEDIA, '_raw');

const mb = (b) => (b / 1024 / 1024).toFixed(2);

async function run(args) {
  return exec(ffmpegPath, ['-hide_banner', '-loglevel', 'error', ...args], {
    maxBuffer: 32 * 1024 * 1024,
  });
}

const MANIFEST = path.join(ROOT, 'tools', 'media.manifest.json');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const assetOf = (name) => manifest.assets.find((a) => a.name === name);
const saveManifest = () => writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

const files = (await readdir(MEDIA)).filter((f) => f.endsWith('.mp4'));
await mkdir(RAW, { recursive: true });

let skipped = 0;
for (const f of files) {
 try {
  const src = path.join(MEDIA, f);
  const base = f.replace(/\.mp4$/, '');
  const poster = path.join(MEDIA, `${base}.jpg`);
  const rawCopy = path.join(RAW, f);
  const asset = assetOf(base);

  if (asset?.optimized) {
    console.log(`${base.padEnd(20)} already optimized`);
    continue;
  }

  const before = (await stat(src)).size;

  // Poster from ~30% in — past the black first frame, into the action.
  if (!existsSync(poster)) {
    const { stdout } = await exec(
      ffmpegPath.replace(/ffmpeg(\.exe)?$/, (m) => m.replace('ffmpeg', 'ffprobe')),
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]
    ).catch(() => ({ stdout: '5' }));
    const dur = parseFloat(stdout) || 5;
    await run(['-ss', String(dur * 0.3), '-i', src, '-frames:v', '1', '-q:v', '4', '-y', poster]);
  }

  // Keep the original, write an optimized version in its place.
  if (existsSync(rawCopy)) {
    // Stale raw from a previous run of this asset; make room for the new one.
    await withRetry(() => rename(rawCopy, rawCopy + '.old'), 'clear stale raw').catch(() => {});
  }
  await withRetry(() => rename(src, rawCopy), 'stash original');
  await run([
    '-i', rawCopy,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
    '-pix_fmt', 'yuv420p',
    '-vf', "scale='min(1920,iw)':-2",
    '-movflags', '+faststart',
    '-an',
    '-y', src,
  ]);

  const after = (await stat(src)).size;
  if (asset) { asset.optimized = true; await saveManifest(); }
  console.log(`${base.padEnd(20)} ${mb(before)}MB -> ${mb(after)}MB  + poster`);
 } catch (e) {
  /* A locked file (Chromium mid-capture, OneDrive sync) must not abort the
     batch — the asset stays unoptimized and gets picked up on the next run. */
  skipped++;
  console.log(`${f.padEnd(24)} SKIPPED — ${e.code || e.message.split('\n')[0]}`);
 }
}

console.log(`\ndone.${skipped ? ` ${skipped} skipped (locked) — re-run once captures finish.` : ''}`);
