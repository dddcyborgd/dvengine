// dvengine — net/interp.js: SnapshotBuffer + TransformSync (pure, no three.js) · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { SnapshotBuffer, TransformSync, constants, lerpAngle, angleDelta } = require('../net/interp.js');

const S = (x, y = 0, z = 0, ry = 0, t = 0) => ({ position: { x, y, z }, rotation: { x: 0, y: ry, z: 0 }, updatedAt: t });

test('constants: 20 Hz → 200 ms buffer, 100 ms extrapolation, awe smoothing values', () => {
  const C = constants(20);
  assert.equal(C.TICK_INTERVAL, 50); assert.equal(C.INTERPOLATION_BUFFER_MS, 200); assert.equal(C.MAX_EXTRAPOLATION_MS, 100);
  assert.equal(C.OFFSET_SMOOTHING, 0.1); assert.equal(C.OFFSET_SNAP_THRESHOLD_MS, 250); assert.equal(C.POSITION_SMOOTHING_SPEED, 18); assert.equal(C.ROTATION_SMOOTHING_SPEED, 22);
  assert.equal(constants(30).INTERPOLATION_BUFFER_MS, 150);
});

test('lerpAngle takes the shortest arc; angleDelta wraps', () => {
  const a = 0.1, b = Math.PI * 2 - 0.1;
  assert.ok(Math.abs(angleDelta(a, b) + 0.2) < 1e-9);
  const mid = lerpAngle(a, b, 0.5);
  assert.ok(Math.abs(((mid % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) < 1e-9);
  assert.ok(Math.abs(lerpAngle(0, Math.PI / 2, 0.5) - Math.PI / 4) < 1e-9);
});

test('SnapshotBuffer: order, dedupe, bracket, hold, prune', () => {
  const b = new SnapshotBuffer(4);
  b.push('a', 100); b.push('b', 200); b.push('x', 150);  // out of order dropped
  assert.equal(b.size(), 2);
  b.push('b2', 200); assert.equal(b.buffer[1].state, 'b2');  // same time replaces
  b.push('c', 300); b.push('d', 400); b.push('e', 500);      // maxSize 4 → 'a' shifted
  assert.equal(b.size(), 4); assert.equal(b.buffer[0].state, 'b2');
  assert.equal(b.sample(150), null);                          // before all
  const r = b.sample(350); assert.equal(r.prev.state, 'c'); assert.equal(r.next.state, 'd'); assert.ok(Math.abs(r.t - 0.5) < 1e-9);
  assert.equal(b.size(), 3);                                  // pruned older than prev
  const h = b.sample(900); assert.equal(h.prev.state, 'e'); assert.equal(h.next.state, 'e'); assert.equal(h.t, 1);
  assert.deepEqual(b.latestPair().next.state, 'e');
  b.clear(); assert.equal(b.sample(0), null);
});

test('TransformSync: interpolates between two snapshots at render time − 200 ms', () => {
  let now = 10000;
  const sync = new TransformSync({ tickRate: 20, now: () => now });
  sync.push(S(0, 0, 0, 0, 10000)); now = 10050; sync.push(S(1, 0, 0, 1, 10050)); now = 10100; sync.push(S(2, 0, 0, 2, 10100));
  now = 10225;  // renderTime = 10225 − 0 − 200 = 10025 → between snap 0 and 1 at t = 0.5
  const target = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
  const st = sync.update(target, 1 / 60);
  assert.ok(Math.abs(st.position.x - 0.5) < 1e-9); assert.ok(Math.abs(st.rotation.y - 0.5) < 1e-9);
  assert.ok(target.position.x > 0 && target.position.x < 0.5, 'eased toward, not snapped');
  // many frames converge
  for (let i = 0; i < 200; i++) sync.update(target, 1 / 60);
  assert.ok(Math.abs(target.position.x - 0.5) < 1e-3);
});

test('TransformSync: extrapolates at most 2 ticks past the last snapshot', () => {
  let now = 0;
  const sync = new TransformSync({ tickRate: 20, now: () => now });
  sync.push(S(0, 0, 0, 0, 0)); now = 50; sync.push(S(1, 0, 0, 0, 50));   // 1 m per 50 ms
  const tgt = { position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
  now = 50 + 200 + 60;  // renderTime 110 → 60 ms past the last → extrapolate 60 ms → x = 2.2
  let st = sync.update(tgt, 1); assert.ok(Math.abs(st.position.x - 2.2) < 1e-9); assert.equal(st.extrapolated, 60);
  now = 50 + 200 + 400;  // 400 ms past → capped at 100 ms → x = 3
  st = sync.update(tgt, 1); assert.ok(Math.abs(st.position.x - 3) < 1e-9); assert.equal(st.extrapolated, 100);
});

test('TransformSync: offset smoothing 0.1 and snap beyond 250 ms', () => {
  let now = 1000;
  const sync = new TransformSync({ now: () => now });
  sync.push(S(0, 0, 0, 0, 900)); assert.equal(sync.timeOffset, 100);
  sync.push(S(0, 0, 0, 0, 850)); // measured 150 → +5
  assert.ok(Math.abs(sync.timeOffset - 105) < 1e-9);
  sync.push(S(0, 0, 0, 0, 500)); // measured 500 → |Δ| 395 > 250 → snap
  assert.equal(sync.timeOffset, 500);
  sync.reset(); assert.equal(sync.timeOffset, -1); assert.equal(sync.update({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }, 0.1), null);
});

test('TransformSync: locked axes stay put; big jumps snap', () => {
  let now = 0;
  const sync = new TransformSync({ now: () => now, lockPosition: { y: true }, lockRotation: { x: true } });
  sync.push(S(50, 9, 0, 0, 0)); now = 50; sync.push(S(50, 9, 0, 0, 50)); now = 400;
  const tgt = { position: { x: 0, y: 1, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, rotation: { x: 0.3, y: 0, z: 0 } };
  sync.update(tgt, 1 / 60);
  assert.equal(tgt.position.x, 50, 'distance² > 100 → snapped'); assert.equal(tgt.position.y, 1, 'y locked'); assert.equal(tgt.rotation.x, 0.3, 'x rotation locked');
});
