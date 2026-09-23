/*!
 * awe runtime component — bird
 * Mirrors awe BirdComponent (engine-src/space/components/bird): an animated flock following
 * circular flight paths. Realized as a THREE.InstancedMesh of simple cone "birds" doing
 * boids-lite circular flocking with per-bird phase, banking toward heading. Props:
 * { count, radius, speed, color }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('bird.js: AweRuntime not loaded');

  global.AweRuntime.register('bird', function (props) {
    props = props || {};
    var mesh, geo, mat, count, radius, speed, phase, ring, alt, dummy, THREE;

    return {
      type: 'bird',
      init: function (ctx) {
        THREE = ctx.THREE;
        count = props.count || 24;
        radius = props.radius || 8;
        speed = props.speed || 0.5;
        geo = new THREE.ConeGeometry(0.18, 0.7, 4);
        geo.rotateX(Math.PI / 2);
        mat = new THREE.MeshStandardMaterial({
          color: props.color != null ? props.color : 0x2b2f38,
          roughness: 0.7, metalness: 0.1,
        });
        mesh = new THREE.InstancedMesh(geo, mat, count);
        mesh.name = 'bird';
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        phase = new Float32Array(count);
        ring = new Float32Array(count);
        alt = new Float32Array(count);
        for (var i = 0; i < count; i++) {
          phase[i] = Math.random() * Math.PI * 2;
          ring[i] = 0.6 + Math.random() * 0.7;        // radius fraction
          alt[i] = 4 + Math.random() * 4;             // flight height
        }
        dummy = new THREE.Object3D();
        for (var j = 0; j < count; j++) { this._place(j, 0); }
        mesh.instanceMatrix.needsUpdate = true;
        return mesh;
      },
      _place: function (i, t) {
        var r = radius * ring[i];
        var a = phase[i] + t * speed * (0.8 + ring[i] * 0.4);
        var x = Math.cos(a) * r;
        var z = Math.sin(a) * r;
        var y = alt[i] + Math.sin(t * 1.5 + phase[i]) * 0.6;
        dummy.position.set(x, y, z);
        // heading: tangent of the circle
        var hx = -Math.sin(a), hz = Math.cos(a);
        dummy.rotation.set(0, Math.atan2(hx, hz), Math.sin(t * 6 + phase[i]) * 0.4);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      },
      update: function (dt, t) {
        if (!mesh || dt <= 0) return;
        for (var i = 0; i < count; i++) this._place(i, t);
        mesh.instanceMatrix.needsUpdate = true;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
