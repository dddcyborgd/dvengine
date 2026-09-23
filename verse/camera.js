/*! dvengine — DVVerse.camera (verse/camera.js) · the third-person rig, and the ArcballControls focus mode around an aivatar · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · ArcballControls © three.js (MIT) */
/*
 *   var cam = DVVerse.camera.create(space, targetObject3D, { dist: 4.5, height: 1.6, minDist: 1.5, maxDist: 10 })
 *   cam.update(dt)                     every frame (the verse calls it)
 *   cam.focus(object3D)                → ArcballControls orbiting that object (gizmo visible, cursor zoom), the USER DIRECTIVE
 *   cam.unfocus()                      → back to the third-person rig
 *   cam.setHeadOffset(yawRad)          the participant's head yaw (senses) nudges the orbit
 *   cam.mode 'third'|'arcball' · cam.yaw · cam.pitch · cam.dist · cam.dispose()
 * Pure: DVVerse.camera.orbitOffset(yaw, pitch, dist) → {x,y,z}
 */
(function (global) {
  'use strict';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function orbitOffset(yaw, pitch, dist) { var cp = Math.cos(pitch); return { x: Math.sin(yaw) * cp * dist, y: Math.sin(pitch) * dist, z: Math.cos(yaw) * cp * dist }; }

  function create(space, target, opts) {
    opts = opts || {};
    var THREE = space.THREE, camera = space.camera, dom = space.renderer.domElement;
    var rig = { mode: 'third', yaw: Math.PI, pitch: 0.35, dist: opts.dist || 4.5, height: opts.height || 1.6, target: target, headOffset: 0, arc: null, focusObj: null };
    var minDist = opts.minDist || 1.5, maxDist = opts.maxDist || 10, drag = null, look = new THREE.Vector3(), want = new THREE.Vector3(), tp = new THREE.Vector3();
    if (space.controls) { try { space.controls.enabled = false; } catch (e) {} }
    function onDown(e) { if (rig.mode !== 'third') return; drag = { x: e.clientX, y: e.clientY, yaw: rig.yaw, pitch: rig.pitch }; }
    function onMove(e) { if (!drag) return; rig.yaw = drag.yaw - (e.clientX - drag.x) * 0.006; rig.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.004, -0.2, 1.2); }
    function onUp() { drag = null; }
    function onWheel(e) { if (rig.mode !== 'third') return; rig.dist = clamp(rig.dist * (e.deltaY > 0 ? 1.1 : 0.9), minDist, maxDist); }
    dom.addEventListener('pointerdown', onDown); global.addEventListener('pointermove', onMove); global.addEventListener('pointerup', onUp); dom.addEventListener('wheel', onWheel, { passive: true });
    var first = true;
    rig.update = function (dt) {
      if (rig.mode === 'arcball') { if (rig.arc) rig.arc.update(); return; }
      var t = rig.target; if (!t) return;
      t.getWorldPosition ? t.getWorldPosition(tp) : tp.copy(t.position);
      var off = orbitOffset(rig.yaw + rig.headOffset, rig.pitch, rig.dist);
      want.set(tp.x + off.x, tp.y + rig.height * 0.6 + off.y, tp.z + off.z);
      if (first) { camera.position.copy(want); first = false; } else camera.position.lerp(want, Math.min(1, dt * 6));
      look.set(tp.x, tp.y + rig.height * 0.85, tp.z); camera.lookAt(look);
    };
    rig.focus = function (obj) {
      if (!obj) return rig.unfocus();
      var A = global.ArcballControls;
      rig.focusObj = obj; rig.mode = 'arcball';
      var head = new THREE.Vector3(); obj.getWorldPosition(head); head.y += 1.5 * (obj.scale ? obj.scale.y : 1);
      if (!A) { camera.lookAt(head); return false; }   // without the addon: stay put, look at the agent
      if (rig.arc) { try { rig.arc.dispose(); } catch (e) {} }
      var d = Math.max(2.2, camera.position.distanceTo(head) * 0.8), dir = new THREE.Vector3().subVectors(camera.position, head).setY(0).normalize();
      if (!isFinite(dir.x) || dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      camera.position.copy(head).addScaledVector(dir, d); camera.position.y = head.y + 0.4;
      var arc = new A(camera, dom, space.scene);
      arc.target.copy(head); arc.setGizmosVisible(true); arc.cursorZoom = true; arc.enableAnimations = true; arc.minDistance = 1.2; arc.maxDistance = 9; arc.update();
      rig.arc = arc;
      return true;
    };
    rig.unfocus = function () {
      if (rig.arc) { try { rig.arc.setGizmosVisible(false); rig.arc.dispose(); } catch (e) {} rig.arc = null; }
      if (rig.focusObj && rig.target) { var tp2 = new THREE.Vector3(); rig.target.getWorldPosition(tp2); rig.yaw = Math.atan2(camera.position.x - tp2.x, camera.position.z - tp2.z); }
      rig.focusObj = null; rig.mode = 'third'; first = true; return true;
    };
    rig.setHeadOffset = function (yaw) { rig.headOffset = clamp(+yaw || 0, -0.6, 0.6); };
    rig.setTarget = function (t) { rig.target = t; };
    rig.dispose = function () { rig.unfocus(); dom.removeEventListener('pointerdown', onDown); global.removeEventListener('pointermove', onMove); global.removeEventListener('pointerup', onUp); dom.removeEventListener('wheel', onWheel); };
    return rig;
  }
  var api = { create: create, orbitOffset: orbitOffset };
  var NS = global.DVVerse = global.DVVerse || {}; NS.camera = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
