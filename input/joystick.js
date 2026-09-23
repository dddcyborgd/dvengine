/*! dvengine — DVJoystick (input/joystick.js) · a virtual joystick: four direction keys → a normalised stick, thumb-fire, two side buttons, the core; keyboard (KeyboardEvent.code) or a gamepad · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 *   var stick = DVJoystick.create({ id, layout, allowShared, gamepad:index|null, deadZone:0.18, chords:map|engine, now })
 *   stick.x / stick.y            −1..1 (up = +y, right = +x; a diagonal is normalised to length 1)
 *   stick.buttons                { fire, core, sideLeft, sideRight }  (booleans)
 *   stick.dirs                   { up, down, left, right }
 *   stick.held(name, t?)         ms held (0 when up) — name ∈ up down left right fire core sideLeft sideRight
 *   stick.on('axis'|'button'|'chord', fn) → off      axis {x,y} · button {name, down, t} · chord {action, key, t} (when a DVChords map is given)
 *   stick.bind(layout) · stick.layout() · stick.attach(el = window) · stick.detach() · stick.poll(t) → snapshot
 *   layout = { up, down, left, right, fire, sideLeft, sideRight, core } → KeyboardEvent.code values (any slot may be null)
 *   Validation: two ATTACHED sticks may not claim the same code unless one of them was created with allowShared.
 *   Keyboard repeat is ignored; every key is released on window blur. A gamepad (navigator.getGamepads()[index])
 *   is merged on poll(): axes 0/1 → x/y, button 0 → fire, 4/5 → sideLeft/sideRight, 9 → core, the d-pad 12–15 → dirs.
 * Pure: DVJoystick.axes(dirs) · DVJoystick.fromGamepad(gp, deadZone) · DVJoystick.SLOTS · DVJoystick.BUTTONS
 */
