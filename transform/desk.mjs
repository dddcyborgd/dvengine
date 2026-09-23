#!/usr/bin/env node
/*! dvengine — transform desk (transform/desk.mjs) · the Node asset desk over the vendored glTF-Transform: optimize · inspect · validate · bake · vrm · gates — zero npm deps, Node 24 · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © Don McCurdy (glTF-Transform, MIT) / © oncyberio (awe packages/tools, MIT) where derived */
/*
 *   node transform/desk.mjs optimize <in.glb|gltf> [--out=<file>] [--ops=dedup,prune,weld,quantize] [--json]
 *   node transform/desk.mjs inspect  <in.glb|gltf> [--json]
 *   node transform/desk.mjs validate <scene.json>  [--public=<dir>] [--json]     cyborg-space/1 or awe static-scene.json
 *   node transform/desk.mjs bake     <in.glb|gltf> [--out=<dir>] [--name=<n>] [--json]   glTF clips → awe anims JSON (.fbx: unavailable)
 *   node transform/desk.mjs vrm      <in.vrm|glb>  [--out=<file>] [--json]     VRMC_* / VRM kept as pass-through
 *   node transform/desk.mjs gates    [--json]
 *
 * Ports: awe packages/tools inspect-gltf.ts · scene/validate-scene.ts · bake/bake-animation.ts · vrm/* · gltf/optimize-gltf.ts
 * (the pure subset; draco/meshopt/sharp/toktx are gated in transform/gates.mjs).
 */
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gates, loadOp, table, ROOT } from './gates.mjs';

const V = (p) => pathToFileURL(join(ROOT, 'vendor', 'gltf-transform', p)).href;
const core = await import(V('core/index.js'));
const { Document, NodeIO, Extension, Logger, VertexLayout } = core;
const { KHRONOS_EXTENSIONS } = await import(V('extensions/index.js'));
const fns = await import(V('functions/index.js'));
const require = createRequire(import.meta.url);

// ---- args ------------------------------------------------------------------------------------
export function parseArgs(argv) {
  const positional = [], flags = {};
  for (const a of argv) {
    if (a.startsWith('--')) { const eq = a.indexOf('='); if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1); else if (a.startsWith('--no-')) flags[a.slice(5)] = false; else flags[a.slice(2)] = true; }
    else positional.push(a);
  }
  return { positional, flags };
}
const silent = () => new Logger(Logger.Verbosity.SILENT);
function io(extra = []) { return new NodeIO().registerExtensions(KHRONOS_EXTENSIONS).registerExtensions(extra); }
const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
const GLB_MAGIC = 0x46546c67; // 'glTF'
function isGLB(bytes) { return bytes.length >= 12 && new DataView(bytes.buffer, bytes.byteOffset, 12).getUint32(0, true) === GLB_MAGIC; }
/** read by CONTENT, not extension: .vrm / .glb / anything with the glTF magic is binary, else JSON glTF */
async function readAnyJSON(nio, p) { const bytes = readFileSync(p); return isGLB(bytes) ? nio.binaryToJSON(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)) : nio.readAsJSON(p); }
async function readAny(nio, p) { return nio.readJSON(await readAnyJSON(nio, p)); }
function need(input, exts) { if (!input) throw new Error('input path required'); const p = resolve(input); if (!existsSync(p)) throw new Error(`File not found: ${p}`); const e = extname(p).toLowerCase(); if (exts && !exts.includes(e)) throw new Error(`File must be ${exts.join('/')} (got ${e || 'none'})`); return p; }

