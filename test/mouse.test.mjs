// dvengine — input/mouse.js (DVMouseStick): position → axes with dead zone + radial clamp, velocity mode, buttons, wheel raise/lower/next/prev/grow/shrink · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Mo = require('../input/mouse.js');

test('axesFromPosition: centre is dead, the edge is 1, beyond the ball is clamped, y is up', () => {
  assert.deepEqual(Mo.axesFromPosition(400, 300, 800, 600), { x: 0, y: 0, len: 0 });
  assert.deepEqual(Mo.axesFromPosition(410, 300, 800, 600), { x: 0, y: 0, len: 0 }, '10 px of a 300 px half-height is inside the 8 % dead zone');
  const r = Mo.axesFromPosition(700, 300, 800, 600); assert.ok(Math.abs(r.x - 1) < 1e-9 && r.y === 0, 'the half-min-dimension is full deflection');
  const far = Mo.axesFromPosition(800, 0, 800, 600); assert.ok(Math.abs(Math.hypot(far.x, far.y) - 1) < 1e-9, 'radial clamp'); assert.ok(far.y > 0, 'up is positive');
  const half = Mo.axesFromPosition(400, 150, 800, 600); assert.ok(half.y > 0.4 && half.y < 0.5, 'linear after the dead zone: (0.5−0.08)/(0.92)');
});

test('axesFromDelta: 200 px = full at sensitivity 1, inverted y, clamped', () => {
  assert.deepEqual(Mo.axesFromDelta(100, -50, 1), { x: 0.5, y: 0.25 });
  assert.deepEqual(Mo.axesFromDelta(1000, 0, 1), { x: 1, y: 0 });
  assert.deepEqual(Mo.axesFromDelta(100, 0, 2), { x: 1, y: 0 });
});

test('position mode via feed(); velocity mode consumes the deltas on poll; pointer lock forces velocity', () => {
  let t = 0; const m = Mo.create({ now: () => t });
  m.feed({ position: { x: 700, y: 300, w: 800, h: 600 } }); let p = m.poll(1); assert.ok(Math.abs(p.x - 1) < 1e-9);
  m.feed({ delta: { x: 100, y: 0 } }); p = m.poll(2); assert.ok(Math.abs(p.x - 1) < 1e-9, 'position mode ignores deltas');
  m.mode = 'velocity'; m.feed({ delta: { x: 100, y: -100 } }); p = m.poll(3); assert.deepEqual([p.x, p.y], [0.5, 0.5]); p = m.poll(4); assert.deepEqual([p.x, p.y], [0, 0], 'consumed');
  m.mode = 'position'; m.feed({ locked: true, delta: { x: 40, y: 0 } }); p = m.poll(5); assert.equal(p.locked, true); assert.equal(p.x, 0.2);
  m.sensitivity = 2; m.feed({ delta: { x: 40, y: 0 } }); assert.equal(m.poll(6).x, 0.4);
  m.enabled = false; m.feed({ delta: { x: 40, y: 0 } }); assert.equal(m.poll(7).x, 0);
});

test('buttons: left = fire, right = core, middle = sideLeft, back = sideRight; held ms; wheel raise/lower, +core prev/next, +side grow/shrink', () => {
  let t = 0; const m = Mo.create({ now: () => t }); const ev = [];
  m.on('button', (b) => ev.push(b.name + (b.down ? '+' : '-'))); m.on('wheel', (w) => ev.push('wheel:' + w.dir));
  assert.deepEqual(Mo.BUTTONS, { 0: 'fire', 1: 'sideLeft', 2: 'core', 3: 'sideRight', 4: 'sideLeft' });
  m.feed({ press: 'fire', t: 0 }); t = 300; let p = m.poll(t); assert.equal(p.buttons.fire, true); assert.equal(p.held.fire, 300);
  m.feed({ wheel: -100 }); m.feed({ wheel: 100 }); p = m.poll(t); assert.equal(p.wheel.raise, 1); assert.equal(p.wheel.lower, 1); assert.equal(m.poll(t).wheel.raise, 0, 'consumed');
  m.feed({ press: 'core' }); m.feed({ wheel: -1 }); m.feed({ wheel: 1 }); p = m.poll(t); assert.equal(p.wheel.prev, 1); assert.equal(p.wheel.next, 1); m.feed({ release: 'core' });
  m.feed({ press: 'sideRight' }); m.feed({ wheel: -1 }); m.feed({ wheel: 1 }); m.feed({ wheel: 1 }); p = m.poll(t); assert.equal(p.wheel.grow, 1); assert.equal(p.wheel.shrink, 2); m.feed({ release: 'sideRight' }); m.feed({ release: 'fire' });
  assert.deepEqual(ev, ['fire+', 'wheel:raise', 'wheel:lower', 'core+', 'wheel:prev', 'wheel:next', 'core-', 'sideRight+', 'wheel:grow', 'wheel:shrink', 'wheel:shrink', 'sideRight-', 'fire-']);
  assert.equal(m.poll(t).buttons.fire, false);
});

test('attach/detach on a stub canvas: DOM pointer events map to the same model, contextmenu is prevented, the wheel is', () => {
  const h = {}, gh = {};
  const canvas = { addEventListener(t, f) { (h[t] = h[t] || []).push(f); }, removeEventListener(t, f) { h[t] = (h[t] || []).filter((x) => x !== f); }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }), ownerDocument: { addEventListener() {}, removeEventListener() {} } };
  const g = globalThis; const oa = g.addEventListener, or = g.removeEventListener;
  g.addEventListener = (t, f) => { (gh[t] = gh[t] || []).push(f); }; g.removeEventListener = (t, f) => { gh[t] = (gh[t] || []).filter((x) => x !== f); };
  try {
    const m = Mo.create().attach(canvas);
    const fire = (t, e) => (h[t] || []).forEach((f) => f(e)); const gfire = (t, e) => (gh[t] || []).forEach((f) => f(e));
    fire('pointerdown', { button: 2, pointerType: 'mouse', preventDefault() {} }); assert.equal(m.poll(1).buttons.core, true);
    gfire('pointerup', { button: 2, pointerType: 'mouse' }); assert.equal(m.poll(2).buttons.core, false);
    fire('pointermove', { clientX: 400, clientY: 0, pointerType: 'mouse' }); assert.ok(m.poll(3).y > 0.99);
    const ctx = { preventDefault() { this.p = true; } }; fire('contextmenu', ctx); assert.equal(ctx.p, true);
    fire('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100 }); fire('pointermove', { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 10 }); assert.ok(m.poll(4).y > 0.4, 'one finger = the stick from where it landed');
    fire('pointerdown', { pointerId: 2, pointerType: 'touch', clientX: 500, clientY: 500 }); assert.equal(m.poll(5).buttons.fire, true, 'a second finger fires');
    gfire('pointerup', { pointerId: 2, pointerType: 'touch' }); gfire('pointerup', { pointerId: 1, pointerType: 'touch' }); const p = m.poll(6); assert.equal(p.buttons.fire, false); assert.equal(p.y, 0);
    m.detach(); assert.equal((h.pointerdown || []).length, 0); assert.equal((gh.pointerup || []).length, 0);
  } finally { g.addEventListener = oa; g.removeEventListener = or; }
});
