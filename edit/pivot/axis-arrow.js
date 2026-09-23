/*! dvengine — DVPivot.AxisArrow (edit/pivot/axis-arrow.js) · single-axis translate (and per-axis scale in scale mode) handle of the own gizmo · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit controls/pivot-controls/axis-arrow.js, MIT) where derived */
(function (global) {
  'use strict';
  var NS = global.DVPivot = global.DVPivot || {};
  var CURSORS = ['ew-resize', 'ns-resize', 'ew-resize'];

  /** opts: { ctx, axis:0|1|2, direction:Vector3, normal:Vector3, colors:[...], hoverColors:[...], lineWidth } */
  NS.AxisArrow = function (opts) {
    var THREE = global.THREE, h = new THREE.Group();
    h.name = 'AxisArrow-' + opts.axis; h.opts = opts; h.ctx = opts.ctx; h.isHandle = true; h.kind = 'arrow';
    h.direction = opts.direction.clone().normalize(); h.normal = opts.normal;
    h.raycastPlane = new THREE.Plane(); h.isHovered = false; h._locked = false; h.active = true;
    var coneW = 1 / 15, coneL = 1 / 5, cylL = (1 - coneL) * 1.5;
    var mat = new THREE.MeshBasicMaterial({ color: opts.colors[opts.axis], depthTest: false, depthWrite: false, transparent: true, toneMapped: false });
    h.shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, cylL, 8), mat); h.shaft.position.y = cylL / 2;
    h.cone = new THREE.Mesh(new THREE.ConeGeometry(coneW, coneL, 12), mat); h.cone.position.y = cylL + coneL / 2;
    h.raycastMesh = new THREE.Mesh(new THREE.CylinderGeometry(coneW * 1.6, coneW * 1.6, cylL + coneL, 8), new THREE.MeshBasicMaterial({ visible: false }));
    h.raycastMesh.position.y = (cylL + coneL) / 2; h.raycastMesh.userData = { handle: h, dvGizmo: true };
    h.axisHelper = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -100, 0), new THREE.Vector3(0, 100, 0)]), new THREE.LineBasicMaterial({ color: opts.helperColor || 0xdedede, transparent: true, opacity: 0.5, depthTest: true, depthWrite: false, toneMapped: false }));
    h.axisHelper.visible = false;
    h.root = new THREE.Group(); h.root.add(h.shaft, h.cone, h.raycastMesh, h.axisHelper);
    h.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), h.direction);
    h.add(h.root);
    h.traverse(function (o) { o.userData.dvGizmo = true; o.renderOrder = 1000; });
    var _offset = new THREE.Vector3(), _worldDir = new THREE.Vector3(), _tmpN = new THREE.Vector3();

    h.updateMatrixWorld = function (force) {
      if (h.ctx.space === 'world') { h.quaternion.copy(h.ctx.worldQuaternionInv); h.ctx.turnAxisToEye(h.direction); }
      else h.quaternion.identity();
      h.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), h.direction);
      h.updateStyle();
      THREE.Group.prototype.updateMatrixWorld.call(h, force);
    };
    h.getRaycastPlane = function () {
      if (opts.axis === 1) { _tmpN.copy(h.ctx.eye).setY(0); if (_tmpN.lengthSq() < 1e-6) _tmpN.set(0, 0, 1); _tmpN.normalize(); return h.raycastPlane.setFromNormalAndCoplanarPoint(_tmpN, h.ctx.worldPosition); }
      return NS.getHandlePlane(h, h.raycastPlane);
    };
    h.getColor = function () { return h._locked ? (opts.lockedColor || 0x808080) : h.isHovered ? opts.hoverColors[opts.axis] : opts.colors[opts.axis]; };
    h.getCursor = function () { return CURSORS[opts.axis]; };
    h.setHovered = function (v) { h.isHovered = v; h.updateStyle(); };
    h.setLocked = function (v) { h._locked = v; h.updateStyle(); };
    h.updateStyle = function () {
      var fb = h.ctx.isSnapFeedbackActive(h);
      mat.color.set(h.getColor()); mat.opacity = h._locked ? 0.5 : 1;
      var s = (h.isHovered ? 1.2 : 1) * (fb ? 1.2 : 1); h.cone.scale.set(s, s, s);
      h.axisHelper.visible = h.isHovered || fb;
    };
    h.onPointerDown = function () { h.ctx.onDragStart(); h.ctx.snapBegin(); };
    h.onPointerMove = function (e) {
      var ctx = h.ctx; h.setHovered(true);
      if (!ctx.dragging) return;
      var isLocal = ctx.space === 'local';
      _offset.copy(ctx.offset);
      if (isLocal) _offset.applyQuaternion(ctx.worldQuaternionInv);
      _offset.multiply(h.direction);                         // keep the component along this axis
      if (isLocal) _offset.applyQuaternion(ctx.worldQuaternionStart);
      if (ctx.mode === 'scale') {
        // per-axis scale: drag distance along the axis relative to the object's half-extent on that axis
        var ext = Math.max(1e-6, ctx.halfExtent(opts.axis));
        var d = _offset.dot(isLocal ? _worldDir.copy(h.direction).applyQuaternion(ctx.worldQuaternionStart) : h.direction);
        var k = ctx.applyScaleSnap(1 + d / ext);
        ctx.object.scale.copy(ctx.scaleStart); ctx.object.scale.setComponent(opts.axis, ctx.scaleStart.getComponent(opts.axis) * Math.max(0.01, k));
        return;
      }
      _offset.applyQuaternion(ctx.parentQuaternionInv).divide(ctx.parentScale);
      ctx.object.position.copy(ctx.positionStart).add(_offset);
      ctx.applyTranslationGridSnap();
      ctx.object.updateMatrixWorld();
      _worldDir.copy(h.direction); if (isLocal) _worldDir.applyQuaternion(ctx.worldQuaternion);
      if (ctx.isSnapEnabled(e.raw)) ctx.snapTranslateAlongWorldDirection(_worldDir, h); else ctx.clearSnapFeedback();
    };
    h.onPointerUp = function () { h.setHovered(false); h.ctx.onDragEnd(); };
    h.onPointerOut = function () { h.setHovered(false); };
    h.dispose = function () { NS.disposeObject(h); };
    return h;
  };
})(typeof window !== 'undefined' ? window : this);