// ---- inspect (port of tools inspect-gltf.ts, over the glTF-Transform document instead of three) ----
export async function inspect(input) {
  const p = need(input, ['.glb', '.gltf', '.vrm']);
  const nio = io([VRMPassthrough.VRM, VRMPassthrough.VRMC_vrm, VRMPassthrough.VRMC_springBone, VRMPassthrough.VRMC_materials_mtoon, VRMPassthrough.VRMC_node_constraint]).setLogger(silent());
  const jsonDoc = await readAnyJSON(nio, p);
  const json = jsonDoc.json;
  const doc = await nio.readJSON(jsonDoc);
  doc.setLogger(silent());
  const rep = fns.inspect(doc);
  const root = doc.getRoot();
  const meshes = root.listMeshes().map((m) => {
    const prims = m.listPrimitives();
    let vertices = 0, triangles = 0;
    for (const pr of prims) { const pos = pr.getAttribute('POSITION'); vertices += pos ? pos.getCount() : 0; triangles += fns.getGLPrimitiveCount(pr); }
    return { name: m.getName() || '(unnamed)', primitives: prims.length, vertices, triangles, materials: [...new Set(prims.map((pr) => (pr.getMaterial() ? pr.getMaterial().getName() || '(unnamed)' : '(none)')))], attributes: [...new Set(prims.flatMap((pr) => pr.listSemantics()))], skinned: root.listSkins().length > 0 && root.listNodes().some((n) => n.getMesh() === m && n.getSkin()) };
  });
  const materials = root.listMaterials().map((m) => { const c = m.getBaseColorFactor(); return { name: m.getName() || '(unnamed)', color: '#' + c.slice(0, 3).map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join(''), roughness: m.getRoughnessFactor(), metalness: m.getMetallicFactor(), alphaMode: m.getAlphaMode(), doubleSided: m.getDoubleSided(), textures: fns.listTextureSlots(m) }; });
  const textures = rep.textures.properties.map((t) => ({ name: t.name || '(unnamed)', uri: t.uri, mimeType: t.mimeType, resolution: t.resolution, size: t.size, slots: t.slots, instances: t.instances }));
  const animations = root.listAnimations().map((a) => { let duration = 0; for (const s of a.listSamplers()) { const inp = s.getInput(); if (inp) duration = Math.max(duration, inp.getMax([0])[0]); } return { name: a.getName() || '(unnamed)', duration, trackCount: a.listChannels().length, samplers: a.listSamplers().length }; });
  const bones = root.listSkins().flatMap((s) => s.listJoints().map((j) => j.getName() || '(unnamed)'));
  const st = statSync(p);
  return {
    file: { path: input, size: st.size, sizeFormatted: fmtBytes(st.size) },
    asset: { version: json.asset?.version || '2.0', generator: json.asset?.generator || '', copyright: json.asset?.copyright },
    extensions: { used: json.extensionsUsed || [], required: json.extensionsRequired || [] },
    counts: { scenes: root.listScenes().length, nodes: root.listNodes().length, meshes: meshes.length, primitives: meshes.reduce((a, m) => a + m.primitives, 0), vertices: meshes.reduce((a, m) => a + m.vertices, 0), triangles: meshes.reduce((a, m) => a + m.triangles, 0), materials: materials.length, textures: textures.length, animations: animations.length, skins: root.listSkins().length },
    scenes: rep.scenes.properties.map((s) => ({ name: s.name, rootName: s.rootName, bboxMin: s.bboxMin, bboxMax: s.bboxMax })),
    meshes, materials, textures, animations,
    skeleton: bones.length ? { boneCount: bones.length, bones } : null,
  };
}

// ---- optimize (pure subset of tools optimize-gltf.ts) -----------------------------------------
export async function optimize(input, { out, ops } = {}) {
  const p = need(input, ['.glb', '.gltf']);
  const names = (ops || 'dedup,prune,weld,quantize').split(',').map((s) => s.trim()).filter(Boolean);
  const transforms = [];
  for (const n of names) transforms.push([n, await loadOp(n)]);
  const nio = io().setLogger(silent());
  const doc = await readAny(nio, p); doc.setLogger(silent());
  const count = (d) => { let v = 0; for (const m of d.getRoot().listMeshes()) for (const pr of m.listPrimitives()) { const a = pr.getAttribute('POSITION'); v += a ? a.getCount() : 0; } return v; };
  const before = { vertices: count(doc), bytes: statSync(p).size, accessors: doc.getRoot().listAccessors().length };
  await doc.transform(...transforms.map(([, f]) => f()));
  const outPath = resolve(out || p.replace(/\.(glb|gltf)$/i, '.opt.$1'));
  mkdirSync(dirname(outPath), { recursive: true });
  await nio.write(outPath, doc);
  const after = { vertices: count(doc), bytes: statSync(outPath).size, accessors: doc.getRoot().listAccessors().length };
  return { input, out: outPath, ops: names, before, after, saved: before.bytes - after.bytes };
}

