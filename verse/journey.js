/*! dvengine — DVVerse.journey (verse/journey.js) · the 8 stages of the DeltaVerse journey mapped to zones; the director's stage teleports the participant · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · stages after DeltaVerse engine/ngn/journey.js */
/*
 *   DVVerse.journey.STAGES        ['arrival','recognition','communion','chain-of-thought','ascension','market-pulse','swarm-bloom','free-roam']
 *   zoneFor(stage, doc) → zone   by id, then by index (the n-th zone is the n-th stage), null when neither
 *   attach(verse, director?) → j  j.stage · j.next() · j.go(stage) · j.on('stage', fn) · j.detach();  director.on('stage') → j.go
 */
(function (global) {
  'use strict';
  var STAGES = ['arrival', 'recognition', 'communion', 'chain-of-thought', 'ascension', 'market-pulse', 'swarm-bloom', 'free-roam'];
  function zoneFor(stage, doc) {
    var zs = (doc && doc.zones) || [], i;
    for (i = 0; i < zs.length; i++) if (zs[i].id === stage) return zs[i];
    var idx = STAGES.indexOf(stage); if (idx >= 0 && zs[idx]) return zs[idx];
    return null;
  }
  function attach(verse, director) {
    var handlers = [], off = null, j = { stage: STAGES[0], index: 0 };
    j.on = function (ev, fn) { if (ev === 'stage') handlers.push(fn); return function () { handlers = handlers.filter(function (f) { return f !== fn; }); }; };
    j.go = function (stage) {
      var idx = STAGES.indexOf(stage); if (idx < 0) return false;
      j.stage = stage; j.index = idx;
      var z = zoneFor(stage, verse.doc);
      if (z && z.bounds && verse.teleport) verse.teleport({ x: z.bounds.c[0], y: z.bounds.c[1], z: z.bounds.c[2] + Math.min(2, z.bounds.r * 0.4) });
      handlers.forEach(function (f) { try { f({ stage: stage, index: idx, zone: z }); } catch (e) {} });
      return true;
    };
    j.next = function () { return j.go(STAGES[Math.min(STAGES.length - 1, j.index + 1)]); };
    if (director && director.on) { var h = function (st) { if (st && st.id) j.go(st.id); }; director.on('stage', h); off = function () { if (director.off) director.off('stage', h); }; }
    j.detach = function () { if (off) off(); handlers = []; };
    return j;
  }
  var api = { STAGES: STAGES, zoneFor: zoneFor, attach: attach };
  var NS = global.DVVerse = global.DVVerse || {}; NS.journey = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
