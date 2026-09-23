// dvengine — verse/field.math.js + verse/field.js (DVFieldMath · DVField, headless): slots → points, rotation, drag, armTarget, max = extent − 1, grow/shrink clamped, recognition edges once per crossing + continuous degree, contains(), select next/prev wrap, the two dials, mode/links, the remote-field visibility matrix, the DVSphere alias · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../verse/arcball.math.js');
const M = require('../verse/field.math.js');
const F = require('../verse/field.js');
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const stub = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; };
const mk = (o) => F.create(Object.assign({ storage: stub() }, o));

test('slots: theta 0 → in front (+z), phi π/2 → the pole (+y); slotOf inverts; raise/lower clamp; ring; wrap', () => {
  const p = M.slotPoint({ theta: 0, phi: 0 }); assert.ok(near(p.z, 1) && near(p.x, 0) && near(p.y, 0));
  const pole = M.slotPoint({ theta: 1, phi: Math.PI / 2 }); assert.ok(near(pole.y, 1) && near(pole.x, 0, 1e-9) && near(pole.z, 0, 1e-9));
  const s = M.slotOf(M.slotPoint({ theta: 0.7, phi: -0.4 })); assert.ok(near(s.theta, 0.7) && near(s.phi, -0.4));
  let r = { theta: 0, phi: 1.4 }; r = M.raise(r); assert.ok(near(r.phi, Math.PI / 2), 'clamped at the pole'); assert.ok(near(M.lower(M.lower({ theta: 0, phi: 0 })).phi, -Math.PI / 6));
  assert.equal(M.ringSlots(4).length, 4); assert.ok(near(M.ringSlots(4)[1].theta, Math.PI / 2));
  assert.equal(M.wrap(-1, 3), 2); assert.equal(M.wrap(3, 3), 0); assert.equal(M.wrap(5, 0), 0);
});

test('rotation: yaw π/2 carries +z to +x; quaternion helpers; the Holroyd drag carries p0 to p1; surface = the arcball rule', () => {
  const q = M.rotate(M.qIdentity(), Math.PI / 2, 0); const v = M.qRotate(q, { x: 0, y: 0, z: 1 }); assert.ok(near(v.x, 1) && near(v.z, 0));
  const up = M.qRotate(M.rotate(M.qIdentity(), 0, -Math.PI / 2), { x: 0, y: 0, z: 1 }); assert.ok(near(up.y, 1), 'pitch −π/2 lifts +z to +y');
  const a = M.qAxisAngle({ x: 0, y: 1, z: 0 }, 0.3), b = M.qAxisAngle({ x: 0, y: 1, z: 0 }, 0.4); const ab = M.qMul(a, b), c = M.qAxisAngle({ x: 0, y: 1, z: 0 }, 0.7); for (const k of 'xyzw') assert.ok(near(ab[k], c[k]));
  assert.ok(near(M.qNormalize({ x: 0, y: 0, z: 0, w: 2 }).w, 1));
  const p0 = M.surface(0, 0, 1), p1 = M.surface(0.5, 0, 1); const d = M.dragRotation(p0, p1); const moved = M.qRotate(d, p0); assert.ok(near(moved.x, p1.x, 1e-9) && near(moved.z, p1.z, 1e-9));
  for (const k of 'xyzw') assert.equal(M.dragRotation(p0, p0)[k], M.qIdentity()[k]);
  assert.equal(M.surface(0.2, 0.2, 1).sheet, 'sphere'); assert.equal(M.surface(2, 2, 1).sheet, 'hyperboloid');
});

