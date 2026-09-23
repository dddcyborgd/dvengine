/*!
 * awe runtime component — destination
 * Mirrors awe DestinationComponent (engine-src/space/components/destination): a teleport/portal marker
 * linking spaces. Clean-room realization: a glowing ground ring + an additive particle column rising
 * from it, slowly rotating, marking a destination. Props: { color, label, position, height, count }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('destination.js: AweRuntime not loaded');

  global.AweRuntime.register('destination', function (props) {
    props = props || {};
    var root, geos = [], mats = [], ring, points, pgeo, count, height, base = [];

    return {
      type: 'destination',
      init: function (ctx) {
        var THREE = ctx.THREE;
        root = new THREE.Group();
        root.name = 'destination' + (props.label ? ':' + props.label : '');
        var pos = props.position || { x: 6, y: 0.05, z: -4 };
        root.position.set(pos.x, pos.y, pos.z);
        var color = props.color != null ? props.color : 0x7b2ff7;
        height = props.height || 4;

        // glowing ring base
        var rgeo = new THREE.RingGeometry(1.1, 1.5, 48);
        var rmat = new THREE.MeshBasicMaterial({
          color: color, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        geos.push(rgeo); mats.push(rmat);
        ring = new THREE.Mesh(rgeo, rmat);
        ring.rotation.x = -Math.PI / 2;
        root.add(ring);

        // inner disc glow
        var dgeo = new THREE.CircleGeometry(1.1, 48);
        var dmat = new THREE.MeshBasicMaterial({
          color: color, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        geos.push(dgeo); mats.push(dmat);
        var disc = new THREE.Mesh(dgeo, dmat);
        disc.rotation.x = -Math.PI / 2; disc.position.y = 0.01;
        root.add(disc);

        // additive particle column
        count = props.count || 240;
        var p = new Float32Array(count * 3);
        for (var i = 0; i < count; i++) {
          var a = Math.random() * Math.PI * 2;
          var r = Math.random() * 1.0;
          p[i * 3] = Math.cos(a) * r;
          p[i * 3 + 1] = Math.random() * height;
          p[i * 3 + 2] = Math.sin(a) * r;
          base[i] = Math.random();
        }
        pgeo = new THREE.BufferGeometry();
        pgeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
        var pmat = new THREE.PointsMaterial({
          color: color, size: 0.14, transparent: true, opacity: 0.8,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        geos.push(pgeo); mats.push(pmat);
        points = new THREE.Points(pgeo, pmat);
        root.add(points);

        return root;
      },
      update: function (dt, t) {
        if (!root) return;
        if (ring) ring.rotation.z = t * 0.6;
        if (points) {
          points.rotation.y = t * 0.4;
          if (dt > 0 && pgeo) {
            var arr = pgeo.attributes.position.array;
            for (var i = 0; i < count; i++) {
              arr[i * 3 + 1] += (0.4 + base[i] * 0.6) * dt;
              if (arr[i * 3 + 1] > height) arr[i * 3 + 1] = 0;
            }
            pgeo.attributes.position.needsUpdate = true;
          }
        }
      },
      dispose: function () {
        for (var i = 0; i < geos.length; i++) { geos[i].dispose(); mats[i].dispose(); }
        root = null;
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
