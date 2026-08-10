#!/usr/bin/env node
/* Composite the REAL packet artwork onto a generated plume background.

   The packet is the client's own transparent PNG, overlaid pixel-exact — no
   model touches the label, so the packaging, logo, claim strip and net-weight
   line are guaranteed identical to what ships. A grounded, blurred silhouette
   goes down first so the packet sits in the scene rather than pasted on it.

   Output: public/media/shot-<flavour>.png   (what #offer renders)
   Usage:  node tools/compose-shots.mjs [flavour ...]
*/

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stat, open } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

/* ffmpeg-static ships ffmpeg only — there is no ffprobe binary beside it.
   A PNG's dimensions live in the IHDR chunk at a fixed offset, so read them
   straight out of the header rather than adding a dependency for it. */
async function pngSize(file) {
  const fh = await open(file, 'r');
  try {
    const buf = Buffer.alloc(24);
    await fh.read(buf, 0, 24, 0);
    if (buf.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`not a PNG: ${file}`);
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } finally {
    await fh.close();
  }
}

const exec = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const MEDIA = path.join(ROOT, 'public', 'media');
const IMG = path.join(ROOT, 'public', 'img');

const FLAVOURS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['berry', 'lemonade', 'tropical'];

/* Packet height as a share of frame height. 0.62 leaves the plume room to
   read above and below without the packet looking lost. */
const H = 0.62;

for (const id of FLAVOURS) {
  const bg = path.join(MEDIA, `plume-${id}.png`);
  const pk = path.join(IMG, `packet-${id}.png`);
  const out = path.join(MEDIA, `shot-${id}.png`);

  if (!existsSync(bg)) { console.log(`${id.padEnd(10)} no plume-${id}.png yet — skipped`); continue; }
  if (!existsSync(pk)) { console.log(`${id.padEnd(10)} no packet-${id}.png — skipped`); continue; }

  /* [1] packet scaled to H of frame height
     [sh] a black, blurred, semi-transparent copy offset down = contact shadow
     then packet over shadow over plume, both centred */
  const filter =
    `[1:v]scale=-1:ih*0+H_PLACEHOLDER:flags=lanczos[pk];` +
    `[pk]split=2[pk1][pk2];` +
    `[pk2]colorchannelmixer=rr=0:rg=0:rb=0:gr=0:gg=0:gb=0:br=0:bg=0:bb=0,` +
    `format=rgba,colorchannelmixer=aa=0.55,gblur=sigma=26[sh];` +
    `[0:v][sh]overlay=x=(W-w)/2:y=(H-h)/2+26:format=auto[bgs];` +
    `[bgs][pk1]overlay=x=(W-w)/2:y=(H-h)/2:format=auto`;

  // resolve the packet height in px from the background's real height
  const { height: bh } = await pngSize(bg);
  const pkH = Math.round(bh * H);

  await exec(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error',
    '-i', bg, '-i', pk,
    '-filter_complex', filter.replace('H_PLACEHOLDER', String(pkH)),
    '-frames:v', '1', '-y', out,
  ]);

  const kb = Math.round((await stat(out)).size / 1024);
  console.log(`${id.padEnd(10)} composed -> shot-${id}.png  (${kb} KB, packet ${pkH}px tall)`);
}

console.log('\ndone. Packet artwork is the client PNG, unmodified.');
