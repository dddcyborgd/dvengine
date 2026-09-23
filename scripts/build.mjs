#!/usr/bin/env node
/*
 * build.mjs — emit dist/ for consumers (DeltaVerse gathers it): one concatenated UMD bundle per lane, no minifier,
 * plus dist/MANIFEST.json { version, sha, files:{path:{bytes,sha256}} }. Components stay one-file-per-folder
 * (lazy) and are copied verbatim to dist/components/<type>/index.js.
 *   node scripts/build.mjs
 * (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, cpSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const LANES = { 'dvengine-core.js': ['engine/index.js', 'engine/scene.js', 'engine/legacy.js'], 'dvengine-edit.js': ['edit/snap.js', 'edit/commands.js', 'edit/history.js', 'edit/grid.js', 'edit/capture.js', 'edit/pivot/index.js', 'edit/index.js'], 'dvengine-net.js': ['net/interp.js', 'net/index.js', 'net/peer.js', 'net/host.js'], 'dvengine-xr.js': ['xr/probe.js', 'xr/teleport.js'], 'dvengine-verse.js': ['verse/rung.js', 'verse/world.js', 'verse/senses.js', 'verse/journey.js', 'verse/holdings.js', 'verse/inft.js', 'verse/thot.js', 'verse/index.js'] };
rmSync(DIST, { recursive: true, force: true }); mkdirSync(DIST, { recursive: true });
const files = {};
function record(p) { const b = readFileSync(p); files[relative(DIST, p).split('\\').join('/')] = { bytes: b.length, sha256: createHash('sha256').update(b).digest('hex') }; }
for (const [out, parts] of Object.entries(LANES)) {
  const present = parts.filter((p) => existsSync(join(ROOT, p)));
  if (!present.length) continue;
  let src = `/*! dvengine ${PKG.version} — ${out} · concatenated UMD (${present.join(' + ')}) · https://github.com/dddcyborgd/dvengine · MIT */\n`;
  for (const p of present) src += `\n/* ---- ${p} ---- */\n` + readFileSync(join(ROOT, p), 'utf8');
  const missing = parts.filter((p) => !present.includes(p)); if (missing.length) src += `\n/* not yet present: ${missing.join(', ')} */\n`;
  writeFileSync(join(DIST, out), src); record(join(DIST, out));
}
for (const dir of ['components', 'editors', 'studio', 'legacy', 'live']) {
  if (!existsSync(join(ROOT, dir))) continue;
  cpSync(join(ROOT, dir), join(DIST, dir), { recursive: true, filter: (s) => !/\.js\.xml$/.test(s) });
  (function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); e.isDirectory() ? walk(p) : record(p); } })(join(DIST, dir));
}
let sha = 'unknown'; try { sha = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(); } catch {}
writeFileSync(join(DIST, 'MANIFEST.json'), JSON.stringify({ name: PKG.name, version: PKG.version, sha, builtAt: new Date().toISOString(), three: 'r182 (shared from the consumer: /vendor/three — not bundled)', files }, null, 2) + '\n');
console.log(`build: ${Object.keys(files).length} files → dist/ (${Object.values(files).reduce((a, f) => a + f.bytes, 0)} bytes)`);
