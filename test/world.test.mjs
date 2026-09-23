// dvengine — verse/world.js: ring positions, zone containment, portal reach, placements from live/spaces/agora.json · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const W = require('../verse/world.js');
const agora = JSON.parse(readFileSync(new URL('../live/spaces/agora.json', import.meta.url), 'utf8'));

test('ringPositions: n pieces on a ring at eye height, each facing the centre', () => {
  const ring = W.ringPositions(8, 6.5);
  assert.equal(ring.length, 8);
  for (const p of ring) {
    assert.equal(p.y, 1.6);
    assert.ok(Math.abs(Math.hypot(p.x, p.z) - 6.5) < 1e-6);
    // the rig/piece faces +z after yaw: stepping along (sin yaw, cos yaw) must move TOWARD the origin
    const nx = p.x + Math.sin(p.yaw), nz = p.z + Math.cos(p.yaw);
    assert.ok(Math.hypot(nx, nz) < Math.hypot(p.x, p.z), 'faces inward');
  }
  const out = W.ringPositions(4, 3, 0, { facing: 'out' })[1];
  assert.ok(Math.hypot(out.x + Math.sin(out.yaw), out.z + Math.cos(out.yaw)) > 3, 'facing out moves away');
  assert.equal(W.ringPositions(0, 5).length, 0);
});

test('zoneContains / portalReach', () => {
  const z = { bounds: { c: [10, 0, -4], r: 3 } };
  assert.ok(W.zoneContains(z, { x: 12, y: 1, z: -4 })); assert.ok(!W.zoneContains(z, { x: 14, y: 0, z: -4 })); assert.ok(!W.zoneContains({}, { x: 0, y: 0, z: 0 }));
  assert.ok(W.portalReach({ x: 0, z: 0 }, { x: 1, y: 5, z: 1 }, 1.6), 'y is ignored — reach is planar');
  assert.ok(!W.portalReach({ x: 0, z: 0 }, { x: 2, y: 0, z: 0 }, 1.6));
});

test('agora.json: 8 zones named after the journey stages, 8 portals placed inside their zone toward the next', () => {
  assert.equal(agora.zones.length, 8);
  assert.deepEqual(agora.zones.map((z) => z.id), ['arrival', 'recognition', 'communion', 'chain-of-thought', 'ascension', 'market-pulse', 'swarm-bloom', 'free-roam']);
  const portals = W.portalsOf(agora);
  assert.equal(portals.length, 8);
  for (const p of portals) {
    const from = W.zoneById(agora, p.from), to = W.zoneById(agora, p.to);
    assert.ok(from && to);
    assert.ok(W.zoneContains(from, p.position), 'portal stands inside its zone');
    const dFrom = Math.hypot(p.position.x - to.bounds.c[0], p.position.z - to.bounds.c[2]);
    const dCentre = Math.hypot(from.bounds.c[0] - to.bounds.c[0], from.bounds.c[2] - to.bounds.c[2]);
    assert.ok(dFrom < dCentre, 'portal is nearer the target than the zone centre is');
    assert.equal(p.minRole, to.minRole);
  }
  assert.equal(agora.nfts.length, 8); assert.equal(agora.agents.length, 3);
});

test('agentPlacements: agents sit in their zone; unknown zone falls to a ring at the origin', () => {
  const pl = W.agentPlacements(agora);
  assert.equal(pl.length, 3);
  for (const p of pl) { const z = W.zoneById(agora, p.agent.zone); assert.ok(W.zoneContains(z, p.position), p.id + ' inside ' + p.agent.zone); }
  const loose = W.agentPlacements({ agents: [{ id: 'x' }, { id: 'y', position: { x: 1, y: 0, z: 2 } }] });
  assert.ok(Math.abs(Math.hypot(loose[0].position.x, loose[0].position.z) - 3.2) < 1e-6);
  assert.deepEqual(loose[1].position, { x: 1, y: 0, z: 2 });
});

test('typesOf / ensure: the native set plus every type the document names; ensure resolves without DVEngine', async () => {
  const t = W.typesOf(agora);
  for (const n of W.NATIVE) assert.ok(t.includes(n));
  for (const k of Object.keys(agora.components || {})) assert.ok(t.includes(agora.components[k].type));
  assert.deepEqual(await W.ensure(agora), []);
});
