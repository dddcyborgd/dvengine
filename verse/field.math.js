/*! dvengine — DVFieldMath (verse/field.math.js) · the field of influence, pure: slots on a sphere, the arcball orientation (quaternions), the drag rotation, the arm target, the radius bound (max = extent − 1: infinity − 1), recognition degree, the hierarchy's two dials, privacy and links · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · after three.js ArcballControls (MIT) where derived */
/*
 *   slots      slotPoint({theta,phi}) → unit {x,y,z} (theta = azimuth about y, 0 → +z in front; phi = elevation, +π/2 → the pole above)
 *              slotOf(p) · ringSlots(n, phi, start) · raise(slot, step) / lower(slot, step) (phi clamped to ±π/2) · wrap(i, n)
 *   rotation   qIdentity · qAxisAngle(axis, rad) · qMul(a, b) · qConj · qNormalize · qRotate(q, v)
 *              surface(x, y, r) — the ArcballControls trackball surface (DVArcballMath.project when loaded, the same rule inline otherwise)
 *              dragRotation(p0, p1) — the Holroyd/ArcballControls rotation that carries surface point p0 to p1 (axis p0×p1, angle acos p0·p1)
 *              rotate(q, yaw, pitch) — the joystick drive: yaw about y, pitch about x, applied in the subject frame · pointOf(q, slot)
 *   the arm    armTarget(point, radius, max) → { extend: radius/max, yaw, pitch }  (yaw ±1.3 rad, pitch −0.6..1.45; a point behind mirrors to the side)
 *   the bound  extentOf(doc, skyRadius=70) → the outer zone radius (largest zones[].bounds.r) else the skydome radius else 70
 *              maxOf(extent) = extent − 1   ← THE RULE: "the field of influence can approach the limits of becoming the entire field,
 *              similar to how a thing has to be separate from infinity to recognise it (infinity − 1), and the DeltaVerse recognised itself."
 *              clampRadius(r, min=0.35, max) · atBound(r, max, eps=0.5) · edge(wasAt, isAt) → 'enter'|'leave'|null
 *   the dials  POLICY (the default ladder, cyborgd registries/field-policy.json) · policyFor(rank, table?) → { outflow, inflow }
 *              degree(r, max, outflow) = clamp(r/max) × outflow — the DeltaVerse ALWAYS recognises a field; the bound is degree → 1 (× outflow)
 *   privacy    MODES · defaultModeFor(rank, table?) · canPrivate(claim) · visibleTo(ownerField, ownerSid, viewerSid, viewerInflow) · contains(c, r, p)
 */
