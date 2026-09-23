// dvengine — input/senses.js (DVSenseStick): a stubbed DVParticipantInput state → head yaw → right-stick x, lean → left y, jawOpen → fire pulse, onset → fire tap, speaking → fire hold, peak → core, inflection → raise/lower, level → energy; inert without a source · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../input/senses.js');
const deg = (d) => d * Math.PI / 180;

test('headAxes: dead zone 4°, full at 30°, sign kept, degrees accepted', () => {
  assert.deepEqual(S.headAxes({ yaw: deg(2), pitch: 0 }), { x: 0, y: 0 });
  assert.deepEqual(S.headAxes({ yaw: deg(30), pitch: deg(-45) }), { x: 1, y: -1 });
  const h = S.headAxes({ yaw: deg(17), pitch: 0 }); assert.ok(h.x > 0.49 && h.x < 0.51, '(17−4)/(30−4) = 0.5');
  assert.deepEqual(S.headAxes({ yaw: 30, pitch: 0 }, { units: 'deg' }), { x: 1, y: 0 });
  assert.deepEqual(S.headAxes(null), { x: 0, y: 0 });
});

test('normalise: DVParticipantInput state as is; a DVDirector senses state (face/audio) lifted to the same shape', () => {
  const a = S.normalise({ voice: { level: 0.2 }, vision: { present: true } }); assert.equal(a.voice.level, 0.2); assert.equal(a.vision.present, true);
  const b = S.normalise({ face: { active: true, present: true, pose: { yaw: 0.3 }, gesture: { name: 'smile', value: 1 } }, audio: { level: 0.5 } });
  assert.equal(b.vision.present, true); assert.equal(b.vision.pose.yaw, 0.3); assert.equal(b.voice.level, 0.5);
  assert.equal(S.normalise({}), null); assert.equal(S.normalise(null), null);
});

test('inert without any source', () => {
  const s = S.create({ read: () => null }); const p = s.poll(0);
  assert.equal(p.available, false); assert.deepEqual(p.right, { x: 0, y: 0 }); assert.equal(p.buttons.fire, false); assert.equal(p.energy, 0);
  const g = S.create(); assert.equal(g.poll(0).available, false, 'no DVParticipantInput / DVDirector globals here');
});

test('camera: head yaw → right.x (smoothed toward the target), lean → left.y, gesture onsets pulse buttons once', () => {
  let st = { vision: { present: true, pose: { yaw: deg(30), pitch: 0 }, lean: 1, gesture: null } };
  const s = S.create({ read: () => st, smoothing: 0.5, pulseMs: 100 });
  let p = s.poll(0); assert.equal(p.available, true); assert.ok(Math.abs(p.right.x - 0.5) < 1e-9, 'first poll: half way with smoothing 0.5'); assert.ok(Math.abs(p.left.y - 0.5) < 1e-9);
  p = s.poll(10); assert.ok(Math.abs(p.right.x - 0.75) < 1e-9);
  st = { vision: { present: true, pose: { yaw: 0, pitch: 0 }, lean: 0, gesture: { name: 'jawOpen', value: 0.9 } } };
  const ev = []; s.on('button', (b) => ev.push(b.name + (b.down ? '+' : '-')));
  p = s.poll(20); assert.equal(p.buttons.fire, true, 'jawOpen → fire pulse'); assert.equal(p.held.fire, 0);
  p = s.poll(60); assert.equal(p.buttons.fire, true, 'still inside the 100 ms pulse; the gesture staying on does not re-pulse');
  p = s.poll(130); assert.equal(p.buttons.fire, false, 'the pulse ended');
  st.vision.gesture = { name: 'nod', value: 1 }; p = s.poll(140); assert.equal(p.buttons.core, true, 'nod → core');
  st.vision.gesture = { name: 'browsUp', value: 1 }; p = s.poll(260); assert.equal(p.buttons.sideLeft, true); assert.equal(p.buttons.core, false);
  st.vision.gesture = { name: 'smile', value: 1 }; p = s.poll(380); assert.equal(p.buttons.sideRight, true);
  assert.deepEqual(ev, ['fire+', 'fire-', 'core+', 'core-', 'sideLeft+', 'sideLeft-', 'sideRight+']);
  st.vision.present = false; for (let i = 0; i < 40; i++) p = s.poll(500 + i * 10); assert.equal(p.right.x, 0, 'no face → the stick relaxes to centre');
});

test('mic: onset → fire tap, sustained speaking ≥ 400 ms → fire held, peak → core tap, inflection → raise/lower once per crossing, level → energy', () => {
  let v = { level: 0.8, peak: false, onset: true, speaking: true, inflection: 0 };
  const s = S.create({ read: () => ({ voice: v }), pulseMs: 100, holdMs: 400 });
  let p = s.poll(0); assert.equal(p.buttons.fire, true, 'onset tap'); assert.ok(p.energy > 0.2 && p.energy < 0.3, 'energy eases toward the level');
  v = { level: 0.8, onset: false, speaking: true, inflection: 0 }; p = s.poll(150); assert.equal(p.buttons.fire, false, 'tap over, not yet a hold');
  p = s.poll(400); assert.equal(p.buttons.fire, true, 'speaking 400 ms → held'); p = s.poll(900); assert.equal(p.buttons.fire, true); assert.ok(p.held.fire >= 400); assert.equal(p.speaking, true);
  v = { level: 0, speaking: false }; p = s.poll(950); assert.equal(p.buttons.fire, false); assert.equal(p.speaking, false);
  v = { peak: true }; p = s.poll(1000); assert.equal(p.buttons.core, true); p = s.poll(1050); assert.equal(p.buttons.core, true); v = { peak: true }; p = s.poll(1200); assert.equal(p.buttons.core, false, 'a peak that stays on is one tap');
  const sph = []; s.on('sphere', (d) => sph.push(d));
  v = { inflection: 0.6 }; p = s.poll(1300); assert.equal(p.sphere.raise, 1); p = s.poll(1310); assert.equal(p.sphere.raise, 0, 'once per crossing');
  v = { inflection: -0.6 }; p = s.poll(1320); assert.equal(p.sphere.lower, 1); assert.equal(sph.length, 2);
  for (let i = 0; i < 80; i++) p = s.poll(1400 + i * 10); assert.equal(p.energy, 0, 'silence decays the energy to 0');
});
