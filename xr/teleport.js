/*! dvengine — DVXR.teleport / DVXR.button (xr/teleport.js) · controller rays + floor marker + trigger teleport of the dolly; VRButton when present · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 * After DeltaVerse interaction/gallery-room.html + bubbleroom.html: each XR controller carries a ray line;
 * while the trigger is held the ray is cast at the floor and a ring marker follows the hit; on release
 * the XR reference space is offset so the participant stands on the marker. The camera is parented to a
 * DOLLY group so the whole rig moves.
 *
 *   var tp = DVXR.teleport(space, { floor: mesh|null, color, rayLength });   tp.dolly · tp.marker · tp.update() (called by the space) · tp.dispose()
 *   DVXR.button(space, opts) → the VRButton element (or null when window.VRButton is absent — nothing else changes)
 * Reads window.THREE / window.VRButton at USE time.
 */
(function (global) {
  'use strict';
  var NS = global.DVXR = global.DVXR || {};

  function teleport(space, opts) {
    opts = opts || {};
    var THREE = space.THREE || global.THREE, renderer = space.renderer, scene = space.scene, camera = space.camera;
    var color = opts.color != null ? opts.color : 0x9fe9ff;
    var dolly = camera.parent && camera.parent.isGroup ? camera.parent : new THREE.Group();
    if (!camera.parent) { dolly.name = 'xr-dolly'; dolly.add(camera); scene.add(dolly); }
    var marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 }));
    marker.visible = false; marker.name = 'xr-teleport-marker'; scene.add(marker);
    var floor = opts.floor || null;
    var baseRef = null, rc = new THREE.Raycaster(), ctrls = [];
    var onStart = function () { try { baseRef = renderer.xr.getReferenceSpace(); } catch (e) { baseRef = null; } };
    renderer.xr.addEventListener('sessionstart', onStart);
    function makeCtrl(idx) {
      var c = renderer.xr.getController(idx); dolly.add(c);
      var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -(opts.rayLength || 6))]), new THREE.LineBasicMaterial({ color: color }));
      c.add(line); c.userData.tp = false;
      c.addEventListener('selectstart', function () { c.userData.tp = true; });
      c.addEventListener('selectend', function () {
        c.userData.tp = false;
        if (marker.visible && baseRef && global.XRRigidTransform) {
          var off = new global.XRRigidTransform({ x: -marker.position.x, y: 0, z: -marker.position.z, w: 1 });
          try { renderer.xr.setReferenceSpace(baseRef.getOffsetReferenceSpace(off)); } catch (e) {}
          space._emit && space._emit('dv:teleport', { x: marker.position.x, y: marker.position.y, z: marker.position.z, via: 'xr' });
          marker.visible = false;
        }
      });
      return c;
    }
    ctrls.push(makeCtrl(0), makeCtrl(1));
    var m4 = new THREE.Matrix4();
    function update() {
      marker.visible = false;
      if (!renderer.xr.isPresenting || !floor) return;
      for (var i = 0; i < ctrls.length; i++) {
        var c = ctrls[i]; if (!c.userData.tp) continue;
        m4.extractRotation(c.matrixWorld);
        rc.ray.origin.setFromMatrixPosition(c.matrixWorld);
        rc.ray.direction.set(0, 0, -1).applyMatrix4(m4);
        var h = rc.intersectObject(floor, true)[0];
        if (h) { marker.position.copy(h.point); marker.position.y += 0.01; marker.visible = true; }
      }
    }
    var comp = { type: 'xr-teleport', init: function () { return null; }, update: update, dispose: function () {} };
    var handle = null;
    try { if (global.DVEngine && !global.DVEngine.has('xr-teleport')) global.DVEngine.register('xr-teleport', function () { return comp; }); handle = space.add('xr-teleport', {}); } catch (e) {}
    return { dolly: dolly, marker: marker, controllers: ctrls, update: update, setFloor: function (f) { floor = f; },
      dispose: function () { renderer.xr.removeEventListener('sessionstart', onStart); if (handle) space.remove(handle); scene.remove(marker); marker.geometry.dispose(); marker.material.dispose(); } };
  }

  function button(space, opts) {
    if (!global.VRButton || !global.document) return null;
    opts = opts || {};
    try { space.renderer.xr.enabled = true; } catch (e) {}
    var el = global.VRButton.createButton(space.renderer, { optionalFeatures: opts.optionalFeatures || ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'] });
    (opts.host || global.document.body).appendChild(el);
    return el;
  }

  NS.teleport = teleport; NS.button = button; NS.version = NS.version || '0.1.0';
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
