/*! dvengine — DVPivot.AxisRotator (edit/pivot/axis-rotator.js) · single-axis rotation ring of the own gizmo (angle from the plane intersection, optional angle snap) · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit controls/pivot-controls/axis-rotator.js, MIT) where derived */
(function (global) {
  'use strict';
  var NS = global.DVPivot = global.DVPivot || {};
  var R = 0.65 * 1.5;

  /** opts: { ctx, axis, normal:Vector3 (the rotation axis), dir1, dir2, colors, hoverColors } */
  NS.AxisRotator = function (opts) {
    var THREE = global.THREE, h = new THREE.Group();
    h.name = 'AxisRotator-' + opts.axis; h.opts = opts; h.ctx = opts.ctx; h.isHandle = true; h.kind = 'rotator';
    h.normal = opts.normal.clone().normalize(); h.isHovered = false; h._locked = false; h.active = true; h.angle = 0;
    h.handlePlane = new THREE.Plane();
    var mat = new THREE.MeshBasicMaterial({ color: opts.colors[opts.axis], depthTest: false, depthWrite: false, transparent: true, toneMapped: false, side: THREE.DoubleSide });
    h.ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 8, 96), mat);
    h.raycastMesh = new THREE.Mesh(new THREE.TorusGeometry(R, 0.08, 6, 48), new THREE.MeshBasicMaterial({ visible: false }));
    h.raycastMesh.userData = { handle: h, dvGizmo: true };
    // the swept angle indicator
    h.sweep = new THREE.Mesh(new THREE.CircleGeometry(R, 64, 0, 0.0001), new THREE.MeshBasicMaterial({ color: opts.hoverColors[opts.axis], transparent: true, opacity: 0.25, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    h.sweep.visible = false;
    h.root = new THREE.Group(); h.root.add(h.ring, h.raycastMesh, h.sweep);
    // torus lies in XY (normal +Z): orient so its normal is the rotation axis
    h.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), h.normal);
    h.add(h.root);
    h.traverse(function (o) { o.userData.dvGizmo = true; o.renderOrder = 1001; });
    var _axisWorld = new THREE.Vector3(), _vs = new THREE.Vector3(), _ve = new THREE.Vector3(), _q = new THREE.Quaternion(), _w = new THREE.Quaternion();

    h.updateMatrixWorld = function (force) {
      if (h.ctx.space === 'world') h.quaternion.copy(h.ctx.worldQuaternionInv); else h.quaternion.identity();
      h.updateStyle();
      THREE.Group.prototype.updateMatrixWorld.call(h, force);
    };
    h.axisWorld = function () { _axisWorld.copy(h.normal); if (h.ctx.space === 'local') _axisWorld.applyQuaternion(h.ctx.worldQuaternionStart); return _axisWorld; };
    h.getRaycastPlane = function () { return h.handlePlane.setFromNormalAndCoplanarPoint(h.axisWorld(), h.ctx.worldPosition); };
    h.getColor = function () { return h._locked ? (opts.lockedColor || 0x808080) : h.isHovered ? opts.hoverColors[opts.axis] : opts.colors[opts.axis]; };
    h.getCursor = function () { return 'grab'; };
    h.setHovered = function (v) { h.isHovered = v; h.updateStyle(); };
    h.setLocked = function (v) { h._locked = v; h.updateStyle(); };
    h.updateStyle = function () { mat.color.set(h.getColor()); mat.opacity = h._locked ? 0.5 : 1; var s = h.isHovered ? 1.05 : 1; h.ring.scale.set(s, s, s); };
    h.setSweep = function (angle) {
      if (h.sweep.geometry) h.sweep.geometry.dispose();
      var a = Math.abs(angle); if (a < 1e-4) { h.sweep.visible = false; return; }
      h.sweep.geometry = new THREE.CircleGeometry(R, Math.max(4, Math.ceil(a / (Math.PI / 32))), h.startAngle + (angle < 0 ? angle : 0), a);
      h.sweep.visible = true;
    };
    h.onPointerDown = function () {
      var ctx = h.ctx; h.angle = 0;
      // angle of the start point within the ring's own frame, for the sweep indicator
      _vs.copy(ctx.pointStart).applyQuaternion(_q.copy(ctx.worldQuaternion).invert());
      h.startAngle = Math.atan2(_vs.y, _vs.x);
      ctx.onDragStart();
    };
    h.onPointerMove = function (e) {
      var ctx = h.ctx; h.setHovered(true);
      if (!ctx.dragging) return;
      var axis = h.axisWorld();
      _vs.copy(ctx.pointStart).projectOnPlane(axis); _ve.copy(ctx.pointEnd).projectOnPlane(axis);
      if (_vs.lengthSq() < 1e-8 || _ve.lengthSq() < 1e-8) return;
      var angle = Math.atan2(_vs.clone().cross(_ve).dot(axis), _vs.dot(_ve));
      if (ctx.rotationSnap && (ctx.snapAlways || (e.raw && e.raw.shiftKey))) angle = Math.round(angle / ctx.rotationSnap) * ctx.rotationSnap;
      h.angle = angle;
      _q.setFromAxisAngle(axis, angle);
      // new world rotation = q · worldStart; local = parentInv · world
      _w.copy(_q).multiply(ctx.worldQuaternionStart);
      ctx.object.quaternion.copy(ctx.parentQuaternionInv).multiply(_w);
      ctx.setLabel(Math.round(angle * 180 / Math.PI) + '°');
      h.setSweep(angle);
    };
    h.onPointerUp = function () { h.setHovered(false); h.setSweep(0); h.ctx.clearLabel(); h.ctx.onDragEnd(); };
    h.onPointerOut = function () { h.setHovered(false); };
    h.dispose = function () { NS.disposeObject(h); };
    return h;
  };
})(typeof window !== 'undefined' ? window : this);
