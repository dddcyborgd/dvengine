/*!
 * awe runtime component — camera
 * Mirrors awe CameraComponent (engine-src/space/components/camera): an in-space camera rig that can
 * drive the active view along a path (upstream supports spline cinematics). Clean-room realization:
 * returns an Object3D marker (a small frustum gizmo) and on update gently orbits/dollies the space
 * camera (ctx.camera) around a circular path, looking at the origin. Props: { radius, speed, height,
 * target, drive }. Set drive:false to only show the gizmo. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('camera.js: AweRuntime not loaded');

  global.AweRuntime.register('camera', function (props) {
    props = props || {};
    var gizmo, geos = [], mats = [], camera, drive, radius, speed, height, target, THREE;

    return {
      type: 'camera',
      init: function (ctx) {
        THREE = ctx.THREE;
        camera = ctx.camera;
        drive = props.drive !== false;
        radius = props.radius != null ? props.radius : 16;
        speed = props.speed != null ? props.speed : 0.12;
        height = props.height != null ? props.height : 6;
        target = props.target || { x: 0, y: 1.5, z: 0 };

        gizmo = new THREE.Group();
        gizmo.name = 'camera';

        // small frustum gizmo: a line-segment pyramid pointing -Z
        var d = 0.9, w = 0.6, h = 0.4;
        var verts = new Float32Array([
          0, 0, 0, w, h, -d, 0, 0, 0, -w, h, -d, 0, 0, 0, w, -h, -d, 0, 0, 0, -w, -h, -d,
          w, h, -d, -w, h, -d, -w, h, -d, -w, -h, -d, -w, -h, -d, w, -h, -d, w, -h, -d, w, h, -d,
        ]);
        var lgeo = new THREE.BufferGeometry();
        lgeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        var lmat = new THREE.LineBasicMaterial({ color: props.color != null ? props.color : 0xffd166 });
        geos.push(lgeo); mats.push(lmat);
        gizmo.add(new THREE.LineSegments(lgeo, lmat));

        // a small body cube behind the lens
        var bgeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        var bmat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.5, metalness: 0.4 });
        geos.push(bgeo); mats.push(bmat);
        gizmo.add(new THREE.Mesh(bgeo, bmat));

        return gizmo;
      },
      update: function (dt, t) {
        // move the gizmo along the same path it implies
        if (gizmo) {
          var a = t * speed;
          gizmo.position.set(Math.cos(a) * radius, height, Math.sin(a) * radius);
          gizmo.lookAt(target.x, target.y, target.z);
        }
        // drive the real space camera along the orbit/dolly path
        if (drive && camera) {
          var b = t * speed;
          var r = radius + Math.sin(t * 0.5) * 2;     // gentle dolly
          camera.position.set(Math.cos(b) * r, height + Math.sin(t * 0.4) * 1.5, Math.sin(b) * r);
          camera.lookAt(target.x, target.y, target.z);
        }
      },
      dispose: function () {
        for (var i = 0; i < geos.length; i++) { geos[i].dispose(); mats[i].dispose(); }
        gizmo = null; camera = null;
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
