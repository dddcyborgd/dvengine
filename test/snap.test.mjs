/*! dvengine — snap tests (test/snap.test.mjs) · every case of awe engine-edit/test/snap-3d.test.ts ported against edit/snap.js (plain boxes, no three, no vitest) + snap2d / snapAngle / snapGrid · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe, MIT) where derived */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const DVSnap = require('../edit/snap.js');
const { Snap3D, box, v3 } = DVSnap;

// ---- the upstream FakeComponent, on plain boxes ----------------------------------------------
class FakeComponent {
  constructor(b, opts = {}) { this.box = box(b.min, b.max); this.info = { is2D: opts.is2D }; this.parent = opts.parent ?? null; this.collisionMesh = opts.hasCollisionMesh === false ? null : {}; }
  getBBox(target = box()) { target.min = { ...this.box.min }; target.max = { ...this.box.max }; return target; }
  getCollisionMesh() { return this.collisionMesh; }
  updateMatrixWorld() {}
  isDescendantOf(c) { let cur = this.parent; while (cur != null) { if (cur === c) return true; cur = cur.parent; } return false; }
}
const makeBox = (a, b, c, d, e, f) => box(v3(a, b, c), v3(d, e, f));
const makeComponent = (a, b, c, d, e, f, opts) => new FakeComponent(makeBox(a, b, c, d, e, f), opts);
function expectVectorClose(actual, [x, y, z]) { assert.ok(Math.abs(actual.x - x) < 1e-10, `x ${actual.x} ≠ ${x}`); assert.ok(Math.abs(actual.y - y) < 1e-10, `y ${actual.y} ≠ ${y}`); assert.ok(Math.abs(actual.z - z) < 1e-10, `z ${actual.z} ≠ ${z}`); }
/** upstream primeSnap mocks getCurrentSpace().components; here the components are passed to onPointerDown */
function primeSnap(snap, dragged, components) { snap.setObject(dragged); snap.onPointerDown(components); }

describe('Snap3D (port of engine-edit/test/snap-3d.test.ts)', () => {
  let snap;
  beforeEach(() => { snap = new Snap3D(); });

  test('collects only eligible 3d targets on pointer down', () => {
    const ancestor = makeComponent(-5, -5, -5, 5, 5, 5);
    const dragged = makeComponent(0, 0, 0, 1, 1, 1, { parent: ancestor });
    const descendant = makeComponent(0, 0, 0, 1, 1, 1, { parent: dragged });
    const eligible = makeComponent(2, 0, 0, 3, 1, 1);
    const twoD = makeComponent(2, 0, 0, 3, 1, 1, { is2D: true });
    const noCollision = makeComponent(2, 0, 0, 3, 1, 1, { hasCollisionMesh: false });
    primeSnap(snap, dragged, [dragged, eligible, twoD, noCollision, ancestor, descendant]);
    assert.deepEqual(snap.targets, [eligible]);
  });

  test('snaps contact faces on enabled world axes', () => {
    const dragged = makeComponent(0, 0, 0, 1, 1, 1);
    const target = makeComponent(1.1, 0, 0, 2.1, 1, 1);
    primeSnap(snap, dragged, [dragged, target]);
    expectVectorClose(snap.getWorldAxesSnapOffset([true, false, false]), [0.1, 0, 0]);
  });

  test('snaps secondary axes by aligned edges after a face contact', () => {
    const dragged = makeComponent(0, 0, 0, 1, 2, 1);
    const target = makeComponent(1.1, 0.1, 0, 2.1, 4.1, 1);
    primeSnap(snap, dragged, [dragged, target]);
    expectVectorClose(snap.getWorldAxesSnapOffset([true, true, false]), [0.1, 0.1, 0]);
  });

  test('does not snap secondary axes by center alignment', () => {
    const dragged = makeComponent(0, 0, 0, 1, 2, 1);
    const target = makeComponent(1.1, -1.1, 0, 2.1, 3.3, 1);
    primeSnap(snap, dragged, [dragged, target]);
    expectVectorClose(snap.getWorldAxesSnapOffset([true, true, false]), [0.1, 0, 0]);
  });

  test('chooses the smallest face-contact gap across candidates', () => {
    const dragged = makeComponent(0, 0, 0, 1, 1, 1);
    const fartherTarget = makeComponent(1.18, 0, 0, 2.18, 1, 1);
    const nearerTarget = makeComponent(1.05, 0, 0, 2.05, 1, 1);
    primeSnap(snap, dragged, [dragged, fartherTarget, nearerTarget]);
    expectVectorClose(snap.getWorldAxesSnapOffset([true, false, false]), [0.05, 0, 0]);
  });

  test('snaps along a drag direction to the nearest contact face', () => {
    const dragged = makeComponent(0, 0, 0, 1, 1, 1);
    const target = makeComponent(1.1, 0, 0, 2.1, 1, 1);
    primeSnap(snap, dragged, [dragged, target]);
    expectVectorClose(snap.getWorldDirectionSnapOffset(v3(1, 0, 0)), [0.1, 0, 0]);
  });

  test('snaps along a drag direction to the nearest aligned min edge', () => {
    const dragged = makeComponent(0.1, 1, 1, 1.1, 2, 2);
    const target = makeComponent(0, 0, 0, 10, 1, 10);
    primeSnap(snap, dragged, [dragged, target]);
    expectVectorClose(snap.getWorldDirectionSnapOffset(v3(1, 0, 0)), [-0.1, 0, 0]);
  });

  test('snaps along a drag direction to the nearest aligned max edge', () => {
    const dragged = makeComponent(8.9, 1, 1, 9.9, 2, 2);
    const target = makeComponent(0, 0, 0, 10, 1, 10);
    primeSnap(snap, dragged, [dragged, target]);
    expectVectorClose(snap.getWorldDirectionSnapOffset(v3(1, 0, 0)), [0.1, 0, 0]);
  });

  test('returns zero when the drag direction is empty', () => {
    const dragged = makeComponent(0, 0, 0, 1, 1, 1);
    const target = makeComponent(1.1, 0, 0, 2.1, 1, 1);
    primeSnap(snap, dragged, [dragged, target]);
    expectVectorClose(snap.getWorldDirectionSnapOffset(v3(0, 0, 0)), [0, 0, 0]);
  });
});

