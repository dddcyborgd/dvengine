/*! dvengine — DVXR.probe (xr/probe.js) · capability probe: WebGPU adapter · immersive-vr · immersive-ar · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 * After DeltaVerse nGn/cycle.html: navigator.gpu can exist while requestAdapter() resolves null (Linux
 * Chrome without the flag), and navigator.xr.isSessionSupported must be ASKED — presence of the object
 * proves nothing. So every answer is awaited, never inferred, and a throw counts as "no".
 *   DVXR.probe() → Promise<{ webgpu, vr, ar }>      (memoised; DVXR.probe.reset() to ask again)
 */
(function (global) {
  'use strict';
  var NS = global.DVXR = global.DVXR || {};
  var memo = null;
  function no() { return Promise.resolve(false); }
  function probe(nav) {
    if (memo && !nav) return memo;
    nav = nav || global.navigator || {};
    var gpu = no(), vr = no(), ar = no();
    try { if (nav.gpu && nav.gpu.requestAdapter) gpu = nav.gpu.requestAdapter().then(function (a) { return !!a; }, function () { return false; }); } catch (e) {}
    try { if (nav.xr && nav.xr.isSessionSupported) {
      vr = nav.xr.isSessionSupported('immersive-vr').then(function (s) { return !!s; }, function () { return false; });
      ar = nav.xr.isSessionSupported('immersive-ar').then(function (s) { return !!s; }, function () { return false; });
    } } catch (e) {}
    var p = Promise.all([gpu, vr, ar]).then(function (r) { return { webgpu: r[0], vr: r[1], ar: r[2] }; });
    if (!nav || nav === global.navigator) memo = p;
    return p;
  }
  probe.reset = function () { memo = null; };
  NS.probe = probe;
  NS.version = NS.version || '0.1.0';
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
