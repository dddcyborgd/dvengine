/*! dvengine — DVSenseStick (input/senses.js) · the participant's mic and camera as a joystick: head yaw/pitch → the right stick, lean → the left, face gestures and voice onsets/peaks/holds → button pulses, inflection → raise/lower, level → energy · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 *   var s = DVSenseStick.create({ read, director, map, smoothing:0.15, deadZoneDeg:4, maxDeg:30, holdMs:400, pulseMs:120, now })
 *   s.available            true when a source answers (DVParticipantInput.shared().state → DVDirector senses → none)
 *   s.poll(t) → { right:{x,y}, left:{x,y}, buttons:{fire,core,sideLeft,sideRight}, held, energy, speaking, lean, sphere:{raise,lower}, source, available }
 *   state read: { voice:{ level, peak, onset, speaking, inflection, bands[4] }, vision:{ present, head{x,y}, pose{pitch,yaw,roll}, engagement, lean, gesture{name,value} } }
 *   mapping (customisable through `map`):
 *     camera   pose.yaw / pose.pitch (rad; `units:'deg'` for degrees) → right.x / right.y — dead zone 4°, full deflection at 30°, exponential smoothing 0.15
 *              lean (+ = in) → left.y                gesture onsets: jawOpen → fire tap · nod → core tap · browsUp → sideLeft tap · smile → sideRight tap
 *     mic      onset → fire tap · speaking ≥ 400 ms → fire held while speaking · peak → core tap · inflection rising/falling → sphere.raise / sphere.lower · level → energy
 *   Every tap is a pulse of pulseMs so the merger's edge detection sees it exactly like a key. Without any source: inert, available:false.
 * Pure: DVSenseStick.headAxes(pose, opts) · DVSenseStick.GESTURE_BUTTONS · DVSenseStick.normalise(state)
 */
