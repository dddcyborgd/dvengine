/*! dvengine — DVMouseStick (input/mouse.js) · the modern mouse as a joystick: pointer position → the stick (dead zone, radial clamp), pointer-lock deltas → velocity (the ArcballControls "extension of the mouse"), buttons, wheel, one/two-finger touch · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · after three.js ArcballControls (MIT) where derived */
/*
 *   var m = DVMouseStick.create({ mode:'position'|'velocity', deadZone:0.08, sensitivity:1, now })
 *   m.attach(canvas) · m.detach() · m.enabled · m.sensitivity · m.mode · m.locked (pointer lock → velocity whatever the mode)
 *   m.poll(t) → { x, y, buttons:{fire,core,sideLeft,sideRight}, held:{name:ms}, wheel:{raise,lower,next,prev,grow,shrink}, locked, over, touch }
 *     position mode: the pointer relative to the canvas centre, in units of the half-min-dimension, dead zone 8 %, radial clamp to 1
 *     velocity mode: the pointer DELTAS since the last poll (÷ 200 px · sensitivity), clamped — the locked pointer rotates the sphere
 *     buttons: left = fire · right = core · middle = sideLeft · back (3) = sideRight · forward (4) = sideLeft
 *     wheel: up = raise · down = lower; with core held = prev/next; with a side button held = grow/shrink (counts, consumed by poll)
 *     touch: one finger = the stick (relative to where it landed, radius 0.3 · min-dimension) · a second finger = fire
 *   m.on('axis'|'button'|'wheel', fn) → off
 * Pure: DVMouseStick.axesFromPosition(px, py, w, h, deadZone) · axesFromDelta(dx, dy, sensitivity) · wheelDir(deltaY) · BUTTONS
 */
