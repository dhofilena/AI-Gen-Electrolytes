#!/usr/bin/env node
/* Aggregates build-notes/status/*.json -> public/progress.json
   Run with --watch to keep it live while agents work. */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const STATUS = path.join(ROOT, 'build-notes', 'status');
const OUT = path.join(ROOT, 'public', 'progress.json');

/* Canonical piece order = scroll order of the page. */
export const PIECES = [
  ['preloader', 'Preloader', 'Brand load sequence'],
  ['nav', 'Navigation', 'Scroll-aware header + CTA'],
  ['hero', 'Hero', 'Full-bleed dissolve film, kinetic type'],
  ['myth', 'The Sodium Myth', 'The category is solving the wrong problem'],
  ['science', 'Cell Science', '610mg K : 200mg Na, the 3:1 ratio'],
  ['pillars', 'Pillars', '5 / 4 / 12 / 9 formulation numbers'],
  ['formula', 'The Formula', 'Three years, ingredients, sweeteners'],
  ['flavors', 'Flavors', 'Three flavors, colour-themed, vertical film'],
  ['ritual', 'The Ritual', 'Lifestyle, the daily pour'],
  ['compare', 'Comparison', 'Animated head-to-head vs 5 competitors'],
  ['benefits', 'Benefits', 'Eight systems supported'],
  ['proof', 'Proof', 'Guarantee, certifications, trust'],
  ['offer', 'The Offer', 'Pricing, subscribe, primary CTA'],
  ['faq', 'FAQ', 'Objection handling'],
  ['footer', 'Footer', 'Close + compliance'],
];

async function build() {
  await mkdir(STATUS, { recursive: true });
  let files = [];
  try { files = await readdir(STATUS); } catch {}

  const byId = {};
  for (const f of files.filter((f) => f.endsWith('.json'))) {
    try {
      // PowerShell's Out-File -Encoding utf8 emits a BOM on Win PS 5.1, and
      // JSON.parse chokes on it. Agents write these files by hand too, so
      // strip it defensively rather than trusting every writer.
      const raw = (await readFile(path.join(STATUS, f), 'utf8')).replace(/^﻿/, '').trim();
      if (raw) byId[f.replace(/\.json$/, '')] = JSON.parse(raw);
    } catch (e) {
      console.error(`status/${f}: ${e.message}`);
    }
  }

  const pieces = PIECES.map(([id, name, blurb]) => ({
    id, name, blurb,
    phase: 'queued',
    round: 0,
    verdict: null,
    note: '',
    ...(byId[id] || {}),
  }));

  const weight = { queued: 0, building: 0.4, review: 0.7, revising: 0.75, passed: 1 };
  const pct = Math.round(
    (pieces.reduce((s, p) => s + (weight[p.phase] ?? 0), 0) / pieces.length) * 100
  );

  await writeFile(
    OUT,
    JSON.stringify({ updated: new Date().toISOString(), pct, pieces, global: byId.__global || {} }, null, 2)
  );
  return pct;
}

const watch = process.argv.includes('--watch');
if (watch) {
  console.log('progress watcher running');
  for (;;) {
    try { await build(); } catch (e) { console.error(e.message); }
    await new Promise((r) => setTimeout(r, 2500));
  }
} else {
  console.log('progress.json written,', await build() + '%');
}
