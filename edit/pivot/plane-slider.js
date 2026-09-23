/*! dvengine — DVPivot.PlaneSlider (edit/pivot/plane-slider.js) · two-axis translate quad of the own gizmo (drag within the axis plane) · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit controls/pivot-controls/plane-slider.js, MIT) where derived */
(function (global) {
  'use strict';
  var NS = global.DVPivot = global.DVPivot || {};

  /** opts: { ctx, axis (the plane's normal axis 0|1|2), dir1, dir2, normal, colors, hoverColors } */
  NS.PlaneSlider = function (opts) {
    var THREE = global.THREE, h = new THREE.Group();
    h.name = 'PlaneSlider-' + opts.axis; h.opts = opts; h.ctx = opts.ctx; h.isHandle = true; h.kind = 'plane';
    h.normal = opts.normal.clone().normalize(); h.dirx = opts.dir1.clone().normalize(); h.diry = opts.dir2.clone().normalize(); h.dirz = new THREE.Vector3();
    h.raycastPlane = new THREE.Plane(); h.isHovered = false; h.active = true;
    var pos1 = 1 / 7, len = 0.225;
    var mat = new THREE.MeshBasicMaterial({ color: opts.colors[opts.axis], transparent: true, opacity: 0.35, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    h.quad = new THREE.Mesh(new THREE.PlaneGeometry(len, len), mat);
    h.raycastMesh = h.quad; h.raycastMesh.userData = { handle: h, dvGizmo: true };
    h.gizmo = new THREE.Group(); h.gizmo.position.set(pos1 * 1.7, pos1 * 1.7, 0); h.gizmo.add(h.quad);
    // plane helper: two long lines through the origin in the plane
    h.helper = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-50, 0, 0), new THREE.Vector3(50, 0, 0), new THREE.Vector3(0, -50, 0), new THREE.Vector3(0, 50, 0)]), new THREE.LineBasicMaterial({ color: opts.helperColor || 0xdedede, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false }));
    h.helper.visible = false;
    h.root = new THREE.Group(); h.root.matrixAutoUpdate = false; h.root.add(h.gizmo, h.helper);
    h.add(h.root);
    h.traverse(function (o) { o.userData.dvGizmo = true; o.renderOrder = 999; });
    var _offset = new THREE.Vector3();

    h.updateMatrixWorld = function (force) {
      h.ctx.turnAxisToEye(h.dirx); h.ctx.turnAxisToEye(h.diry);
      h.dirz.crossVectors(h.dirx, h.diry);
      if (h.ctx.space === 'world') h.quaternion.copy(h.ctx.worldQuaternionInv); else h.quaternion.identity();
      h.root.matrix.makeBasis(h.dirx, h.diry, h.dirz);
      THREE.Group.prototype.updateMatrixWorld.call(h, force);
    };
    h.getRaycastPlane = function () { return NS.getHandlePlane(h, h.raycastPlane); };
    h.getColor = function () { return h.isHovered ? opts.hoverColors[opts.axis] : opts.colors[opts.axis]; };
    h.getCursor = function () { return 'move'; };
    h.setHovered = function (v) { h.isHovered = v; mat.color.set(h.getColor()); mat.opacity = v ? 0.7 : 0.35; h.helper.visible = v; };
    h.onPointerDown = function () { h.helper.visible = true; h.ctx.onDragStart(); h.ctx.snapBegin(); };
    h.onPointerMove = function (e) {
      var ctx = h.ctx; h.setHovered(true);
      if (!ctx.dragging) return;
      _offset.copy(ctx.offset).applyQuaternion(ctx.parentQuaternionInv).divide(ctx.parentScale);
      ctx.object.position.copy(ctx.positionStart).add(_offset);
      ctx.applyTranslationGridSnap();
      ctx.object.updateMatrixWorld();
      if (ctx.isSnapEnabled(e.raw)) { var axes = [true, true, true]; axes[opts.axis] = false; ctx.snapTranslateOnWorldAxes(axes, h, NS.getHandlePlane(h, h.raycastPlane).normal); } else ctx.clearSnapFeedback();
    };
    h.onPointerUp = function () { h.helper.visible = false; h.setHovered(false); h.ctx.onDragEnd(); };
    h.onPointerOut = function () { h.setHovered(false); };
    h.dispose = function () { NS.disposeObject(h); };
    return h;
  };
})(typeof window !== 'undefined' ? window : this);
