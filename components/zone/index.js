/*! dvengine — component zone (components/zone/index.js) · an invisible spherical volume from doc.zones[]; tracks the local participant and emits dv:zone · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · DeltaVerse-native */
/*
 * Props: { id, bounds:{c:[x,y,z], r}, minRole, locked, visible (debug wireframe, false), name }
 * Emits `dv:zone {id, inside, minRole, locked, name}` on the space when the local participant (space.local
 * else the camera) crosses the boundary. Pure: DVZone.contains(bounds, p).
 */
(function (global) {
  'use strict';
  function contains(b, p) {
    if (!b || !b.c) return false;
    var dx = (p.x || 0) - b.c[0], dy = (p.y || 0) - b.c[1], dz = (p.z || 0) - b.c[2];
    return dx * dx + dy * dy + dz * dz <= (b.r || 0) * (b.r || 0);
  }
  var pure = { contains: contains };
  if (!global.DVEngine) { if (typeof module !== 'undefined' && module.exports) module.exports = pure; global.DVZone = pure; return; }

  global.DVEngine.register('zone', function (props) {
    props = props || {};
    var THREE, root, mesh, geo, mat, inside = false, space, b = props.bounds || { c: [0, 0, 0], r: 6 };
    var comp = {
      type: 'zone',
      init: function (ctx) {
        THREE = ctx.THREE; space = ctx.space;
        root = new THREE.Group(); root.name = 'zone:' + (props.id || '?');
        root.position.set(b.c[0], b.c[1], b.c[2]);
        geo = new THREE.SphereGeometry(b.r || 6, 24, 12);
        mat = new THREE.MeshBasicMaterial({ color: props.locked ? 0xff6b6b : 0x22d3ee, wireframe: true, transparent: true, opacity: 0.12 });
        mesh = new THREE.Mesh(geo, mat); mesh.visible = !!props.visible; root.add(mesh);
        root.userData.dvZone = comp;
        return root;
      },
      contains: function (p) { return contains(b, p); },
      get inside() { return inside; },
      get bounds() { return b; },
      setLocked: function (v) { props.locked = !!v; if (mat) mat.color.set(v ? 0xff6b6b : 0x22d3ee); },
      update: function () {
        var local = space.local || space.camera; if (!local) return;
        var wp = local.getWorldPosition ? local.getWorldPosition(new THREE.Vector3()) : local.position;
        var now = contains(b, wp);
        if (now !== inside) { inside = now; space._emit('dv:zone', { id: props.id, name: props.name || props.id, inside: inside, minRole: props.minRole || null, locked: !!props.locked }); }
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); }
    };
    return comp;
  });
  global.DVZone = pure;
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
