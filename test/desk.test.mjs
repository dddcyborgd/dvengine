/*! dvengine — desk tests (test/desk.test.mjs) · programmatic glTF → temp .glb → optimize/inspect/validate/gates through transform/desk.mjs · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © Don McCurdy (glTF-Transform, MIT) where derived */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESK = join(ROOT, 'transform', 'desk.mjs');
const V = (p) => pathToFileURL(join(ROOT, 'vendor', 'gltf-transform', p)).href;
const { Document, NodeIO } = await import(V('core/index.js'));
const { KHRONOS_EXTENSIONS } = await import(V('extensions/index.js'));

const tmp = mkdtempSync(join(tmpdir(), 'dvengine-desk-'));
/** Pack a JSONDocument into a GLB by hand (header + JSON chunk + BIN chunk) so unregistered extensions survive. */
function packGlb(jd) {
  const jsonBytes = Buffer.from(JSON.stringify(jd.json)); const jpad = (4 - (jsonBytes.length % 4)) % 4;
  const bin = Buffer.from(jd.resources['@glb.bin'] || new Uint8Array(0)); const bpad = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + jsonBytes.length + jpad + 8 + bin.length + bpad;
  const out = Buffer.alloc(total); let o = 0;
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8); o = 12;
  out.writeUInt32LE(jsonBytes.length + jpad, o); out.writeUInt32LE(0x4e4f534a, o + 4); o += 8; jsonBytes.copy(out, o); o += jsonBytes.length; out.fill(0x20, o, o + jpad); o += jpad;
  out.writeUInt32LE(bin.length + bpad, o); out.writeUInt32LE(0x004e4942, o + 4); o += 8; bin.copy(out, o); o += bin.length; out.fill(0, o, o + bpad);
  return out;
}

function desk(...args) { return JSON.parse(execFileSync(process.execPath, ['--no-warnings', DESK, ...args, '--json'], { encoding: 'utf8' })); }

/** A quad as two triangles with every vertex duplicated (6 verts, 4 unique) + a second unused mesh. */
async function makeGlb(path) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]);
  const acc = doc.createAccessor('pos').setType('VEC3').setArray(pos).setBuffer(buf);
  const mat = doc.createMaterial('paint').setBaseColorFactor([1, 0.5, 0.25, 1]);
  const prim = doc.createPrimitive().setAttribute('POSITION', acc).setMaterial(mat);
  const mesh = doc.createMesh('quad').addPrimitive(prim);
  const node = doc.createNode('quadNode').setMesh(mesh).setTranslation([0, 1, 0]);
  doc.createScene('main').addChild(node);
  doc.createMesh('orphan'); // pruned by prune()
  const anim = doc.createAnimation('bob');
  const input = doc.createAccessor('t').setType('SCALAR').setArray(new Float32Array([0, 0.5, 1])).setBuffer(buf);
  const output = doc.createAccessor('v').setType('VEC3').setArray(new Float32Array([0, 1, 0, 0, 2, 0, 0, 1, 0])).setBuffer(buf);
  const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
  const channel = doc.createAnimationChannel().setTargetNode(node).setTargetPath('translation').setSampler(sampler);
  anim.addSampler(sampler).addChannel(channel);
  const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
  writeFileSync(path, await io.writeBinary(doc));
  return io;
}

test('optimize: dedup,prune,weld drops duplicated vertices and the output re-reads', async () => {
  const src = join(tmp, 'quad.glb'); const out = join(tmp, 'quad.opt.glb');
  const io = await makeGlb(src);
  const r = desk('optimize', src, `--out=${out}`, '--ops=dedup,prune,weld');
  assert.deepEqual(r.ops, ['dedup', 'prune', 'weld']);
  assert.equal(r.before.vertices, 6);
  assert.equal(r.after.vertices, 4, 'weld merges the duplicated vertices');
  assert.ok(existsSync(out));
  const doc = await io.read(out);
  assert.equal(doc.getRoot().listMeshes().length, 1, 'prune removed the orphan mesh');
  assert.equal(doc.getRoot().listMeshes()[0].listPrimitives()[0].getAttribute('POSITION').getCount(), 4);
});

test('optimize: a gated op is refused with its verdict', async () => {
  const src = join(tmp, 'gated.glb'); await makeGlb(src);
  assert.throws(() => desk('optimize', src, '--ops=draco'), /unavailable: needs/);
});

test('inspect: counts scenes, meshes, primitives, vertices, triangles, materials, animations', async () => {
  const src = join(tmp, 'inspect.glb'); await makeGlb(src);
  const r = desk('inspect', src);
  assert.equal(r.asset.version, '2.0');
  assert.equal(r.counts.scenes, 1);
  assert.equal(r.counts.meshes, 2);
  assert.equal(r.counts.primitives, 1);
  assert.equal(r.counts.vertices, 6);
  assert.equal(r.counts.triangles, 2);
  assert.equal(r.counts.materials, 1);
  assert.equal(r.counts.animations, 1);
  assert.equal(r.meshes[0].name, 'quad');
  assert.equal(r.materials[0].color, '#ff8040');
  assert.equal(r.animations[0].name, 'bob');
  assert.equal(r.animations[0].duration, 1);
  assert.ok(Array.isArray(r.extensions.used));
});

