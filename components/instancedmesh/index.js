/*!
 * dvengine component — instancedmesh (components/instancedmesh/index.js) · folder-is-module · awe port
 * Mirrors awe InstancedMeshComponent (engine-src/space/components/instancedmesh): one draw call for
 * many identical objects. Builds a THREE.InstancedMesh grid of boxes (or spheres) with per-instance
 * color, animated by a wave that lifts/rotates each instance. Props:
 * { rows, cols, gap, shape:'box'|'sphere', color, animate }. Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/instancedmesh/index.js: DVEngine not loaded');

  global.DVEngine.register('instancedmesh', function (props) {
    props = props || {};
    var mesh, geo, mat, rows, cols, gap, animate, dummy, THREE;

    return {
      type: 'instancedmesh',
      init: function (ctx) {
        THREE = ctx.THREE;
        rows = props.rows || 12;
        cols = props.cols || 12;
        gap = props.gap || 1.1;
        animate = props.animate !== false;
        var n = rows * cols;

        geo = props.shape === 'sphere' ? new THREE.SphereGeometry(0.35, 16, 12) : new THREE.BoxGeometry(0.6, 0.6, 0.6);
        mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.15 });
        mesh = new THREE.InstancedMesh(geo, mat, n);
        mesh.name = 'instancedmesh';
        mesh.castShadow = true;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        dummy = new THREE.Object3D();
        var c0 = new THREE.Color(props.color != null ? props.color : 0x4dd0e1);
        var c1 = new THREE.Color(0xff6ad5);
        var color = new THREE.Color();
        var ox = -(cols - 1) * gap / 2, oz = -(rows - 1) * gap / 2;
        var i = 0;
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            dummy.position.set(ox + c * gap, 0.3, oz + r * gap);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            color.copy(c0).lerp(c1, (r + c) / (rows + cols));
            mesh.setColorAt(i, color);
            i++;
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        return mesh;
      },
      update: function (dt, t) {
        if (!mesh || !animate) return;
        var ox = -(cols - 1) * gap / 2, oz = -(rows - 1) * gap / 2, i = 0;
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var x = ox + c * gap, z = oz + r * gap;
            var d = Math.sqrt(x * x + z * z);
            dummy.position.set(x, 0.3 + Math.sin(t * 2 - d * 0.5) * 0.8, z);
            dummy.rotation.y = t * 0.5 + d * 0.1;
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            i++;
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
