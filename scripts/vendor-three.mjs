#!/usr/bin/env node
/*! dvengine — vendor-three (scripts/vendor-three.mjs) · copy $DELTAVERSE/vendor/three (default /home/hacker/DeltaVerse/vendor/three) → vendor/three/ and print the revision from MANIFEST.json · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
import { cpSync, existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2] || join(process.env.DELTAVERSE || '/home/hacker/DeltaVerse', 'vendor', 'three');
const DST = join(ROOT, 'vendor', 'three');
if (!existsSync(join(SRC, 'build'))) { console.error(`vendor-three: no three build at ${SRC} (set $DELTAVERSE or pass a path)`); process.exit(1); }
rmSync(DST, { recursive: true, force: true }); mkdirSync(dirname(DST), { recursive: true });
cpSync(SRC, DST, { recursive: true });
let rev = 'unknown';
try { // the first "revision" string anywhere in the manifest (it is nested per tier)
  const found = []; (function walk(v) { if (found.length || !v || typeof v !== 'object') return; if (typeof v.revision === 'string') found.push(v.revision); else for (const k of Object.keys(v)) walk(v[k]); })(JSON.parse(readFileSync(join(DST, 'MANIFEST.json'), 'utf8')));
  if (found.length) rev = found[0].split(/[ —(]/)[0].trim() + ' (' + found[0].slice(0, 60).replace(/\s+/g, ' ') + (found[0].length > 60 ? '…' : '') + ')';
} catch {}
console.log(`vendor-three: ${SRC} → vendor/three/ · revision ${rev} (git-ignored; the consumer serves /vendor/three in production)`);
