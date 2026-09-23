/*! dvengine — DVChords (input/chords.js) · the combination engine: chords (a+b, simultaneous), sequences (a,a within 350 ms), holds (a:hold ≥ 600 ms) → named actions; pure and testable · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 *   var c = DVChords.create(map, { seqMs:350, holdMs:600, now })
 *   c.press(btn, t) / c.release(btn, t) / c.tick(t) → [{ action, key, t }]   (also emitted as 'chord')
 *   c.bind(map) · c.map() · c.held() → [names] · c.on('chord', fn) → off · c.reset()
 *   map keys   'a+b'   simultaneous: fires on the press that makes the HELD SET exactly {a,b} (order-free; 'b+a' is the same key)
 *              'a,b'   sequence: taps of a then b, each within seqMs of the last (a tap = press + release with no chord and no hold)
 *              'a:hold' held for holdMs without joining a chord
 *              'a'     a plain tap (fires on release)
 *   A button consumed by a chord or a hold never counts as a tap, so 'core+up' does not also register 'core,core'.
 *   DVChords.DEFAULT is the DeltaVerse map (the core button acts only through these).
 */
(function (global) {
  'use strict';
  var DEFAULT = {
    'core+up': 'sphere.raise', 'core+down': 'sphere.lower', 'core+left': 'sphere.prev', 'core+right': 'sphere.next',
    'core+fire': 'item.use', 'fire': 'interact', 'core,core': 'focus.toggle', 'core:hold': 'menu', 'left+right': 'reach', 'fire:hold': 'gesture.greet',
    'sideRight:hold': 'field.grow', 'sideRight,sideRight': 'field.shrink', 'core+sideRight': 'field.shrink', 'core+sideLeft': 'field.mode'
  };
  function parse(key) {
    key = String(key || '');
    if (key.indexOf(':hold') > 0) return { kind: 'hold', parts: [key.slice(0, key.indexOf(':hold'))] };
    if (key.indexOf(',') > 0) return { kind: 'seq', parts: key.split(',') };
    if (key.indexOf('+') > 0) return { kind: 'chord', parts: key.split('+').sort() };
    return { kind: 'tap', parts: [key] };
  }
  function create(map, opts) {
    opts = opts || {};
    var seqMs = opts.seqMs || 350, holdMs = opts.holdMs || 600, now = opts.now || function () { return Date.now(); };
    var chords = {}, seqs = [], holds = {}, taps = {}, down = {}, recent = [], listeners = [], bound = {};
    function bind(m) {
      chords = {}; seqs = []; holds = {}; taps = {}; bound = {};
      for (var k in (m || {})) {
        var p = parse(k), action = m[k]; if (!action) continue; bound[k] = action;
        if (p.kind === 'chord') chords[p.parts.join('+')] = { action: action, key: k };
        else if (p.kind === 'seq') seqs.push({ parts: p.parts, action: action, key: k });
        else if (p.kind === 'hold') holds[p.parts[0]] = { action: action, key: k };
        else taps[p.parts[0]] = { action: action, key: k };
      }
    }
    function fire(out, hit, t) { var ev = { action: hit.action, key: hit.key, t: t }; out.push(ev); for (var i = 0; i < listeners.length; i++) { try { listeners[i](ev); } catch (e) {} } }
    function heldNames() { return Object.keys(down).sort(); }
    function press(btn, t) {
      t = t == null ? now() : t; var out = [];
      if (down[btn]) return out;
      down[btn] = { t0: t, used: false };
      var names = heldNames();
      if (names.length > 1) { var hit = chords[names.join('+')]; if (hit) { for (var i = 0; i < names.length; i++) down[names[i]].used = true; fire(out, hit, t); } }
      return out;
    }
    function release(btn, t) {
      t = t == null ? now() : t; var out = [], e = down[btn];
      if (!e) return out;
      delete down[btn];
      if (e.used) return out;
      // a clean tap
      if (taps[btn]) fire(out, taps[btn], t);
      if (recent.length && t - recent[recent.length - 1].t > seqMs) recent = []; recent.push({ btn: btn, t: t }); if (recent.length > 8) recent.shift();
      for (var s = 0; s < seqs.length; s++) {
        var seq = seqs[s], n = seq.parts.length; if (recent.length < n) continue;
        var ok = true; for (var k = 0; k < n; k++) { var r = recent[recent.length - n + k]; if (r.btn !== seq.parts[k] || (k > 0 && r.t - recent[recent.length - n + k - 1].t > seqMs)) { ok = false; break; } }
        if (ok) { fire(out, seq, t); recent = []; break; }
      }
      return out;
    }
    function tick(t) {
      t = t == null ? now() : t; var out = [];
      for (var b in down) { var e = down[b]; if (!e.used && holds[b] && t - e.t0 >= holdMs) { e.used = true; fire(out, holds[b], t); } }
      return out;
    }
    var engine = {
      press: press, release: release, tick: tick, bind: function (m) { bind(m); return engine; }, map: function () { var o = {}; for (var k in bound) o[k] = bound[k]; return o; },
      held: heldNames, reset: function () { down = {}; recent = []; return engine; }, seqMs: seqMs, holdMs: holdMs,
      on: function (ev, fn) { if (ev === 'chord') listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
    };
    bind(map == null ? DEFAULT : map);
    return engine;
  }
  var api = { create: create, parse: parse, DEFAULT: DEFAULT, version: '0.1.0' };
  global.DVChords = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
