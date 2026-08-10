#!/usr/bin/env node
/* Queue the three flavour hero shots, built FROM the real supplied packaging.

   The packet artwork is the client's real product. The prompt therefore says,
   emphatically, to reproduce it unchanged: an AI-redrawn label would be
   invented packaging on a regulated supplement page, which is the one thing
   this build has refused to do throughout. nano_banana_pro is the strongest
   reference-adherence model available here and costs 2 credits a frame. */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'tools', 'media.manifest.json');
const m = JSON.parse(await readFile(MANIFEST, 'utf8'));

const KEEP =
  'Reproduce the product packet exactly as in the reference image — identical packaging artwork, identical logo, identical wording, identical colours and proportions. Do not redesign, re-letter, translate, restyle or invent any part of the label. The packet must remain perfectly legible and undistorted.';

const SCENE = (colour) =>
  `Cinematic hero product photograph. The stick packet stands upright, floating in a deep near-black studio void. Behind and around it a billowing plume of ${colour} powder dissolves through clear water, catching a hard rim light from behind so the packet edge glows and the powder blooms with volumetric light. Fine bubbles drift upward. Dramatic chiaroscuro, deep shadow, shallow depth of field, anamorphic, premium supplement brand campaign, appetising and clean. No text, no captions, no watermark, no extra packaging, no hands, no people.`;

const FLAVOURS = [
  ['berry', 'deep magenta crimson berry'],
  ['lemonade', 'luminous pale lemon yellow'],
  ['tropical', 'warm coral peach and mango'],
];

let added = 0;
for (const [id, colour] of FLAVOURS) {
  const name = `shot-${id}`;
  if (m.assets.some((a) => a.name === name)) {
    console.log(`${name}: already present, skipped`);
    continue;
  }
  m.assets.push({
    name,
    kind: 'image',
    model: 'nano_banana_pro',
    params: { aspect_ratio: '4:3', resolution: '2k' },
    refs: [`public/img/packet-${id}.png`],
    prompt: `${SCENE(colour)} ${KEEP}`,
  });
  added++;
  console.log(`${name}: queued (ref: packet-${id}.png)`);
}

await writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`\n${added} shot(s) added.`);
