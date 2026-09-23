/*!
 * dvengine component — particles (components/particles/index.js) · folder-is-module · awe port
 * Mirrors awe ParticlesComponent (engine-src/space/components/particles): a configurable particle
 * system. Realized as a THREE.Points buffer cloud with per-particle velocity, looping upward drift
 * and gentle swirl (an "emitter behavior"). Props: { count, color, size, area, speed }.
 * Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/particles/index.js: DVEngine not loaded');

  global.DVEngine.register('particles', function (props) {
    props = props || {};
    var points, geo, mat, count, area, vel, base, speed;

    return {
      type: 'particles',
      init: function (ctx) {
        var THREE = ctx.THREE;
        count = props.count || 1200;
        area = props.area || 14;
        speed = props.speed || 1.0;
        var pos = new Float32Array(count * 3);
        vel = new Float32Array(count * 3);
        base = new Float32Array(count);
        for (var i = 0; i < count; i++) {
          pos[i * 3] = (Math.random() - 0.5) * area;
          pos[i * 3 + 1] = Math.random() * area;
          pos[i * 3 + 2] = (Math.random() - 0.5) * area;
          vel[i * 3] = (Math.random() - 0.5) * 0.2;
          vel[i * 3 + 1] = 0.4 + Math.random() * 0.6;
          vel[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
          base[i] = Math.random() * Math.PI * 2;
        }
        geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        mat = new THREE.PointsMaterial({
          color: props.color != null ? props.color : 0x9fe9ff,
          size: props.size || 0.12,
          transparent: true, opacity: 0.85,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        points = new THREE.Points(geo, mat);
        points.name = 'particles';
        points.position.y = -area / 2 + 1;
        return points;
      },
      update: function (dt, t) {
        if (!geo || dt <= 0) return;
        var p = geo.attributes.position.array;
        for (var i = 0; i < count; i++) {
          p[i * 3] += (vel[i * 3] + Math.sin(t + base[i]) * 0.1) * dt * speed;
          p[i * 3 + 1] += vel[i * 3 + 1] * dt * speed;
          p[i * 3 + 2] += (vel[i * 3 + 2] + Math.cos(t + base[i]) * 0.1) * dt * speed;
          if (p[i * 3 + 1] > area) { p[i * 3 + 1] = 0; p[i * 3] = (Math.random() - 0.5) * area; p[i * 3 + 2] = (Math.random() - 0.5) * area; }
        }
        geo.attributes.position.needsUpdate = true;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
