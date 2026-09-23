/*! dvengine — DVSnap (edit/snap.js) · snapping maths: snap2d (artwork alignment + spacing), snap3d (bbox face-contact / edge alignment), snapAngle, snapGrid, snapToBounds — pure, THREE-free, node-testable · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit controls/pivot-controls/snap-2d.ts + snap-3d.ts, MIT) where derived */
/*
 * Ports the SEMANTICS of awe's Snap2D / Snap3D without their render pipeline (PipeLineMesh, LineHint,
 * emitter). Boxes are plain { min:{x,y,z}, max:{x,y,z} }, vectors plain { x,y,z }, so every function
 * runs in Node (test/snap.test.mjs) and in the browser alike. edit/index.js adapts live Object3Ds to
 * the "snappable" duck type Snap3D expects: { getBBox(target), getCollisionMesh(), info:{is2D},
 * isDescendantOf(other), updateMatrixWorld() }.
 *
 *   DVSnap.Snap3D                      class — setObject · onPointerDown(components) · getWorldAxesSnapOffset · getWorldDirectionSnapOffset · maxGap
 *   DVSnap.snap3d(box, targets, axes|dir, maxGap) → {x,y,z}   one-shot over plain boxes
 *   DVSnap.snap2d({ target, magnets, dir, mode, maxGap }) → { offset:{x,y}, hints:[…] }   artwork alignment + spacing
 *   DVSnap.snapAngle(rad, stepRad)     snap a rotation to a step (0 / falsy step ⇒ unchanged)
 *   DVSnap.snapGrid(v, step)           number or {x,y,z} to a grid step
 *   DVSnap.snapToBounds(box, targets, maxGap) → {x,y,z}   all-axes bbox snap (the box-slider case)
 */
