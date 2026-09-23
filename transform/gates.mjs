#!/usr/bin/env node
/*! dvengine — transform gates (transform/gates.mjs) · which glTF-Transform ops the zero-dep desk can run: pure ⇒ on · wasm ⇒ on only when vendor/{draco,meshopt}/*.wasm exist · native ⇒ unavailable: needs <dep> · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © Don McCurdy (glTF-Transform, MIT) / © oncyberio (awe tools, MIT) where derived */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

/** wasm codec files the wasm-portable ops look for (hooks only — none are vendored today) */
export const WASM_FILES = {
  draco: ['vendor/draco/draco_decoder.wasm', 'vendor/draco/draco_encoder.wasm'],
  meshopt: ['vendor/meshopt/meshopt_decoder.wasm', 'vendor/meshopt/meshopt_encoder.wasm'],
  reorder: ['vendor/meshopt/meshopt_encoder.wasm'],
  simplify: ['vendor/meshopt/meshopt_simplifier.wasm'],
};
const NATIVE_PROBE = { textureCompress: 'sharp', textureResize: 'ndarray-pixels', tangents: 'mikktspace', toktx: null, ktx: null };

export function loadRegistry() { return JSON.parse(readFileSync(join(ROOT, 'transform', 'registry.json'), 'utf8')); }

function hasModule(name) { if (!name) return false; try { require.resolve(name); return true; } catch { return false; } }

/** Live verdict per op: { op, portable, fn, upstream, enabled, reason } */
export function gates() {
  const reg = loadRegistry();
  return reg.ops.map((o) => {
    let enabled = false, reason = '';
    if (o.portable === 'pure') { enabled = true; reason = 'pure JS over vendor/gltf-transform'; }
    else if (o.portable === 'wasm') {
      const files = WASM_FILES[o.op] || [];
      const missing = files.filter((f) => !existsSync(join(ROOT, f)));
      enabled = files.length > 0 && missing.length === 0;
      reason = enabled ? 'wasm present: ' + files.join(', ') : 'unavailable: needs ' + (missing.length ? missing.join(' + ') : o.needs || 'wasm codec');
    } else {
      const mod = NATIVE_PROBE[o.op];
      enabled = hasModule(mod);
      reason = enabled ? 'native module resolvable: ' + mod : 'unavailable: needs ' + (o.needs || mod || 'native dependency');
    }
    return { op: o.op, portable: o.portable, fn: o.fn, upstream: o.upstream, enabled, reason, kind: o.kind || 'transform', note: o.note || '' };
  });
}

/** Import the function behind an enabled op (throws with the gate reason otherwise). */
export async function loadOp(name) {
  const g = gates().find((x) => x.op === name);
  if (!g) throw new Error(`unknown op "${name}" (see transform/registry.json)`);
  if (!g.enabled) throw new Error(`op "${name}" ${g.reason}`);
  const [file, exp] = g.fn.split('#');
  const mod = await import(pathToFileURL(join(ROOT, file)).href);
  if (typeof mod[exp] !== 'function') throw new Error(`op "${name}": ${file} has no export ${exp}`);
  return mod[exp];
}

/** Fixed-width text table. */
export function table(rows) {
  const cols = [['op', (r) => r.op], ['portable', (r) => r.portable], ['on', (r) => (r.enabled ? 'on' : 'off')], ['verdict', (r) => r.reason]];
  const w = cols.map(([h, f]) => Math.max(h.length, ...rows.map((r) => String(f(r)).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(w[i])).join('  ');
  return [line(cols.map((c) => c[0])), line(w.map((n) => '-'.repeat(n))), ...rows.map((r) => line(cols.map((c) => c[1](r))))].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rows = gates();
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 2));
  else console.log(table(rows));
}
