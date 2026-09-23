/*! dvengine — DVControls (input/controls.js) · the old-school default layouts (ESDF·A/C·Space · IJKL;, with K the core button of combinations · arrows), persisted + customisable, and the MERGER of every source (keyboard sticks · gamepad · mouse · senses) into one stick model wired to the participant, the field of influence and the net · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 *   DVControls.DEFAULTS · layouts() · set(stick, slot, code) · save(l) · reset() · reload() · validate(l) → duplicates[] · describe(opts) → printable map
 *   DVControls.merge(polls) → { move:{x,y}, sphere:{x,y}, buttons, dirs, mods:{run,strafe}, held, wheel, energy, speaking, lean }
 *   var ctl = DVControls.mount({ participant, field, conn, verse, canvas, senses:true, gamepad:true, mouse:true, chords:map, now })
 *   ctl.sources [{ id, kind, role:'move'|'sphere'|'both', weight, enabled, stick }] · ctl.chords · ctl.state · ctl.tick(dt) · ctl.rebind() · ctl.dispose()
 *   THE NAMESPACE the chord engine sees: up down left right (any stick) · fire (any) · core (right stick K, mouse right button, gamepad 9, a nod, a voice peak)
 *   · sideLeft / sideRight (the right stick's `;`, mouse middle/back, gamepad 4/5, browsUp/smile). The LEFT stick's and the ARROWS' side buttons are
 *   movement modifiers instead: side-left = strafe-lock, side-right = run. Axes are summed by weight then clamped; buttons are OR-ed; edges are
 *   detected on the MERGED state so a chord can span sources (core from the mouse + up from the keyboard).
 *   Emits on document: dv:stick { state } (when it changes) · dv:chord { action, key } · dv:interact · dv:menu
 */