test('armTarget: extend = r/max; the pole raises the arm; front is yaw 0; behind mirrors to the side within ±1.3; pitch −0.6..1.45', () => {
  const pole = M.armTarget({ x: 0, y: 1, z: 0 }, 2, 4); assert.equal(pole.extend, 0.5); assert.ok(near(pole.pitch, 1.45));
  const front = M.armTarget({ x: 0, y: 0, z: 1 }, 5, 4); assert.equal(front.extend, 1); assert.equal(front.yaw, 0); assert.equal(front.pitch, 0);
  const behind = M.armTarget({ x: 0.3, y: -1, z: -1 }, 1, 4); assert.ok(behind.yaw > 0 && behind.yaw <= 1.3); assert.ok(behind.pitch >= -0.6);
  const left = M.armTarget({ x: 1, y: 0, z: 0.2 }, 1, 4); assert.ok(left.yaw > 0 && left.yaw <= 1.3);
  assert.equal(M.armTarget({ x: 0, y: 0, z: 1 }, 1, 0).extend, 0);
});

test('the bound: max = extent − 1 (infinity − 1); extentOf reads the outer zone else the skydome; grow/shrink clamp to [min, max]', () => {
  assert.equal(M.maxOf(70), 69); assert.equal(M.maxOf(1), M.MIN + M.EPS, 'never below the arm + ε');
  assert.equal(M.extentOf({ zones: [{ bounds: { r: 6 } }, { bounds: { r: 14 } }] }), 14); assert.equal(M.extentOf({ zones: [] }, 50), 50); assert.equal(M.extentOf(null), 70);
  const f = mk({ extent: 12, radius: 1.2 }); assert.equal(f.max, 11); assert.equal(f.min, 0.35); assert.equal(f.radius, 1.2);
  assert.equal(f.grow(100), 11); assert.equal(f.shrink(100), 0.35); assert.equal(f.grow(), 0.6); assert.equal(f.shrink(0.1), 0.5);
  f.setBounds({ zones: [{ bounds: { r: 4 } }] }); assert.equal(f.max, 3); f.setRadius(9); assert.equal(f.radius, 3, 're-bounded');
  const g = mk({ doc: { zones: [{ bounds: { r: 20 } }] } }); assert.equal(g.max, 19);
  assert.equal(F.rule.indexOf('infinity − 1') > 0, true);
});

test('recognition: the edge fires once per crossing; degree = r/max × outflow reported continuously (4 Hz); the bound is degree → outflow', () => {
  const f = mk({ extent: 10, radius: 1, rank: 'overseer' }); const ev = [];
  f.on('recognized', (d) => ev.push(['R', d.atBound, +d.degree.toFixed(2)])); f.on('unrecognized', (d) => ev.push(['U']));
  f.update(0.016, 1000); assert.deepEqual(ev, [], 'nothing changed');
  f.grow(100); f.update(0.016, 1010); assert.deepEqual(ev, [['R', true, 1]]); assert.equal(f.recognized, true);
  f.update(0.016, 1020); f.update(0.016, 1030); assert.equal(ev.length, 1, 'stays at the bound: no re-fire');
  f.shrink(0.6); f.update(0.016, 1040); assert.deepEqual(ev[1], ['U']); assert.equal(f.recognized, false);
  f.shrink(4); f.update(0.016, 1100); assert.equal(ev.length, 2, 'inside 250 ms of the last report: throttled');
  f.update(0.016, 1400); assert.equal(ev.length, 3); assert.equal(ev[2][0], 'R'); assert.equal(ev[2][1], false); assert.ok(near(ev[2][2], 0.49, 0.02));
  f.grow(100); f.update(0.016, 1500); assert.deepEqual(ev[3], ['R', true, 1]); f.shrink(0.3); f.update(0.016, 1800); assert.equal(ev.length, 4, 'still within ε = 0.5 of max: at the bound');
  const p = mk({ extent: 10, radius: 9, rank: 'participant' }); assert.ok(near(p.degree(), 0.15), 'a participant at the bound: degree = outflow 0.15');
  assert.equal(M.degree(5, 10, 0.5), 0.25); assert.equal(M.degree(50, 10, 1), 1); assert.equal(M.degree(1, 0, 1), 0);
  assert.equal(M.edge(false, true), 'enter'); assert.equal(M.edge(true, false), 'leave'); assert.equal(M.edge(true, true), null);
});

