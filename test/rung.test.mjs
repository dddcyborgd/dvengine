// dvengine — verse/rung.js: claim decoding (never verification), the ladder, the veil · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../verse/rung.js');
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const token = (c) => b64u(c) + '.0xdeadbeefsignature';

test('the ladder is privilege-tiers.json: 8 rungs + MASTERMIND (+1)', () => {
  assert.equal(R.LADDER.length, 9); assert.equal(R.rankOf('overlord'), 7); assert.equal(R.rankOf('mastermind'), 8); assert.equal(R.rungName(6), 'overseer');
  assert.equal(R.rankOf('public'), 0); assert.equal(R.rankOf('nonsense'), 0); assert.equal(R.rankOf(42), 8); assert.equal(R.rankOf(-3), 0);
  assert.ok(R.atLeast('overseer', 'member')); assert.ok(!R.atLeast('member', 'overseer')); assert.ok(R.atLeast(3, 'player'));
});

test('parseClaim reads the base64url JSON before the last dot, without verifying', () => {
  const c = { iss: '0xabc', clientID: 'dv', sub: '0x123', tier: 'member', rung: 'overseer', name: 'Ada', iat: 1, exp: 4102444800 };
  assert.deepEqual(R.parseClaim(token(c)), c);
  assert.deepEqual(R.parseClaim(b64u(c)), c, 'a bare body still parses');
  assert.equal(R.parseClaim('not.base64.at.all'), null); assert.equal(R.parseClaim(''), null); assert.equal(R.parseClaim(null), null);
  // a signature is never checked here: any dot-suffix yields the same claim
  assert.deepEqual(R.parseClaim(b64u(c) + '.anything'), c);
});

test('identify: rung wins, tier falls back, sub alone = member, nothing = participant, expired = participant', () => {
  assert.equal(R.identify(token({ sub: '0x1', rung: 'trader' })).rung, 4);
  assert.equal(R.identify(token({ sub: '0x1', tier: 'deployer' })).rung, 5);
  assert.equal(R.identify(token({ sub: '0x1', tier: 'overlord' })).rung, 7);
  assert.equal(R.identify(token({ sub: '0x1' })).rung, 2);
  const none = R.identify(undefined); assert.equal(none.rung, 0); assert.equal(none.rank, 'participant'); assert.equal(none.verified, false);
  const ex = R.identify(token({ sub: '0x1', rung: 'overlord', exp: 100 }), 200); assert.equal(ex.rung, 0); assert.equal(ex.expired, true);
  const ok = R.identify(token({ sub: '0x1', rung: 'overlord', exp: 300, name: 'B' }), 200); assert.equal(ok.rung, 7); assert.equal(ok.name, 'B');
});

test('theme without DVThemeSynth: the role-theme table, not applied', () => {
  const t = R.theme(7, 'gnuvault'); assert.equal(t.id, 'obsidian-gold'); assert.equal(t.overlay, 'gnuvault'); assert.equal(t.synthesized, false);
  assert.equal(R.theme(0).id, 'default-dark'); assert.equal(R.theme('trader').id, 'automindx');
});

test('veil: zones and portals a rung may not enter', () => {
  const doc = { zones: [{ id: 'a', minRole: 'public', portalTo: 'b' }, { id: 'b', minRole: 'overseer', portalTo: 'c' }, { id: 'c', minRole: 'member' }] };
  const v = R.veil(doc, 'member');
  assert.deepEqual(v.zones, { a: false, b: true, c: false });
  assert.equal(v.portals['a→b'], true, 'portal into an overseer zone is veiled for a member');
  assert.equal(v.portals['b→c'], false);
  assert.deepEqual(R.veil(doc, 'overlord').zones, { a: false, b: false, c: false });
});
