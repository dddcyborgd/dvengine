/*!
 * dvengine component — group (components/group/index.js) · folder-is-module · awe port
 * Mirrors awe GroupComponent (engine-src/space/components/group): a transform container that
 * parents children — the scene-graph demonstrator. Builds a THREE.Group, parents a few small child
 * meshes, and rotates the whole group (children inherit the transform). Props:
 * { position, count, radius, color, spin }. Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/group/index.js: DVEngine not loaded');

  global.DVEngine.register('group', function (props) {
    props = props || {};
    var group, spin, geos = [], mats = [];

    return {
      type: 'group',
      init: function (ctx) {
        var THREE = ctx.THREE;
        group = new THREE.Group();
        group.name = 'group';
        var pos = props.position || { x: -6, y: 2.5, z: 0 };
        group.position.set(pos.x, pos.y, pos.z);

        var count = props.count || 5;
        var radius = props.radius || 1.6;
        var color = props.color != null ? props.color : 0x8b5cf6;
        for (var i = 0; i < count; i++) {
          var a = (i / count) * Math.PI * 2;
          var geo = new THREE.IcosahedronGeometry(0.4, 0);
          var mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.2, emissive: 0x120a2a });
          geos.push(geo); mats.push(mat);
          var child = new THREE.Mesh(geo, mat);
          child.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
          child.castShadow = true;
          group.add(child);
        }
        spin = props.spin !== false;
        return group;
      },
      update: function (dt, t) {
        if (!group || !spin) return;
        group.rotation.y = t * 0.5;
        // children also bob individually — they inherit the group transform
        for (var i = 0; i < group.children.length; i++) {
          group.children[i].position.y = Math.sin(t * 1.5 + i) * 0.3;
          group.children[i].rotation.x = t * 0.8;
        }
      },
      dispose: function () {
        for (var i = 0; i < geos.length; i++) { geos[i].dispose(); mats[i].dispose(); }
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
