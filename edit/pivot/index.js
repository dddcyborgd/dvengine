/*! dvengine — DVPivot.Controls (edit/pivot/index.js) · the own transform gizmo: 3 axis arrows · 3 plane sliders · 3 rotators · 8 corner scalers · a box slider, with grid/angle/bbox snapping, a TransformControls-compatible surface, rendered on top in a UI scene · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit controls/pivot-controls/index.js + constants.js + shared.js, MIT) where derived */
/*
 *   var pc = DVPivot.Controls({ camera, domElement, getSnapTargets })   // a THREE.Group — add it to a scene (or pc.getHelper())
 *   pc.attach(object) · pc.detach() · pc.setMode('translate'|'rotate'|'scale') · pc.setSpace('world'|'local')
 *   pc.setTranslationSnap(n|null) · pc.setRotationSnap(rad|null) · pc.setScaleSnap(n|null) · pc.setBBoxSnap(maxGap|0)
 *   pc.enabled · pc.dragging · pc.axis (hovered handle kind, TransformControls-style) · pc.update() (every frame, before render)
 *   pc.addEventListener('dragging-changed'|'objectChange'|'change'|'mouseDown'|'mouseUp', fn) · pc.dispose()
 * Mode colours are the upstream constants (MODE_COLORS / ALT_MODE_COLORS). Every object carries userData.dvGizmo.
 */