// ---- validate (port of tools scene/validate-scene.ts against DVScene + components/manifest.json) ----
export function validate(input, { public: publicDir } = {}) {
  const p = need(input, ['.json']);
  const DVScene = require(join(ROOT, 'engine', 'scene.js'));
  const manifest = JSON.parse(readFileSync(join(ROOT, 'components', 'manifest.json'), 'utf8'));
  const known = new Set(manifest.components.map((c) => c.type));
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  const legacy = raw.format !== DVScene.FORMAT;
  const doc = legacy ? DVScene.fromLegacy(raw) : raw;
  const res = DVScene.validate(doc);
  const errors = res.errors.slice(), warnings = [], unknownTypes = [];
  const comps = doc.components || {};
  const pub = resolve(publicDir || dirname(p));
  for (const c of Object.values(comps)) {
    if (!c || typeof c !== 'object') continue;
    if (c.type && !known.has(c.type)) { unknownTypes.push(c.type); errors.push(`component ${c.id}: unknown type '${c.type}' (not in components/manifest.json)`); }
    // circular parent chains
    const seen = new Set(); let cur = c.id;
    while (cur) { if (seen.has(cur)) { errors.push(`component ${c.id}: circular parent reference`); break; } seen.add(cur); cur = comps[cur] && comps[cur].parentId; }
    // model/avatar urls
    if (c.type === 'model' || c.type === 'avatar') {
      const url = (c.data && c.data.url) || c.url;
      if (url) {
        if (url.startsWith('/') || url.startsWith('./')) { const f = join(pub, url.replace(/^\.?\//, '')); if (!existsSync(f)) warnings.push(`component ${c.id}: references missing local file: ${url}`); }
        else if (!/^https?:\/\//.test(url) && !/^ipfs:\/\//.test(url)) warnings.push(`component ${c.id}: unusual URL format: ${url}`);
      }
    }
    if (c.type === 'vrmanims' || c.type === 'vrm-anims') {
      const anims = (c.data && c.data.anims) || c.anims || {};
      for (const a of Object.values(anims)) { const url = a && a.url; if (url && url.startsWith('/') && !existsSync(join(pub, url.slice(1)))) warnings.push(`animation '${a.name}' references missing file: ${url}`); }
    }
  }
  if (!Object.values(comps).some((c) => c && (c.type === 'spawn' || c.type === 'destination'))) warnings.push('No spawn point / destination component found in scene');
  return { input, format: legacy ? 'awe static-scene.json → ' + DVScene.FORMAT : DVScene.FORMAT, valid: errors.length === 0, errors, warnings, unknownTypes: [...new Set(unknownTypes)], components: Object.keys(comps).length, sceneHash: errors.length === 0 ? DVScene.digest(doc) : null };
}

// ---- bake (port of tools bake/bake-animation.ts — glTF clips; FBX needs a DOM) -----------------
function normalizeMixamo(name) { const m = /^mixamorig\d+([A-Z].*)$/.exec(name); return m ? `mixamorig${m[1]}` : name; }
function normalizeTrack(name) { const i = name.indexOf('.'); if (i < 0) return normalizeMixamo(name); return `${normalizeMixamo(name.slice(0, i))}.${name.slice(i + 1)}`; }
function stable(o) { if (typeof o !== 'object' || o === null) return JSON.stringify(o); if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']'; return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}'; }
function hashOf(clip) { const { name, uuid, ...rest } = clip; return createHash('sha256').update(stable(rest)).digest('hex'); }
const PATHS = { translation: ['position', 'vector'], rotation: ['quaternion', 'quaternion'], scale: ['scale', 'vector'], weights: ['morphTargetInfluences', 'number'] };

export async function bake(input, { out, name, loop = true, sync = false, timeScale = 1 } = {}) {
  const p = need(input);
  const ext = extname(p).toLowerCase();
  if (ext === '.fbx') return { success: false, unavailable: 'FBXLoader needs a DOM — bake FBX in the browser (studio assets panel) or convert to glTF first', input };
  if (!['.glb', '.gltf', '.vrm'].includes(ext)) throw new Error(`bake: .glb/.gltf/.vrm expected (got ${ext})`);
  const nio = io().setLogger(silent());
  const doc = await readAny(nio, p); doc.setLogger(silent());
  const outDir = resolve(out || dirname(p));
  mkdirSync(outDir, { recursive: true });
  const clips = [];
  const anims = doc.getRoot().listAnimations();
  anims.forEach((a, idx) => {
    const raw = (name && anims.length === 1 ? name : a.getName() || `${basename(p).replace(/\.[^.]+$/, '')}_${idx}`);
    const clipName = raw.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    let duration = 0; const tracks = [];
    for (const ch of a.listChannels()) {
      const s = ch.getSampler(), node = ch.getTargetNode(); if (!s || !node) continue;
      const [prop, type] = PATHS[ch.getTargetPath()] || [ch.getTargetPath(), 'number'];
      const times = Array.from(s.getInput().getArray()), values = Array.from(s.getOutput().getArray());
      duration = Math.max(duration, times.length ? times[times.length - 1] : 0);
      tracks.push({ name: normalizeTrack(`${node.getName() || 'node'}.${prop}`), type, times, values, interpolation: s.getInterpolation() });
    }
    const clip = { name: clipName, duration, tracks, uuid: null, blendMode: 2500 };
    clip.uuid = hashOf(clip).slice(0, 32);
    const hash = hashOf(clip);
    const outputPath = join(outDir, `${clipName}.json`);
    writeFileSync(outputPath, JSON.stringify(clip, null, 2));
    clips.push({ success: tracks.length > 0, name: clipName, outputPath, hash, url: `/assets/anims/${clipName}.json`, trackCount: tracks.length, loop, sync, timeScale });
  });
  return { input, clips, count: clips.length, success: clips.length > 0 && clips.every((c) => c.success) };
}

// ---- vrm (port of tools vrm/vrm-extensions.ts + vrm-processing.ts; pure subset) --------------
/** Pass-through Extension class factory: keeps a root-level (and per-node / per-material) extension block byte-for-byte across read → transform → write. */
export function VRMPassthrough(extName, { nodeLevel = false, materialLevel = false, nullThumb = false } = {}) {
  const Cls = class extends Extension {
    static EXTENSION_NAME = extName;
    extensionName = extName;
    read(ctx) {
      const json = ctx.jsonDoc.json, root = this.document.getRoot(), extras = { ...(root.getExtras() || {}) };
      if (json.extensions && json.extensions[extName]) { const block = JSON.parse(JSON.stringify(json.extensions[extName])); if (nullThumb && block.meta) { if ('texture' in block.meta) block.meta.texture = null; if ('thumbnailImage' in block.meta) block.meta.thumbnailImage = null; } extras[extName] = block; }
      if (nodeLevel) { const per = {}; (json.nodes || []).forEach((n, i) => { if (n.extensions && n.extensions[extName]) per[i] = n.extensions[extName]; }); if (Object.keys(per).length) extras[extName + ':nodes'] = per; }
      if (materialLevel) { const per = {}; (json.materials || []).forEach((m, i) => { if (m.extensions && m.extensions[extName]) per[i] = m.extensions[extName]; }); if (Object.keys(per).length) extras[extName + ':materials'] = per; }
      root.setExtras(extras);
      return this;
    }
    write(ctx) {
      const json = ctx.jsonDoc.json, extras = this.document.getRoot().getExtras() || {};
      if (extras[extName]) { json.extensions = json.extensions || {}; json.extensions[extName] = extras[extName]; }
      if (nodeLevel && extras[extName + ':nodes']) for (const [i, data] of Object.entries(extras[extName + ':nodes'])) { const n = (json.nodes || [])[+i]; if (n) { n.extensions = n.extensions || {}; n.extensions[extName] = data; } }
      if (materialLevel && extras[extName + ':materials']) for (const [i, data] of Object.entries(extras[extName + ':materials'])) { const m = (json.materials || [])[+i]; if (m) { m.extensions = m.extensions || {}; m.extensions[extName] = data; } }
      return this;
    }
  };
  Object.defineProperty(Cls, 'name', { value: 'VRMPassthrough_' + extName });
  return Cls;
}
VRMPassthrough.VRM = VRMPassthrough('VRM', { nullThumb: true, materialLevel: true });
VRMPassthrough.VRMC_vrm = VRMPassthrough('VRMC_vrm', { nullThumb: true });
VRMPassthrough.VRMC_springBone = VRMPassthrough('VRMC_springBone');
VRMPassthrough.VRMC_materials_mtoon = VRMPassthrough('VRMC_materials_mtoon', { materialLevel: true });
VRMPassthrough.VRMC_node_constraint = VRMPassthrough('VRMC_node_constraint', { nodeLevel: true });
VRMPassthrough.ALL = [VRMPassthrough.VRM, VRMPassthrough.VRMC_vrm, VRMPassthrough.VRMC_springBone, VRMPassthrough.VRMC_materials_mtoon, VRMPassthrough.VRMC_node_constraint];

export async function vrm(input, { out } = {}) {
  const p = need(input, ['.vrm', '.glb', '.gltf']);
  const nio = io(VRMPassthrough.ALL).setLogger(silent());
  nio.setVertexLayout(VertexLayout.SEPARATE);
  const doc = await readAny(nio, p); doc.setLogger(silent());
  const used = doc.getRoot().listExtensionsUsed().map((e) => e.extensionName);
  await doc.transform(fns.metalRough(), fns.resample(), fns.dedup());
  const outPath = resolve(out || p.replace(/\.[^.]+$/, '') + '_compressed.glb');
  mkdirSync(dirname(outPath), { recursive: true });
  await nio.write(outPath, doc);
  return { input, out: outPath, bytes: statSync(outPath).size, extensionsIn: used, preserved: used.filter((n) => /^VRM/.test(n)), ops: ['metalRough', 'resample', 'dedup'], skipped: { textureResize: 'unavailable: needs ndarray-pixels (native lane)', toktx: 'unavailable: needs ktx-software' } };
}

// ---- CLI -----------------------------------------------------------------------------------
function usage() {
  return `dvengine transform desk\n  node transform/desk.mjs <optimize|inspect|validate|bake|vrm|gates> <in> [--out=] [--ops=dedup,prune,weld,quantize] [--public=<dir>] [--name=] [--json]`;
}
export async function main(argv) {
  const { positional, flags } = parseArgs(argv);
  const [cmd, input] = positional;
  switch (cmd) {
    case 'optimize': return optimize(input, { out: flags.out, ops: flags.ops });
    case 'inspect': return inspect(input);
    case 'validate': return validate(input, { public: flags.public });
    case 'bake': return bake(input, { out: flags.out, name: flags.name });
    case 'vrm': return vrm(input, { out: flags.out });
    case 'gates': return gates();
    default: throw new Error(usage());
  }
}
function human(cmd, r) {
  if (cmd === 'gates') return table(r);
  if (cmd === 'optimize') return `optimize ${r.input} → ${r.out}\n  ops: ${r.ops.join(', ')}\n  vertices ${r.before.vertices} → ${r.after.vertices} · bytes ${r.before.bytes} → ${r.after.bytes} (${r.saved >= 0 ? '-' : '+'}${Math.abs(r.saved)})`;
  if (cmd === 'validate') return `${r.valid ? 'VALID' : 'INVALID'} ${r.input} (${r.format}, ${r.components} components)` + r.errors.map((e) => `\n  error: ${e}`).join('') + r.warnings.map((w) => `\n  warn:  ${w}`).join('');
  if (cmd === 'inspect') return `${r.file.path} ${r.file.sizeFormatted} · glTF ${r.asset.version} ${r.asset.generator}\n  ${Object.entries(r.counts).map(([k, v]) => `${k} ${v}`).join(' · ')}\n  extensions: ${r.extensions.used.join(', ') || '—'}` + r.meshes.map((m) => `\n  mesh ${m.name}: ${m.primitives} prim · ${m.vertices} v · ${m.triangles} tri · ${m.attributes.join(' ')}`).join('') + r.animations.map((a) => `\n  anim ${a.name}: ${a.duration.toFixed(3)}s · ${a.trackCount} tracks`).join('');
  return JSON.stringify(r, null, 2);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  main(argv).then((r) => { console.log(json ? JSON.stringify(r, null, 2) : human(argv[0], r)); }, (e) => { console.error(json ? JSON.stringify({ error: true, message: e.message }) : 'desk: ' + e.message); process.exit(1); });
}
