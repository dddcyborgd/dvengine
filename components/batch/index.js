/*!
 * dvengine component — batch (components/batch/index.js) · folder-is-module · awe port
 * Mirrors awe BatchComponent (engine-src/space/components/batch): many small static meshes collapsed
 * into a single draw call. BufferGeometryUtils may be absent offline, so the merge is done by hand —
 * vertex positions/normals are copied (with per-cube world offset) into one big BufferGeometry, plus a
 * merged index buffer. The result is one THREE.Mesh for the whole field, demonstrating draw-call
 * batching. Props: { count, color, spread, position }. Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/batch/index.js: DVEngine not loaded');

  global.DVEngine.register('batch', function (props) {
    props = props || {};
    var mesh, geo, mat, THREE;

    // hand-merge: copy a source (indexed) geometry `count` times into one buffer, offset per copy.
    function mergeCubes(THREE, src, offsets) {
      var srcPos = src.attributes.position;
      var srcNorm = src.attributes.normal;
      var srcIdx = src.index;
      var vPer = srcPos.count;
      var iPer = srcIdx ? srcIdx.count : 0;
      var n = offsets.length;

      var positions = new Float32Array(vPer * 3 * n);
      var normals = new Float32Array(vPer * 3 * n);
      var indices = new Uint32Array(iPer * n);

      for (var k = 0; k < n; k++) {
        var o = offsets[k];
        var vBase = k * vPer;
        for (var v = 0; v < vPer; v++) {
          var pi = (vBase + v) * 3;
          positions[pi]     = srcPos.getX(v) + o.x;
          positions[pi + 1] = srcPos.getY(v) + o.y;
          positions[pi + 2] = srcPos.getZ(v) + o.z;
          normals[pi]     = srcNorm.getX(v);
          normals[pi + 1] = srcNorm.getY(v);
          normals[pi + 2] = srcNorm.getZ(v);
        }
        var iBase = k * iPer;
        for (var i = 0; i < iPer; i++) {
          indices[iBase + i] = srcIdx.getX(i) + vBase;
        }
      }

      var merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      merged.setIndex(new THREE.BufferAttribute(indices, 1));
      merged.computeBoundingSphere();
      return merged;
    }

    return {
      type: 'batch',
      init: function (ctx) {
        THREE = ctx.THREE;
        var count = props.count || 200;
        var spread = props.spread || 14;

        var src = new THREE.BoxGeometry(0.4, 0.4, 0.4); // BoxGeometry is indexed in r184

        var offsets = [];
        for (var i = 0; i < count; i++) {
          offsets.push({
            x: (Math.random() - 0.5) * spread,
            y: Math.random() * spread * 0.5 + 0.2,
            z: (Math.random() - 0.5) * spread,
          });
        }

        geo = mergeCubes(THREE, src, offsets);
        src.dispose();

        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(props.color != null ? props.color : 0xff6ad5),
          roughness: 0.55,
          metalness: 0.1,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'batch';
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        var pos = props.position || { x: 0, y: 0, z: 0 };
        mesh.position.set(pos.x, pos.y, pos.z);
        return mesh;
      },
      update: function (dt, t) {
        if (mesh) mesh.rotation.y = t * 0.15;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
