/*!
 * awe runtime component — rain
 * Mirrors awe RainComponent (engine-src/space/components/rain): a weather particle effect that
 * covers the scene. Realized as a THREE.Points cloud of falling streaks that recycle to the top
 * once they pass the floor. Props: { count, area, speed, color }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('rain.js: AweRuntime not loaded');

  global.AweRuntime.register('rain', function (props) {
    props = props || {};
    var points, geo, mat, count, area, height, speed, vel;

    return {
      type: 'rain',
      init: function (ctx) {
        var THREE = ctx.THREE;
        count = props.count || 2000;
        area = props.area || 20;
        height = area;
        speed = props.speed || 12;
        var pos = new Float32Array(count * 3);
        vel = new Float32Array(count);
        for (var i = 0; i < count; i++) {
          pos[i * 3] = (Math.random() - 0.5) * area;
          pos[i * 3 + 1] = Math.random() * height;
          pos[i * 3 + 2] = (Math.random() - 0.5) * area;
          vel[i] = 0.6 + Math.random() * 0.8;
        }
        geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        mat = new THREE.PointsMaterial({
          color: props.color != null ? props.color : 0xaecbe6,
          size: props.size || 0.07,
          transparent: true, opacity: 0.6,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        points = new THREE.Points(geo, mat);
        points.name = 'rain';
        return points;
      },
      update: function (dt, t) {
        if (!geo || dt <= 0) return;
        var p = geo.attributes.position.array;
        for (var i = 0; i < count; i++) {
          p[i * 3 + 1] -= vel[i] * dt * speed;
          if (p[i * 3 + 1] < 0) {
            p[i * 3 + 1] = height;
            p[i * 3] = (Math.random() - 0.5) * area;
            p[i * 3 + 2] = (Math.random() - 0.5) * area;
          }
        }
        geo.attributes.position.needsUpdate = true;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
