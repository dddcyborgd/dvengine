// dvengine — editors/index.js (DVEditors) + the 45 generated editors/<type>/index.js + editors/registry.json · node --test (no three.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ED = require('../editors/index.js');
const registry = JSON.parse(readFileSync(new URL('../editors/registry.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../components/manifest.json', import.meta.url), 'utf8'));
const KINDS = new Set(ED.KINDS);

test('every component folder has an editor that registers at load, and the registry lists all 45', () => {
  const dirs = readdirSync(new URL('../components/', import.meta.url), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.equal(dirs.length, 45);
  for (const t of dirs) { const s = require(`../editors/${t}/index.js`); assert.equal(s.type, t); assert.ok(ED.has(t), t + ' registered'); }
  assert.deepEqual(ED.types(), dirs);
  assert.equal(registry.count, 45); assert.deepEqual(Object.keys(registry.editors).sort(), dirs);
  assert.ok(manifest.components.every((c) => ED.has(c.type)), 'each manifest type has an editor');
});

test('rows: the fixed shape, known kinds, transform first, enums carry options and a default among them', () => {
  for (const t of ED.types()) {
    const rows = ED.get(t).rows;
    assert.deepEqual(rows.slice(0, 3).map((r) => r.key), ['position', 'rotation', 'scale'], t + ' transform rows first');
    for (const r of rows) {
      for (const k of ['key', 'kind', 'min', 'max', 'step', 'options', 'default', 'label', 'group']) assert.ok(k in r, `${t}.${r.key} has ${k}`);
      assert.ok(KINDS.has(r.kind), `${t}.${r.key} kind ${r.kind}`);
      if (r.kind === 'enum') { assert.ok(r.options.length > 0); if (r.default != null) assert.ok(r.options.includes(r.default)); }
      if (r.kind === 'number' || r.kind === 'int') assert.ok(r.min <= r.max && r.step > 0, `${t}.${r.key} range`);
    }
  }
  const mesh = ED.get('mesh'); const shape = mesh.rows.find((r) => r.key === 'shape');
  assert.equal(shape.kind, 'enum'); assert.deepEqual(shape.options, ['box', 'sphere', 'torus', 'cylinder']);
  assert.equal(mesh.rows.find((r) => r.key === 'color').kind, 'color'); assert.equal(mesh.rows.find((r) => r.key === 'spin').default, true);
  assert.equal(ED.get('lighting').rows.find((r) => r.key === 'sunPosition').kind, 'vec3');
  assert.equal(ED.get('model').rows.find((r) => r.key === 'url').kind, 'asset');
  assert.equal(ED.get('background').rows.find((r) => r.key === 'top').kind, 'color', 'a 0x literal default is a colour');
  assert.equal(ED.get('portal').upstream, 'DeltaVerse-native'); assert.match(ED.get('fog').upstream, /oncyberio\/awe.*components\/fog$/);
});

test('defaults() and coerce()', () => {
  const d = ED.defaults('mesh'); assert.equal(d.shape, 'box'); assert.equal(d.metalness, 0.2); assert.deepEqual(d.scale, { x: 1, y: 1, z: 1 });
  assert.equal(ED.coerce({ kind: 'number', default: 1 }, '2.5'), 2.5); assert.equal(ED.coerce({ kind: 'int' }, '2.6'), 3);
  assert.equal(ED.coerce({ kind: 'bool' }, 'true'), true); assert.equal(ED.coerce({ kind: 'bool' }, 'no'), false);
  assert.equal(ED.coerce({ kind: 'color' }, '#4dd0e1'), 0x4dd0e1); assert.equal(ED.hex(0x4dd0e1), '#4dd0e1');
  assert.deepEqual(ED.coerce({ kind: 'vec3' }, '1, 2 3'), { x: 1, y: 2, z: 3 });
  assert.equal(ED.coerce({ kind: 'enum', options: ['a', 'b'], default: 'a' }, 'zzz'), 'a');
  assert.deepEqual(ED.coerce({ kind: 'string', json: true }, '[1,2]'), [1, 2]);
});
