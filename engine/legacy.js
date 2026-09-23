/*!
 * dvengine — DVLegacyScene (engine/legacy.js) · legacy mode loader
 *
 * Legacy mode is the reflection of the oncyberio work: an awe `static-scene.json` (SceneData) loaded
 * verbatim, converted by DVScene.fromLegacy, and mounted on a DVEngine Space with the ported awe
 * components. Nothing is refined here — refinement lives in verse/. (c) 2026 BANKON / PYTHAI · MIT
 *
 *   DVLegacyScene.load(urlOrObject) -> Promise<doc>
 *   DVLegacyScene.mount(space, urlOrObject, { lazy }) -> Promise<summary>
 */
(function (global) {
  'use strict';
  function load(src, fetchImpl) {
    if (src && typeof src === 'object') return Promise.resolve(global.DVScene.fromLegacy(src));
    var f = fetchImpl || global.fetch;
    return f(src).then(function (r) { if (!r.ok) throw new Error('legacy scene fetch ' + r.status); return r.json(); }).then(function (j) { return global.DVScene.fromLegacy(j); });
  }
  function mount(space, src, opts) { return load(src).then(function (doc) { return space.load(doc, opts || { lazy: true }); }); }
  var DVLegacyScene = { load: load, mount: mount, version: '0.0.1-alpha', upstream: 'https://github.com/oncyberio/awe' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVLegacyScene;
  global.DVLegacyScene = DVLegacyScene;
})(typeof window !== 'undefined' ? window : this);