test('the two dials: the rung ladder, welcome.policy overrides, setRank keeps the policy in step', () => {
  assert.deepEqual(M.policyFor('member'), { outflow: 0.5, inflow: 0.9 }); assert.deepEqual(M.policyFor('nope'), M.POLICY.participant); assert.deepEqual(M.policyFor('overlord'), { outflow: 1, inflow: 0.1 });
  assert.deepEqual(M.policyFor('member', { rungs: { member: { outflow: 0.2, inflow: 0.2 } } }), { outflow: 0.2, inflow: 0.2 });
  const f = mk({ extent: 10, rank: 'trader' }); assert.deepEqual(f.policy, { outflow: 0.75, inflow: 0.7 });
  f.setRank('owner'); assert.deepEqual(f.policy, { outflow: 0.9, inflow: 0.5 });
  f.setPolicy({ outflow: 2, inflow: -1 }); assert.deepEqual(f.policy, { outflow: 1, inflow: 0 }, 'clamped');
  const rung = require('../verse/rung.js'); assert.deepEqual(rung.rungPolicy(6), { outflow: 1, inflow: 0.3 }); assert.deepEqual(rung.rungPolicy('player'), { outflow: 0.65, inflow: 0.8 });
});

test('items: attach / select next-prev wrap / use / raise / lower / point / armTarget / detach', () => {
  const f = mk({ extent: 10, radius: 2 }); const used = []; const ev = [];
  f.on('item', (d) => ev.push(d.action + ':' + d.name));
  f.attach({ name: 'sceptre', use: () => used.push('sceptre') }); f.attach({ name: 'orb' }, { slot: { theta: Math.PI / 2, phi: 0 } }); f.attach({ id: 'third' });
  assert.deepEqual(f.names(), ['sceptre', 'orb', 'third']); assert.equal(f.selected().name, 'sceptre');
  assert.equal(f.select('prev').name, 'third', 'wraps backward'); assert.equal(f.select('next').name, 'sceptre'); assert.equal(f.select('orb').name, 'orb'); assert.equal(f.select(4).name, 'orb', 'index wraps');
  const p = f.point(); assert.ok(near(p.x, 1), 'the orb sits at +x');
  f.rotate(-Math.PI / 2, 0); assert.ok(near(f.point().z, 1, 1e-9), 'rotated to the front');
  const a = f.armTarget(); assert.equal(a.extend, 2 / 9); assert.ok(near(a.yaw, 0, 1e-9));
  f.raise(); assert.ok(f.selected().slot.phi > 0); f.lower(); f.lower(); assert.ok(f.selected().slot.phi < 0);
  f.select('sceptre'); f.use(); assert.deepEqual(used, ['sceptre']);
  assert.deepEqual(ev, ['select:third', 'select:sceptre', 'select:orb', 'raise:orb', 'lower:orb', 'lower:orb', 'select:sceptre', 'use:sceptre']);
  assert.equal(f.detach('orb'), true); assert.deepEqual(f.names(), ['sceptre', 'third']); assert.equal(f.detach('orb'), false);
  const wp = f.worldPoint(); assert.ok(near(wp.y, 1.3 + 2 * f.point().y, 1e-9), 'world point = centre (shoulder height) + r · point');
});

test('contains() and sweep() edges; stick() drives the rotation by rates; energy clamps', () => {
  const f = mk({ extent: 10, radius: 2, subject: { position: { x: 1, y: 0, z: 1 } } });
  assert.equal(f.contains({ x: 2, y: 1.3, z: 1 }), true); assert.equal(f.contains({ x: 4, y: 1.3, z: 1 }), false); assert.deepEqual(f.center(), { x: 1, y: 1.3, z: 1 });
  let sw = f.sweep([{ id: 'a', position: { x: 2, y: 1.3, z: 1 } }, { id: 'b', position: { x: 9, y: 0, z: 0 } }]); assert.deepEqual(sw, { enter: ['a'], leave: [] }); assert.equal(f.inside('a'), true);
  f.grow(8); sw = f.sweep([{ id: 'a', position: { x: 2, y: 1.3, z: 1 } }, { id: 'b', position: { x: 9, y: 0, z: 0 } }]); assert.deepEqual(sw, { enter: ['b'], leave: [] });
  sw = f.sweep([{ id: 'b', position: { x: 90, y: 0, z: 0 } }]); assert.deepEqual(sw.leave.sort(), ['a', 'b'], 'gone entries leave too');
  const q0 = { ...f.q }; f.stick(1, 0, 0.5); assert.notDeepEqual(f.q, q0); f.stick(0, 0, 1); f.energy(3); f.energy(-1);
});