test('bake: glTF clips → awe anims JSON with tracks, hash and url; fbx is unavailable', async () => {
  const src = join(tmp, 'anim.glb'); await makeGlb(src);
  const r = desk('bake', src, `--out=${join(tmp, 'anims')}`);
  assert.equal(r.count, 1);
  const clip = r.clips[0];
  assert.equal(clip.name, 'bob'); assert.equal(clip.trackCount, 1); assert.match(clip.hash, /^[0-9a-f]{64}$/); assert.equal(clip.url, '/assets/anims/bob.json');
  const json = JSON.parse(readFileSync(clip.outputPath, 'utf8'));
  assert.equal(json.tracks[0].name, 'quadNode.position'); assert.equal(json.tracks[0].type, 'vector'); assert.equal(json.tracks[0].times.length, 3); assert.equal(json.duration, 1);
  const fbx = join(tmp, 'x.fbx'); writeFileSync(fbx, 'not really');
  const f = desk('bake', fbx);
  assert.equal(f.success, false); assert.match(f.unavailable, /FBXLoader needs a DOM/);
});

test('vrm: VRMC extensions pass through read → transform → write', async () => {
  const src = join(tmp, 'avatar.vrm'); const io = await makeGlb(src);
  // inject a VRMC_vrm block + a per-node constraint into the JSON and rewrite as .vrm (a GLB)
  const jd = await io.binaryToJSON(new Uint8Array(readFileSync(src)));
  jd.json.extensionsUsed = [...(jd.json.extensionsUsed || []), 'VRMC_vrm', 'VRMC_node_constraint'];
  jd.json.extensions = { VRMC_vrm: { specVersion: '1.0', meta: { name: 'dv', thumbnailImage: 0 }, humanoid: { humanBones: { hips: { node: 0 } } } } };
  jd.json.nodes[0].extensions = { VRMC_node_constraint: { specVersion: '1.0', constraint: { roll: { source: 0, rollAxis: 'X', weight: 1 } } } };
  writeFileSync(src, packGlb(jd)); // packed by hand: an IO without the VRMC classes would strip them on read
  const r = desk('vrm', src, `--out=${join(tmp, 'avatar_compressed.glb')}`);
  assert.deepEqual(r.preserved.sort(), ['VRMC_node_constraint', 'VRMC_vrm']);
  const out = await io.readAsJSON(r.out);
  assert.equal(out.json.extensions.VRMC_vrm.humanoid.humanBones.hips.node, 0);
  assert.equal(out.json.extensions.VRMC_vrm.meta.thumbnailImage, null, 'thumbnail reference nulled like upstream');
  assert.equal(out.json.nodes[0].extensions.VRMC_node_constraint.constraint.roll.rollAxis, 'X');
  assert.ok(out.json.extensionsUsed.includes('VRMC_vrm'));
});

test('validate: flags an unknown component type, passes the legacy static scene', () => {
  const bad = join(tmp, 'bad.json');
  writeFileSync(bad, JSON.stringify({ format: 'cyborg-space/1', id: 'bad-space', components: { a: { id: 'a', type: 'mesh' }, b: { id: 'b', type: 'hologram', parentId: 'a' }, c: { id: 'c', type: 'model', data: { url: '/missing/thing.glb' } } } }));
  const r = desk('validate', bad);
  assert.equal(r.valid, false);
  assert.deepEqual(r.unknownTypes, ['hologram']);
  assert.ok(r.errors.some((e) => /unknown type 'hologram'/.test(e)));
  assert.ok(r.warnings.some((w) => /missing local file/.test(w)));
  const legacy = desk('validate', join(ROOT, 'legacy', 'static-scene.json'));
  assert.match(legacy.format, /static-scene\.json/);
  assert.equal(legacy.components, 8);
  assert.ok(legacy.errors.every((e) => /unknown type/.test(e)), 'only manifest gaps may fail the legacy scene: ' + legacy.errors.join('; '));
});

test('gates: every pure op is on, wasm/native ops are off with a reason', () => {
  const rows = desk('gates');
  const pure = rows.filter((r) => r.portable === 'pure');
  assert.ok(pure.length >= 20);
  for (const r of pure) assert.equal(r.enabled, true, r.op);
  for (const op of ['dedup', 'prune', 'weld', 'quantize', 'inspect']) assert.ok(pure.find((r) => r.op === op), op);
  for (const r of rows.filter((r) => r.portable !== 'pure')) { assert.equal(r.enabled, false, r.op); assert.match(r.reason, /unavailable: needs/); }
});
