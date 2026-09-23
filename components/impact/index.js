/*!
 * dvengine component — impact (components/impact/index.js) · folder-is-module · awe port
 * Mirrors awe ImpactComponent (engine-src/space/components/impact): short-lived burst effects at a
 * point of contact. Realized as a looping one-shot: an expanding ring/shockwave mesh plus a radial
 * spark burst (THREE.Points), replayed every `period` seconds. Props: { color, period }.
 * Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/impact/index.js: DVEngine not loaded');

  global.DVEngine.register('impact', function (props) {
    props = props || {};
    var group, ring, ringGeo, ringMat, sparks, sparkGeo, sparkMat, period, sparkDir, sparkN, cycle;

    return {
      type: 'impact',
      init: function (ctx) {
        var THREE = ctx.THREE;
        period = props.period || 3.0;
        cycle = 0;
        var color = new THREE.Color(props.color != null ? props.color : 0xff5a3c);
        group = new THREE.Group();
        group.name = 'impact';

        ringGeo = new THREE.RingGeometry(0.9, 1.0, 48);
        ringMat = new THREE.MeshBasicMaterial({
          color: color, transparent: true, opacity: 0.9,
          side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
        });
        ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        sparkN = props.sparks || 80;
        var pos = new Float32Array(sparkN * 3);
        sparkDir = new Float32Array(sparkN * 3);
        for (var i = 0; i < sparkN; i++) {
          var a = Math.random() * Math.PI * 2;
          var up = 0.3 + Math.random() * 0.7;
          sparkDir[i * 3] = Math.cos(a);
          sparkDir[i * 3 + 1] = up;
          sparkDir[i * 3 + 2] = Math.sin(a);
        }
        sparkGeo = new THREE.BufferGeometry();
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        sparkMat = new THREE.PointsMaterial({
          color: color, size: props.size || 0.14,
          transparent: true, opacity: 0.95, depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        sparks = new THREE.Points(sparkGeo, sparkMat);
        group.add(sparks);
        return group;
      },
      update: function (dt, t) {
        if (!group || dt <= 0) return;
        var phase = (t % period) / period;           // 0..1 within a burst
        var k = Math.min(phase * 3, 1);               // burst lasts first third
        var fade = 1 - k;
        // expanding ring
        var s = 0.2 + k * 6;
        ring.scale.set(s, s, s);
        ringMat.opacity = 0.9 * fade;
        // radial sparks
        var p = sparkGeo.attributes.position.array;
        var reach = k * 5;
        for (var i = 0; i < sparkN; i++) {
          p[i * 3] = sparkDir[i * 3] * reach;
          p[i * 3 + 1] = sparkDir[i * 3 + 1] * reach - k * k * 2;   // gravity arc
          p[i * 3 + 2] = sparkDir[i * 3 + 2] * reach;
        }
        sparkGeo.attributes.position.needsUpdate = true;
        sparkMat.opacity = 0.95 * fade;
      },
      dispose: function () {
        if (ringGeo) ringGeo.dispose(); if (ringMat) ringMat.dispose();
        if (sparkGeo) sparkGeo.dispose(); if (sparkMat) sparkMat.dispose();
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
