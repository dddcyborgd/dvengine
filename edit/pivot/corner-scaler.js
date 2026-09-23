/*! dvengine — DVPivot.CornerScaler (edit/pivot/corner-scaler.js) · one of 8 bbox-corner handles: uniform scale about the object's centre (opposite corner anchored with alt) · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit controls/pivot-controls/corner-scaler.js, MIT) where derived */
(function (global) {
  'use strict';
  var NS = global.DVPivot = global.DVPivot || {};
  var SIGNS = [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]];

  /** opts: { ctx, cornerIndex 0..7, color, hoverColor } — positioned in WORLD space each frame from the object's AABB */
  NS.CornerScaler = function (opts) {
    var THREE = global.THREE, h = new THREE.Group();
    h.name = 'CornerScaler-' + opts.cornerIndex; h.opts = opts; h.ctx = opts.ctx; h.isHandle = true; h.kind = 'corner';
    h.corner = new THREE.Vector3().fromArray(SIGNS[opts.cornerIndex]); h.isHovered = false; h.active = true;
    h.raycastPlane = new THREE.Plane();
    var mat = new THREE.MeshBasicMaterial({ color: opts.color, depthTest: false, depthWrite: false, transparent: true, toneMapped: false });
    h.cube = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), mat);
    h.raycastMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ visible: false }));
    h.raycastMesh.userData = { handle: h, dvGizmo: true };
    h.add(h.cube, h.raycastMesh);
    h.traverse(function (o) { o.userData.dvGizmo = true; o.renderOrder = 1002; });
    var _cornerStart = new THREE.Vector3(), _dir = new THREE.Vector3(), _center = new THREE.Vector3(), _anchorStart = new THREE.Vector3(), _anchorNow = new THREE.Vector3(), _d = new THREE.Vector3();

    /** place at the world AABB corner (called by the controls each frame) */
    h.placeAt = function (box, gizmoScale) {
      _center.addVectors(box.min, box.max).multiplyScalar(0.5);
      h.position.set(h.corner.x < 0 ? box.min.x : box.max.x, h.corner.y < 0 ? box.min.y : box.max.y, h.corner.z < 0 ? box.min.z : box.max.z);
      var s = gizmoScale || 1; h.scale.set(s, s, s);
    };
    h.getRaycastPlane = function () { return h.raycastPlane.setFromNormalAndCoplanarPoint(h.ctx.eye, h.position); };
    h.getCursor = function () { return 'nwse-resize'; };
    h.setHovered = function (v) { h.isHovered = v; mat.color.set(v ? opts.hoverColor : opts.color); var s = v ? 1.25 : 1; h.cube.scale.set(s, s, s); };
    h.onPointerDown = function () {
      var ctx = h.ctx;
      _cornerStart.copy(h.position); _center.copy(ctx.worldPosition);
      _dir.subVectors(_cornerStart, _center); h._radius = Math.max(1e-6, _dir.length()); _dir.normalize();
      // the opposite corner, kept fixed when alt is held
      _anchorStart.copy(_center).sub(_dir.clone().multiplyScalar(h._radius));
      ctx.onDragStart();
    };
    h.onPointerMove = function (e) {
      var ctx = h.ctx; h.setHovered(true);
      if (!ctx.dragging) return;
      var d = ctx.offset.dot(_dir);                       // drag distance along the centre→corner diagonal
      var k = ctx.applyScaleSnap(Math.max(0.01, 1 + d / h._radius));
      ctx.object.scale.copy(ctx.scaleStart).multiplyScalar(k);
      ctx.object.position.copy(ctx.positionStart);
      if (e.raw && e.raw.altKey) {
        // anchor the opposite corner: move the object so that corner stays put
        ctx.object.updateMatrixWorld(true);
        _anchorNow.copy(_center).sub(_dir.clone().multiplyScalar(h._radius * k));
        _d.subVectors(_anchorStart, _anchorNow).applyQuaternion(ctx.parentQuaternionInv).divide(ctx.parentScale);
        ctx.object.position.add(_d);
      }
      ctx.setLabel('×' + k.toFixed(2));
    };
    h.onPointerUp = function () { h.setHovered(false); h.ctx.clearLabel(); h.ctx.onDragEnd(); };
    h.onPointerOut = function () { h.setHovered(false); };
    h.dispose = function () { NS.disposeObject(h); };
    return h;
  };
  NS.CornerScaler.SIGNS = SIGNS;
})(typeof window !== 'undefined' ? window : this);
