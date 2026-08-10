#!/usr/bin/env node
/* Append product-shot assets to the media manifest without disturbing the
   state the pipeline has already written (jobIds, done, optimized flags). */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'tools', 'media.manifest.json');
const m = JSON.parse(await readFile(MANIFEST, 'utf8'));

/* NOTE ON HONESTY: these prompts deliberately specify an UNBRANDED container
   with no label text, logo or typography. We do not have the real BIOptimizers
   packaging, and generating a plausible-looking fake label would put invented
   branding — and potentially invented supplement facts — on screen. An
   unlabelled vessel reads as "the product" without counterfeiting it. */
const NEW = [
  {
    name: 'product-tub',
    kind: 'image',
    model: 'gpt_image_2',
    params: { aspect_ratio: '4:3', resolution: '2k' },
    prompt:
      'Premium product photograph on a deep near-black surface: a matte cream-white cylindrical supplement tub with a smooth brushed metal lid, completely unlabelled with no text and no logo, standing beside a small stainless scoop heaped with fine pale-amber electrolyte powder, a little of the powder spilled in a soft arc on the surface. Single hard warm key light from the upper left raking across the tub, long crisp shadow, deep falloff to black. Editorial supplement campaign still life, 100mm macro, shallow depth of field, hyper detailed, no text, no logo, no label, no branding, no packaging graphics.',
  },
  {
    name: 'product-scoop',
    kind: 'image',
    model: 'gpt_image_2',
    params: { aspect_ratio: '1:1', resolution: '2k' },
    prompt:
      'Extreme macro photograph: a stainless steel measuring scoop heaped with fine pale-amber crystalline electrolyte powder, individual grains catching a hard warm side light, a few grains falling. Deep matte black background, dramatic chiaroscuro, powder texture razor sharp. Editorial supplement photography, 100mm macro, no text, no logo, no packaging, no hands.',
  },
  {
    name: 'product-glass-pour',
    kind: 'image',
    model: 'gpt_image_2',
    params: { aspect_ratio: '3:4', resolution: '2k' },
    prompt:
      'Premium product photograph: a tall clear glass of bright translucent citrus-amber electrolyte drink on a pale travertine surface, fine effervescent bubbles rising, condensation on the glass, an unlabelled matte cream supplement tub softly out of focus behind it. Hard warm morning sunlight from the left casting a long crisp shadow and bright caustic light through the liquid. Cream and warm neutral palette, editorial wellness still life, 85mm, shallow depth of field, no text, no logo, no label, no branding.',
  },
];

let added = 0;
for (const a of NEW) {
  if (m.assets.some((x) => x.name === a.name)) {
    console.log(`${a.name}: already present, skipped`);
    continue;
  }
  m.assets.push(a);
  added++;
  console.log(`${a.name}: added`);
}

await writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`\n${added} asset(s) added.`);