test('privacy + links: private needs a signed claim; defaults by rung; persisted choice; connect/disconnect; the visibility matrix', () => {
  const f = mk({ extent: 10, rank: 'participant' }); assert.equal(f.mode, 'open'); assert.equal(f.canPrivate(), false);
  assert.equal(f.setMode('private'), 'open', 'no claim → cannot be private'); assert.equal(f.setMode('connected'), 'connected'); assert.equal(f.cycleMode(), 'open', 'connected → private is refused → open');
  const m = mk({ extent: 10, rank: 'member' }); assert.equal(m.mode, 'connected', 'member up defaults to connected');
  const st = stub(); const s = F.create({ extent: 10, rank: 'member', claim: 'eyJzdWIiOiIweGFiIn0.sig', storage: st }); assert.equal(s.canPrivate(), true);
  assert.equal(s.setMode('private'), 'private'); assert.equal(st.getItem('dv.field.mode'), 'private');
  const again = F.create({ extent: 10, rank: 'member', claim: 'x.y', storage: st }); assert.equal(again.mode, 'private', 'the own choice persists');
  const ev = []; s.on('links', (d) => ev.push(d)); s.connect('p1').connect('p2').connect('p1'); s.disconnect('p2'); s.disconnect('zz');
  assert.deepEqual(Array.from(s.links), ['p1']); assert.equal(ev.length, 3);
  s.sessionId = 'me';
  assert.equal(s.visibleTo('me'), true, 'always to oneself'); assert.equal(s.visibleTo('p1'), false, 'private: nobody else');
  s.setMode('connected'); assert.equal(s.visibleTo('p1'), true); assert.equal(s.visibleTo('p9'), false); assert.equal(s.visibleTo('p1', 0), false, 'a viewer whose inflow is 0 sees nothing');
  s.setMode('open'); assert.equal(s.visibleTo('p9'), true);
  const matrix = [];
  for (const mode of M.MODES) for (const linked of [true, false]) matrix.push(mode[0] + (linked ? '+' : '-') + (M.visibleTo({ mode, links: linked ? ['v'] : [] }, 'o', 'v', 1) ? 'Y' : 'N'));
  assert.deepEqual(matrix, ['o+Y', 'o-Y', 'c+Y', 'c-N', 'p+N', 'p-N']);
  assert.deepEqual(s.snapshot(), { r: 1.2, max: 9, at: null, mode: 'open', links: ['p1'], degree: +(1.2 / 9 * 0.5).toFixed(3) });
  assert.equal(M.defaultModeFor('overlord'), 'connected'); assert.equal(M.defaultModeFor('participant'), 'open'); assert.equal(M.defaultModeFor('member', { defaultMode: { member: 'open' } }), 'open');
  assert.equal(M.canPrivate({ sub: '0xab' }), true); assert.equal(M.canPrivate('nodot'), false); assert.equal(M.canPrivate(null), false);
});

test('the throttled field snapshot (2 Hz) for the anchor; the DVSphere alias', () => {
  const f = mk({ extent: 10, radius: 1 }); const snaps = []; f.on('field', (s) => snaps.push(s.r));
  f.update(0, 1000); f.grow(1); f.update(0, 1100); f.grow(1); f.update(0, 1200); f.grow(1); f.update(0, 1600);
  assert.deepEqual(snaps, [1, 4], 'the first change, then the next one ≥ 500 ms later carrying the latest radius');
  assert.equal(globalThis.DVSphere, globalThis.DVField); assert.equal(globalThis.DVSphereMath, M); assert.equal(globalThis.DVVerse.field, F);
});
