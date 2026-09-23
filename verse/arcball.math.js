/*! dvengine — DVArcballMath (verse/arcball.math.js) · the ArcballControls trackball-surface projection, pure, for the aivatar arm and the focus camera · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · surface rule after three.js ArcballControls (MIT) */
/*
 * THE SURFACE. three.js ArcballControls (addons/controls/ArcballControls.js, unprojectOnTbSurface) maps a
 * 2-D cursor (x, y) in trackball units onto a virtual trackball of radius r:
 *
 *     x² + y² <= r²/2   →  the sphere       z = sqrt(r² − x² − y²)
 *     otherwise         →  the hyperboloid  z = (r²/2) / sqrt(x² + y²)
 *
 * The two sheets meet C¹-continuously at x² + y² = r²/2 (both give z = r/√2 there), which is why the
 * arcball never "snaps" when the cursor leaves the sphere — the hyperbolic sheet keeps rotating it,
 * more slowly, for ever. The aivatar's arm uses exactly this: the participant's position relative to
 * the agent's SHOULDER is taken as the cursor over a trackball whose radius is the arm's reach, the
 * projected point is where the hand goes, and yaw/pitch/extend are read from it. A participant in
 * front is on the sphere (the arm points forward and lifts); one far to the side lands on the
 * hyperbolic sheet (the arm sweeps sideways without ever flipping behind the body).
 *
 *   DVArcballMath.project(x, y, r)                 → { x, y, z, sheet: 'sphere'|'hyperboloid' }
 *   DVArcballMath.tbRadius(distance, fovDeg, aspect, radiusFactor=0.67)   ArcballControls.calculateTbRadius
 *   DVArcballMath.toLocal(rel, yaw)                 world-relative vector → agent frame (agent faces +z)
 *   DVArcballMath.arm(rel, opts)                    → { extend, yaw, pitch, point:{x,y,z}, distance, sheet }
 *   DVArcballMath.lerpAngle(a, b, t) / angleDelta(a, b)   shortest arc
 *
 * Zero-dependency UMD: window.DVArcballMath + module.exports. No three.js.
 */
(function (global) {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /** ArcballControls.unprojectOnTbSurface, orthographic branch — the trackball surface itself. */
  function project(x, y, r) {
    x = +x || 0; y = +y || 0; r = +r > 0 ? +r : 1;
    var x2 = x * x, y2 = y * y, r2 = r * r;
    if (x2 + y2 <= r2 * 0.5) return { x: x, y: y, z: Math.sqrt(r2 - (x2 + y2)), sheet: 'sphere' };
    return { x: x, y: y, z: (r2 * 0.5) / Math.sqrt(x2 + y2), sheet: 'hyperboloid' };
  }

  /** ArcballControls.calculateTbRadius for a perspective camera: tan(min(halfFovV, halfFovH)) · distance · factor. */
  function tbRadius(distance, fovDeg, aspect, radiusFactor) {
    var halfFovV = (+fovDeg || 55) * Math.PI / 360;
    var halfFovH = Math.atan((+aspect || 1) * Math.tan(halfFovV));
    return Math.tan(Math.min(halfFovV, halfFovH)) * (+distance || 0) * (radiusFactor == null ? 0.67 : +radiusFactor);
  }

  function angleDelta(a, b) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function lerpAngle(a, b, t) { return a + angleDelta(a, b) * t; }

  /** Rotate a world-relative vector into the agent's local frame (the agent faces +z after yaw about y). */
  function toLocal(rel, yaw) {
    var c = Math.cos(-(yaw || 0)), s = Math.sin(-(yaw || 0));
    var x = +rel.x || 0, z = +rel.z || 0;
    return { x: c * x + s * z, y: +rel.y || 0, z: -s * x + c * z };
  }

  /**
   * The arm. `rel` is (participant − shoulder) in the AGENT frame (use toLocal first when it is in world
   * space). opts: { radius (trackball = reach, m, default 0.7), near (fully extended at/inside, 0.9),
   * far (arm at rest beyond, 3.2), maxPitch (rad, 1.2) }.
   * Returns extend 0..1, yaw (about y, 0 = straight ahead, +left), pitch (+up), the surface point, distance.
   */
  function arm(rel, opts) {
    opts = opts || {};
    var r = opts.radius > 0 ? +opts.radius : 0.7;
    var near = opts.near > 0 ? +opts.near : 0.9, far = opts.far > near ? +opts.far : 3.2;
    var x = +rel.x || 0, y = +rel.y || 0, z = +rel.z || 0;
    var d = Math.sqrt(x * x + y * y + z * z);
    if (d < 1e-6) return { extend: 0, yaw: 0, pitch: 0, point: { x: 0, y: 0, z: r }, distance: 0, sheet: 'sphere' };
    // Behind the shoulder the cursor is mirrored onto the far hyperbolic sheet by pushing it outward:
    // the arm sweeps to the side, it never points through the body.
    var behind = z < 0 ? (1 + (-z / d)) : 1;
    var p = project(x * behind, y * behind, r);
    var len = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
    var dir = { x: p.x / len, y: p.y / len, z: p.z / len };
    var yaw = Math.atan2(dir.x, dir.z);
    var pitch = clamp(Math.asin(clamp(dir.y, -1, 1)), -(opts.maxPitch || 1.2), opts.maxPitch || 1.2);
    // extend: at rest beyond `far`, fully extended at `near` — a smoothstep so the reach eases in.
    var u = clamp((far - d) / (far - near), 0, 1);
    var extend = u * u * (3 - 2 * u);
    return { extend: extend, yaw: yaw, pitch: pitch, point: p, distance: d, sheet: p.sheet };
  }

  var DVArcballMath = { project: project, tbRadius: tbRadius, toLocal: toLocal, arm: arm, angleDelta: angleDelta, lerpAngle: lerpAngle, clamp: clamp, version: '0.1.0',
    upstream: 'three.js addons/controls/ArcballControls.js (unprojectOnTbSurface, calculateTbRadius) — MIT' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVArcballMath;
  global.DVArcballMath = DVArcballMath;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
