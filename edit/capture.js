/*! dvengine — DVCapture (edit/capture.js) · captureThumbnail(space, {w,h}) → dataURL: an offscreen render at the requested size with every gizmo hidden · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit capture/index.ts → engine captureFrame, MIT) where derived */
/*
 *   DVCapture.captureThumbnail(space, { w: 512, h: 288, type: 'image/jpeg', quality: 0.85, hideGizmos: true, camera }) → 'data:image/jpeg;base64,…'
 *   DVCapture.captureBlob(space, opts) → Promise<Blob>
 * Renders synchronously into the WebGL canvas at w×h (pixel ratio 1), copies the frame onto a 2D canvas
 * (works without preserveDrawingBuffer because the copy happens right after render), then restores size,
 * ratio, aspect and visibility and re-renders the on-screen frame.
 */
(function (global) {
  'use strict';
  function hideGizmos(scene) {
    var hidden = [];
    scene.traverse(function (o) { if (o.visible && o.userData && (o.userData.dvGizmo || o.userData.dvProxy)) { o.visible = false; hidden.push(o); } });
    return function () { hidden.forEach(function (o) { o.visible = true; }); };
  }
  function captureCanvas(space, opts) {
    opts = opts || {};
    var THREE = space.THREE || global.THREE, r = space.renderer, cam = opts.camera || space.camera;
    var w = opts.w || opts.width || 512, h = opts.h || opts.height || Math.round(w * 9 / 16);
    var size = r.getSize(new THREE.Vector2()), ratio = r.getPixelRatio(), aspect = cam.aspect;
    var restore = opts.hideGizmos === false ? function () {} : hideGizmos(space.scene);
    var extraRestore = [];
    (opts.hideScenes || []).forEach(function (s) { if (s.visible) { s.visible = false; extraRestore.push(s); } });
    try {
      r.setPixelRatio(1); r.setSize(w, h, false);
      if (cam.isPerspectiveCamera) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
      r.render(space.scene, cam);
      var out = global.document.createElement('canvas'); out.width = w; out.height = h;
      out.getContext('2d').drawImage(r.domElement, 0, 0, w, h);
      return out;
    } finally {
      restore(); extraRestore.forEach(function (s) { s.visible = true; });
      r.setPixelRatio(ratio); r.setSize(size.x, size.y, false);
      if (cam.isPerspectiveCamera) { cam.aspect = aspect; cam.updateProjectionMatrix(); }
      try { r.render(space.scene, cam); } catch (e) { /* on-screen frame comes back next tick anyway */ }
    }
  }
  function captureThumbnail(space, opts) { opts = opts || {}; return captureCanvas(space, opts).toDataURL(opts.type || 'image/jpeg', opts.quality != null ? opts.quality : 0.85); }
  function captureBlob(space, opts) { opts = opts || {}; var c = captureCanvas(space, opts); return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob failed')); }, opts.type || 'image/jpeg', opts.quality != null ? opts.quality : 0.85); }); }
  var DVCapture = { captureThumbnail: captureThumbnail, captureBlob: captureBlob, captureCanvas: captureCanvas, version: '0.1.0', upstream: 'https://github.com/oncyberio/awe/blob/main/packages/engine-edit/src/capture/index.ts' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVCapture;
  global.DVCapture = DVCapture;
})(typeof window !== 'undefined' ? window : this);