describe('one-shot helpers', () => {
  test('snap3d over plain boxes matches the class (axes + direction forms)', () => {
    expectVectorClose(DVSnap.snap3d(makeBox(0, 0, 0, 1, 1, 1), [makeBox(1.1, 0, 0, 2.1, 1, 1)], [true, false, false]), [0.1, 0, 0]);
    expectVectorClose(DVSnap.snap3d(makeBox(8.9, 1, 1, 9.9, 2, 2), [makeBox(0, 0, 0, 10, 1, 10)], v3(1, 0, 0)), [0.1, 0, 0]);
    expectVectorClose(DVSnap.snapToBounds(makeBox(0, 0, 0, 1, 2, 1), [makeBox(1.1, 0.1, 0, 2.1, 4.1, 1)]), [0.1, 0.1, 0]);
    expectVectorClose(DVSnap.snap3d(makeBox(0, 0, 0, 1, 1, 1), [makeBox(5, 0, 0, 6, 1, 1)], [true, true, true]), [0, 0, 0]);
  });

  test('snap2d: centre / edge alignment and equal spacing (port of snap-2d.ts)', () => {
    const target = makeBox(-1, -1, 0, 1, 1, 0.01);
    // translate: magnet 0.03 above centre on Y, dir y → centre alignment wins
    let r = DVSnap.snap2d({ target, magnets: [makeBox(3, -0.97, 0, 5, 1.03, 0)], dir: { x: 0, y: 1 }, mode: 'translate', maxGap: 0.08 });
    assert.ok(Math.abs(r.offset.y - 0.03) < 1e-12); assert.equal(r.hints[0].kind, 'centerY');
    // translate on x: magnet's left edge 0.05 right of ours, no centre match
    r = DVSnap.snap2d({ target, magnets: [makeBox(-0.95, -3, 0, 4, -2, 0)], dir: { x: 1, y: 0 }, mode: 'translate', maxGap: 0.08 });
    assert.ok(Math.abs(r.offset.x - 0.05) < 1e-12); assert.equal(r.hints[0].kind, 'left');
    // spacing case 1: between two neighbours, gaps 1.0 and 1.06 → shift by 0.03 to equalise
    r = DVSnap.snap2d({ target, magnets: [makeBox(-4, -1, 0, -2, 1, 0), makeBox(2.06, -1, 0, 4, 1, 0)], dir: { x: 1, y: 0 }, mode: 'translate', maxGap: 0.08 });
    assert.ok(Math.abs(r.offset.x - 0.03) < 1e-12); assert.deepEqual(r.hints.map((h) => h.kind), ['space1', 'space2']);
    // scale mode: dragging the top edge toward a magnet's top edge (0.04 gap) yields a uniform scale factor
    r = DVSnap.snap2d({ target, magnets: [makeBox(3, -1, 0, 5, 1.04, 0)], dir: { x: 0, y: 1 }, mode: 'scale', maxGap: 0.08 });
    assert.ok(Math.abs(r.offset.y - 0.04) < 1e-12); assert.ok(Math.abs(r.scale - 1.04) < 1e-12);
    // out of range → nothing
    r = DVSnap.snap2d({ target, magnets: [makeBox(3, 2, 0, 5, 4, 0)], dir: { x: 1, y: 1 }, mode: 'translate', maxGap: 0.08 });
    assert.deepEqual(r.offset, { x: 0, y: 0 }); assert.equal(r.hints.length, 0);
  });

  test('snapAngle / snapGrid', () => {
    const step = Math.PI / 12; // 15°
    assert.ok(Math.abs(DVSnap.snapAngle(0.27, step) - step) < 1e-12);
    assert.equal(DVSnap.snapAngle(0.27, 0), 0.27);
    assert.deepEqual(DVSnap.snapGrid({ x: 0.74, y: -1.26, z: 2.5 }, 0.5), { x: 0.5, y: -1.5, z: 2.5 });
    assert.equal(DVSnap.snapGrid(1.3, 0.25), 1.25);
    assert.equal(DVSnap.snapGrid(1.3, 0), 1.3);
  });
});