(function (global) {
  'use strict';
  var BUTTONS = { 0: 'fire', 1: 'sideLeft', 2: 'core', 3: 'sideRight', 4: 'sideLeft' };
  var WHEEL = ['raise', 'lower', 'next', 'prev', 'grow', 'shrink'];
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function axesFromPosition(px, py, w, h, deadZone) {
    var half = Math.min(w || 1, h || 1) / 2 || 1, dz = deadZone == null ? 0.08 : +deadZone;
    var x = ((+px || 0) - (w || 0) / 2) / half, y = -((+py || 0) - (h || 0) / 2) / half, len = Math.sqrt(x * x + y * y);
    if (len <= dz) return { x: 0, y: 0, len: 0 };
    var k = Math.min(1, (len - dz) / (1 - dz)) / len;
    return { x: x * k, y: y * k, len: Math.min(1, len) };
  }
  function axesFromDelta(dx, dy, sensitivity, px) { var s = (sensitivity == null ? 1 : +sensitivity) / (px || 200); return { x: clamp((+dx || 0) * s, -1, 1) || 0, y: clamp(-(+dy || 0) * s, -1, 1) || 0 }; }
  function wheelDir(deltaY) { return (+deltaY || 0) < 0 ? 'raise' : 'lower'; }

  function create(opts) {
    opts = opts || {};
    var now = opts.now || function () { return Date.now(); };
    var el = null, doc = null, held = {}, listeners = {}, acc = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, wheel = {}, touch = null, last = { x: 0, y: 0 };
    var m = { mode: opts.mode || 'position', deadZone: opts.deadZone == null ? 0.08 : +opts.deadZone, sensitivity: opts.sensitivity == null ? 1 : +opts.sensitivity, enabled: true, locked: false, over: false, x: 0, y: 0, buttons: { fire: false, core: false, sideLeft: false, sideRight: false } };
    for (var i = 0; i < WHEEL.length; i++) wheel[WHEEL[i]] = 0;
    function emit(ev, d) { var l = listeners[ev]; if (l) for (var i = 0; i < l.length; i++) { try { l[i](d); } catch (e) {} } }
    m.on = function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return function () { var l = listeners[ev]; var i = l ? l.indexOf(fn) : -1; if (i >= 0) l.splice(i, 1); }; };
    function size() { var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; return r ? { w: r.width, h: r.height, left: r.left, top: r.top } : { w: el && el.width || 1, h: el && el.height || 1, left: 0, top: 0 }; }
    function press(name, t) { if (name in held) return; held[name] = { t0: t }; m.buttons[name] = true; emit('button', { name: name, down: true, t: t, via: 'mouse' }); }
    function release(name, t) { if (!(name in held)) return; delete held[name]; m.buttons[name] = false; emit('button', { name: name, down: false, t: t, via: 'mouse' }); }
    function releaseAll() { var t = now(); for (var n in held) release(n, t); touch = null; pos.x = pos.y = 0; }
    function onDown(e) {
      if (!m.enabled) return;
      if (e.pointerType === 'touch') { var s = size(); if (!touch) { touch = { id: e.pointerId, ox: e.clientX - s.left, oy: e.clientY - s.top, r: 0.3 * Math.min(s.w, s.h) }; } else if (e.pointerId !== touch.id) { press('fire', now()); touch.second = e.pointerId; } return; }
      var n = BUTTONS[e.button]; if (n) { press(n, now()); if (e.button === 2 || e.button === 3 || e.button === 4) e.preventDefault(); }
    }
    function onUp(e) {
      if (e.pointerType === 'touch') { if (touch && e.pointerId === touch.id) { touch = null; pos.x = pos.y = 0; } else if (touch && e.pointerId === touch.second) { release('fire', now()); touch.second = null; } return; }
      var n = BUTTONS[e.button]; if (n) release(n, now());
    }
    function onMove(e) {
      if (!m.enabled) return;
      var s = size();
      if (e.pointerType === 'touch') { if (touch && e.pointerId === touch.id) { var dx = (e.clientX - s.left - touch.ox) / touch.r, dy = -(e.clientY - s.top - touch.oy) / touch.r, len = Math.sqrt(dx * dx + dy * dy); if (len > 1) { dx /= len; dy /= len; } pos.x = dx; pos.y = dy; touch.live = true; } return; }
      if (m.locked || m.mode === 'velocity') { acc.x += e.movementX || 0; acc.y += e.movementY || 0; }
      var a = axesFromPosition(e.clientX - s.left, e.clientY - s.top, s.w, s.h, m.deadZone); pos.x = a.x; pos.y = a.y;
    }
    function onEnter() { m.over = true; } function onLeave() { m.over = false; if (!m.locked) { pos.x = pos.y = 0; } }
    function onWheel(e) { if (!m.enabled) return; var dir = wheelDir(e.deltaY), side = ('sideLeft' in held) || ('sideRight' in held), core = 'core' in held; var k = side ? (dir === 'raise' ? 'grow' : 'shrink') : core ? (dir === 'raise' ? 'prev' : 'next') : dir; wheel[k]++; emit('wheel', { dir: k, core: core, side: side, t: now() }); if (e.preventDefault && (core || side)) e.preventDefault(); }
    function onCtx(e) { if (m.enabled && e.preventDefault) e.preventDefault(); }
    function onLock() { m.locked = !!(doc && doc.pointerLockElement && doc.pointerLockElement === el); if (!m.locked) { acc.x = acc.y = 0; } }
    m.attach = function (canvas) {
      if (el) m.detach(); el = canvas; doc = (canvas && canvas.ownerDocument) || global.document || null;
      el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerenter', onEnter); el.addEventListener('pointerleave', onLeave);
      el.addEventListener('wheel', onWheel, { passive: false }); el.addEventListener('contextmenu', onCtx);
      global.addEventListener('pointerup', onUp); global.addEventListener('pointercancel', onUp); global.addEventListener('blur', releaseAll);
      if (doc && doc.addEventListener) doc.addEventListener('pointerlockchange', onLock);
      return m;
    };
    m.detach = function () {
      if (!el) return m;
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerenter', onEnter); el.removeEventListener('pointerleave', onLeave); el.removeEventListener('wheel', onWheel); el.removeEventListener('contextmenu', onCtx);
      global.removeEventListener('pointerup', onUp); global.removeEventListener('pointercancel', onUp); global.removeEventListener('blur', releaseAll);
      if (doc && doc.removeEventListener) doc.removeEventListener('pointerlockchange', onLock);
      releaseAll(); el = null; return m;
    };
    m.lock = function () { if (el && el.requestPointerLock) { try { el.requestPointerLock(); } catch (e) {} } return m; };
    m.unlock = function () { if (doc && doc.exitPointerLock) { try { doc.exitPointerLock(); } catch (e) {} } return m; };
    m.held = function (name, t) { return held[name] ? Math.max(0, (t == null ? now() : t) - held[name].t0) : 0; };
    /** Test / programmatic surface: feed a pointer position, a delta, a button or a wheel tick without DOM events. */
    m.feed = function (d) {
      if (!d) return m; var t = d.t == null ? now() : d.t;
      if (d.position) { var a = axesFromPosition(d.position.x, d.position.y, d.position.w, d.position.h, m.deadZone); pos.x = a.x; pos.y = a.y; }
      if (d.locked != null) { m.locked = !!d.locked; if (!m.locked) acc.x = acc.y = 0; }
      if (d.delta && (m.locked || m.mode === 'velocity')) { acc.x += +d.delta.x || 0; acc.y += +d.delta.y || 0; }
      if (d.press) press(d.press, t); if (d.release) release(d.release, t);
      if (d.wheel != null) onWheel({ deltaY: d.wheel });
      return m;
    };
    m.poll = function (t) {
      t = t == null ? now() : t;
      var a;
      if (m.locked || m.mode === 'velocity') { a = axesFromDelta(acc.x, acc.y, m.sensitivity); acc.x = acc.y = 0; }
      else a = { x: pos.x * m.sensitivity, y: pos.y * m.sensitivity };
      a.x = clamp(a.x, -1, 1); a.y = clamp(a.y, -1, 1);
      if (!m.enabled) a = { x: 0, y: 0 };
      m.x = a.x; m.y = a.y;
      if (a.x !== last.x || a.y !== last.y) { last = a; emit('axis', { x: a.x, y: a.y, t: t, via: 'mouse' }); }
      var hs = {}; for (var n in held) hs[n] = Math.max(0, t - held[n].t0);
      var w = {}; for (var i = 0; i < WHEEL.length; i++) { w[WHEEL[i]] = wheel[WHEEL[i]]; wheel[WHEEL[i]] = 0; }
      return { id: 'mouse', x: a.x, y: a.y, buttons: { fire: 'fire' in held, core: 'core' in held, sideLeft: 'sideLeft' in held, sideRight: 'sideRight' in held }, held: hs, wheel: w, locked: m.locked, over: m.over, touch: !!touch, t: t };
    };
    return m;
  }
  var api = { create: create, axesFromPosition: axesFromPosition, axesFromDelta: axesFromDelta, wheelDir: wheelDir, BUTTONS: BUTTONS, WHEEL: WHEEL, version: '0.1.0' };
  global.DVMouseStick = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
