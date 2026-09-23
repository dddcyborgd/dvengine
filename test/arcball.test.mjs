// dvengine — verse/arcball.math.js: the ArcballControls trackball surface, pure · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../verse/arcball.math.js');

test('project: sphere inside r²/2, hyperboloid outside, C¹-continuous at the seam', () => {
  const r = 2;
  const p = M.project(0.5, 0.5, r);
  assert.equal(p.sheet, 'sphere'); assert.ok(Math.abs(p.z - Math.sqrt(4 - 0.5)) < 1e-12);
  const q = M.project(1.5, 1.5, r);
  assert.equal(q.sheet, 'hyperboloid'); assert.ok(Math.abs(q.z - (2 / Math.sqrt(4.5))) < 1e-12);
  // seam: x² + y² = r²/2 → both formulas give r/√2
  const s = Math.sqrt(2) * r / 2;   // x = y = r/2 → x²+y² = r²/2
  const a = M.project(r / 2, r / 2, r), b = M.project(r / 2 + 1e-9, r / 2, r);
  assert.ok(Math.abs(a.z - r / Math.SQRT2) < 1e-9); assert.ok(Math.abs(b.z - a.z) < 1e-6, 'no jump across the seam');
  assert.equal(M.project(0, 0, 3).z, 3, 'centre of the ball');
  assert.equal(M.project(0, 0, -1).z, 1, 'a non-positive radius becomes 1');
});

test('tbRadius follows ArcballControls.calculateTbRadius', () => {
  const fov = 55, aspect = 16 / 9, d = 10;
  const halfV = fov * Math.PI / 360, halfH = Math.atan(aspect * Math.tan(halfV));
  assert.ok(Math.abs(M.tbRadius(d, fov, aspect) - Math.tan(Math.min(halfV, halfH)) * d * 0.67) < 1e-12);
  assert.ok(Math.abs(M.tbRadius(d, fov, 0.5, 1) - Math.tan(Math.atan(0.5 * Math.tan(halfV))) * d) < 1e-12, 'portrait: the horizontal half-fov is the smaller');
});

test('toLocal rotates a world-relative vector into the agent frame (agent faces +z)', () => {
  const v = M.toLocal({ x: 1, y: 0, z: 0 }, Math.PI / 2);  // agent turned 90° left: world +x is its forward
  assert.ok(Math.abs(v.z - 1) < 1e-12 && Math.abs(v.x) < 1e-12);
  const w = M.toLocal({ x: 0, y: 2, z: 3 }, 0); assert.deepEqual(w, { x: 0, y: 2, z: 3 });
});

test('arm: extend eases from far to near; yaw/pitch read from the surface point; behind never points through the body', () => {
  const far = M.arm({ x: 0, y: 0, z: 5 }); assert.equal(far.extend, 0);
  const near = M.arm({ x: 0, y: 0, z: 0.5 }); assert.equal(near.extend, 1); assert.ok(Math.abs(near.yaw) < 1e-9);
  const mid = M.arm({ x: 0, y: 0, z: 2.05 }); assert.ok(Math.abs(mid.extend - 0.5) < 1e-9, 'smoothstep midpoint');
  const left = M.arm({ x: 1, y: 0, z: 1 }); assert.ok(left.yaw > 0, '+x is the agent\'s left → positive yaw');
  const right = M.arm({ x: -1, y: 0, z: 1 }); assert.ok(right.yaw < 0);
  const up = M.arm({ x: 0, y: 0.6, z: 1 }); assert.ok(up.pitch > 0); assert.ok(up.pitch <= 1.2);
  const side = M.arm({ x: 3, y: 0, z: 0.1 }, { radius: 0.7 }); assert.equal(side.sheet, 'hyperboloid'); assert.ok(side.point.z > 0);
  const behind = M.arm({ x: 0.5, y: 0, z: -1 }); assert.ok(behind.point.z > 0, 'surface z is always positive'); assert.ok(behind.yaw > 0 && behind.yaw < Math.PI / 2);
  const zero = M.arm({ x: 0, y: 0, z: 0 }); assert.equal(zero.extend, 0); assert.equal(zero.distance, 0);
});

test('angle helpers', () => {
  assert.ok(Math.abs(M.angleDelta(3, -3) - (2 * Math.PI - 6)) < 1e-12);
  assert.ok(Math.abs(M.lerpAngle(3, -3, 1) - (3 + (2 * Math.PI - 6))) < 1e-12);
});
