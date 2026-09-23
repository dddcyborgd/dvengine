// dvengine — input/chords.js (DVChords): simultaneous chords, sequences, holds, taps, a custom map · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../input/chords.js');
const acts = (list) => list.map((a) => a.action);

test('parse: chord parts are sorted so order never matters; seq, hold, tap', () => {
  assert.deepEqual(C.parse('up+core'), { kind: 'chord', parts: ['core', 'up'] });
  assert.deepEqual(C.parse('core,core'), { kind: 'seq', parts: ['core', 'core'] });
  assert.deepEqual(C.parse('core:hold'), { kind: 'hold', parts: ['core'] });
  assert.deepEqual(C.parse('fire'), { kind: 'tap', parts: ['fire'] });
});

test('simultaneous: fires on the press that completes the held set, consumes the buttons, once per press', () => {
  const c = C.create();
  assert.deepEqual(acts(c.press('core', 0)), []);
  assert.deepEqual(acts(c.press('up', 10)), ['sphere.raise']);
  assert.deepEqual(c.held(), ['core', 'up']);
  assert.deepEqual(acts(c.release('up', 20)), [], 'consumed → no tap');
  assert.deepEqual(acts(c.press('up', 30)), ['sphere.raise'], 'core still held: tap up again → again');
  assert.deepEqual(acts(c.press('fire', 40)), [], 'core+up+fire is no chord');
  c.reset();
  assert.deepEqual(acts(c.press('fire', 100).concat(c.press('core', 101))), ['item.use'], 'order-free');
  assert.deepEqual(acts(c.release('core', 110).concat(c.release('fire', 111))), [], 'neither counts as a tap afterwards');
});

test('sequence: a double-tap of the core within 350 ms; slower is nothing; a chord in between breaks it', () => {
  const c = C.create();
  c.press('core', 0); c.release('core', 50); c.press('core', 200); assert.deepEqual(acts(c.release('core', 250)), ['focus.toggle']);
  c.press('core', 1000); c.release('core', 1050); c.press('core', 1500); assert.deepEqual(acts(c.release('core', 1550)), [], '450 ms apart → no');
  c.press('core', 2000); c.release('core', 2020); c.press('core', 2100); c.press('up', 2110); c.release('up', 2120); assert.deepEqual(acts(c.release('core', 2130)), [], 'the second core joined a chord');
  c.press('core', 3000); c.release('core', 3010); c.press('core', 3100); c.release('core', 3110); c.press('core', 3200); assert.deepEqual(acts(c.release('core', 3210)), [], 'a triple does not re-fire (the pair was cleared)');
});

test('hold: ≥ 600 ms without joining a chord; fires once; the release is then not a tap', () => {
  const c = C.create();
  c.press('core', 0); assert.deepEqual(acts(c.tick(599)), []); assert.deepEqual(acts(c.tick(600)), ['menu']); assert.deepEqual(acts(c.tick(900)), []);
  assert.deepEqual(acts(c.release('core', 1000)), []);
  c.press('core', 2000); c.press('up', 2100); assert.deepEqual(acts(c.tick(3000)), [], 'a button consumed by a chord never holds');
  c.reset(); c.press('fire', 0); assert.deepEqual(acts(c.tick(700)), ['gesture.greet']);
});

test('taps and the default map', () => {
  const c = C.create();
  c.press('fire', 0); assert.deepEqual(acts(c.release('fire', 100)), ['interact']);
  assert.equal(C.DEFAULT['core+up'], 'sphere.raise'); assert.equal(C.DEFAULT['left+right'], 'reach'); assert.equal(C.DEFAULT['sideRight:hold'], 'field.grow');
  c.press('left', 0); assert.deepEqual(acts(c.press('right', 1)), ['reach']);
  assert.deepEqual(c.map(), C.DEFAULT);
});

test('a custom map, bind(), listeners, custom timings', () => {
  const seen = []; const c = C.create({ 'a+b': 'ab', 'a,a,a': 'triple', 'b:hold': 'bh', 'a': 'tap' }, { seqMs: 100, holdMs: 200 });
  const off = c.on('chord', (e) => seen.push(e.key));
  c.press('a', 0); c.release('a', 10); c.press('a', 50); c.release('a', 60); c.press('a', 120); assert.deepEqual(acts(c.release('a', 130)), ['tap', 'triple']);
  c.press('b', 500); assert.deepEqual(acts(c.tick(700)), ['bh']);
  assert.deepEqual(seen, ['a', 'a', 'a', 'a,a,a', 'b:hold']); off();
  c.bind({ 'x+y': 'xy' }); c.reset(); c.press('a', 0); assert.deepEqual(acts(c.release('a', 5)), [], 'the old map is gone');
  c.press('y', 10); assert.deepEqual(acts(c.press('x', 11)), ['xy']); assert.equal(seen.length, 5, 'listener removed');
});
