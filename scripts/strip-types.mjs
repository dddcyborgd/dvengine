#!/usr/bin/env node
/*! dvengine — strip-types (scripts/strip-types.mjs) · transpile the vendored glTF-Transform fork (TypeScript) into zero-dependency ESM under vendor/gltf-transform/ with Node 24's built-in stripTypeScriptTypes · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © Don McCurdy (glTF-Transform, MIT) where derived */
/*
 * What this does (no npm, no tsc, no bundler):
 *
 *   1. Walks archive/gltftransform/packages/{core,extensions,functions}/src/**\/*.ts
 *   2. stripTypeScriptTypes(src, { mode: 'transform' })  — 'transform' (not 'strip') because the fork
 *      uses enums, parameter properties and `declare` fields, which strip-only mode refuses.
 *   3. LINKS the output: swc leaves type-only names inside `import { … }` / `export { … } from` lists
 *      (it cannot see across files), which native ESM rejects at link time ("does not provide an export
 *      named …"). A fixed-point pass computes the RUNTIME export set of every module and prunes every
 *      import/re-export list down to names that really exist.
 *   4. Rewrites bare specifiers: @gltf-transform/* → the sibling vendored package; property-graph and
 *      gl-matrix/* → the vendored ESM copies; ktx-parse and ndarray-pixels → local shims.
 *   5. Emits vendor/gltf-transform/<pkg>/src/**\/*.js + <pkg>/index.js entry points. functions/index.js
 *      re-exports ONLY the pure (no wasm / no native) transforms — the curated list lives below.
 *
 *   node scripts/strip-types.mjs            (idempotent; rewrites vendor/gltf-transform/{core,extensions,functions})
 *   node scripts/strip-types.mjs --check    (exit 1 if the emitted tree would change)
 */
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'archive', 'gltftransform', 'packages');
const OUT = join(ROOT, 'vendor', 'gltf-transform');
const CHECK = process.argv.includes('--check');
const PKGS = ['core', 'extensions', 'functions'];
const VERSION = JSON.parse(readFileSync(join(SRC, 'core', 'package.json'), 'utf8')).version;

/** functions re-exported by vendor/gltf-transform/functions/index.js — pure JS only (see transform/registry.json). */
const PURE_FUNCTIONS = [
  ['center.js', ['center']],
  ['clear-node-parent.js', ['clearNodeParent']],
  ['clear-node-transform.js', ['clearNodeTransform']],
  ['dedup.js', ['dedup']],
  ['dequantize.js', ['dequantize']],
  ['flatten.js', ['flatten']],
  ['get-node-scene.js', ['getNodeScene']],
  ['inspect.js', ['inspect']],
  ['instance.js', ['instance']],
  ['join-primitives.js', ['joinPrimitives']],
  ['join.js', ['join']],
  ['list-node-scenes.js', ['listNodeScenes']],
  ['list-texture-channels.js', ['listTextureChannels', 'getTextureChannelMask']],
  ['list-texture-info.js', ['listTextureInfo']],
  ['list-texture-slots.js', ['listTextureSlots']],
  ['metal-rough.js', ['metalRough']],
  ['normals.js', ['normals']],
  ['partition.js', ['partition']],
  ['prune.js', ['prune']],
  ['quantize.js', ['quantize']],
  ['resample.js', ['resample']],
  ['sequence.js', ['sequence']],
  ['sort-primitive-weights.js', ['sortPrimitiveWeights']],
  ['sparse.js', ['sparse']],
  ['transform-mesh.js', ['transformMesh']],
  ['transform-primitive.js', ['transformPrimitive']],
  ['unlit.js', ['unlit']],
  ['unpartition.js', ['unpartition']],
  ['unweld.js', ['unweld']],
  ['vertex-color-space.js', ['vertexColorSpace']],
  ['weld.js', ['weld', 'weldPrimitive']],
  ['utils.js', ['getGLPrimitiveCount', 'isTransformPending', 'createTransform']],
];

