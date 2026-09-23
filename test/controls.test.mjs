// dvengine — input/controls.js (DVControls): the default layouts have no duplicate codes; describe() lists every key; persist/reset round trip with a stub localStorage; the merger sums + clamps axes, ORs buttons, detects cross-source chords; mount() over stub sources · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const J = require('../input/joystick.js'); const C = require('../input/chords.js'); require('../input/mouse.js'); require('../input/senses.js');
const K = require('../input/controls.js');
function stubStorage() { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, dump: () => ({ ...m }) }; }

test('the old-school defaults: ESDF · A/C · Space, IJKL; with K the core, arrows + RCtrl/RShift/Num0 — no duplicate codes, roles', () => {
  const d = K.DEFAULTS;
  assert.deepEqual(d.left, { up: 'KeyE', down: 'KeyD', left: 'KeyS', right: 'KeyF', sideLeft: 'KeyA', sideRight: 'KeyC', fire: 'Space', core: null });
  assert.deepEqual(d.right, { up: 'KeyI', down: 'Comma', left: 'KeyJ', right: 'KeyL', sideLeft: null, sideRight: 'Semicolon', fire: null, core: 'KeyK' });
  assert.deepEqual(d.arrows, { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'ControlRight', sideLeft: 'ShiftRight', sideRight: 'Numpad0', core: null });
  assert.deepEqual(K.validate(d), []);
  assert.deepEqual(K.ROLES, { left: 'move', right: 'sphere', arrows: 'move' });
  assert.deepEqual(K.validate({ a: { up: 'KeyE' }, b: { fire: 'KeyE' } }), [{ code: 'KeyE', a: 'a.up', b: 'b.fire' }]);
});

test('describe() lists every bound key (short names), the chord table, the mouse, senses and gamepad sections', () => {
  K.storage = stubStorage();
  const s = K.describe();
  for (const st of Object.keys(K.DEFAULTS)) for (const slot of K.SLOTS) { const code = K.DEFAULTS[st][slot]; if (code) assert.ok(s.includes('[' + K.shortName(code) + ']'), st + '.' + slot + ' ' + code); }
  assert.ok(s.includes('(K)') && s.includes('combinations only'));
  for (const key of Object.keys(C.DEFAULT)) assert.ok(s.includes(key), 'chord ' + key);
  assert.ok(s.includes('misc_controls_arcball') && s.includes('MIC + CAMERA') && s.includes('GAMEPAD'));
  assert.equal(K.shortName('Semicolon'), ';'); assert.equal(K.shortName('Numpad0'), 'Num0'); assert.equal(K.shortName('ArrowUp'), '↑'); assert.equal(K.shortName(null), '·');
  assert.ok(!K.describe({ mouse: false, senses: false, gamepad: false }).includes('GAMEPAD'));
});

test('persist / reset round trip with a stub localStorage; set() steals a code from its old slot', () => {
  const st = stubStorage(); K.storage = st;
  assert.deepEqual(K.layouts(), K.DEFAULTS);
  const l = K.set('right', 'core', 'KeyH'); assert.equal(l.right.core, 'KeyH'); assert.ok(st.dump()['dv.controls'].includes('KeyH'));
  const l2 = K.set('left', 'fire', 'KeyE'); assert.equal(l2.left.fire, 'KeyE'); assert.equal(l2.left.up, null, 'KeyE left its old slot');
  K.reload(); assert.equal(K.layouts().right.core, 'KeyH', 'read back from storage');
  assert.throws(() => K.save({ left: { up: 'KeyQ', fire: 'KeyQ' } }), /duplicate/);
  assert.throws(() => K.set('nope', 'up', 'KeyQ'), /unknown stick/); assert.throws(() => K.set('left', 'nope', 'KeyQ'), /unknown slot/);
  K.reset(); assert.deepEqual(K.layouts(), K.DEFAULTS); assert.equal(st.getItem('dv.controls'), null);
  K.storage = stubStorage(); K.storage.setItem('dv.controls', '{not json'); K.reload(); assert.deepEqual(K.layouts(), K.DEFAULTS, 'corrupt storage → defaults');
});

test('merge: axes are summed by weight then clamped, buttons OR-ed, move-role side buttons become run/strafe, wheel + senses fold in', () => {
  const m = K.merge([
    { id: 'left', kind: 'keys', role: 'move', weight: 1, p: { x: 0.8, y: 0.8, buttons: { fire: true, sideRight: true }, dirs: { up: true, right: true }, held: { up: 120 } } },
    { id: 'arrows', kind: 'keys', role: 'move', weight: 1, p: { x: 0.8, y: -0.2, buttons: { sideLeft: true }, dirs: { down: true }, held: { up: 300 } } },
    { id: 'mouse', kind: 'mouse', role: 'sphere', weight: 0.5, p: { x: 1, y: -1, buttons: { core: true, sideLeft: true }, wheel: { raise: 2, lower: 0, next: 1, prev: 0, grow: 0, shrink: 1 } } },
    { id: 'senses', kind: 'senses', role: 'both', weight: 1, p: { right: { x: 0.25, y: 0 }, left: { x: 0, y: 0.5 }, buttons: {}, energy: 0.7, speaking: true, lean: 0.5, sphere: { raise: 1, lower: 0 } } },
    { id: 'off', kind: 'keys', role: 'move', weight: 1, enabled: false, p: { x: -5, y: -5, buttons: { core: true } } },
  ]);
  assert.equal(m.move.x, 1, '0.8 + 0.8 clamped'); assert.ok(Math.abs(m.move.y - 1) < 1e-9, '0.8 − 0.2 + 0.5 (lean) → 1.1 clamped');
  assert.equal(m.sphere.x, 0.75); assert.equal(m.sphere.y, -0.5);
  assert.deepEqual(m.buttons, { fire: true, core: true, sideLeft: true, sideRight: false }, 'the mouse side button is a chord button; the left stick side-right is run');
  assert.deepEqual(m.mods, { run: true, strafe: true });
  assert.deepEqual(m.dirs, { up: true, down: true, left: false, right: true });
  assert.equal(m.held.up, 300); assert.equal(m.wheel.raise, 3, 'wheel raise 2 + inflection 1'); assert.equal(m.wheel.next, 1); assert.equal(m.wheel.shrink, 1);
  assert.equal(m.energy, 0.7); assert.equal(m.speaking, true);
  assert.equal(Object.keys(m.sources).length, 4, 'disabled sources are left out');
});

