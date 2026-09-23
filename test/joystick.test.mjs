// dvengine — input/joystick.js (DVJoystick): axes from four keys, diagonal normalisation, repeat ignored, release on blur, layouts validated, gamepad mapping · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const J = require('../input/joystick.js');

/** A minimal event target: handlers by type, fire(type, ev). */
function target() { const h = {}; return { addEventListener(t, f) { (h[t] = h[t] || []).push(f); }, removeEventListener(t, f) { h[t] = (h[t] || []).filter((x) => x !== f); }, fire(t, ev) { (h[t] || []).forEach((f) => f(ev)); }, count(t) { return (h[t] || []).length; } }; }
const key = (code, repeat = false) => ({ code, repeat, preventDefault() { this.prevented = true; } });
const L = { up: 'KeyE', down: 'KeyD', left: 'KeyS', right: 'KeyF', fire: 'Space', sideLeft: 'KeyA', sideRight: 'KeyC', core: null };

test('axes: four keys → a unit-clamped stick, diagonals normalised', () => {
  assert.deepEqual(J.axes({ up: true }), { x: 0, y: 1 });
  assert.deepEqual(J.axes({ right: true }), { x: 1, y: 0 });
  const d = J.axes({ up: true, right: true }); assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < 1e-12); assert.ok(d.x > 0 && d.y > 0);
  assert.deepEqual(J.axes({ left: true, right: true }), { x: 0, y: 0 }, 'opposites cancel');
});

test('keys drive the stick; repeat is ignored; blur releases everything', () => {
  let t = 1000; const el = target(), s = J.create({ id: 'left', layout: L, now: () => t }).attach(el);
  const events = []; s.on('axis', (a) => events.push(['axis', a.x, a.y])); s.on('button', (b) => events.push(['btn', b.name, b.down]));
  const e = key('KeyE'); el.fire('keydown', e); assert.equal(e.prevented, true, 'mapped keys are prevented');
  assert.equal(s.y, 1); assert.equal(s.dirs.up, true);
  el.fire('keydown', key('KeyF')); assert.ok(Math.abs(s.x - Math.SQRT1_2) < 1e-12 && Math.abs(s.y - Math.SQRT1_2) < 1e-12);
  el.fire('keydown', key('KeyE', true)); assert.equal(events.filter((x) => x[0] === 'btn' && x[1] === 'up').length, 1, 'repeat never re-presses');
  t = 1250; assert.equal(s.held('up'), 250); assert.equal(s.held('fire'), 0);
  el.fire('keydown', key('Space')); assert.equal(s.buttons.fire, true);
  el.fire('keyup', key('KeyF')); assert.equal(s.x, 0); assert.equal(s.y, 1);
  el.fire('blur', {}); assert.equal(s.x, 0); assert.equal(s.y, 0); assert.equal(s.buttons.fire, false); assert.deepEqual(s.poll(t).held, {});
  const unmapped = key('KeyZ'); el.fire('keydown', unmapped); assert.notEqual(unmapped.prevented, true);
  s.detach(); assert.equal(el.count('keydown'), 0);
});

test('poll snapshot shape; bind() re-maps and releases', () => {
  let t = 0; const el = target(), s = J.create({ id: 'a', layout: L, now: () => t }).attach(el);
  el.fire('keydown', key('KeyA')); t = 5; const p = s.poll(5);
  assert.deepEqual(Object.keys(p).sort(), ['buttons', 'dirs', 'held', 'id', 't', 'x', 'y']);
  assert.equal(p.buttons.sideLeft, true); assert.ok('sideLeft' in p.held);
  s.bind({ up: 'ArrowUp' }); assert.equal(s.buttons.sideLeft, false); assert.deepEqual(s.layout().up, 'ArrowUp'); assert.equal(s.layout().fire, null);
  el.fire('keydown', key('KeyA')); assert.equal(s.buttons.sideLeft, false, 'the old code is unbound');
  s.detach();
});

test('two attached sticks may not share a code unless allowShared', () => {
  const el = target(), a = J.create({ id: 'a', layout: L }).attach(el);
  assert.throws(() => J.create({ id: 'b', layout: { up: 'KeyE' } }).attach(el), /KeyE/);
  const c = J.create({ id: 'c', layout: { up: 'KeyE' }, allowShared: true }).attach(el);
  assert.ok(J.claimed().KeyE);
  assert.throws(() => a.bind({ up: 'KeyI', fire: 'KeyE' }) && J.create({ id: 'd', layout: { core: 'KeyI' } }).attach(el), /KeyI/);
  a.detach(); c.detach(); assert.deepEqual(J.claimed(), {});
});

test('gamepad: axes 0/1 → x/y with a radial dead zone, buttons 0/4/5/9 and the d-pad', () => {
  const gp = { axes: [0.5, -0.5], buttons: [{ pressed: true }, {}, {}, {}, { pressed: true }, {}, {}, {}, {}, { pressed: true }] };
  const g = J.fromGamepad(gp); assert.ok(g.x > 0 && g.y > 0, 'axis 1 is inverted so up is +y'); assert.deepEqual(g.names, ['fire', 'sideLeft', 'core']);
  assert.deepEqual(J.fromGamepad({ axes: [0, 0], buttons: Object.assign(new Array(16).fill({}), { 13: { pressed: true } }) }).names, ['down'], 'the d-pad');
  assert.deepEqual(J.fromGamepad({ axes: [0.05, 0.05], buttons: [] }), { x: 0, y: 0, names: [] });
  const big = J.fromGamepad({ axes: [1, 1], buttons: [] }); assert.ok(Math.abs(Math.hypot(big.x, big.y) - 1) < 1e-12);
  let pads = [gp]; let t = 0; const s = J.create({ id: 'gp', gamepad: 0, layout: {}, getGamepads: () => pads, now: () => t });
  const btns = []; s.on('button', (b) => btns.push(b.name + (b.down ? '+' : '-')));
  const p = s.poll(10); assert.equal(p.buttons.fire, true); assert.equal(p.buttons.core, true); assert.ok(p.x > 0);
  pads = [{ axes: [0, 0], buttons: [] }]; const q = s.poll(20); assert.equal(q.buttons.fire, false); assert.equal(q.x, 0);
  assert.deepEqual(btns, ['fire+', 'sideLeft+', 'core+', 'fire-', 'sideLeft-', 'core-']);
});

test('a chord map on the stick emits chord events', () => {
  require('../input/chords.js');
  let t = 0; const el = target(), s = J.create({ id: 'r', layout: { up: 'KeyI', core: 'KeyK' }, now: () => t, chords: { 'core+up': 'sphere.raise' } }).attach(el);
  const out = []; s.on('chord', (c) => out.push(c.action));
  el.fire('keydown', key('KeyK')); el.fire('keydown', key('KeyI')); assert.deepEqual(out, ['sphere.raise']);
  s.detach();
});
