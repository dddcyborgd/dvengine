/*!
 * awe runtime component — spline
 * Mirrors awe SplineComponent (engine-src/space/components/spline): a smooth curve through control
 * points with a follower travelling along it. Realized as a THREE.CatmullRomCurve3 drawn as a tube
 * mesh, with a glowing marker sphere advancing along the path. Props: { points?, color, speed }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('spline.js: AweRuntime not loaded');

  global.AweRuntime.register('spline', function (props) {
    props = props || {};
    var group, curve, tube, tubeGeo, tubeMat, marker, markerGeo, markerMat, speed, THREE;

    return {
      type: 'spline',
      init: function (ctx) {
        THREE = ctx.THREE;
        speed = props.speed || 0.2;
        var color = props.color != null ? props.color : 0x7ad7ff;

        var pts = [];
        if (props.points && props.points.length >= 6) {
          for (var i = 0; i + 2 < props.points.length; i += 3) {
            pts.push(new THREE.Vector3(props.points[i], props.points[i + 1], props.points[i + 2]));
          }
        } else {
          pts = [
            new THREE.Vector3(-6, 0.5, -4),
            new THREE.Vector3(-2, 3, 3),
            new THREE.Vector3(3, 1, -3),
            new THREE.Vector3(6, 4, 4),
            new THREE.Vector3(2, 2, -6),
          ];
        }
        curve = new THREE.CatmullRomCurve3(pts, true);

        group = new THREE.Group();
        group.name = 'spline';

        tubeGeo = new THREE.TubeGeometry(curve, props.segments || 200, props.radius || 0.08, 8, true);
        tubeMat = new THREE.MeshStandardMaterial({
          color: color, emissive: new THREE.Color(color), emissiveIntensity: 0.4,
          roughness: 0.4, metalness: 0.2,
        });
        tube = new THREE.Mesh(tubeGeo, tubeMat);
        group.add(tube);

        markerGeo = new THREE.SphereGeometry(0.22, 16, 12);
        markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        marker = new THREE.Mesh(markerGeo, markerMat);
        group.add(marker);

        var p0 = curve.getPointAt(0);
        marker.position.copy(p0);
        return group;
      },
      update: function (dt, t) {
        if (!curve || dt <= 0) return;
        var u = (t * speed) % 1;
        if (u < 0) u += 1;
        var pos = curve.getPointAt(u);
        marker.position.copy(pos);
      },
      dispose: function () {
        if (tubeGeo) tubeGeo.dispose(); if (tubeMat) tubeMat.dispose();
        if (markerGeo) markerGeo.dispose(); if (markerMat) markerMat.dispose();
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
