// dvengine — components/aivatar/index.js pure helpers (DVAivatar): walk phase, shortest-arc turn, dims → look, the say queue, the arcball arm · node --test (no three.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../verse/arcball.math.js');     // attaches globalThis.DVArcballMath — the arm reads it at use time
const A = require('../components/aivatar/index.js');

test('registers nothing without DVEngine but exposes the helpers', () => {
  assert.equal(typeof A.walkPhase, 'function'); assert.equal(typeof A.buildRig, 'function'); assert.ok(A.EMOTIONS.joy); assert.equal(A.SAY_MS, 4000);
  assert.deepEqual(Object.keys(A.GESTURES), ['greet', 'nod', 'wave', 'think']);
});

test('walkPhase: one cycle per stride', () => {
  assert.ok(Math.abs(A.walkPhase(0, 0.9) - Math.PI * 2) < 1e-12);
  assert.ok(Math.abs(A.walkPhase(1, 0.45, 0.9) - (1 + Math.PI)) < 1e-12);
  assert.equal(A.walkPhase(2, 0), 2);
});

test('turnToward takes the shortest arc and never overshoots', () => {
  const a = A.turnToward(3.0, -3.0, 0.1);   // shortest way is through π (+0.28), not −6
  assert.ok(a > 3.0 && a <= 3.1);
  assert.ok(Math.abs(A.turnToward(0, 0.05, 0.1) - 0.05) < 1e-12, 'within the step → arrives exactly');
  assert.ok(Math.abs(A.turnToward(0, -1, 0.25) + 0.25) < 1e-12);
  assert.ok(Math.abs(A.yawTo({ x: 0, z: 0 }, { x: 1, z: 0 }) - Math.PI / 2) < 1e-12, '+x target → yaw π/2 for a +z face');
  assert.ok(Math.abs(A.yawTo({ x: 0, z: 0 }, { x: 0, z: -1 })) - Math.PI < 1e-12);
});

test('dimsStyle: dims[0] → hue, 1 + 0.2·dims[1] → scale (clamped), dims[2] → idle speed; the seed fills gaps deterministically', () => {
  const s = A.dimsStyle([0.5, 1, 0.25], 7);
  assert.ok(Math.abs(s.hue - 180) < 1e-9); assert.ok(Math.abs(s.scale - 1.2) < 1e-9); assert.ok(Math.abs(s.idleSpeed - 0.8) < 1e-9);
  assert.equal(A.dimsStyle([0, 10, 0]).scale, 1.6); assert.equal(A.dimsStyle([0, -10, 0]).scale, 0.7);
  assert.equal(A.dimsStyle([1.25, 0, 0]).hue, 90, 'fractional part of the dim');
  assert.match(s.tint, /^#[0-9a-f]{6}$/);
  assert.deepEqual(A.dimsStyle(null, 42), A.dimsStyle(null, 42)); assert.notDeepEqual(A.dimsStyle(null, 42), A.dimsStyle(null, 43));
});

test('SayQueue: one line at a time, 4 s each, in order', () => {
  let now = 0;
  const q = new A.SayQueue({ now: () => now });
  assert.equal(q.current(), null);
  q.push('one', 'joy'); q.push('two');
  assert.equal(q.current().text, 'one'); assert.equal(q.current().emotion, 'joy');
  now = 3999; assert.equal(q.current().text, 'one');
  now = 4000; assert.equal(q.current().text, 'two'); assert.equal(q.current().emotion, 'neutral');
  now = 8000; assert.equal(q.current(), null);
  q.push('three'); assert.equal(q.current().text, 'three'); q.clear(); assert.equal(q.current(), null);
});

test('armFor uses the arcball surface when DVArcballMath is loaded', () => {
  assert.ok(globalThis.DVArcballMath === M);
  const a = A.armFor({ x: 0, y: 0, z: 0.6 }, { radius: 0.7, near: 0.9, far: 3.2 });
  assert.equal(a.extend, 1); assert.equal(a.sheet, 'sphere');
  const side = A.armFor({ x: 2, y: 0, z: 0.2 }, { radius: 0.7 }); assert.equal(side.sheet, 'hyperboloid'); assert.ok(side.yaw > 0);
  assert.equal(A.armFor({ x: 0, y: 0, z: 9 }).extend, 0);
  // without the math: the straight-line fallback keeps the same contract
  const saved = globalThis.DVArcballMath; globalThis.DVArcballMath = null;
  const f = A.armFor({ x: 0, y: 0, z: 0.6 }); assert.equal(f.extend, 1); assert.equal(f.sheet, 'line');
  globalThis.DVArcballMath = saved;
});