test('mount(): keyboard sticks + a stub gamepad + a stub senses source drive a stub participant and field; a chord spans sources', () => {
  K.storage = stubStorage(); K.reset();
  let t = 0; const h = {}; const win = { addEventListener(ty, f) { (h[ty] = h[ty] || []).push(f); }, removeEventListener(ty, f) { h[ty] = (h[ty] || []).filter((x) => x !== f); } };
  const key = (code) => ({ code, preventDefault() {} }); const fire = (ty, e) => (h[ty] || []).forEach((f) => f(e));
  let pads = [null]; let sense = null;
  const calls = []; const participant = { drive: (d) => calls.push(['drive', +d.x.toFixed(2), +d.y.toFixed(2), d.run, d.strafe]), setKeyboard: (v) => calls.push(['kb', v]), jump: () => calls.push(['jump']), setArm: () => {}, root: { position: { x: 0, y: 0, z: 0, distanceTo: () => 99 } } };
  const field = { radius: 1, step: 0.25, stick: (x, y, dt) => calls.push(['stick', +x.toFixed(2), +y.toFixed(2)]), raise: () => calls.push(['raise']), lower: () => calls.push(['lower']), select: (w) => calls.push(['select', w]), use: () => calls.push(['use']), grow: (d) => calls.push(['grow', +d.toFixed(3)]), shrink: (d) => calls.push(['shrink', +d.toFixed(3)]), armTarget: () => ({ extend: 0.5, yaw: 0, pitch: 0 }), energy: () => {}, cycleMode: () => calls.push(['mode']) };
  const ctl = K.mount({ participant, field, target: win, canvas: null, now: () => t, getGamepads: () => pads, senses: true, readSenses: () => sense });
  assert.deepEqual(ctl.sources.map((s) => s.id), ['left', 'right', 'arrows', 'gamepad', 'senses']);
  assert.deepEqual(calls[0], ['kb', false], 'the built-in W/A/S/D is turned off (S is `left` now)');
  fire('keydown', key('KeyE')); fire('keydown', key('KeyF')); fire('keydown', key('KeyC')); ctl.tick(0.016);
  assert.deepEqual(calls.find((c) => c[0] === 'drive'), ['drive', 0.71, 0.71, true, false], 'E+F = a normalised diagonal, C = run');
  fire('keyup', key('KeyE')); fire('keyup', key('KeyF')); fire('keyup', key('KeyC'));
  fire('keydown', key('KeyJ')); ctl.tick(0.5); assert.deepEqual(calls.filter((c) => c[0] === 'stick').pop(), ['stick', -1, 0], 'J turns the field'); fire('keyup', key('KeyJ'));
  // the cross-source chord: core from the gamepad (button 9) + up from the keyboard (I)
  pads = [{ axes: [0, 0], buttons: Object.assign(new Array(16).fill({ pressed: false }), { 9: { pressed: true } }) }]; t = 100; ctl.tick(0.016);
  fire('keydown', key('KeyI')); t = 110; ctl.tick(0.016); assert.ok(calls.some((c) => c[0] === 'raise'), 'core (gamepad) + up (keyboard) → sphere.raise');
  fire('keyup', key('KeyI')); pads = [null]; t = 200; ctl.tick(0.016);
  // a fire tap → interact → jump; core+fire → item.use
  fire('keydown', key('Space')); t = 220; ctl.tick(0.016); fire('keyup', key('Space')); t = 240; ctl.tick(0.016); assert.ok(calls.some((c) => c[0] === 'jump'));
  fire('keydown', key('KeyK')); fire('keydown', key('Space')); t = 260; ctl.tick(0.016); assert.ok(calls.some((c) => c[0] === 'use')); fire('keyup', key('Space')); fire('keyup', key('KeyK')); t = 300; ctl.tick(0.016);
  // sideRight held ≥ 600 ms → field.grow while held
  fire('keydown', key('Semicolon')); t = 1000; ctl.tick(0.016); assert.ok(!calls.some((c) => c[0] === 'grow')); t = 1700; ctl.tick(0.1); assert.ok(calls.some((c) => c[0] === 'grow'));
  fire('keyup', key('Semicolon')); t = 1800; ctl.tick(0.1); assert.equal(ctl.growing, false);
  // senses: speaking grows the field slowly; silence relaxes it back
  sense = { voice: { speaking: true, level: 0.5 } }; t = 2000; ctl.tick(0.1); const grown = calls.filter((c) => c[0] === 'grow').length; assert.ok(grown >= 2);
  sense = { voice: { speaking: false, level: 0 } }; t = 2100; ctl.tick(0.1); assert.ok(calls.some((c) => c[0] === 'shrink'));
  assert.ok(ctl.describe().includes('CHORDS'));
  ctl.dispose(); assert.deepEqual(calls.pop(), ['kb', true]); assert.equal((h.keydown || []).length, 0);
});