(function (global) {
  'use strict';
  var KEY = 'dv.controls';
  var DEFAULTS = {
    left: { up: 'KeyE', down: 'KeyD', left: 'KeyS', right: 'KeyF', sideLeft: 'KeyA', sideRight: 'KeyC', fire: 'Space', core: null },
    right: { up: 'KeyI', down: 'Comma', left: 'KeyJ', right: 'KeyL', sideLeft: null, sideRight: 'Semicolon', fire: null, core: 'KeyK' },
    arrows: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'ControlRight', sideLeft: 'ShiftRight', sideRight: 'Numpad0', core: null }
  };
  var ROLES = { left: 'move', right: 'sphere', arrows: 'move' };
  var TITLES = { left: 'LEFT STICK — movement', right: 'RIGHT STICK — the field of influence', arrows: 'ARROWS — joystick emulation' };
  var SLOTS = ['up', 'down', 'left', 'right', 'fire', 'sideLeft', 'sideRight', 'core'];
  var MOUSE = [['left button', 'fire'], ['right button', 'core'], ['middle', 'sideLeft'], ['back (3)', 'sideRight'], ['forward (4)', 'sideLeft'], ['wheel', 'raise / lower · +core: prev / next · +side: grow / shrink'], ['position', 'the right stick (dead zone 8 %)'], ['pointer lock', 'velocity → the sphere turns with the mouse'], ['touch', 'one finger = stick · second finger = fire']];
  var SENSES = [['head yaw / pitch', 'right stick x / y (dead zone 4°, full at 30°)'], ['lean in / back', 'left stick y'], ['jawOpen · nod', 'fire tap · core tap'], ['browsUp · smile', 'sideLeft tap · sideRight tap'], ['voice onset · peak', 'fire tap · core tap'], ['speaking ≥ 400 ms', 'fire held · the field grows (relaxes in 10 s)'], ['inflection ↑ / ↓', 'raise / lower'], ['level', 'energy → item glow']];
  var GAMEPAD = [['axes 0 / 1', 'x / y'], ['button 0', 'fire'], ['4 / 5', 'sideLeft / sideRight'], ['9', 'core'], ['12–15', 'up down left right']];
  var SHORT = { Space: 'Space', Comma: ',', Period: '.', Semicolon: ';', Quote: "'", Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ControlRight: 'RCtrl', ControlLeft: 'LCtrl', ShiftRight: 'RShift', ShiftLeft: 'LShift', AltLeft: 'LAlt', AltRight: 'RAlt', Enter: 'Enter', Tab: 'Tab', Backspace: 'Bksp', Escape: 'Esc' };
  function shortName(code) { if (!code) return '·'; if (SHORT[code]) return SHORT[code]; var m = /^(Key|Digit|Numpad)(.+)$/.exec(code); return m ? (m[1] === 'Numpad' ? 'Num' : '') + m[2] : code; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var storage = null, cache = null;
  function store() { if (storage) return storage; try { return global.localStorage || null; } catch (e) { return null; } }
  function layouts() {
    if (cache) return clone(cache);
    var l = clone(DEFAULTS), s = store();
    if (s) { try { var saved = JSON.parse(s.getItem(KEY) || 'null'); if (saved && typeof saved === 'object') for (var st in l) if (saved[st]) for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i] in saved[st]) l[st][SLOTS[i]] = saved[st][SLOTS[i]] || null; } catch (e) {} }
    cache = l; return clone(l);
  }
  function validate(l) {
    var seen = {}, dups = [];
    for (var st in l) for (var i = 0; i < SLOTS.length; i++) { var c = l[st][SLOTS[i]]; if (!c) continue; var at = st + '.' + SLOTS[i]; if (seen[c]) dups.push({ code: c, a: seen[c], b: at }); else seen[c] = at; }
    return dups;
  }
  function save(l) { var d = validate(l); if (d.length) throw new Error('DVControls: duplicate code ' + d[0].code + ' (' + d[0].a + ' and ' + d[0].b + ')'); cache = clone(l); var s = store(); if (s) { try { s.setItem(KEY, JSON.stringify(l)); } catch (e) {} } return clone(l); }
  function set(stick, slot, code) { var l = layouts(); if (!l[stick]) throw new Error('DVControls: unknown stick ' + stick); if (SLOTS.indexOf(slot) < 0) throw new Error('DVControls: unknown slot ' + slot); for (var st in l) for (var i = 0; i < SLOTS.length; i++) if (code && l[st][SLOTS[i]] === code) l[st][SLOTS[i]] = null; l[stick][slot] = code || null; return save(l); }
  function reset() { cache = null; var s = store(); if (s) { try { s.removeItem(KEY); } catch (e) {} } return layouts(); }
  function reload() { cache = null; return layouts(); }

  /** The printable map: three sticks side by side, then the chord table, the mouse, the senses, the gamepad. */
  function describe(opts) {
    opts = opts || {}; var l = opts.layouts || layouts(), out = [], sticks = ['left', 'right', 'arrows'];
    function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
    function col(st) { var k = l[st], n = function (s) { return '[' + shortName(k[s]) + ']'; }; return [TITLES[st], '        ' + n('up'), '  ' + n('left') + ' ◄ ' + (k.core ? '(' + shortName(k.core) + ')' : ' ● ') + ' ► ' + n('right'), '        ' + n('down'), 'fire ' + n('fire') + '  side ' + n('sideLeft') + ' ' + n('sideRight'), k.core ? 'core ' + n('core') + ' — combinations only' : (ROLES[st] === 'move' ? 'side-left = strafe · side-right = run' : '')]; }
    var cols = sticks.map(col), w = 40;
    for (var r = 0; r < 6; r++) out.push(cols.map(function (c) { return pad(c[r] || '', w); }).join('').replace(/\s+$/, ''));
    var chords = opts.chords || (global.DVChords && global.DVChords.DEFAULT) || {};
    out.push('', 'CHORDS (the core acts only through these)');
    for (var key in chords) out.push('  ' + pad(key, 22) + chords[key]);
    if (opts.mouse !== false) { out.push('', 'MOUSE AS A JOYSTICK (https://threejs.org/examples/#misc_controls_arcball — the pointer extends onto the ball)'); MOUSE.forEach(function (m) { out.push('  ' + pad(m[0], 22) + m[1]); }); }
    if (opts.senses !== false) { out.push('', 'MIC + CAMERA AS JOYSTICKS (after "enable senses")'); SENSES.forEach(function (m) { out.push('  ' + pad(m[0], 22) + m[1]); }); }
    if (opts.gamepad !== false) { out.push('', 'GAMEPAD'); GAMEPAD.forEach(function (m) { out.push('  ' + pad(m[0], 22) + m[1]); }); }
    out.push('', '? / F1 toggles this map · click a slot, press a key to rebind · saved in localStorage[' + KEY + '] · DVControls.reset() restores');
    return out.join('\n');
  }

  var NAMES = ['up', 'down', 'left', 'right', 'fire', 'core', 'sideLeft', 'sideRight'];
  /** Merge the polled sources. polls: [{ role, weight, enabled, kind, p }]. */
  function merge(polls) {
    var m = { move: { x: 0, y: 0 }, sphere: { x: 0, y: 0 }, buttons: { fire: false, core: false, sideLeft: false, sideRight: false }, dirs: { up: false, down: false, left: false, right: false }, mods: { run: false, strafe: false }, held: {}, wheel: { raise: 0, lower: 0, next: 0, prev: 0, grow: 0, shrink: 0 }, energy: 0, speaking: false, lean: 0, sources: {} };
    for (var i = 0; i < polls.length; i++) {
      var s = polls[i], p = s.p; if (!p || s.enabled === false) continue;
      var w = s.weight == null ? 1 : +s.weight, role = s.role || 'move';
      m.sources[s.id || i] = p;
      if (s.kind === 'senses') { m.sphere.x += w * (p.right ? p.right.x : 0); m.sphere.y += w * (p.right ? p.right.y : 0); m.move.y += w * (p.left ? p.left.y : 0); m.energy = Math.max(m.energy, +p.energy || 0); m.speaking = m.speaking || !!p.speaking; m.lean = p.lean || m.lean; if (p.sphere) { m.wheel.raise += p.sphere.raise || 0; m.wheel.lower += p.sphere.lower || 0; } }
      else if (role === 'sphere') { m.sphere.x += w * (+p.x || 0); m.sphere.y += w * (+p.y || 0); }
      else if (role === 'both') { m.move.x += w * (+p.x || 0); m.move.y += w * (+p.y || 0); }
      else { m.move.x += w * (+p.x || 0); m.move.y += w * (+p.y || 0); }
      if (p.wheel) for (var k in m.wheel) m.wheel[k] += p.wheel[k] || 0;
      var b = p.buttons || {};
      if (b.fire) m.buttons.fire = true; if (b.core) m.buttons.core = true;
      if (role === 'move' && s.kind !== 'senses') { if (b.sideLeft) m.mods.strafe = true; if (b.sideRight) m.mods.run = true; }
      else { if (b.sideLeft) m.buttons.sideLeft = true; if (b.sideRight) m.buttons.sideRight = true; }
      var d = p.dirs || {}; for (var n in m.dirs) if (d[n]) m.dirs[n] = true;
      var h = p.held || {}; for (var hn in h) if (NAMES.indexOf(hn) >= 0) m.held[hn] = Math.max(m.held[hn] || 0, h[hn]);
    }
    m.move.x = clamp(m.move.x, -1, 1); m.move.y = clamp(m.move.y, -1, 1); m.sphere.x = clamp(m.sphere.x, -1, 1); m.sphere.y = clamp(m.sphere.y, -1, 1);
    return m;
  }
  function pressedSet(m) { var o = {}; for (var n in m.buttons) if (m.buttons[n]) o[n] = 1; for (var d in m.dirs) if (m.dirs[d]) o[d] = 1; return o; }
  function sig(m) { return [m.move.x.toFixed(2), m.move.y.toFixed(2), m.sphere.x.toFixed(2), m.sphere.y.toFixed(2), Object.keys(pressedSet(m)).join(','), m.mods.run ? 'r' : '', m.mods.strafe ? 's' : '', m.energy.toFixed(2)].join('|'); }

  function mount(o) {
    o = o || {};
    var J = global.DVJoystick, C = global.DVChords, now = o.now || function () { return Date.now(); };
    if (!J || !C) throw new Error('DVControls.mount: DVJoystick + DVChords required');
    var doc = global.document, field = o.field || o.sphere || null, verse = o.verse || null, participant = o.participant || (verse && verse.participant) || null, conn = o.conn || (verse && verse.conn) || null;
    var ctl = { sources: [], chords: C.create(o.chords || null, { now: now }), state: null, field: field, participant: participant, rates: o.rates || { yaw: 1.8, pitch: 1.4 }, grow: o.growRate || 0.9, growing: false, spoke: 0, lastSig: '', lastFieldT: 0 };
    var prev = {};
    function add(id, kind, role, stick, weight) { var s = { id: id, kind: kind, role: role, stick: stick, weight: weight == null ? 1 : weight, enabled: true }; ctl.sources.push(s); return s; }
    var l = layouts();
    for (var st in l) add(st, 'keys', ROLES[st], J.create({ id: st, layout: l[st], now: now }).attach(o.target || global));
    if (o.gamepad !== false) add('gamepad', 'gamepad', 'both', J.create({ id: 'gamepad', gamepad: o.gamepad == null || o.gamepad === true ? 0 : o.gamepad, now: now, getGamepads: o.getGamepads }));
    if (o.mouse !== false && global.DVMouseStick && o.canvas) add('mouse', 'mouse', 'sphere', global.DVMouseStick.create({ now: now }).attach(o.canvas));
    if (o.senses !== false && global.DVSenseStick) { var ss = add('senses', 'senses', 'both', global.DVSenseStick.create({ director: verse && verse.senses && verse.senses.director, now: now, read: o.readSenses })); ss.enabled = o.senses === true; if (verse && verse.on) verse.on('senses', function (e) { ss.enabled = !!(e && (e.audio || e.video)); }); }
    ctl.source = function (id) { for (var i = 0; i < ctl.sources.length; i++) if (ctl.sources[i].id === id) return ctl.sources[i]; return null; };
    ctl.rebind = function () { var l2 = layouts(); for (var i = 0; i < ctl.sources.length; i++) if (ctl.sources[i].kind === 'keys') ctl.sources[i].stick.bind(l2[ctl.sources[i].id]); return ctl; };
    if (participant && participant.setKeyboard) participant.setKeyboard(false);
    function dispatch(name, detail) { if (doc && doc.dispatchEvent && global.CustomEvent) { try { doc.dispatchEvent(new global.CustomEvent(name, { detail: detail })); } catch (e) {} } }
    function nearestAgent() { if (!verse || !participant || !participant.root) return null; var best = null, bd = Infinity, lp = participant.root.position; for (var id in verse.agents) { var a = verse.agents[id]; if (!a || !a.root) continue; var d = a.root.position.distanceTo(lp); if (d < bd) { bd = d; best = a; } } return bd < (field ? Math.max(8, field.radius) : 8) ? best : null; }
    function act(ev) {
      var a = ev.action, F = field; dispatch('dv:chord', ev);
      if (a === 'sphere.raise' && F) F.raise(); else if (a === 'sphere.lower' && F) F.lower(); else if (a === 'sphere.next' && F) F.select('next'); else if (a === 'sphere.prev' && F) F.select('prev');
      else if (a === 'item.use' && F) F.use();
      else if (a === 'field.grow') ctl.growing = true; else if (a === 'field.shrink' && F) F.shrink(F.step); else if (a === 'field.mode' && F && F.cycleMode) F.cycleMode();
      else if (a === 'focus.toggle' && verse) { if (verse.focused) verse.focus(null); else { var ag = nearestAgent(); if (ag) verse.focus(ag.id); } }
      else if (a === 'menu') dispatch('dv:menu', { t: ev.t });
      else if (a === 'interact') { if (participant && participant.jump) participant.jump(); dispatch('dv:interact', { t: ev.t }); }
      else if (a === 'reach') { var ag2 = nearestAgent(); if (ag2 && participant && participant.root) ag2.reachToward(participant.root.position); if (conn) conn.event('reach', { zone: (verse && verse.zone) || 'agora', level: 1 }); if (participant && participant.setArm && F) participant.setArm(F.armTarget(), true); }
      else if (a.indexOf('gesture.') === 0) { var g = a.slice(8), ag3 = nearestAgent(); if (ag3) ag3.gesture(g); if (participant && participant.gesture) participant.gesture(g); if (conn) conn.event('gesture', { name: g, value: 1 }); }
    }
    ctl.chords.on('chord', act);
    ctl.tick = function (dt) {
      var t = now(), polls = [];
      for (var i = 0; i < ctl.sources.length; i++) { var s = ctl.sources[i]; polls.push({ id: s.id, kind: s.kind, role: s.role, weight: s.weight, enabled: s.enabled, p: s.enabled ? s.stick.poll(t) : null }); }
      var m = merge(polls); ctl.state = m;
      var cur = pressedSet(m);
      for (var n in prev) if (!cur[n]) ctl.chords.release(n, t);
      for (var c in cur) if (!prev[c]) ctl.chords.press(c, t);
      prev = cur; ctl.chords.tick(t);
      if (participant && participant.drive) participant.drive({ x: m.move.x, y: m.move.y, run: m.mods.run, strafe: m.mods.strafe });
      var F = field;
      if (F) {
        F.grab = m.buttons.core;
        if (m.sphere.x || m.sphere.y) F.stick(m.sphere.x, m.sphere.y, dt);
        var w = m.wheel, k;
        for (k = 0; k < w.raise; k++) F.raise(); for (k = 0; k < w.lower; k++) F.lower(); for (k = 0; k < w.next; k++) F.select('next'); for (k = 0; k < w.prev; k++) F.select('prev');
        if (w.grow) F.grow(F.step * w.grow); if (w.shrink) F.shrink(F.step * w.shrink);
        if (ctl.growing) { if (m.buttons.sideRight) F.grow(ctl.grow * dt); else ctl.growing = false; }
        if (m.speaking) { var g = ctl.grow * 0.35 * dt; F.grow(g); ctl.spoke += g; } else if (ctl.spoke > 0) { var back = Math.min(ctl.spoke, ctl.spoke * dt / 10 + 1e-4); F.shrink(back); ctl.spoke -= back; if (ctl.spoke < 1e-3) ctl.spoke = 0; }
        if (m.lean) F.grow(m.lean * ctl.grow * 0.5 * dt);
        if (F.energy) F.energy(m.energy);
        if (participant && participant.setArm && !verse) participant.setArm(F.armTarget());
      }
      var sg = sig(m); if (sg !== ctl.lastSig) { ctl.lastSig = sg; dispatch('dv:stick', m); }
      return m;
    };
    ctl.describe = function (opts) { return describe(Object.assign({ chords: ctl.chords.map() }, opts || {})); };
    ctl.dispose = function () { for (var i = 0; i < ctl.sources.length; i++) { var s = ctl.sources[i].stick; if (s.detach) s.detach(); } ctl.sources = []; if (participant && participant.setKeyboard) participant.setKeyboard(true); };
    return ctl;
  }

  var api = { DEFAULTS: DEFAULTS, ROLES: ROLES, SLOTS: SLOTS, KEY: KEY, MOUSE: MOUSE, SENSES: SENSES, GAMEPAD: GAMEPAD, layouts: layouts, set: set, save: save, reset: reset, reload: reload, validate: validate, describe: describe, shortName: shortName, merge: merge, mount: mount, version: '0.1.0',
    get storage() { return storage; }, set storage(s) { storage = s; cache = null; } };
  global.DVControls = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
