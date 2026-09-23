/*!
 * awe runtime component — quarks
 * Mirrors awe QuarksComponent (engine-src/space/components/quarks; upstream three.quarks ©
 * Alchemist0823 — MIT). Clean-room reimplementation as a continuous additive-sprite emitter:
 * particles spawn at the origin, fly out within a cone-ish spread, fade over a lifetime, recycle.
 * Realized as a THREE.Points cloud with per-particle age/opacity. Props: { rate, color, spread }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('quarks.js: AweRuntime not loaded');

  global.AweRuntime.register('quarks', function (props) {
    props = props || {};
    var points, geo, mat, count, rate, spread, life, vel, age, lifespan, accum;

    function spawn(p, i) {
      p[i * 3] = 0; p[i * 3 + 1] = 0; p[i * 3 + 2] = 0;
      var dir = (Math.random() - 0.5) * spread;
      var ang = Math.random() * Math.PI * 2;
      vel[i * 3] = Math.cos(ang) * dir;
      vel[i * 3 + 1] = 1.0 + Math.random() * 1.5;
      vel[i * 3 + 2] = Math.sin(ang) * dir;
      age[i] = 0;
      lifespan[i] = life * (0.6 + Math.random() * 0.8);
    }

    return {
      type: 'quarks',
      init: function (ctx) {
        var THREE = ctx.THREE;
        rate = props.rate || 200;          // particles per second
        spread = props.spread != null ? props.spread : 2.0;
        life = props.life || 1.6;          // seconds
        count = Math.max(16, Math.ceil(rate * life * 1.2));
        var pos = new Float32Array(count * 3);
        vel = new Float32Array(count * 3);
        age = new Float32Array(count);
        lifespan = new Float32Array(count);
        accum = 0;
        for (var i = 0; i < count; i++) { spawn(pos, i); age[i] = lifespan[i]; }  // start "dead"
        geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        var alpha = new Float32Array(count);
        geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
        mat = new THREE.PointsMaterial({
          color: props.color != null ? props.color : 0xffc25a,
          size: props.size || 0.18,
          transparent: true, opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        points = new THREE.Points(geo, mat);
        points.name = 'quarks';
        return points;
      },
      update: function (dt, t) {
        if (!geo || dt <= 0) return;
        var p = geo.attributes.position.array;
        accum += rate * dt;
        var toSpawn = accum | 0;
        accum -= toSpawn;
        for (var i = 0; i < count; i++) {
          age[i] += dt;
          if (age[i] >= lifespan[i]) {
            if (toSpawn > 0) { spawn(p, i); toSpawn--; }
            else { continue; }
          }
          p[i * 3] += vel[i * 3] * dt;
          p[i * 3 + 1] += vel[i * 3 + 1] * dt;
          p[i * 3 + 2] += vel[i * 3 + 2] * dt;
          vel[i * 3 + 1] -= 1.2 * dt;     // gravity drag
        }
        geo.attributes.position.needsUpdate = true;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
