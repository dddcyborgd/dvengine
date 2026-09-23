/*! dvengine — DVVerse.world (verse/world.js) · the world from a cyborg-space/1 document: skydome, floor, zones, portals, the pieces ring, aivatars, the THOT memory · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 * Pure layout (node-testable):
 *   ringPositions(n, radius, y, opts{start,facing:'in'|'out'}) → [{x,y,z,yaw}]   pieces face the centre at eye height 1.6
 *   zoneContains(zone, p) · portalReach(portalPos, p, r) · portalsOf(doc) → [{id,from,to,minRole,position,label}]
 *   agentPlacements(doc) → [{id, position, yaw}]   agents sit in their zone (agent.zone) or around the origin
 * Build (three.js at use time): build(space, doc, { rung, veil, skyPreset, floorPreset }) → handles map
 */
(function (global) {
  'use strict';
  var EYE = 1.6;
  function ringPositions(n, radius, y, opts) {
    opts = opts || {}; var out = [], start = opts.start || 0, r = radius || 6;
    for (var i = 0; i < n; i++) {
      var a = start + (i / Math.max(1, n)) * Math.PI * 2, x = Math.sin(a) * r, z = Math.cos(a) * r;
      var yaw = opts.facing === 'out' ? a : a + Math.PI;   // +z face → faces the centre when yaw = a + π
      out.push({ x: +x.toFixed(6), y: y == null ? EYE : y, z: +z.toFixed(6), yaw: yaw, index: i });
    }
    return out;
  }
  function zoneContains(z, p) { var b = z && z.bounds; if (!b || !b.c) return false; var dx = (p.x || 0) - b.c[0], dy = (p.y || 0) - b.c[1], dz = (p.z || 0) - b.c[2]; return dx * dx + dy * dy + dz * dz <= b.r * b.r; }
  function portalReach(c, p, r) { r = r || 1.6; var dx = (p.x || 0) - (c.x || 0), dz = (p.z || 0) - (c.z || 0); return dx * dx + dz * dz <= r * r; }
  function zoneById(doc, id) { var zs = (doc && doc.zones) || []; for (var i = 0; i < zs.length; i++) if (zs[i].id === id) return zs[i]; return null; }
  /** A portal stands at the edge of its zone, toward the zone it leads to (or at the zone centre when the target is unknown). */
  function portalsOf(doc) {
    var out = [], zs = (doc && doc.zones) || [];
    zs.forEach(function (z) {
      if (!z.portalTo) return;
      var c = (z.bounds && z.bounds.c) || [0, 0, 0], r = (z.bounds && z.bounds.r) || 6, t = zoneById(doc, z.portalTo);
      var pos = { x: c[0], y: c[1], z: c[2] };
      if (t && t.bounds) { var dx = t.bounds.c[0] - c[0], dz = t.bounds.c[2] - c[2], d = Math.sqrt(dx * dx + dz * dz) || 1; var k = Math.max(0, r - 1.6); pos = { x: c[0] + dx / d * k, y: c[1], z: c[2] + dz / d * k }; }
      out.push({ id: 'portal:' + z.id + '→' + z.portalTo, from: z.id, to: z.portalTo, minRole: (t && t.minRole) || z.minRole || 'public', position: pos, label: (t && (t.name || t.id)) || z.portalTo });
    });
    return out;
  }
  function agentPlacements(doc) {
    var agents = (doc && doc.agents) || [], out = [];
    agents.forEach(function (a, i) {
      var pos = a.position ? { x: +a.position.x || 0, y: +a.position.y || 0, z: +a.position.z || 0 } : null, yaw = a.yaw || 0;
      if (!pos) { var z = a.zone ? zoneById(doc, a.zone) : null; if (z && z.bounds) { var ang = i * 2.1; pos = { x: z.bounds.c[0] + Math.sin(ang) * z.bounds.r * 0.3, y: z.bounds.c[1], z: z.bounds.c[2] + Math.cos(ang) * z.bounds.r * 0.3 }; yaw = ang + Math.PI; } else { var rp = ringPositions(agents.length, 3.2, 0, { start: 0.4 })[i]; pos = { x: rp.x, y: 0, z: rp.z }; yaw = rp.yaw; } }
      out.push({ id: a.id || ('agent-' + i), position: pos, yaw: yaw, agent: a });
    });
    return out;
  }

  /** The component types the world needs: the native set + every type the document names. */
  var NATIVE = ['substrate', 'portal', 'zone', 'piece', 'aivatar', 'thot-memory', 'participant', 'remote-participant', 'lighting', 'sceptre', 'orb'];
  function typesOf(doc) { var t = NATIVE.slice(), c = (doc && doc.components) || {}; Object.keys(c).forEach(function (k) { var ty = c[k] && c[k].type; if (ty && t.indexOf(ty) < 0) t.push(ty); }); return t; }
  /** Register every needed type first (DVEngine.lazy resolves at once when already registered; a type that cannot load is skipped, never fatal). */
  function ensure(doc) {
    var E = global.DVEngine; if (!E || !E.lazy) return Promise.resolve([]);
    return Promise.all(typesOf(doc).map(function (t) { return E.lazy(t).then(function () { return t; }, function () { return null; }); })).then(function (r) { return r.filter(Boolean); });
  }

  function build(space, doc, opts) {
    opts = opts || {};
    var H = {}, E = global.DVEngine, veil = opts.veil || { zones: {}, portals: {} };
    function add(type, props, meta) { if (!E.has(type)) return null; try { return space.add(type, props, meta); } catch (e) { return null; } }
    var skin = opts.skyPreset || doc.skin || 'shadow-field';
    H.sky = add('substrate', { preset: skin, shape: 'sky', radius: 70, fps: 24, seed: 7 }, { id: 'sky' });
    H.floor = add('substrate', { preset: opts.floorPreset || null, shape: 'floor', radius: opts.floorRadius || 26, fps: 8, seed: 3, opacity: 0.85 }, { id: 'floor' });
    if (!H.floor) { var THREE = space.THREE, fm = new THREE.Mesh(new THREE.CircleGeometry(26, 64), new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.85 })); fm.rotation.x = -Math.PI / 2; fm.receiveShadow = true; space.scene.add(fm); H.floorMesh = fm; }
    if (!doc.components || !Object.keys(doc.components).some(function (k) { return doc.components[k].type === 'lighting'; })) H.lighting = add('lighting', { animate: false }, { id: 'lighting' });
    H.zones = {}; (doc.zones || []).forEach(function (z) { H.zones[z.id] = add('zone', { id: z.id, name: z.name, bounds: z.bounds, minRole: z.minRole, locked: !!veil.zones[z.id], visible: !!opts.debugZones }, { id: 'zone:' + z.id }); });
    H.portals = {}; portalsOf(doc).forEach(function (p) { H.portals[p.id] = add('portal', { id: p.id, to: p.to, minRole: p.minRole, label: p.label, position: p.position, locked: !!veil.portals[p.from + '→' + p.to], seed: p.id.length }, { id: p.id }); });
    H.pieces = {}; var nfts = doc.nfts || [], ring = ringPositions(nfts.length, opts.ringRadius || 6.5, EYE, { start: Math.PI / nfts.length || 0 });
    nfts.forEach(function (nft, i) { H.pieces[nft.id] = add('piece', { nft: nft, position: { x: ring[i].x, y: ring[i].y, z: ring[i].z }, rotation: { x: 0, y: ring[i].yaw, z: 0 } }, { id: 'piece:' + nft.id }); });
    H.agents = {}; agentPlacements(doc).forEach(function (pl) { var a = pl.agent; H.agents[pl.id] = add('aivatar', { id: pl.id, type: a.type, name: a.name, seed: a.seed, tint: a.tint, dims: a.dims, say: a.say, position: pl.position, yaw: pl.yaw, facePreset: a.face || doc.skin }, { id: 'agent:' + pl.id }); });
    if (doc.agent && doc.agent.thotRoot) H.thot = add('thot-memory', { root: doc.agent.thotRoot, depth: 4, position: opts.thotPosition || { x: 0, y: 2.4, z: -9 }, label: 'THOT · ' + String(doc.agent.thotRoot).slice(0, 10) }, { id: 'thot' });
    return H;
  }

  var api = { EYE: EYE, NATIVE: NATIVE, typesOf: typesOf, ensure: ensure, ringPositions: ringPositions, zoneContains: zoneContains, portalReach: portalReach, portalsOf: portalsOf, agentPlacements: agentPlacements, zoneById: zoneById, build: build };
  var NS = global.DVVerse = global.DVVerse || {}; NS.world = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
