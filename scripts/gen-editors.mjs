#!/usr/bin/env node
/*! dvengine — gen-editors (scripts/gen-editors.mjs) · derive editors/<type>/index.js + editors/registry.json from the props.<key> reads in each components/<type>/index.js (the port is authoritative; kinds guessed from defaults) · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CDIR = join(ROOT, 'components'), EDIR = join(ROOT, 'editors');
const NATIVE = new Set(['substrate', 'portal', 'zone', 'piece', 'aivatar', 'thot-memory', 'participant', 'remote-participant']);
const SKIP = new Set(['id', 'name', 'type', 'parentId', 'sessionId', 'pick', 'visible']);
const COLOR = /(^|[a-z])(color|tint|bg)$|Color$/i, ASSET = /^(url|src|model|vrm|texture|image|audio|video|file|href|glb)$/i;
const INT = /^(count|rows|cols|puffs|rays|sparks|segments|seed|nodes|rate|dims|run)$/;
const GROUP = [[/^(position|rotation|scale)$/, 'transform'], [COLOR, 'look'], [/opacity|intensity|metalness|roughness|size|width|height|radius|spread|area|shape|preset|type$/i, 'look'], [/speed|spin|animate|drift|wind|period|phase|billboard/i, 'motion']];
const label = (k) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
function parseDefault(s) {
  s = s.trim().replace(/[;,)\]]+$/, '').trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return +s; if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16);
  if (/^'[^']*'$/.test(s) || /^"[^"]*"$/.test(s)) return s.slice(1, -1); if (s === 'true') return true; if (s === 'false') return false; if (s === 'null') return null;
  const v = /^\{\s*x:\s*(-?[\d.]+),\s*y:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+)\s*\}/.exec(s); if (v) return { x: +v[1], y: +v[2], z: +v[3] };
  if (/^\[\s*\]/.test(s)) return []; if (/^\{\s*\}/.test(s)) return {};
  return undefined;
}
function range(key, d) {
  if (/^(yaw|angle|pitch|roll)$/i.test(key)) return { min: -3.1416, max: 3.1416, step: 0.01 };
  if (INT.test(key)) return { min: 0, max: Math.max(16, Math.ceil(Math.abs(d) * 4)), step: 1 };
  if (/opacity|metalness|roughness|intensity|density|vignette|damping/i.test(key) && d <= 1) return { min: 0, max: 1, step: 0.01 };
  if (d === 0) return { min: -10, max: 10, step: 0.1 };
  const mag = Math.abs(d); const max = Number.isInteger(d) ? Math.max(4, d * 4) : +(mag * 4).toPrecision(2);
  return { min: 0, max, step: Number.isInteger(d) && mag >= 2 ? 1 : mag < 1 ? 0.01 : 0.1 };
}
function derive(type, src) {
  const rows = new Map(), cases = [...src.matchAll(/case '([^']+)':/g)].map((m) => m[1]);
  const seen = new Set([...src.matchAll(/props\.([A-Za-z_]\w*)/g)].map((m) => m[1]));
  const add = (key, kind, dflt, extra = {}) => { if (SKIP.has(key) || rows.has(key)) return; const r = { key, kind, min: null, max: null, step: null, options: [], default: dflt === undefined ? null : dflt, label: label(key), group: 'props', ...extra }; rows.set(key, r); };
  for (const key of seen) {
    if (SKIP.has(key)) continue;
    let m, d;
    if (/^(position|rotation|scale)$/.test(key)) { m = new RegExp(`props\\.${key}\\s*\\|\\|\\s*(\\{[^}]*\\})`).exec(src); d = m ? parseDefault(m[1]) : undefined; add(key, 'vec3', d && typeof d === 'object' ? d : (key === 'scale' ? { x: 1, y: 1, z: 1 } : { x: 0, y: 0, z: 0 })); continue; }
    if ((m = new RegExp(`props\\.${key}\\s*!==\\s*false`).exec(src))) { add(key, 'bool', true); continue; }
    if ((m = new RegExp(`(!!props\\.${key}\\b|props\\.${key}\\s*===\\s*true)`).exec(src))) { add(key, 'bool', false); continue; }
    let hexLit = false;
    if ((m = new RegExp(`props\\.${key}\\s*\\|\\|\\s*(\\{[^}]*\\})`).exec(src)) || (m = new RegExp(`props\\.${key}\\s*!=\\s*null\\s*\\?\\s*\\+?props\\.${key}\\s*:\\s*([^;,}]+)`).exec(src)) || (m = new RegExp(`props\\.${key}\\s*>\\s*0\\s*\\?\\s*\\+?props\\.${key}\\s*:\\s*([^;,}]+)`).exec(src)) || (m = new RegExp(`props\\.${key}\\s*\\|\\|\\s*([^;,})]+)`).exec(src))) { d = parseDefault(m[1]); hexLit = /^\s*0x[0-9a-f]{3,6}\b/i.test(m[1]); }
    const opts = [...src.matchAll(new RegExp(`props\\.${key}\\s*===\\s*'([^']+)'`, 'g'))].map((x) => x[1]);
    if (/^(shape|type|preset|mode|kind)$/.test(key) && new RegExp(`\\b(var|let|const)\\s+${key}\\s*=\\s*props\\.${key}`).test(src)) for (const x of src.matchAll(new RegExp(`\\b${key}\\s*===\\s*'([^']+)'`, 'g'))) if (!opts.includes(x[1])) opts.push(x[1]);
    if (COLOR.test(key) || hexLit) { add(key, 'color', typeof d === 'number' ? d : (d === undefined ? null : d)); continue; }
    if (ASSET.test(key)) { add(key, 'asset', typeof d === 'string' ? d : ''); continue; }
    if (typeof d === 'boolean') { add(key, 'bool', d); continue; }
    if (typeof d === 'number') { const int = INT.test(key) || (Number.isInteger(d) && d >= 2 && /count|rows|cols|n$/i.test(key)); add(key, int ? 'int' : 'number', d, range(key, d)); continue; }
    if (typeof d === 'string') { const all = [...new Set([d, ...opts, ...(cases.length && /^(shape|type|preset|mode|kind)$/.test(key) ? cases : [])])]; add(key, all.length > 1 ? 'enum' : 'string', d, { options: all.length > 1 ? all : [] }); continue; }
    if (opts.length) { add(key, 'enum', opts[0], { options: opts }); continue; }
    if (d && typeof d === 'object' && 'x' in d) { add(key, 'vec3', d); continue; }
    if (Array.isArray(d) || (d && typeof d === 'object')) { add(key, 'string', d, { json: true }); continue; }
    if (/^(width|height|radius|size|seed|fps|depth|count|spread|area|range|length|gap|scale|speed)$/.test(key)) { add(key, 'number', null, { min: 0, max: 100, step: 0.1 }); continue; }
    if (/^(dims|say|points|nodes|nft|traits)$/.test(key)) { add(key, 'string', null, { json: true }); continue; }
    if (/^(text|label|title|to|minRole|preset|root|owner|kind|from)$/.test(key)) { add(key, 'string', ''); continue; }
    add(key, 'string', null);
  }
  for (const k of ['position', 'rotation', 'scale']) if (!rows.has(k)) add(k, 'vec3', k === 'scale' ? { x: 1, y: 1, z: 1 } : { x: 0, y: 0, z: 0 });
  const out = [...rows.values()].map((r) => { for (const [re, g] of GROUP) if (re.test(r.key)) { r.group = g; break; } return r; });
  const order = { transform: 0, look: 1, motion: 2, props: 3 };
  out.sort((a, b) => order[a.group] - order[b.group] || (a.group === 'transform' ? ['position', 'rotation', 'scale'].indexOf(a.key) - ['position', 'rotation', 'scale'].indexOf(b.key) : a.key.localeCompare(b.key)));
  return out;
}
const types = readdirSync(CDIR, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(CDIR, e.name, 'index.js'))).map((e) => e.name).sort();
const registry = { $schema: 'dddcyborgd/editors.v1', generatedBy: 'scripts/gen-editors.mjs (rows derived from the props.<key> reads in components/<type>/index.js)', upstream: 'https://github.com/oncyberio/awe/tree/main/packages/engine-edit/src/editors', count: 0, editors: {} };
for (const type of types) {
  const src = readFileSync(join(CDIR, type, 'index.js'), 'utf8');
  const native = NATIVE.has(type);
  const upstream = native ? 'DeltaVerse-native' : `https://github.com/oncyberio/awe/tree/main/packages/engine/src/space/components/${type}`;
  const schema = { type, upstream, native, rows: derive(type, src) };
  registry.editors[type] = schema; registry.count++;
  mkdirSync(join(EDIR, type), { recursive: true });
  const body = `/*! dvengine — editor ${type} (editors/${type}/index.js) · inspector schema for components/${type} · GENERATED by scripts/gen-editors.mjs · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · ${native ? 'DeltaVerse-native' : 'upstream © oncyberio (awe, MIT) where derived'} */\n` +
    `(function (global) {\n  'use strict';\n  var schema = ${JSON.stringify(schema, null, 2).replace(/\n/g, '\n  ')};\n` +
    `  if (global.DVEditors) global.DVEditors.register(${JSON.stringify(type)}, schema);\n  if (typeof module !== 'undefined' && module.exports) module.exports = schema;\n})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));\n`;
  writeFileSync(join(EDIR, type, 'index.js'), body);
}
writeFileSync(join(EDIR, 'registry.json'), JSON.stringify(registry, null, 2) + '\n');
console.log(`gen-editors: ${registry.count} editors → editors/<type>/index.js + editors/registry.json (${Object.values(registry.editors).reduce((a, s) => a + s.rows.length, 0)} rows)`);
