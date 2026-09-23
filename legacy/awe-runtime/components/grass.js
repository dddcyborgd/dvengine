/*!
 * awe runtime component — grass
 * Mirrors awe GrassComponent (engine-src/space/components/grass): an instanced, wind-animated grass
 * field. Builds a ground plane plus a THREE.InstancedMesh of thin blade planes scattered over it;
 * wind sway is applied in a vertex shader (top of blade bends, base stays planted). Props:
 * { count, size, color, ground, windStrength }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('grass.js: AweRuntime not loaded');

  global.AweRuntime.register('grass', function (props) {
    props = props || {};
    var grp, blades, bladeGeo, bladeMat, groundGeo, groundMat;

    return {
      type: 'grass',
      init: function (ctx) {
        var THREE = ctx.THREE;
        grp = new THREE.Group();
        grp.name = 'grass';
        var size = props.size || 24;
        var count = props.count || 4000;

        if (props.ground !== false) {
          groundGeo = new THREE.PlaneGeometry(size, size);
          groundMat = new THREE.MeshStandardMaterial({ color: 0x14301a, roughness: 1 });
          var ground = new THREE.Mesh(groundGeo, groundMat);
          ground.rotation.x = -Math.PI / 2;
          ground.receiveShadow = true;
          grp.add(ground);
        }

        // a single blade (tall thin plane), pivot at its base
        bladeGeo = new THREE.PlaneGeometry(0.08, 0.9, 1, 4);
        bladeGeo.translate(0, 0.45, 0);
        bladeMat = new THREE.MeshStandardMaterial({
          color: props.color != null ? props.color : 0x4caf50,
          side: THREE.DoubleSide, roughness: 0.9,
        });
        // inject wind sway into the vertex shader; amount scales with height (y)
        bladeMat.onBeforeCompile = function (shader) {
          shader.uniforms.uTime = bladeMat.userData.uTime = { value: 0 };
          shader.uniforms.uWind = { value: props.windStrength != null ? props.windStrength : 0.35 };
          shader.vertexShader = 'uniform float uTime; uniform float uWind;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            ['#include <begin_vertex>',
             'float h = position.y;',
             '#ifdef USE_INSTANCING',
             '  float ph = instanceMatrix[3][0] + instanceMatrix[3][2];',
             '#else',
             '  float ph = 0.0;',
             '#endif',
             'float sway = sin(uTime * 1.6 + ph) * uWind * h * h;',
             'transformed.x += sway;'
            ].join('\n')
          );
        };

        var n = count;
        blades = new THREE.InstancedMesh(bladeGeo, bladeMat, n);
        blades.name = 'grass-blades';
        var dummy = new THREE.Object3D();
        for (var i = 0; i < n; i++) {
          dummy.position.set((Math.random() - 0.5) * size, 0, (Math.random() - 0.5) * size);
          dummy.rotation.y = Math.random() * Math.PI;
          var s = 0.7 + Math.random() * 0.8;
          dummy.scale.set(1, s, 1);
          dummy.updateMatrix();
          blades.setMatrixAt(i, dummy.matrix);
        }
        blades.instanceMatrix.needsUpdate = true;
        grp.add(blades);
        return grp;
      },
      update: function (dt, t) {
        if (bladeMat && bladeMat.userData.uTime) bladeMat.userData.uTime.value = t;
      },
      dispose: function () {
        if (bladeGeo) bladeGeo.dispose(); if (bladeMat) bladeMat.dispose();
        if (groundGeo) groundGeo.dispose(); if (groundMat) groundMat.dispose();
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