// ---- walk ----------------------------------------------------------------------------------
function walk(dir, out = []) { for (const e of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; }
const posix = (p) => p.split('\\').join('/');
function relSpec(fromFile, toFile) { let r = posix(relative(dirname(fromFile), toFile)); if (!r.startsWith('.')) r = './' + r; return r; }

// ---- 1+2: transpile -------------------------------------------------------------------------
const modules = new Map(); // outPath -> { code }
function specifierFor(spec, outFile) {
  if (spec.startsWith('@gltf-transform/')) { const pkg = spec.split('/')[1]; return relSpec(outFile, join(OUT, pkg, 'index.js')); }
  if (spec === 'property-graph') return relSpec(outFile, join(OUT, 'property-graph', 'property-graph.modern.js'));
  if (spec.startsWith('gl-matrix/')) return relSpec(outFile, join(OUT, 'gl-matrix', spec.split('/')[1] + '.js'));
  if (spec === 'gl-matrix') return relSpec(outFile, join(OUT, 'gl-matrix', 'index.js'));
  if (spec === 'ktx-parse') return relSpec(outFile, join(OUT, 'shims', 'ktx-parse.js'));
  if (spec === 'ndarray-pixels') return relSpec(outFile, join(OUT, 'shims', 'ndarray-pixels.js'));
  if (spec.startsWith('.')) { if (/\.(js|mjs|json)$/.test(spec)) return spec; return spec + '.js'; }
  return spec; // node builtins (fs, path) and anything else untouched
}
const SPEC_RE = /((?:import|export)\s*(?:[^'";]*?)\s*from\s*)(['"])([^'"]+)\2|(\bimport\s*\(\s*)(['"])([^'"]+)\5/g;
function rewriteSpecifiers(code, outFile) {
  return code.replace(SPEC_RE, (m, head, q, spec, dhead, dq, dspec) => {
    if (head) return head + q + specifierFor(spec, outFile) + q;
    return dhead + dq + specifierFor(dspec, outFile) + dq;
  });
}

for (const pkg of PKGS) {
  const srcDir = join(SRC, pkg, 'src');
  for (const file of walk(srcDir)) {
    if (!file.endsWith('.ts') || file.endsWith('.d.ts')) continue;
    const rel = relative(srcDir, file).replace(/\.ts$/, '.js');
    const outFile = join(OUT, pkg, 'src', rel);
    let ts = readFileSync(file, 'utf8');
    let code;
    if (/\bdeclare module\b/.test(ts)) {
      // ambient type module (core/types/gltf.ts): nothing survives at runtime
      code = `/* types-only module (${posix(relative(ROOT, file))}) — erased by scripts/strip-types.mjs */\nexport {};\n`;
    } else {
      ts = ts.replace(/`v\$\{PACKAGE_VERSION\}`/g, JSON.stringify('v' + VERSION)); // build-time define in constants.ts
      code = stripTypeScriptTypes(ts, { mode: 'transform', sourceMap: false });
      code = rewriteSpecifiers(code, outFile);
    }
    modules.set(outFile, { code, src: posix(relative(ROOT, file)) });
  }
}

// ---- 5: entry points (registered BEFORE linking so ../<pkg>/index.js resolves) ------------------
const BANNER = (pkg, line) => `/*! dvengine — vendor/gltf-transform/${pkg} (vendor/gltf-transform/${pkg}/index.js) · ${line} · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © Don McCurdy (glTF-Transform ${VERSION}, MIT) via the oncyberio/gltftransform fork — generated by scripts/strip-types.mjs, do not edit */\n`;
const entries = {
  core: BANNER('core', 'ESM entry: Document · NodeIO · properties · utils') + `export * from './src/core.js';\n`,
  extensions: BANNER('extensions', 'ESM entry: KHRONOS_EXTENSIONS · ALL_EXTENSIONS · every KHR_/EXT_ class') + `export * from './src/extensions.js';\n`,
  functions: BANNER('functions', 'ESM entry: PURE transforms only (no draco/meshopt wasm, no sharp/ktx/mikktspace native) — see transform/registry.json') +
    PURE_FUNCTIONS.map(([f, names]) => `export { ${names.join(', ')} } from './src/${f}';`).join('\n') +
    `\n/* wasm-gated (reachable by path, gated in transform/gates.mjs): ./src/draco.js ./src/meshopt.js ./src/reorder.js ./src/simplify.js */\n/* native-gated (NOT re-exported): ./src/tangents.js (mikktspace) ./src/texture-compress.js (sharp) ./src/texture-resize.js (ndarray) */\n`,
};
for (const pkg of PKGS) modules.set(join(OUT, pkg, 'index.js'), { code: entries[pkg], src: 'scripts/strip-types.mjs' });

// ---- 3: link (prune type-only names out of import / re-export lists) --------------------------
const DECL_RE = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?(?:class|function\*?|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_DECL_RE = /(?:^|\n)\s*export\s+(?:async\s+)?(?:class|function\*?|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_LIST_RE = /export\s*\{([^}]*)\}\s*(?:from\s*(['"])([^'"]+)\2)?\s*;?/g;
const EXPORT_STAR_RE = /export\s*\*\s*(?:as\s+([A-Za-z_$][\w$]*)\s*)?from\s*(['"])([^'"]+)\2\s*;?/g;
const IMPORT_RE = /import\s+(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\*\s*as\s+([A-Za-z_$][\w$]*)|\{([^}]*)\})?\s*from\s*(['"])([^'"]+)\4\s*;?/g;

function parseNames(list) { return list.split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const m = /^(\S+)(?:\s+as\s+(\S+))?$/.exec(s); return m ? { local: m[1], exported: m[2] || m[1] } : null; }).filter(Boolean); }
function resolveFrom(file, spec) { if (!spec.startsWith('.')) return null; return resolve(dirname(file), spec); }

/** exports of external ESM files (property-graph, gl-matrix, shims) — parsed with the same grammar */
const externalExports = new Map();
function exportsOfExternal(path) {
  if (externalExports.has(path)) return externalExports.get(path);
  const set = new Set();
  if (existsSync(path)) {
    const code = readFileSync(path, 'utf8');
    for (const m of code.matchAll(EXPORT_DECL_RE)) set.add(m[1]);
    for (const m of code.matchAll(EXPORT_LIST_RE)) if (!m[3]) for (const n of parseNames(m[1])) set.add(n.exported);
    if (/export\s+default\b/.test(code)) set.add('default');
  }
  externalExports.set(path, set);
  return set;
}

function localValues(code) {
  const set = new Set();
  for (const m of code.matchAll(DECL_RE)) set.add(m[1]);
  for (const m of code.matchAll(IMPORT_RE)) { if (m[1]) set.add(m[1]); if (m[2]) set.add(m[2]); if (m[3]) for (const n of parseNames(m[3])) set.add(n.exported); }
  return set;
}

let exportSets = new Map();
function exportsOf(path, seen = new Set()) {
  if (exportSets.has(path)) return exportSets.get(path);
  if (!modules.has(path)) return exportsOfExternal(path);
  if (seen.has(path)) return new Set();
  seen.add(path);
  const code = modules.get(path).code;
  const set = new Set();
  const locals = localValues(code);
  for (const m of code.matchAll(EXPORT_DECL_RE)) set.add(m[1]);
  for (const m of code.matchAll(EXPORT_LIST_RE)) {
    if (m[3]) { const target = resolveFrom(path, m[3]); const te = target ? exportsOf(target, seen) : new Set(); for (const n of parseNames(m[1])) if (te.has(n.local)) set.add(n.exported); }
    else for (const n of parseNames(m[1])) if (locals.has(n.local)) set.add(n.exported);
  }
  for (const m of code.matchAll(EXPORT_STAR_RE)) { if (m[1]) { set.add(m[1]); continue; } const target = resolveFrom(path, m[3]); if (target) for (const n of exportsOf(target, seen)) if (n !== 'default') set.add(n); }
  if (/export\s+default\b/.test(code)) set.add('default');
  return set;
}

function linkPass() {
  exportSets = new Map();
  for (const path of modules.keys()) exportSets.set(path, exportsOf(path));
  let changed = 0;
  for (const [path, mod] of modules) {
    const locals = localValues(mod.code);
    let code = mod.code;
    code = code.replace(IMPORT_RE, (m, def, ns, list, q, spec) => {
      if (!list && !def) return m;
      const target = resolveFrom(path, spec);
      const te = target ? exportsOf(target) : null;
      if (!te) return m;
      const names = list ? parseNames(list) : [];
      const kept = names.filter((n) => te.has(n.local));
      // `import quat, { … } from 'gl-matrix/quat'` — a TS esModuleInterop default over a namespace-style
      // module: native ESM has no default there, so the default binding becomes `import * as`.
      const nsDefault = def && !te.has('default') ? def : null;
      if (kept.length === names.length && !nsDefault) return m;
      const body = kept.map((n) => (n.local === n.exported ? n.local : `${n.local} as ${n.exported}`)).join(', ');
      const out = [];
      if (nsDefault) out.push(`import * as ${nsDefault} from ${q}${spec}${q};`);
      const defPart = def && !nsDefault ? def + (kept.length ? ', ' : '') : '';
      if (defPart || kept.length) out.push(`import ${defPart}${kept.length ? `{ ${body} }` : ''} from ${q}${spec}${q};`);
      if (!out.length) return `/* type-only import erased: ${spec} */`;
      return out.join(' ');
    });
    code = code.replace(EXPORT_LIST_RE, (m, list, q, spec) => {
      const names = parseNames(list);
      let kept;
      if (spec) { const target = resolveFrom(path, spec); const te = target ? exportsOf(target) : null; if (!te) return m; kept = names.filter((n) => te.has(n.local)); }
      else kept = names.filter((n) => locals.has(n.local));
      if (kept.length === names.length) return m;
      if (!kept.length) return `/* type-only export erased${spec ? ': ' + spec : ''} */`;
      const body = kept.map((n) => (n.local === n.exported ? n.local : `${n.local} as ${n.exported}`)).join(', ');
      return spec ? `export { ${body} } from ${q}${spec}${q};` : `export { ${body} };`;
    });
    if (code !== mod.code) { mod.code = code; changed++; }
  }
  return changed;
}
let passes = 0; while (linkPass() && passes < 8) passes++;
// verify the curated names really exist at runtime
for (const [f, names] of PURE_FUNCTIONS) { const set = exportsOf(join(OUT, 'functions', 'src', f)); for (const n of names) if (!set.has(n)) throw new Error(`strip-types: functions/src/${f} has no runtime export "${n}"`); }

// ---- write -------------------------------------------------------------------------------------
let wrote = 0, diff = 0;
for (const [path, mod] of modules) {
  const cur = existsSync(path) ? readFileSync(path, 'utf8') : null;
  if (cur === mod.code) continue;
  diff++;
  if (CHECK) continue;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, mod.code);
  wrote++;
}
// prune stale emitted files
for (const pkg of PKGS) { const dir = join(OUT, pkg, 'src'); if (!existsSync(dir)) continue; for (const f of walk(dir)) if (!modules.has(f)) { diff++; if (!CHECK) { rmSync(f); wrote++; } } }
if (CHECK) { console.log(diff ? `strip-types --check: ${diff} file(s) would change` : 'strip-types --check: ok'); process.exit(diff ? 1 : 0); }
console.log(`strip-types: ${modules.size} modules · ${passes} link pass(es) · ${wrote} file(s) written → vendor/gltf-transform/{core,extensions,functions}`);