(function (global) {
  'use strict';
  var GESTURE_BUTTONS = { jawOpen: 'fire', nod: 'core', browsUp: 'sideLeft', smile: 'sideRight' };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function toRad(v, units) { return units === 'deg' ? (+v || 0) * Math.PI / 180 : (+v || 0); }
  /** Head pose → a stick deflection: dead zone, linear to maxDeg, clamped. */
  function headAxes(pose, opts) {
    opts = opts || {}; var dz = toRad(opts.deadZoneDeg == null ? 4 : opts.deadZoneDeg, 'deg'), mx = toRad(opts.maxDeg == null ? 30 : opts.maxDeg, 'deg');
    function one(v) { v = toRad(v, opts.units); var s = Math.sign(v), a = Math.abs(v); if (a <= dz) return 0; return s * clamp((a - dz) / (mx - dz), 0, 1); }
    return pose ? { x: one(pose.yaw), y: one(pose.pitch) } : { x: 0, y: 0 };
  }
  /** Accept DVParticipantInput's state, or a DVDirector senses state ({ face, voice }), as the same shape. */
  function normalise(st) {
    if (!st) return null;
    if (st.voice || st.vision) return { voice: st.voice || null, vision: st.vision || null };
    if (st.face || st.audio) { var f = st.face || {}; return { voice: st.audio || st.voice || null, vision: { present: !!(f.active && f.present), pose: f.pose || null, lean: f.lean || 0, gesture: f.gesture || null, engagement: f.engagement || 0 } }; }
    return null;
  }
  function create(opts) {
    opts = opts || {};
    var now = opts.now || function () { return Date.now(); };
    var map = opts.map || GESTURE_BUTTONS, smoothing = opts.smoothing == null ? 0.15 : +opts.smoothing, holdMs = opts.holdMs || 400, pulseMs = opts.pulseMs || 120;
    var right = { x: 0, y: 0 }, left = { x: 0, y: 0 }, until = {}, pressedAt = {}, gest = {}, prev = { onset: false, peak: false, infl: 0, speaking: false, spokeAt: 0 }, energy = 0, listeners = {}, lastSource = 'none';
    function emit(ev, d) { var l = listeners[ev]; if (l) for (var i = 0; i < l.length; i++) { try { l[i](d); } catch (e) {} } }
    function read() {
      if (opts.read) { try { return normalise(opts.read()); } catch (e) { return null; } }
      var I = global.DVParticipantInput; if (I && I.shared) { try { var st = I.shared().state; var n = normalise(st); if (n) { lastSource = 'input'; return n; } } catch (e) {} }
      var d = opts.director || global.DVDirector; var ss = d && d.senses && d.senses.state; if (ss) { var n2 = normalise(ss); if (n2) { lastSource = 'director'; return n2; } }
      lastSource = 'none'; return null;
    }
    function pulse(name, t) { until[name] = t + pulseMs; if (!(name in pressedAt)) { pressedAt[name] = { t0: t }; emit('button', { name: name, down: true, t: t, via: 'senses' }); } }
    var s = {
      available: false, energy: 0, speaking: false, lean: 0, right: right, left: left, source: 'none', map: map,
      on: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return function () { var l = listeners[ev]; var i = l ? l.indexOf(fn) : -1; if (i >= 0) l.splice(i, 1); }; },
      poll: function (t) {
        t = t == null ? now() : t;
        var st = read(), raise = 0, lower = 0, holdFire = false, pulses = [];
        s.available = !!st; s.source = opts.read ? 'read' : lastSource;
        var v = st && st.vision, a = v && v.present ? headAxes(v.pose, opts) : { x: 0, y: 0 };
        right.x += (a.x - right.x) * smoothing; right.y += (a.y - right.y) * smoothing;
        var lean = v && v.present ? clamp(+v.lean || 0, -1, 1) : 0; left.y += (lean - left.y) * smoothing; s.lean = left.y;
        if (Math.abs(right.x) < 1e-4) right.x = 0; if (Math.abs(right.y) < 1e-4) right.y = 0; if (Math.abs(left.y) < 1e-4) left.y = 0;
        if (v && v.gesture && v.gesture.name) { var g = v.gesture, on = (+g.value || 0) >= 0.5; if (on && !gest[g.name] && map[g.name]) pulses.push(map[g.name]); gest[g.name] = on; for (var k in gest) if (k !== g.name) gest[k] = false; } else for (var k2 in gest) gest[k2] = false;
        var vo = st && st.voice;
        if (vo) {
          if (vo.onset && !prev.onset) pulses.push('fire'); prev.onset = !!vo.onset;
          if (vo.peak && !prev.peak) pulses.push('core'); prev.peak = !!vo.peak;
          var infl = +vo.inflection || 0; if (infl > 0.3 && prev.infl <= 0.3) raise++; if (infl < -0.3 && prev.infl >= -0.3) lower++; prev.infl = infl;
          if (vo.speaking) { if (!prev.speaking) prev.spokeAt = t; holdFire = t - prev.spokeAt >= holdMs; } prev.speaking = !!vo.speaking;
          energy += (clamp(+vo.level || 0, 0, 1) - energy) * 0.3;
        } else { energy *= 0.9; prev.speaking = false; }
        if (energy < 1e-3) energy = 0; s.energy = energy; s.speaking = !!(vo && vo.speaking);
        var NAMES = ['fire', 'core', 'sideLeft', 'sideRight'], n, i;
        for (i = 0; i < NAMES.length; i++) { n = NAMES[i]; if ((n in pressedAt) && !(until[n] != null && t < until[n]) && !(n === 'fire' && holdFire)) { delete pressedAt[n]; emit('button', { name: n, down: false, t: t, via: 'senses' }); } }
        for (i = 0; i < pulses.length; i++) pulse(pulses[i], t);
        if (holdFire && !('fire' in pressedAt)) { pressedAt.fire = { t0: t }; emit('button', { name: 'fire', down: true, t: t, via: 'senses' }); }
        var buttons = {}, held = {};
        for (i = 0; i < NAMES.length; i++) { n = NAMES[i]; buttons[n] = n in pressedAt; if (buttons[n]) held[n] = Math.max(0, t - pressedAt[n].t0); }
        if (raise || lower) emit('sphere', { raise: raise, lower: lower, t: t });
        return { id: 'senses', right: { x: right.x, y: right.y }, left: { x: left.x, y: left.y }, x: right.x, y: right.y, buttons: buttons, held: held, energy: energy, speaking: s.speaking, lean: s.lean, sphere: { raise: raise, lower: lower }, source: s.source, available: s.available, t: t };
      }
    };
    return s;
  }
  var api = { create: create, headAxes: headAxes, normalise: normalise, GESTURE_BUTTONS: GESTURE_BUTTONS, version: '0.1.0' };
  global.DVSenseStick = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
