#!/usr/bin/env node
/* ============================================================
   Higgsfield media pipeline — resumable.

     node tools/media.mjs submit   queue every asset lacking a jobId
     node tools/media.mjs poll     download whatever has finished
     node tools/media.mjs status   one-line status per asset

   Deliberately does NOT use `higgsfield --wait`: a transient 503 on
   the poll connection kills the client while the render continues
   server-side, orphaning the job. Submit and poll are separate so a
   blip never costs credits or loses work.
   ============================================================ */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

const execFileP = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const MANIFEST = path.join(ROOT, 'tools', 'media.manifest.json');
const OUT = path.join(ROOT, 'public', 'media');

/* Windows needs shell:true to run higgsfield.cmd, but shell:true means the
   args array is re-joined WITHOUT quoting — so a prompt with spaces explodes
   into positional args. Quote every arg ourselves. Prompts must not contain
   double quotes; assertPromptSafe enforces that. */
function q(arg) {
  const s = String(arg);
  if (process.platform !== 'win32') return s;
  return /[\s&|<>^()"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function hf(args) {
  if (process.platform === 'win32') {
    const { stdout } = await execFileP('higgsfield.cmd', args.map(q), {
      shell: true,
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout;
  }
  const { stdout } = await execFileP('higgsfield', args, { maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}

/* Without --wait the CLI returns a bare array of id STRINGS: ["uuid"].
   With --wait it returns full job objects. Accept both — getting this
   wrong once already orphaned 9 paid jobs. */
function extractId(out) {
  let parsed;
  try { parsed = JSON.parse(out); } catch { return null; }
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!first) return null;
  return typeof first === 'string' ? first : (first.id ?? null);
}

async function assertPromptSafe(a) {
  if (a.prompt && a.prompt.includes('"')) {
    throw new Error(`asset "${a.name}": prompt contains a double quote; use single quotes instead`);
  }
}

async function loadManifest() {
  return JSON.parse(await readFile(MANIFEST, 'utf8'));
}

async function saveManifest(m) {
  await writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
}

/* Flatten {duration:5} -> ['--duration','5'] with the CLI's flag spellings. */
function paramFlags(params = {}) {
  const out = [];
  for (const [k, v] of Object.entries(params)) {
    const flag = '--' + k.replace(/_/g, '-');
    // The CLI accepts snake_case for schema params but kebab for its own;
    // schema params are passed through verbatim.
    const useKey = ['generate_audio'].includes(k) ? flag : '--' + k;
    out.push(useKey, String(v));
  }
  return out;
}

async function submit() {
  const m = await loadManifest();
  let queued = 0;

  for (const a of m.assets) {
    if (a.jobId || a.done) continue;
    assertPromptSafe(a);

    const args = ['generate', 'create', a.model, '--prompt', a.prompt, ...paramFlags(a.params), '--json'];
    process.stdout.write(`submit  ${a.name} … `);
    try {
      const out = await hf(args);
      const id = extractId(out);
      if (!id) throw new Error('no job id in response: ' + out.slice(0, 200));
      a.jobId = id;
      queued++;
      console.log(id);
    } catch (e) {
      console.log('FAILED — ' + (e.stderr || e.message || '').toString().trim().split('\n')[0]);
    }
    await saveManifest(m);
  }
  console.log(`\nqueued ${queued} job(s).`);
}

async function getJob(id) {
  const out = await hf(['generate', 'get', id, '--json']);
  return JSON.parse(out);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function poll() {
  const m = await loadManifest();
  await mkdir(OUT, { recursive: true });

  let pending = 0;
  for (const a of m.assets) {
    if (!a.jobId || a.done) continue;

    let job;
    try {
      job = await getJob(a.jobId);
    } catch (e) {
      console.log(`${a.name.padEnd(20)} query failed (retry next poll)`);
      pending++;
      continue;
    }

    if (job.status === 'completed' && job.result_url) {
      const ext = a.kind === 'video' ? 'mp4' : (job.result_url.match(/\.(\w+)(?:\?|$)/)?.[1] || 'png');
      const dest = path.join(OUT, `${a.name}.${ext}`);
      process.stdout.write(`${a.name.padEnd(20)} downloading … `);
      try {
        await download(job.result_url, dest);
        a.done = true;
        a.file = `/media/${a.name}.${ext}`;
        console.log('ok');
      } catch (e) {
        console.log('download failed: ' + e.message);
        pending++;
      }
      await saveManifest(m);
    } else if (job.status === 'failed' || job.status === 'canceled') {
      console.log(`${a.name.padEnd(20)} ${job.status.toUpperCase()} — clearing id so submit can retry`);
      a.jobId = null;
      a.error = job.status;
      await saveManifest(m);
    } else {
      console.log(`${a.name.padEnd(20)} ${job.status}`);
      pending++;
    }
  }
  console.log(`\n${pending} still pending.`);
  return pending;
}

async function status() {
  const m = await loadManifest();
  for (const a of m.assets) {
    const state = a.done ? 'DONE' : a.jobId ? 'running' : 'not submitted';
    console.log(`${a.name.padEnd(20)} ${state.padEnd(14)} ${a.file || ''}`);
  }
}

/* Re-attach jobs that were submitted but whose ids we failed to record.
   Matches server-side jobs to manifest assets on the first 60 chars of
   the prompt. Prevents paying twice for the same render. */
async function recover() {
  const m = await loadManifest();
  const jobs = JSON.parse(await hf(['generate', 'list', '--json']));

  let found = 0;
  for (const a of m.assets) {
    if (a.jobId || a.done || !a.prompt || a.prompt === 'done') continue;
    const key = a.prompt.slice(0, 60);
    const hit = jobs.find(
      (j) => typeof j?.params?.prompt === 'string' && j.params.prompt.startsWith(key)
    );
    if (hit) {
      a.jobId = hit.id;
      found++;
      console.log(`${a.name.padEnd(20)} re-attached ${hit.id}  (${hit.status})`);
    } else {
      console.log(`${a.name.padEnd(20)} no server-side match`);
    }
  }
  await saveManifest(m);
  console.log(`\nre-attached ${found} orphaned job(s).`);
}

const cmd = process.argv[2] || 'status';
if (cmd === 'submit') await submit();
else if (cmd === 'poll') await poll();
else if (cmd === 'recover') await recover();
else await status();