(function (global) {
  'use strict';

  var AXES = ['x', 'y', 'z'];

  // ---- tiny vector / box helpers (plain objects) ------------------------------------------------
  function v3(x, y, z) { return { x: x || 0, y: y || 0, z: z || 0 }; }
  function vcopy(t, s) { t.x = s.x; t.y = s.y; t.z = s.z; return t; }
  function vlenSq(v) { return v.x * v.x + v.y * v.y + v.z * v.z; }
  function vnormalize(v) { var l = Math.sqrt(vlenSq(v)); if (l > 0) { v.x /= l; v.y /= l; v.z /= l; } return v; }
  function vscale(t, s, k) { t.x = s.x * k; t.y = s.y * k; t.z = s.z * k; return t; }
  function box(min, max) { return { min: min ? vcopy(v3(), min) : v3(Infinity, Infinity, Infinity), max: max ? vcopy(v3(), max) : v3(-Infinity, -Infinity, -Infinity) }; }
  function bcopy(t, s) { vcopy(t.min, s.min); vcopy(t.max, s.max); return t; }
  function btranslate(b, o) { b.min.x += o.x; b.min.y += o.y; b.min.z += o.z; b.max.x += o.x; b.max.y += o.y; b.max.z += o.z; return b; }
  function bcenter(b) { return v3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2); }
  /** accept a THREE.Box3 or a plain box */
  function asBox(b) { return b && b.min && b.max ? b : box(); }

  // ---- Snap3D (port of snap-3d.ts) --------------------------------------------------------------
  function isSnappable(o) { return o != null && typeof o.getBBox === 'function' && typeof o.getCollisionMesh === 'function'; }
  function rangesOverlap(minA, maxA, minB, maxB, padding) { padding = padding || 0; return maxA + padding >= minB && maxB + padding >= minA; }
  function overlapsOnOtherAxes(boxA, boxB, ignoredAxis) {
    for (var i = 0; i < 3; i++) { var a = AXES[i]; if (a === ignoredAxis) continue; if (!rangesOverlap(boxA.min[a], boxA.max[a], boxB.min[a], boxB.max[a])) return false; }
    return true;
  }
  function hasCompatibleLateralPosition(boxA, boxB, ignoredAxis, maxGap) {
    for (var i = 0; i < 3; i++) {
      var a = AXES[i]; if (a === ignoredAxis) continue;
      if (rangesOverlap(boxA.min[a], boxA.max[a], boxB.min[a], boxB.max[a])) continue;
      var g1 = boxB.min[a] - boxA.min[a], g2 = boxB.max[a] - boxA.max[a];
      if (Math.abs(g1) <= maxGap || Math.abs(g2) <= maxGap) continue;
      return false;
    }
    return true;
  }
  function hasContactOnOtherAxis(boxA, boxB, ignoredAxis, maxGap) {
    for (var i = 0; i < 3; i++) {
      var a = AXES[i]; if (a === ignoredAxis) continue;
      var c1 = boxB.min[a] - boxA.max[a], c2 = boxB.max[a] - boxA.min[a];
      if (!(Math.abs(c1) <= maxGap || Math.abs(c2) <= maxGap)) continue;
      var ok = true;
      for (var j = 0; j < 3; j++) { var o = AXES[j]; if (o === ignoredAxis || o === a) continue; if (!rangesOverlap(boxA.min[o], boxA.max[o], boxB.min[o], boxB.max[o])) { ok = false; break; } }
      if (ok) return true;
    }
    return false;
  }

  function Snap3D() {
    this.object = null; this.targets = []; this.maxGap = 0.2;
    this.currentBox = box(); this.targetBox = box(); this.shiftedBox = box();
    this.normalizedDirection = v3(); this.candidateOffset = v3();
  }
  /** attach the dragged object (3D + collidable only, exactly like upstream) */
  Snap3D.prototype.setObject = function (object) {
    if (isSnappable(object) && !(object.info && object.info.is2D === true) && object.getCollisionMesh() != null) { this.object = object; return; }
    this.object = null; this.targets = [];
  };
  /** collect eligible targets from the space's components (upstream reads getCurrentSpace().components) */
  Snap3D.prototype.onPointerDown = function (components) {
    if (this.object == null || this.maxGap <= 0) return;
    this.targets = [];
    var self = this;
    (components || []).forEach(function (c) {
      if (c == null || c === self.object || (c.info && c.info.is2D === true) || !isSnappable(c) || c.getCollisionMesh() == null) return;
      if (typeof c.isDescendantOf === 'function' && c.isDescendantOf(self.object)) return;
      if (typeof self.object.isDescendantOf === 'function' && self.object.isDescendantOf(c)) return;
      self.targets.push(c);
    });
  };
  Snap3D.prototype.getWorldAxesSnapOffset = function (axes, target) {
    target = target || v3(); target.x = target.y = target.z = 0;
    if (this.object == null || this.targets.length === 0 || this.maxGap <= 0) return target;
    if (this.object.updateMatrixWorld) this.object.updateMatrixWorld(true);
    this.object.getBBox(this.currentBox);
    var best = { x: Infinity, y: Infinity, z: Infinity }, maxGap = this.maxGap;
    for (var t = 0; t < this.targets.length; t++) {
      var cand = this.targets[t];
      if (cand.updateMatrixWorld) cand.updateMatrixWorld(true);
      cand.getBBox(this.targetBox);
      var contacts = {};
      for (var i = 0; i < 3; i++) {
        if (!axes[i]) continue; var a = AXES[i];
        if (!hasCompatibleLateralPosition(this.currentBox, this.targetBox, a, maxGap)) continue;
        var gaps = [this.targetBox.min[a] - this.currentBox.max[a], this.targetBox.max[a] - this.currentBox.min[a]];
        for (var g = 0; g < 2; g++) { var gap = gaps[g]; if (Math.abs(gap) > maxGap) continue; if (contacts[a] == null || Math.abs(gap) < Math.abs(contacts[a])) contacts[a] = gap; }
      }
      var hasContact = false;
      for (i = 0; i < 3; i++) { if (!axes[i]) continue; a = AXES[i]; if (contacts[a] == null) continue; hasContact = true; if (Math.abs(contacts[a]) < best[a]) { best[a] = Math.abs(contacts[a]); target[a] = contacts[a]; } }
      if (!hasContact) continue;
      for (i = 0; i < 3; i++) {
        if (!axes[i]) continue; a = AXES[i]; if (contacts[a] != null) continue;
        var aligns = [this.targetBox.min[a] - this.currentBox.min[a], this.targetBox.max[a] - this.currentBox.max[a]];
        for (g = 0; g < 2; g++) { gap = aligns[g]; if (Math.abs(gap) > maxGap) continue; if (Math.abs(gap) < best[a]) { best[a] = Math.abs(gap); target[a] = gap; } }
      }
    }
    return target;
  };
  Snap3D.prototype.getWorldDirectionSnapOffset = function (direction, target) {
    target = target || v3(); target.x = target.y = target.z = 0;
    if (this.object == null || this.targets.length === 0 || this.maxGap <= 0) return target;
    if (vlenSq(direction) === 0) return target;
    if (this.object.updateMatrixWorld) this.object.updateMatrixWorld(true);
    this.object.getBBox(this.currentBox);
    vnormalize(vcopy(this.normalizedDirection, direction));
    var bestAlign = Infinity, bestContact = Infinity, alignOff = v3(), contactOff = v3(), maxGap = this.maxGap;
    for (var t = 0; t < this.targets.length; t++) {
      var cand = this.targets[t];
      if (cand.updateMatrixWorld) cand.updateMatrixWorld(true);
      cand.getBBox(this.targetBox);
      for (var i = 0; i < 3; i++) {
        var a = AXES[i], d = this.normalizedDirection[a];
        if (Math.abs(d) < 1e-4) continue;
        var aligns = [(this.targetBox.min[a] - this.currentBox.min[a]) / d, (this.targetBox.max[a] - this.currentBox.max[a]) / d];
        var contacts = [(this.targetBox.min[a] - this.currentBox.max[a]) / d, (this.targetBox.max[a] - this.currentBox.min[a]) / d];
        for (var g = 0; g < 2; g++) {
          var ad = aligns[g];
          if (Math.abs(ad) > maxGap) continue;
          vscale(this.candidateOffset, this.normalizedDirection, ad);
          btranslate(bcopy(this.shiftedBox, this.currentBox), this.candidateOffset);
          if (hasContactOnOtherAxis(this.shiftedBox, this.targetBox, a, maxGap) && Math.abs(ad) < bestAlign) { bestAlign = Math.abs(ad); vcopy(alignOff, this.candidateOffset); }
        }
        for (g = 0; g < 2; g++) {
          var cd = contacts[g];
          if (Math.abs(cd) > maxGap) continue;
          vscale(this.candidateOffset, this.normalizedDirection, cd);
          btranslate(bcopy(this.shiftedBox, this.currentBox), this.candidateOffset);
          if (!overlapsOnOtherAxes(this.shiftedBox, this.targetBox, a)) continue;
          if (Math.abs(cd) < bestContact) { bestContact = Math.abs(cd); vcopy(contactOff, this.candidateOffset); }
        }
      }
    }
    if (bestAlign !== Infinity) vcopy(target, alignOff);
    else if (bestContact !== Infinity) vcopy(target, contactOff);
    else { target.x = target.y = target.z = 0; }
    return target;
  };

  /** one-shot Snap3D over plain boxes: axesOrDir = [bool,bool,bool] (world axes) or {x,y,z} (drag direction) */
  function snap3d(current, targets, axesOrDir, maxGap) {
    var s = new Snap3D(); if (maxGap != null) s.maxGap = maxGap;
    var wrap = function (b) { var bb = asBox(b); return { getBBox: function (t) { return bcopy(t || box(), bb); }, getCollisionMesh: function () { return {}; }, info: {} }; };
    s.setObject(wrap(current));
    s.onPointerDown((targets || []).map(wrap));
    return Array.isArray(axesOrDir) ? s.getWorldAxesSnapOffset(axesOrDir) : s.getWorldDirectionSnapOffset(axesOrDir);
  }
  function snapToBounds(current, targets, maxGap) { return snap3d(current, targets, [true, true, true], maxGap); }

  // ---- Snap2D (port of snap-2d.ts `snap()`; boxes are in the TARGET's local space) ----------------
  /**
   * opts: { target:{min,max} (local bbox of the dragged 2D object), magnets:[{min,max} in target-local space],
   *         dir:{x,y}, mode:'translate'|'scale', maxGap (world), worldScale:{x,y} }
   * → { offset:{x,y} (local), hints:[{kind, x1,x2,y1,y2,z}] }  — the caller applies offset*worldScale rotated by the world quaternion.
   */
  function snap2d(opts) {
    var target = asBox(opts.target), magnets = (opts.magnets || []).map(function (m) { return { box: asBox(m.box || m), ref: m }; });
    var dir = opts.dir || { x: 0, y: 0 }, mode = opts.mode || 'translate';
    var maxGap = opts.maxGap != null ? opts.maxGap : 0.08, ws = opts.worldScale || { x: 1, y: 1 };
    var maxGapY = maxGap / (ws.y || 1), maxGapX = maxGap / (ws.x || 1);
    var curMin = target.min, curMax = target.max, curCenter = bcenter(target);
    var offset = { x: 0, y: 0 }, hints = [];
    magnets.sort(function (a, b) { return Math.abs((a.box.max.x + a.box.min.x) / 2) - Math.abs((b.box.max.x + b.box.min.x) / 2); });
    var isTranslate = mode === 'translate', isScale = mode === 'scale';
    var snapBottom = isTranslate || (isScale && dir.y < 0), snapTop = isTranslate || (isScale && dir.y > 0);
    var snapLeft = isTranslate || (isScale && dir.x < 0), snapRight = isTranslate || (isScale && dir.x > 0);
    var hint = function (kind, x1, x2, y1, y2, z) { hints.push({ kind: kind, x1: x1, x2: x2, y1: y1, y2: y2, z: z }); };
    for (var i = 0; i < magnets.length; i++) {
      var m = magnets[i].box, mMin = m.min, mMax = m.max, mC = bcenter(m);
      var leftMost = Math.min(curMin.x, mMin.x), rightMost = Math.max(curMax.x, mMax.x), topMost = Math.min(curMin.y, mMin.y), bottomMost = Math.max(curMax.y, mMax.y), zUi = curMax.z;
      var centerGapY = mC.y - curCenter.y, bottomGap = mMin.y - curMin.y, topGap = mMax.y - curMax.y;
      var centerGapX = mC.x - curCenter.x, leftGapX = mMin.x - curMin.x, rightGapX = mMax.x - curMax.x;
      if (dir.y !== 0) {
        if (isTranslate && Math.abs(centerGapY) < maxGapY) { offset.y = centerGapY; hint('centerY', mC.x, curCenter.x, mC.y, mC.y, zUi); }
        else if (snapBottom && Math.abs(bottomGap) < maxGapY) { offset.y = bottomGap; hint('bottom', leftMost, rightMost, mMin.y, mMin.y, zUi); }
        else if (snapTop && Math.abs(topGap) < maxGapY) { offset.y = topGap; hint('top', leftMost, rightMost, mMax.y, mMax.y, zUi); }
      }
      if (dir.x !== 0) {
        if (isTranslate && Math.abs(centerGapX) < maxGapX) { offset.x = centerGapX; hint('centerX', mC.x, mC.x, mC.y, curCenter.y, zUi); }
        else if (snapLeft && Math.abs(leftGapX) < maxGapX) { offset.x = leftGapX; hint('left', mMin.x, mMin.x, topMost, bottomMost, zUi); }
        else if (snapRight && Math.abs(rightGapX) < maxGapX) { offset.x = rightGapX; hint('right', mMax.x, mMax.x, topMost, bottomMost, zUi); }
      }
      if (offset.x !== 0 || offset.y !== 0) break;
    }
    // spacing: equal gaps between neighbours on the same row
    if (isTranslate && offset.x === 0) {
      var left = [], right = [];
      magnets.forEach(function (mm) { var b = mm.box; if (!(b.min.y < 0 && b.max.y > 0)) return; if (b.min.x > curMax.x) right.push(b); else if (b.max.x < curMin.x) left.push(b); });
      var y = offset.y, snapped = false, snap, ref, cur;
      if (left.length > 0 && right.length > 0) {
        snap = (left[0].max.x + right[0].min.x) / 2;
        if (Math.abs(snap) < maxGapX) { snapped = true; offset.x = snap; hint('space1', left[0].max.x, curMin.x + snap, y, y, 0); hint('space2', curMax.x + snap, right[0].min.x, y, y, 0); }
      }
      if (!snapped && left.length > 1) {
        ref = left[0].min.x - left[1].max.x; cur = curMin.x - left[0].max.x; snap = ref - cur;
        if (ref >= 0 && cur >= 0 && Math.abs(snap) < maxGap) { snapped = true; offset.x = snap; hint('space2', curMin.x + snap, left[0].max.x, y, y, 0); hint('space1', left[0].min.x, left[1].max.x, y, y, 0); }
      }
      if (!snapped && right.length > 1) {
        ref = right[1].min.x - right[0].max.x; cur = right[0].min.x - curMax.x; snap = cur - ref;
        if (ref >= 0 && cur >= 0 && Math.abs(snap) < maxGap) { snapped = true; offset.x = snap; hint('space2', curMax.x + snap, right[0].min.x, y, y, 0); hint('space1', right[0].max.x, right[1].min.x, y, y, 0); }
      }
    }
    var scale = null;
    if (isScale) {
      if (dir.y !== 0 && offset.y !== 0) scale = 1 + offset.y / (dir.y < 0 ? curMin.y : curMax.y);
      else if (dir.x !== 0 && offset.x !== 0) scale = 1 + offset.x / (dir.x < 0 ? curMin.x : curMax.x);
    }
    return { offset: offset, hints: hints, scale: scale };
  }

  // ---- grid + angle ---------------------------------------------------------------------------
  function snapNum(n, step) { return step ? Math.round(n / step) * step : n; }
  function snapGrid(v, step) { if (typeof v === 'number') return snapNum(v, step); return { x: snapNum(v.x, step), y: snapNum(v.y, step), z: snapNum(v.z, step) }; }
  function snapAngle(rad, stepRad) { return stepRad ? Math.round(rad / stepRad) * stepRad : rad; }

  var DVSnap = { Snap3D: Snap3D, snap3d: snap3d, snap2d: snap2d, snapAngle: snapAngle, snapGrid: snapGrid, snapToBounds: snapToBounds,
    box: box, v3: v3, isSnappable: isSnappable, _internal: { rangesOverlap: rangesOverlap, overlapsOnOtherAxes: overlapsOnOtherAxes, hasCompatibleLateralPosition: hasCompatibleLateralPosition, hasContactOnOtherAxis: hasContactOnOtherAxis },
    version: '0.1.0', upstream: 'https://github.com/oncyberio/awe/tree/main/packages/engine-edit/src/controls/pivot-controls' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVSnap;
  global.DVSnap = DVSnap;
})(typeof window !== 'undefined' ? window : this);
