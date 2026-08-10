#!/usr/bin/env node
/* Queue three plume-only BACKGROUNDS — no packet in frame.

   Why not let the model place the packet: asked to reproduce the real
   packaging it garbled the claim strip, rendering "NO ARTIFICIAL SLEETENERS"
   for SWEETENERS. Any re-lettering of a real supplement label is invented
   packaging, so the packet is composited in afterwards from the client's own
   transparent PNG (tools/compose-shots.mjs) and is therefore pixel-exact.

   These frames need a clear vertical corridor down the middle for it to land in. */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'tools', 'media.manifest.json');
const m = JSON.parse(await readFile(MANIFEST, 'utf8'));

const scene = (colour) =>
  `Cinematic macro photograph: a billowing plume of ${colour} powder bursting and dissolving through clear water against a deep near-black void, backlit by a hard rim light so the powder blooms with volumetric light and fine bubbles drift upward. The plume spreads to the left and right of frame, leaving a clear empty vertical corridor of dark negative space down the centre of the image. Dramatic chiaroscuro, deep shadow, shallow depth of field, anamorphic, premium beverage campaign lighting. No product, no packaging, no bottle, no packet, no text, no logos, no hands, no people.`;

const FLAVOURS = [
  ['berry', 'deep magenta crimson berry-red'],
  ['lemonade', 'luminous pale lemon yellow'],
  ['tropical', 'warm coral peach and mango orange'],
];

let added = 0;
for (const [id, colour] of FLAVOURS) {
  const name = `plume-${id}`;
  if (m.assets.some((a) => a.name === name)) { console.log(`${name}: already present`); continue; }
  m.assets.push({
    name,
    kind: 'image',
    model: 'gpt_image_2',
    params: { aspect_ratio: '4:3', resolution: '2k' },
    prompt: scene(colour),
  });
  added++;
  console.log(`${name}: queued`);
}

await writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`\n${added} plume(s) added.`);