(function (global) {
  'use strict';
  var NS = global.DVPivot = global.DVPivot || {};

  // controls/pivot-controls/constants.js
  NS.MODE_COLORS = { X: 0xE80303, Y: 0x28D348, Z: 0x4282BF };
  NS.ALT_MODE_COLORS = { X: 0xFF2D20, Y: 0x2CF852, Z: 0x4EEAFF };

  // controls/pivot-controls/shared.js
  NS.getHandlePlane = function (handle, target) {
    var THREE = global.THREE, ctx = handle.ctx, n = new THREE.Vector3().copy(handle.normal);
    if (ctx.space === 'local') n.applyQuaternion(ctx.worldQuaternionStart || ctx.worldQuaternion);
    return target.setFromNormalAndCoplanarPoint(n, ctx.worldPosition);
  };
  NS.disposeObject = function (o) { o.traverse(function (c) { if (c.geometry) c.geometry.dispose(); if (c.material) { (Array.isArray(c.material) ? c.material : [c.material]).forEach(function (m) { m.dispose(); }); } }); if (o.parent) o.parent.remove(o); };

  function getPointer(event, el) { var r = el.getBoundingClientRect(); return { x: ((event.clientX - r.left) / r.width) * 2 - 1, y: (-(event.clientY - r.top) / r.height) * 2 + 1, button: event.button }; }

  NS.Controls = function (opts) {
    var THREE = global.THREE;
    if (!THREE) throw new Error('DVPivot: window.THREE not loaded');
    opts = opts || {};
    var pc = new THREE.Group(); pc.name = 'DVPivotControls'; pc.userData.dvGizmo = true; pc.isDVPivot = true;
    pc.camera = opts.camera; pc.domElement = opts.domElement; pc.getSnapTargets = opts.getSnapTargets || function () { return []; };
    pc.size = opts.size || 1;
    var X = 0, Y = 1, Z = 2, xDir = new THREE.Vector3(1, 0, 0), yDir = new THREE.Vector3(0, 1, 0), zDir = new THREE.Vector3(0, 0, 1);
    var colors = [NS.MODE_COLORS.X, NS.MODE_COLORS.Y, NS.MODE_COLORS.Z], hover = [NS.ALT_MODE_COLORS.X, NS.ALT_MODE_COLORS.Y, NS.ALT_MODE_COLORS.Z];
    var raycaster = new THREE.Raycaster(); raycaster.params.Line = { threshold: 0.05 };

    // ---- state (upstream field names kept) ----
    pc.object = null; pc.enabled = false; pc.mode = 'translate'; pc.space = 'world'; pc.axis = null;
    pc.translationSnap = null; pc.rotationSnap = null; pc.scaleSnap = null; pc.bboxSnap = 0; pc.snapAlways = true;
    pc.positionStart = new THREE.Vector3(); pc.quaternionStart = new THREE.Quaternion(); pc.scaleStart = new THREE.Vector3();
    pc.worldPositionStart = new THREE.Vector3(); pc.worldQuaternionStart = new THREE.Quaternion(); pc.worldQuaternionStartInv = new THREE.Quaternion(); pc.worldScaleStart = new THREE.Vector3();
    pc.pointStart = new THREE.Vector3(); pc.pointEnd = new THREE.Vector3(); pc.offset = new THREE.Vector3(); pc.planeIntersect = new THREE.Vector3(); pc.hitPoint = null;
    pc.parentPosition = new THREE.Vector3(); pc.parentQuaternion = new THREE.Quaternion(); pc.parentQuaternionInv = new THREE.Quaternion(); pc.parentScale = new THREE.Vector3(1, 1, 1);
    pc.worldPosition = new THREE.Vector3(); pc.worldQuaternion = new THREE.Quaternion(); pc.worldQuaternionInv = new THREE.Quaternion(); pc.worldScale = new THREE.Vector3(1, 1, 1);
    pc.cameraPosition = new THREE.Vector3(); pc.eye = new THREE.Vector3(0, 0, 1); pc.bbox = new THREE.Box3(); pc.halfSize = new THREE.Vector3(1, 1, 1);
    pc.snap3D = global.DVSnap ? new global.DVSnap.Snap3D() : null; pc.snapFeedbackHandle = null; pc.snapFeedbackUntil = 0;
    pc.currentHandle = null; pc.currentHoverHandle = null; pc._isPointerDown = false; pc._dragging = false; pc._label = '';

    // ---- gizmo tree ----
    pc.root = new THREE.Group(); pc.gizmo = new THREE.Group(); pc.root.add(pc.gizmo); pc.add(pc.root);
    var handleOpts = { ctx: pc, colors: colors, hoverColors: hover, helperColor: 0xdedede };
    var normalsByAxis = [zDir, zDir, xDir];
    pc.axisArrows = [xDir, yDir, zDir].map(function (d, i) { return NS.AxisArrow(Object.assign({}, handleOpts, { axis: i, direction: d, normal: normalsByAxis[i] })); });
    pc.planeSliders = [[yDir, zDir], [zDir, xDir], [xDir, yDir]].map(function (p, i) { return NS.PlaneSlider(Object.assign({}, handleOpts, { axis: i, dir1: p[0], dir2: p[1], normal: [xDir, yDir, zDir][i] })); });
    pc.axisRotators = [[yDir, zDir], [zDir, xDir], [xDir, yDir]].map(function (p, i) { return NS.AxisRotator(Object.assign({}, handleOpts, { axis: i, dir1: p[0], dir2: p[1], normal: [xDir, yDir, zDir][i] })); });
    pc.cornerScalers = []; for (var c = 0; c < 8; c++) pc.cornerScalers.push(NS.CornerScaler(Object.assign({}, handleOpts, { cornerIndex: c, color: 0xffd166, hoverColor: 0xffffff })));
    pc.boxSlider = NS.BoxSlider(Object.assign({}, handleOpts, { color: 0xffd166 }));
    pc.handles = [].concat(pc.axisArrows, pc.planeSliders, pc.axisRotators, pc.cornerScalers, [pc.boxSlider]);
    pc.axisArrows.concat(pc.planeSliders, pc.axisRotators).forEach(function (h) { pc.gizmo.add(h); });
    pc.cornerScalers.forEach(function (h) { pc.add(h); }); pc.add(pc.boxSlider);      // world-space handles
    pc.raycastMeshes = pc.handles.map(function (h) { return h.raycastMesh; });
    pc.visible = false;

    // ---- mode / space ----
    pc.setMode = function (m) { pc.mode = m; pc._updateGizmosStates(); return pc; };
    pc.setSpace = function (s) { pc.space = s; return pc; };
    pc.setTranslationSnap = function (n) { pc.translationSnap = n || null; };
    pc.setRotationSnap = function (r) { pc.rotationSnap = r || null; };
    pc.setScaleSnap = function (n) { pc.scaleSnap = n || null; };
    pc.setBBoxSnap = function (gap) { pc.bboxSnap = gap || 0; if (pc.snap3D) pc.snap3D.maxGap = pc.bboxSnap; };
    pc.getHelper = function () { return pc; };
    pc._updateGizmosStates = function () {
      var m = pc.mode, hov = pc.currentHoverHandle, drag = pc.dragging && pc.currentHandle;
      var show = function (h, on) { h.visible = on && (!drag || drag === h); h.active = on; };
      pc.axisArrows.forEach(function (h) { show(h, (m === 'translate' || m === 'scale') && (!hov || hov.kind !== 'rotator')); });
      pc.planeSliders.forEach(function (h) { show(h, m === 'translate' && (!hov || hov.kind !== 'rotator')); });
      pc.axisRotators.forEach(function (h) { show(h, m === 'rotate'); });
      pc.cornerScalers.forEach(function (h) { show(h, m === 'scale' && !!pc.object); });
      show(pc.boxSlider, m === 'translate' && !!pc.object); pc.boxSlider.enabled = pc.boxSlider.visible;
      pc.activeRaycastMeshes = pc.handles.filter(function (h) { return h.active && h.visible !== false; }).map(function (h) { return h.raycastMesh; });
    };

    // ---- attach / detach ----
    pc.attach = function (object) { pc.object = object; pc.visible = true; pc.addEvents(); if (pc.snap3D) pc.snap3D.setObject(pc.snapWrap(object)); pc._updateGizmosStates(); pc.update(true); return pc; };
    pc.detach = function () { pc.object = null; pc.visible = false; pc.currentHandle = null; pc.currentHoverHandle = null; pc.axis = null; if (pc.snap3D) pc.snap3D.setObject(null); pc.removeEvents(); return pc; };
    /** Snap3D duck type over an Object3D (edit/index.js supplies richer wrappers via getSnapTargets) */
    pc.snapWrap = function (obj) {
      return { object: obj, info: { is2D: !!(obj.userData && obj.userData.dvIs2D) },
        getBBox: function (t) { var b = new THREE.Box3().setFromObject(obj); t.min.x = b.min.x; t.min.y = b.min.y; t.min.z = b.min.z; t.max.x = b.max.x; t.max.y = b.max.y; t.max.z = b.max.z; return t; },
        getCollisionMesh: function () { return obj; }, updateMatrixWorld: function () { obj.updateMatrixWorld(true); },
        isDescendantOf: function (o) { var p = obj.parent; while (p) { if (p === (o.object || o)) return true; p = p.parent; } return false; } };
    };

    // ---- per-frame ----
    pc.update = function (force) {
      if (pc.object == null || pc.object.parent == null) return;
      pc.object.updateMatrixWorld();
      pc.object.parent.matrixWorld.decompose(pc.parentPosition, pc.parentQuaternion, pc.parentScale);
      pc.object.matrixWorld.decompose(pc.worldPosition, pc.worldQuaternion, pc.worldScale);
      pc.parentQuaternionInv.copy(pc.parentQuaternion).invert(); pc.worldQuaternionInv.copy(pc.worldQuaternion).invert();
      pc.camera.updateMatrixWorld(); pc.cameraPosition.setFromMatrixPosition(pc.camera.matrixWorld);
      pc.eye.copy(pc.cameraPosition).sub(pc.worldPosition).normalize();
      pc.root.position.copy(pc.worldPosition); pc.root.quaternion.copy(pc.worldQuaternion);
      // constant screen size (upstream updateScale)
      var cam = pc.camera, factor = pc.worldPosition.distanceTo(pc.cameraPosition) * Math.min((1.9 * Math.tan((Math.PI * (cam.fov || 50)) / 360)) / (cam.zoom || 1), 7);
      var gs = Math.max(factor / 8, 0.02) * pc.size; pc.gizmo.scale.set(gs, gs, gs);
      // world AABB for the corner scalers + box slider (excluding gizmo children)
      if (!pc.dragging || pc.mode === 'scale' || pc.mode === 'translate') {
        pc.bbox.makeEmpty(); pc.object.traverse(function (o) { if (o.userData && (o.userData.dvGizmo || o.userData.dvProxy)) return; if (o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); var bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); pc.bbox.union(bb); } });
        if (pc.bbox.isEmpty()) pc.bbox.setFromCenterAndSize(pc.worldPosition, new THREE.Vector3(1, 1, 1));
        pc.bbox.getSize(pc.halfSize).multiplyScalar(0.5);
        pc.cornerScalers.forEach(function (h) { h.placeAt(pc.bbox, gs * 0.6); });
        pc.boxSlider.setBox(pc.bbox);
      }
      pc.updateMatrixWorld(force);
    };
    pc.halfExtent = function (axis) { return Math.max(pc.halfSize.getComponent(axis), 1e-3); };
    pc.turnAxisToEye = function (dir) { if (!pc.dragging && !dir.equals(yDir) && pc.eye.dot(dir) < 0) dir.negate(); };

    // ---- dragging + events ----
    Object.defineProperty(pc, 'dragging', { get: function () { return pc._dragging; }, set: function (v) { if (pc._dragging === v) return; pc._dragging = v; pc.dispatchEvent({ type: 'dragging-changed', value: v }); } });
    pc.onDragStart = function () { pc.dispatchEvent({ type: 'mouseDown', mode: pc.mode }); };
    pc.onDragEnd = function () { pc.dispatchEvent({ type: 'mouseUp', mode: pc.mode }); };
    pc.setLabel = function (t) { pc._label = t; pc.dispatchEvent({ type: 'label', value: t }); };
    pc.clearLabel = function () { pc._label = ''; pc.dispatchEvent({ type: 'label', value: '' }); };

    // ---- snapping (grid · angle · scale · bbox) ----
    pc.isSnapEnabled = function (ev) { return !(ev && ev.altKey) && pc.bboxSnap > 0; };
    pc.applyTranslationGridSnap = function () { if (!pc.translationSnap) return; var s = pc.translationSnap, p = pc.object.position; if (pc.space === 'world') { pc.object.updateMatrixWorld(); var w = pc.object.getWorldPosition(new THREE.Vector3()); w.set(Math.round(w.x / s) * s, Math.round(w.y / s) * s, Math.round(w.z / s) * s); pc.object.position.copy(pc.object.parent.worldToLocal(w)); } else p.set(Math.round(p.x / s) * s, Math.round(p.y / s) * s, Math.round(p.z / s) * s); };
    pc.applyScaleSnap = function (k) { return pc.scaleSnap ? Math.max(pc.scaleSnap, Math.round(k / pc.scaleSnap) * pc.scaleSnap) : k; };
    pc.snapBegin = function () { if (pc.snap3D && pc.bboxSnap > 0) { pc.snap3D.onPointerDown(pc.getSnapTargets(pc.object)); } };
    pc.applyWorldTranslationOffset = function (o) { if (!o || (o.x === 0 && o.y === 0 && o.z === 0)) return false; var t = new THREE.Vector3(o.x, o.y, o.z).applyQuaternion(pc.parentQuaternionInv).divide(pc.parentScale); pc.object.position.add(t); pc.object.updateMatrixWorld(); return true; };
    pc.snapTranslateOnWorldAxes = function (axes, handle, planeNormal) { if (!pc.snap3D || pc.bboxSnap <= 0) return false; var o = pc.snap3D.getWorldAxesSnapOffset(axes); var v = new THREE.Vector3(o.x, o.y, o.z); if (planeNormal && planeNormal.lengthSq() > 0) v.projectOnPlane(planeNormal); var ok = pc.applyWorldTranslationOffset(v); if (ok) pc.showSnapFeedback(handle); return ok; };
    pc.snapTranslateAlongWorldDirection = function (dir, handle) { if (!pc.snap3D || pc.bboxSnap <= 0) return false; var o = pc.snap3D.getWorldDirectionSnapOffset({ x: dir.x, y: dir.y, z: dir.z }); var ok = pc.applyWorldTranslationOffset(o); if (ok) pc.showSnapFeedback(handle); return ok; };
    pc.showSnapFeedback = function (h) { pc.snapFeedbackHandle = h; pc.snapFeedbackUntil = (global.performance ? performance.now() : Date.now()) + 140; };
    pc.isSnapFeedbackActive = function (h) { return pc.snapFeedbackHandle === h && (global.performance ? performance.now() : Date.now()) < pc.snapFeedbackUntil; };
    pc.clearSnapFeedback = function () { pc.snapFeedbackHandle = null; pc.snapFeedbackUntil = 0; };

    // ---- pointer ----
    pc.hitTestHandle = function (event) { raycaster.setFromCamera(getPointer(event, pc.domElement), pc.camera); return raycaster.intersectObjects(pc.activeRaycastMeshes || [], false); };
    pc.hitTestPlane = function () { var plane = pc.currentHandle && pc.currentHandle.getRaycastPlane(); if (!plane) return null; return raycaster.ray.intersectPlane(plane, pc.planeIntersect); };
    pc.onPointerHover = function (event) {
      if (!pc.enabled || pc.object == null || pc.dragging) return;
      var hits = pc.hitTestHandle(event), hit = hits[0] || null, handle = hit ? hit.object.userData.handle : null;
      if (handle && handle.active === false) handle = null;
      pc.hitPoint = hit ? hit.point.clone() : null; pc.currentHandleIntersect = hit;
      if (handle !== pc.currentHandle) { if (pc.currentHandle) pc.currentHandle.onPointerOut(); pc.currentHandle = handle; }
      if (handle) handle.onPointerMove({ intersect: hit.point, hit: hit, ray: raycaster.ray, raw: event });
      pc.currentHoverHandle = handle; pc.axis = handle ? handle.kind : null;
      pc.domElement.style.cursor = handle ? handle.getCursor() : '';
      pc._updateGizmosStates();
    };
    pc.onPointerDown = function (event) {
      if (!pc.enabled || pc.object == null || event.button !== 0) return;
      pc.onPointerHover(event);
      if (pc.currentHandle == null) return;
      pc._isPointerDown = true;
      var intersect = pc.hitTestPlane(); if (intersect == null) return;
      pc.object.updateMatrixWorld(); pc.object.parent.updateMatrixWorld();
      pc.positionStart.copy(pc.object.position); pc.quaternionStart.copy(pc.object.quaternion); pc.scaleStart.copy(pc.object.scale);
      pc.object.matrixWorld.decompose(pc.worldPositionStart, pc.worldQuaternionStart, pc.worldScaleStart); pc.worldQuaternionStartInv.copy(pc.worldQuaternionStart).invert();
      pc.pointStart.copy(intersect).sub(pc.worldPositionStart);
      pc.currentHandle.onPointerDown({ intersect: intersect, hit: pc.currentHandleIntersect || null, ray: raycaster.ray, raw: event });
      pc.dragging = true; pc._updateGizmosStates();
      try { pc.domElement.setPointerCapture(event.pointerId); } catch (e) { /* not all elements */ }
      pc.domElement.addEventListener('pointermove', pc.onPointerMove);
    };
    pc.onPointerMove = function (event) {
      if (!pc.enabled || pc.object == null || !pc.dragging) return;
      raycaster.setFromCamera(getPointer(event, pc.domElement), pc.camera);
      var intersect = pc.hitTestPlane(); if (intersect == null) return;
      pc.pointEnd.copy(intersect).sub(pc.worldPositionStart);
      pc.offset.copy(pc.pointEnd).sub(pc.pointStart);
      pc.currentHandle.onPointerMove({ intersect: intersect, ray: raycaster.ray, raw: event });
      pc.update(true);
      pc.dispatchEvent({ type: 'change' }); pc.dispatchEvent({ type: 'objectChange' }); pc.dispatchEvent({ type: 'dragging' });
    };
    pc.onPointerUp = function (event) {
      pc._isPointerDown = false;
      if (!pc.enabled || !pc.dragging) return;
      if (pc.currentHandle) pc.currentHandle.onPointerUp();
      try { pc.domElement.releasePointerCapture(event.pointerId); } catch (e) { /* ignore */ }
      pc.domElement.removeEventListener('pointermove', pc.onPointerMove);
      pc.dragging = false; pc.clearSnapFeedback(); pc._updateGizmosStates();
    };
    pc.onKeyDown = function (e) { if (e.repeat) return; if (e.shiftKey && (e.key === 'l' || e.key === 'L')) pc.setSpace(pc.space === 'world' ? 'local' : 'world'); };
    pc.addEvents = function () { if (pc.enabled) return; pc.enabled = true; pc.domElement.addEventListener('pointerdown', pc.onPointerDown, { capture: true }); pc.domElement.addEventListener('pointermove', pc.onPointerHover); pc.domElement.addEventListener('pointerup', pc.onPointerUp); global.addEventListener('keydown', pc.onKeyDown); };
    pc.removeEvents = function () { if (!pc.enabled) return; pc.enabled = false; pc.domElement.removeEventListener('pointerdown', pc.onPointerDown, { capture: true }); pc.domElement.removeEventListener('pointermove', pc.onPointerHover); pc.domElement.removeEventListener('pointermove', pc.onPointerMove); pc.domElement.removeEventListener('pointerup', pc.onPointerUp); global.removeEventListener('keydown', pc.onKeyDown); pc.domElement.style.cursor = ''; };
    pc.dispose = function () { pc.detach(); pc.handles.forEach(function (h) { h.dispose(); }); if (pc.parent) pc.parent.remove(pc); };
    pc._updateGizmosStates();
    return pc;
  };
  NS.version = '0.1.0'; NS.upstream = 'https://github.com/oncyberio/awe/tree/main/packages/engine-edit/src/controls/pivot-controls';
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : this);