(function (global) {
  'use strict';
  var SLOTS = ['up', 'down', 'left', 'right', 'fire', 'sideLeft', 'sideRight', 'core'];
  var BUTTONS = ['fire', 'core', 'sideLeft', 'sideRight'];
  var DIRS = ['up', 'down', 'left', 'right'];
  var GP_BUTTONS = { 0: 'fire', 4: 'sideLeft', 5: 'sideRight', 9: 'core', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
  var attached = [];   // every attached stick (for the shared-code check)

  /** Four booleans → a unit-clamped stick. */
  function axes(d) {
    var x = (d.right ? 1 : 0) - (d.left ? 1 : 0), y = (d.up ? 1 : 0) - (d.down ? 1 : 0);
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x: x, y: y };
  }
  /** A Gamepad → { x, y, names:[pressed] } with a radial dead zone. */
  function fromGamepad(gp, deadZone) {
    var dz = deadZone == null ? 0.18 : +deadZone, ax = gp && gp.axes ? +gp.axes[0] || 0 : 0, ay = gp && gp.axes ? -(+gp.axes[1] || 0) : 0;
    var len = Math.sqrt(ax * ax + ay * ay);
    if (len < dz) { ax = 0; ay = 0; } else if (len > 1) { ax /= len; ay /= len; }
    var names = [];
    if (gp && gp.buttons) for (var i in GP_BUTTONS) if (gp.buttons[i] && gp.buttons[i].pressed) names.push(GP_BUTTONS[i]);
    return { x: ax, y: ay, names: names };
  }
  function codesOf(layout) { var out = {}; for (var i = 0; i < SLOTS.length; i++) { var c = layout[SLOTS[i]]; if (c) out[c] = SLOTS[i]; } return out; }

  function create(opts) {
    opts = opts || {};
    var now = opts.now || function () { return Date.now(); };
    var layout = {}, codes = {}, el = null, held = {}, gpHeld = {}, listeners = {}, chords = null, last = { x: 0, y: 0 };
    var stick = { id: opts.id || 'stick', x: 0, y: 0, buttons: { fire: false, core: false, sideLeft: false, sideRight: false }, dirs: { up: false, down: false, left: false, right: false }, allowShared: !!opts.allowShared, gamepad: opts.gamepad == null ? null : opts.gamepad, deadZone: opts.deadZone };
    function emit(ev, d) { var l = listeners[ev]; if (l) for (var i = 0; i < l.length; i++) { try { l[i](d); } catch (e) {} } }
    stick.on = function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return function () { var l = listeners[ev]; var i = l ? l.indexOf(fn) : -1; if (i >= 0) l.splice(i, 1); }; };
    function refresh(t) {
      var changed = false;
      for (var i = 0; i < SLOTS.length; i++) { var n = SLOTS[i], v = (n in held) || (n in gpHeld); var tgt = DIRS.indexOf(n) >= 0 ? stick.dirs : stick.buttons; if (tgt[n] !== v) { tgt[n] = v; changed = true; } }
      var a = axes(stick.dirs);
      if (stick.gamepad != null && gpHeld._x != null && !stick.dirs.up && !stick.dirs.down && !stick.dirs.left && !stick.dirs.right) a = { x: gpHeld._x, y: gpHeld._y };
      stick.x = a.x; stick.y = a.y;
      if (a.x !== last.x || a.y !== last.y) { last = a; emit('axis', { x: a.x, y: a.y, id: stick.id, t: t }); }
      return changed;
    }
    function press(name, t) { if (name in held) return; held[name] = { t0: t }; refresh(t); emit('button', { name: name, down: true, t: t, id: stick.id }); if (chords) fire(chords.press(name, t), t); }
    function release(name, t) { if (!(name in held)) return; delete held[name]; refresh(t); emit('button', { name: name, down: false, t: t, id: stick.id }); if (chords) fire(chords.release(name, t), t); }
    function fire(actions, t) { for (var i = 0; i < (actions || []).length; i++) emit('chord', { action: actions[i].action, key: actions[i].key, t: t, id: stick.id }); }
    function onKD(e) { var n = codes[e.code]; if (!n) return; if (e.preventDefault && !e.metaKey) e.preventDefault(); if (e.repeat) return; press(n, now()); }
    function onKU(e) { var n = codes[e.code]; if (!n) return; release(n, now()); }
    function onBlur() { var t = now(); for (var n in held) release(n, t); }

    stick.bind = function (l) {
      var next = {}; for (var i = 0; i < SLOTS.length; i++) next[SLOTS[i]] = (l && l[SLOTS[i]]) || null;
      if (el) check(next, stick);
      layout = next; codes = codesOf(layout); onBlur(); return stick;
    };
    stick.layout = function () { var o = {}; for (var k in layout) o[k] = layout[k]; return o; };
    stick.held = function (name, t) { var e = held[name] || gpHeld[name]; return e ? Math.max(0, (t == null ? now() : t) - e.t0) : 0; };
    stick.press = function (name, t) { if (SLOTS.indexOf(name) >= 0) press(name, t == null ? now() : t); return stick; };
    stick.release = function (name, t) { release(name, t == null ? now() : t); return stick; };
    stick.attach = function (target) {
      if (el) stick.detach();
      el = target || global; check(layout, stick);
      el.addEventListener('keydown', onKD); el.addEventListener('keyup', onKU); el.addEventListener('blur', onBlur);
      attached.push(stick); return stick;
    };
    stick.detach = function () { if (!el) return stick; el.removeEventListener('keydown', onKD); el.removeEventListener('keyup', onKU); el.removeEventListener('blur', onBlur); el = null; onBlur(); var i = attached.indexOf(stick); if (i >= 0) attached.splice(i, 1); return stick; };
    stick.attached = function () { return !!el; };
    stick.chords = function (mapOrEngine) {
      if (mapOrEngine && typeof mapOrEngine.press === 'function') chords = mapOrEngine;
      else if (global.DVChords) chords = global.DVChords.create(mapOrEngine);
      return chords;
    };
    /** Poll the gamepad (when any) and return a snapshot { x, y, buttons, dirs, held:{name:ms}, t }. */
    stick.poll = function (t) {
      t = t == null ? now() : t;
      if (stick.gamepad != null) {
        var pads = (opts.getGamepads || (global.navigator && global.navigator.getGamepads && function () { return global.navigator.getGamepads(); }));
        var gp = null; try { var list = pads ? pads() : null; gp = list ? list[stick.gamepad] : null; } catch (e) { gp = null; }
        var g = fromGamepad(gp, stick.deadZone), names = {}; for (var i = 0; i < g.names.length; i++) names[g.names[i]] = 1;
        for (var n in gpHeld) if (n.charAt(0) !== '_' && !names[n]) { delete gpHeld[n]; if (!(n in held)) { refresh(t); emit('button', { name: n, down: false, t: t, id: stick.id, via: 'gamepad' }); if (chords) fire(chords.release(n, t), t); } }
        for (var m in names) if (!(m in gpHeld)) { gpHeld[m] = { t0: t }; if (!(m in held)) { refresh(t); emit('button', { name: m, down: true, t: t, id: stick.id, via: 'gamepad' }); if (chords) fire(chords.press(m, t), t); } }
        gpHeld._x = gp ? g.x : null; gpHeld._y = gp ? g.y : null;
      }
      refresh(t);
      if (chords) fire(chords.tick(t), t);
      var hs = {}; for (var k = 0; k < SLOTS.length; k++) if ((SLOTS[k] in held) || (SLOTS[k] in gpHeld)) hs[SLOTS[k]] = stick.held(SLOTS[k], t);
      return { id: stick.id, x: stick.x, y: stick.y, buttons: { fire: stick.buttons.fire, core: stick.buttons.core, sideLeft: stick.buttons.sideLeft, sideRight: stick.buttons.sideRight }, dirs: { up: stick.dirs.up, down: stick.dirs.down, left: stick.dirs.left, right: stick.dirs.right }, held: hs, t: t };
    };
    stick.bind(opts.layout || {});
    if (opts.chords) stick.chords(opts.chords);
    return stick;
  }
  /** Throw when `layout` shares a code with another attached stick (unless either allows sharing). */
  function check(layout, self) {
    var mine = codesOf(layout);
    for (var i = 0; i < attached.length; i++) {
      var other = attached[i]; if (other === self || other.allowShared || (self && self.allowShared)) continue;
      var theirs = codesOf(other.layout());
      for (var c in mine) if (theirs[c]) throw new Error('DVJoystick: code ' + c + ' is already bound by stick "' + other.id + '" (' + theirs[c] + ') — use allowShared to permit it');
    }
  }
  function claimed() { var out = {}; for (var i = 0; i < attached.length; i++) { var c = codesOf(attached[i].layout()); for (var k in c) out[k] = attached[i].id + '.' + c[k]; } return out; }

  var api = { create: create, axes: axes, fromGamepad: fromGamepad, claimed: claimed, SLOTS: SLOTS, BUTTONS: BUTTONS, DIRS: DIRS, GP_BUTTONS: GP_BUTTONS, version: '0.1.0' };
  global.DVJoystick = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