(function (global) {
  'use strict';
  var MIN = 0.35, EPS = 0.5, STEP = Math.PI / 12, RSTEP = 0.25;
  var POLICY = { participant: { outflow: 0.15, inflow: 1 }, 'recognized-participant': { outflow: 0.3, inflow: 1 }, member: { outflow: 0.5, inflow: 0.9 }, player: { outflow: 0.65, inflow: 0.8 }, trader: { outflow: 0.75, inflow: 0.7 }, owner: { outflow: 0.9, inflow: 0.5 }, overseer: { outflow: 1, inflow: 0.3 }, overlord: { outflow: 1, inflow: 0.1 }, mastermind: { outflow: 1, inflow: 0 } };
  var MODES = ['open', 'connected', 'private'];
  var DEFAULT_MODE = { participant: 'open', 'recognized-participant': 'open' };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function slotPoint(s) { var th = +(s && s.theta) || 0, ph = clamp(+(s && s.phi) || 0, -Math.PI / 2, Math.PI / 2), c = Math.cos(ph); return { x: c * Math.sin(th), y: Math.sin(ph), z: c * Math.cos(th) }; }
  function slotOf(p) { var x = +p.x || 0, y = +p.y || 0, z = +p.z || 0, l = Math.sqrt(x * x + y * y + z * z) || 1; return { theta: Math.atan2(x, z), phi: Math.asin(clamp(y / l, -1, 1)) }; }
  function ringSlots(n, phi, start) { var out = []; for (var i = 0; i < n; i++) out.push({ theta: (start || 0) + (i / Math.max(1, n)) * Math.PI * 2, phi: phi || 0 }); return out; }
  function raise(s, step) { return { theta: s.theta, phi: clamp(s.phi + (step == null ? STEP : step), -Math.PI / 2, Math.PI / 2) }; }
  function lower(s, step) { return raise(s, -(step == null ? STEP : step)); }
  function wrap(i, n) { if (!(n > 0)) return 0; return ((i % n) + n) % n; }

  function qIdentity() { return { x: 0, y: 0, z: 0, w: 1 }; }
  function qAxisAngle(a, rad) { var l = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) || 1, s = Math.sin(rad / 2) / l; return { x: a.x * s, y: a.y * s, z: a.z * s, w: Math.cos(rad / 2) }; }
  function qMul(a, b) { return { x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z }; }
  function qConj(q) { return { x: -q.x, y: -q.y, z: -q.z, w: q.w }; }
  function qNormalize(q) { var l = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w) || 1; return { x: q.x / l, y: q.y / l, z: q.z / l, w: q.w / l }; }
  function qRotate(q, v) { var r = qMul(qMul(q, { x: v.x, y: v.y, z: v.z, w: 0 }), qConj(q)); return { x: r.x, y: r.y, z: r.z }; }
  function surface(x, y, r) {
    var M = global.DVArcballMath; if (M && M.project) return M.project(x, y, r);
    x = +x || 0; y = +y || 0; r = +r > 0 ? +r : 1; var x2 = x * x, y2 = y * y, r2 = r * r;
    return x2 + y2 <= r2 * 0.5 ? { x: x, y: y, z: Math.sqrt(r2 - (x2 + y2)), sheet: 'sphere' } : { x: x, y: y, z: (r2 * 0.5) / Math.sqrt(x2 + y2), sheet: 'hyperboloid' };
  }
  function dragRotation(p0, p1) {
    var l0 = Math.sqrt(p0.x * p0.x + p0.y * p0.y + p0.z * p0.z) || 1, l1 = Math.sqrt(p1.x * p1.x + p1.y * p1.y + p1.z * p1.z) || 1;
    var a = { x: p0.x / l0, y: p0.y / l0, z: p0.z / l0 }, b = { x: p1.x / l1, y: p1.y / l1, z: p1.z / l1 };
    var axis = { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }, al = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
    if (al < 1e-9) return qIdentity();
    return qAxisAngle(axis, Math.acos(clamp(a.x * b.x + a.y * b.y + a.z * b.z, -1, 1)));
  }
  function rotate(q, yaw, pitch) { return qNormalize(qMul(qMul(qAxisAngle({ x: 0, y: 1, z: 0 }, yaw || 0), qAxisAngle({ x: 1, y: 0, z: 0 }, pitch || 0)), q)); }
  function pointOf(q, slot) { return qRotate(q, slotPoint(slot)); }
  function armTarget(p, radius, max) {
    var x = +p.x || 0, y = +p.y || 0, z = +p.z || 0, l = Math.sqrt(x * x + y * y + z * z) || 1; x /= l; y /= l; z /= l;
    var yaw = Math.atan2(x, z); if (z < 0) yaw = Math.sign(x || 1) * (Math.PI - Math.abs(yaw));
    return { extend: clamp(max > 0 ? (+radius || 0) / max : 0, 0, 1), yaw: clamp(yaw, -1.3, 1.3), pitch: clamp(Math.asin(clamp(y, -1, 1)), -0.6, 1.45) };
  }
  function extentOf(doc, skyRadius) { var best = 0, zs = (doc && doc.zones) || []; for (var i = 0; i < zs.length; i++) { var r = zs[i] && zs[i].bounds && +zs[i].bounds.r; if (r > best) best = r; } return best > 0 ? best : (+skyRadius > 0 ? +skyRadius : 70); }
  function maxOf(extent, min) { return Math.max((min == null ? MIN : min) + EPS, (+extent || 0) - 1); }
  function clampRadius(r, min, max) { return clamp(+r || 0, min == null ? MIN : min, max == null ? Infinity : max); }
  function atBound(r, max, eps) { return max > 0 && r >= max - (eps == null ? EPS : eps); }
  function edge(was, is) { return is && !was ? 'enter' : (!is && was ? 'leave' : null); }
  function policyFor(rank, table) { var t = (table && table.rungs) || POLICY; return t[rank] || t.participant || POLICY.participant; }
  function degree(r, max, outflow) { if (!(max > 0)) return 0; return clamp((+r || 0) / max, 0, 1) * (outflow == null ? 1 : clamp(+outflow, 0, 1)); }
  function defaultModeFor(rank, table) { var d = (table && table.defaultMode); if (d && d[rank]) return d[rank]; return DEFAULT_MODE[rank] || 'connected'; }
  function canPrivate(claim) { return !!(claim && (typeof claim === 'string' ? claim.indexOf('.') > 0 : (claim.sub || claim.iss))); }
  function visibleTo(f, ownerSid, viewerSid, viewerInflow) {
    if (viewerInflow != null && !(viewerInflow > 0)) return false;
    if (!f || ownerSid === viewerSid) return true;
    var mode = f.mode || 'open';
    if (mode === 'open') return true;
    if (mode === 'connected') { var links = f.links; if (!links) return false; if (typeof links.has === 'function') return links.has(viewerSid); return links.indexOf(viewerSid) >= 0; }
    return false;
  }
  function contains(c, r, p) { var dx = (+p.x || 0) - (+c.x || 0), dy = (+p.y || 0) - (+c.y || 0), dz = (+p.z || 0) - (+c.z || 0); return dx * dx + dy * dy + dz * dz <= r * r; }

  var api = { MIN: MIN, EPS: EPS, STEP: STEP, RSTEP: RSTEP, POLICY: POLICY, MODES: MODES, slotPoint: slotPoint, slotOf: slotOf, ringSlots: ringSlots, raise: raise, lower: lower, wrap: wrap, qIdentity: qIdentity, qAxisAngle: qAxisAngle, qMul: qMul, qConj: qConj, qNormalize: qNormalize, qRotate: qRotate, surface: surface, dragRotation: dragRotation, rotate: rotate, pointOf: pointOf, armTarget: armTarget, extentOf: extentOf, maxOf: maxOf, clampRadius: clampRadius, atBound: atBound, edge: edge, policyFor: policyFor, degree: degree, defaultModeFor: defaultModeFor, canPrivate: canPrivate, visibleTo: visibleTo, contains: contains, version: '0.1.0' };
  global.DVFieldMath = api; global.DVSphereMath = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
