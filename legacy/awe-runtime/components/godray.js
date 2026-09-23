/*!
 * awe runtime component — godray
 * Mirrors awe GodrayComponent (engine-src/space/components/godray): a volumetric light-shaft
 * (crepuscular) effect. Realized as a stack of additive, soft cone billboards beaming down from a
 * sun position, gently pulsing — a cheap god-ray look. Props: { color, origin, length, rays }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('godray.js: AweRuntime not loaded');

  global.AweRuntime.register('godray', function (props) {
    props = props || {};
    var grp, geo, mat, base;

    return {
      type: 'godray',
      init: function (ctx) {
        var THREE = ctx.THREE;
        grp = new THREE.Group();
        grp.name = 'godray';
        var origin = props.origin || { x: 0, y: 16, z: -6 };
        grp.position.set(origin.x, origin.y, origin.z);
        var length = props.length || 18;
        var rays = props.rays || 5;
        base = props.opacity != null ? props.opacity : 0.14;

        geo = new THREE.ConeGeometry(2.2, length, 24, 1, true);
        geo.translate(0, -length / 2, 0); // apex at origin
        mat = new THREE.MeshBasicMaterial({
          color: props.color != null ? props.color : 0xfff0c0,
          transparent: true, opacity: base,
          side: THREE.DoubleSide, depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        for (var i = 0; i < rays; i++) {
          var cone = new THREE.Mesh(geo, mat);
          cone.rotation.y = (i / rays) * Math.PI;
          var s = 0.6 + (i / rays) * 0.8;
          cone.scale.set(s, 1, s);
          grp.add(cone);
        }
        return grp;
      },
      update: function (dt, t) {
        if (mat) mat.opacity = base * (0.7 + 0.3 * Math.sin(t * 0.8));
        if (grp) grp.rotation.y = t * 0.05;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
