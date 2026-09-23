/*! dvengine — DVPivot.BoxSlider (edit/pivot/box-slider.js) · the invisible bbox handle: grab the object itself and slide it on the ground plane (or the camera plane from a side face) with world-axis bbox snapping · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit controls/pivot-controls/box-slider.js, MIT) where derived */
(function (global) {
  'use strict';
  var NS = global.DVPivot = global.DVPivot || {};

  /** opts: { ctx, color } — sized to the object's world AABB each frame; hit face decides the drag plane */
  NS.BoxSlider = function (opts) {
    var THREE = global.THREE, h = new THREE.Group();
    h.name = 'BoxSlider'; h.opts = opts; h.ctx = opts.ctx; h.isHandle = true; h.kind = 'box';
    h.raycastPlane = new THREE.Plane(); h.isHovered = false; h.active = true; h.enabled = false;
    h.raycastMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
    h.raycastMesh.userData = { handle: h, dvGizmo: true };
    h.outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: opts.color || 0xffd166, transparent: true, opacity: 0.0, depthTest: false, depthWrite: false, toneMapped: false }));
    h.add(h.raycastMesh, h.outline);
    h.traverse(function (o) { o.userData.dvGizmo = true; o.renderOrder = 998; });
    h.dragPlaneNormal = new THREE.Vector3(0, 1, 0); h.dragAxes = [true, false, true];
    var _offset = new THREE.Vector3(), _n = new THREE.Vector3();

    h.setBox = function (box) {
      if (!box || box.isEmpty()) { h.visible = false; return; }
      h.visible = true; box.getCenter(h.position); box.getSize(h.scale);
      h.scale.x = Math.max(h.scale.x, 1e-3); h.scale.y = Math.max(h.scale.y, 1e-3); h.scale.z = Math.max(h.scale.z, 1e-3);
    };
    h.getRaycastPlane = function () { return h.raycastPlane.setFromNormalAndCoplanarPoint(h.dragPlaneNormal, h.ctx.hitPoint || h.ctx.worldPosition); };
    h.getCursor = function () { return h.isHovered ? 'grab' : 'default'; };
    h.setHovered = function (v) { h.isHovered = v; h.outline.material.opacity = v ? 0.8 : 0.0; };
    /** side faces → camera-facing plane (free X/Y/Z); top/bottom → ground plane (XZ) */
    h.updatePlaneFromHit = function (hit) {
      var n = hit && (hit.normal || (hit.face && hit.face.normal));
      if (n) { _n.copy(n).transformDirection(h.raycastMesh.matrixWorld); } else _n.set(0, 1, 0);
      if (Math.abs(_n.y) > 0.5) { h.dragPlaneNormal.set(0, 1, 0); h.dragAxes = [true, false, true]; }
      else { h.dragPlaneNormal.copy(h.ctx.eye); h.dragAxes = [true, true, true]; }
    };
    h.onPointerDown = function (e) { h.updatePlaneFromHit(e.hit); h.ctx.onDragStart(); h.ctx.snapBegin(); };
    h.onPointerMove = function (e) {
      var ctx = h.ctx;
      if (!ctx.dragging) { h.updatePlaneFromHit(e.hit); h.setHovered(true); return; }
      h.setHovered(true);
      _offset.copy(ctx.offset).applyQuaternion(ctx.parentQuaternionInv).divide(ctx.parentScale);
      ctx.object.position.copy(ctx.positionStart).add(_offset);
      ctx.applyTranslationGridSnap();
      ctx.object.updateMatrixWorld();
      if (ctx.isSnapEnabled(e.raw)) ctx.snapTranslateOnWorldAxes(h.dragAxes, h, h.dragPlaneNormal); else ctx.clearSnapFeedback();
    };
    h.onPointerUp = function () { h.setHovered(false); h.ctx.onDragEnd(); };
    h.onPointerOut = function () { h.setHovered(false); };
    h.dispose = function () { NS.disposeObject(h); };
    return h;
  };
})(typeof window !== 'undefined' ? window : this);
