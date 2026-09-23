/*!
 * awe runtime component — dust
 * Mirrors awe DustComponent (engine-src/space/components/dust): small drifting particle motes.
 * Realized as a THREE.Points cloud that floats slowly with a subtle per-particle brownian sway,
 * wrapping back into the volume at its bounds. Props: { count, area, color }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('dust.js: AweRuntime not loaded');

  global.AweRuntime.register('dust', function (props) {
    props = props || {};
    var points, geo, mat, count, area, base, drift;

    return {
      type: 'dust',
      init: function (ctx) {
        var THREE = ctx.THREE;
        count = props.count || 800;
        area = props.area || 12;
        var pos = new Float32Array(count * 3);
        base = new Float32Array(count * 2);
        drift = new Float32Array(count * 3);
        for (var i = 0; i < count; i++) {
          pos[i * 3] = (Math.random() - 0.5) * area;
          pos[i * 3 + 1] = Math.random() * area;
          pos[i * 3 + 2] = (Math.random() - 0.5) * area;
          base[i * 2] = Math.random() * Math.PI * 2;
          base[i * 2 + 1] = 0.4 + Math.random() * 0.8;
          drift[i * 3] = (Math.random() - 0.5) * 0.15;
          drift[i * 3 + 1] = 0.05 + Math.random() * 0.1;
          drift[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
        }
        geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        mat = new THREE.PointsMaterial({
          color: props.color != null ? props.color : 0xd8c9a3,
          size: props.size || 0.06,
          transparent: true, opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        points = new THREE.Points(geo, mat);
        points.name = 'dust';
        points.position.y = -area / 2 + 1;
        return points;
      },
      update: function (dt, t) {
        if (!geo || dt <= 0) return;
        var p = geo.attributes.position.array;
        for (var i = 0; i < count; i++) {
          var ph = base[i * 2], sp = base[i * 2 + 1];
          p[i * 3] += (drift[i * 3] + Math.sin(t * sp + ph) * 0.06) * dt;
          p[i * 3 + 1] += drift[i * 3 + 1] * dt;
          p[i * 3 + 2] += (drift[i * 3 + 2] + Math.cos(t * sp + ph) * 0.06) * dt;
          if (p[i * 3 + 1] > area) { p[i * 3 + 1] = 0; }
          if (p[i * 3] > area / 2) p[i * 3] = -area / 2; else if (p[i * 3] < -area / 2) p[i * 3] = area / 2;
          if (p[i * 3 + 2] > area / 2) p[i * 3 + 2] = -area / 2; else if (p[i * 3 + 2] < -area / 2) p[i * 3 + 2] = area / 2;
        }
        geo.attributes.position.needsUpdate = true;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
