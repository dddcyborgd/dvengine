/*! dvengine — DVField (verse/field.js) · THE FIELD OF INFLUENCE (née the sphere of influence): a resizable arcball around a subject — items of influence on its surface, the arm follows the selected item, the mouse / the right stick / an XR controller turn it; max radius = the space extent − 1 ("a thing has to be separate from infinity to recognise it (infinity − 1), and the DeltaVerse recognised itself"); the DeltaVerse always recognises it (degree = r/max × outflow), the OVERLORD hierarchy's two dials (outflow · inflow), private / connected / open · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · after three.js ArcballControls (MIT) where derived */
/*
 *   var f = DVField.create({ subject, radius:1.2, THREE, space, doc|extent, min:0.35, height:1.3, guide:true, tint, rates:{yaw,pitch}, step:0.25,
 *                            rank:'participant', policy:{outflow,inflow}, claim, mode, sessionId, storage, now })
 *   size        f.radius · f.min · f.max (= extent − 1) · f.grow(dr) · f.shrink(dr) · f.setRadius(r) · f.setBounds(doc | { extent }) · f.contains(worldPos)
 *   recognition f.degree() = clamp(r/max) × policy.outflow · f.atBound() (r ≥ max − 0.5) · f.recognized · events recognized / unrecognized (+ document dv:recognized / dv:unrecognized)
 *   the dials   f.policy { outflow, inflow } (welcome.policy from the anchor, else the rung's default ladder) · f.setPolicy(p) · f.setRank(rank)
 *   privacy     f.mode 'open' | 'connected' | 'private' (private needs a signed claim: without one it stays open) · f.setMode(m) · f.cycleMode() · f.links (Set of sessionIds)
 *               f.connect(sid) · f.disconnect(sid) · f.visibleTo(viewerSid, viewerInflow) · f.snapshot() → { r, max, at, mode, links, degree } (→ conn.event('field'))
 *   items       f.attach(obj|comp, { slot:{theta,phi}, name }) · f.detach(name) · f.select(name|'next'|'prev'|i) · f.selected() · f.names() · f.use() · f.raise() · f.lower()
 *               f.point() (the selected item's unit point, subject frame) · f.worldPoint(out) · f.armTarget() → { extend: r/max, yaw, pitch } (→ aivatar.setArm / participant.setArm)
 *   drivers     f.rotate(yaw, pitch) · f.drag(p0, p1) · f.stick(x, y, dt) · f.mouse(canvas, { button:2, tbRadius:0.67 }) → off (right-drag, or any drag while f.grab) · f.xr(controllers) → off
 *   f.energy(e) (the senses' voice level → item glow) · f.sweep([{id, position}]) → { enter, leave } · f.update(dt) · f.on(ev, fn) → off · f.dispose()
 *   events  radius · recognized · unrecognized · select · use · item{name,action} · mode · links · field (the throttled 2 Hz snapshot for the anchor)
 *   Headless without THREE: the same state machine, no meshes (node --test).
 */
(function (global) {
  'use strict';
  var M = global.DVFieldMath;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function objOf(x) { return x && (x.isObject3D ? x : (x.root || x.object || null)); }
  function create(opts) {
    opts = opts || {}; M = M || global.DVFieldMath; if (!M) throw new Error('DVField: verse/field.math.js first');
    var THREE = opts.THREE || global.THREE || null, now = opts.now || function () { return Date.now(); }, doc = global.document;
    var listeners = {}, group = null, guide = null, items = [], sel = -1, wasAt = false, lastDeg = -1, lastRecT = 0, lastFieldT = 0, lastSnap = '', energy = 0, pulse = 0, inside = {};
    var f = { subject: null, radius: 0, min: opts.min == null ? M.MIN : +opts.min, max: 0, extent: 0, step: opts.step || M.RSTEP, height: opts.height == null ? 1.3 : +opts.height, q: M.qIdentity(), rates: opts.rates || { yaw: 1.8, pitch: 1.4 }, rank: opts.rank || 'participant', policy: null, mode: 'open', links: new Set(), signed: M.canPrivate(opts.claim), sessionId: opts.sessionId || null, recognized: false, grab: false, group: null, guide: null, tint: opts.tint || '#9fe9ff' };
    function emit(ev, d) { var l = listeners[ev]; if (l) for (var i = 0; i < l.length; i++) { try { l[i](d); } catch (e) {} } }
    function dispatch(name, d) { if (doc && doc.dispatchEvent && global.CustomEvent) { try { doc.dispatchEvent(new global.CustomEvent(name, { detail: d })); } catch (e) {} } }
    f.on = function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return function () { var l = listeners[ev]; var i = l ? l.indexOf(fn) : -1; if (i >= 0) l.splice(i, 1); }; };
    function store() { if (opts.storage) return opts.storage; try { return global.localStorage || null; } catch (e) { return null; } }

    // ---- three (optional) -------------------------------------------------------
    function buildGuide() {
      var pts = [], N = 12, S = 6, i, j, a, b;
      for (i = 0; i < N; i++) { a = (i / N) * Math.PI * 2; for (j = 0; j < 24; j++) { var p0 = (j / 24) * Math.PI * 2, p1 = ((j + 1) / 24) * Math.PI * 2; pts.push(Math.sin(a) * Math.cos(p0), Math.sin(p0), Math.cos(a) * Math.cos(p0), Math.sin(a) * Math.cos(p1), Math.sin(p1), Math.cos(a) * Math.cos(p1)); } }
      for (i = 1; i < S; i++) { b = -Math.PI / 2 + (i / S) * Math.PI; var r = Math.cos(b), y = Math.sin(b); for (j = 0; j < 48; j++) { var t0 = (j / 48) * Math.PI * 2, t1 = ((j + 1) / 48) * Math.PI * 2; pts.push(Math.sin(t0) * r, y, Math.cos(t0) * r, Math.sin(t1) * r, y, Math.cos(t1) * r); } }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      var m = new THREE.LineBasicMaterial({ color: new THREE.Color(f.tint), transparent: true, opacity: 0.12, depthWrite: false });
      var l = new THREE.LineSegments(g, m); l.name = 'field-guide'; l.userData.dvField = true; return l;
    }
    if (THREE) { group = new THREE.Group(); group.name = 'field'; group.position.y = f.height; f.group = group; if (opts.guide !== false) { guide = buildGuide(); group.add(guide); f.guide = guide; } }
    function layout() { for (var i = 0; i < items.length; i++) { var it = items[i], p = M.slotPoint(it.slot); if (it.obj && it.obj.position) { it.obj.position.set(p.x * f.radius, p.y * f.radius, p.z * f.radius); if (it.obj.lookAt) { it.obj.lookAt(p.x * (f.radius + 1), f.height + p.y * (f.radius + 1), p.z * (f.radius + 1)); } } } if (guide) guide.scale.setScalar(f.radius); }

    // ---- subject + bounds ---------------------------------------------------------
    f.setSubject = function (obj) { obj = objOf(obj) || obj; if (group && group.parent) group.parent.remove(group); f.subject = obj || null; if (group && obj && obj.add) { obj.add(group); group.position.y = f.height * (obj.scale && obj.scale.y ? 1 : 1); } return f; };
    f.setBounds = function (b) { var ext = b && b.extent != null ? +b.extent : M.extentOf(b, opts.skyRadius); f.extent = ext; f.max = M.maxOf(ext, f.min); f.setRadius(f.radius); return f; };
    f.setRadius = function (r) { var nr = M.clampRadius(r, f.min, f.max); if (nr !== f.radius) { f.radius = nr; layout(); emit('radius', { radius: nr, max: f.max, min: f.min }); } return f.radius; };
    f.grow = function (dr) { return f.setRadius(f.radius + (dr == null ? f.step : +dr)); };
    f.shrink = function (dr) { return f.setRadius(f.radius - (dr == null ? f.step : +dr)); };
    f.contains = function (p) { var c = f.center(); return M.contains(c, f.radius, p); };
    f.center = function () { var s = f.subject; if (s && s.getWorldPosition && THREE) { var v = s.getWorldPosition(new THREE.Vector3()); return { x: v.x, y: v.y + f.height, z: v.z }; } var q = (s && s.position) || { x: 0, y: 0, z: 0 }; return { x: +q.x || 0, y: (+q.y || 0) + f.height, z: +q.z || 0 }; };

    // ---- recognition + the dials ----------------------------------------------------
    f.setPolicy = function (p) { f.policy = p && p.outflow != null ? { outflow: clamp(+p.outflow, 0, 1), inflow: clamp(p.inflow == null ? 1 : +p.inflow, 0, 1) } : M.policyFor(f.rank, opts.policyTable); return f; };
    f.setRank = function (rank) { f.rank = rank || 'participant'; if (!opts.policy) f.setPolicy(null); if (!f._modeChosen) f.mode = M.defaultModeFor(f.rank, opts.policyTable); if (f.mode === 'private' && !f.signed) f.mode = 'open'; return f; };
    f.degree = function () { return M.degree(f.radius, f.max, f.policy ? f.policy.outflow : 1); };
    f.atBound = function () { return M.atBound(f.radius, f.max); };
    f.snapshot = function () { return { r: +f.radius.toFixed(3), max: +f.max.toFixed(3), at: f.atBound() ? 'bound' : null, mode: f.mode, links: Array.from(f.links), degree: +f.degree().toFixed(3) }; };
    function recognise(t, force) {
      var at = f.atBound(), deg = f.degree(), e = M.edge(wasAt, at), d = { subject: f.subject, radius: f.radius, max: f.max, degree: deg, atBound: at, policy: f.policy, t: t };
      if (e === 'enter') { f.recognized = true; emit('recognized', d); dispatch('dv:recognized', d); lastDeg = deg; lastRecT = t; }
      else if (e === 'leave') { f.recognized = false; emit('unrecognized', d); dispatch('dv:unrecognized', d); lastDeg = deg; lastRecT = t; }
      else if (force || (!at /* at the bound the degree is pinned at outflow: the bound report already said it */ && Math.abs(deg - lastDeg) >= 0.02 && t - lastRecT >= 250)) { emit('recognized', d); dispatch('dv:recognized', d); lastDeg = deg; lastRecT = t; }
      wasAt = at;
      var snap = f.snapshot(), sg = JSON.stringify(snap);
      if (sg !== lastSnap && (force || t - lastFieldT >= 500)) { lastSnap = sg; lastFieldT = t; emit('field', snap); }
    }
    f.recognise = recognise;

    // ---- privacy + links ---------------------------------------------------------------
    f.canPrivate = function () { return f.signed; };
    f.setMode = function (m) { if (M.MODES.indexOf(m) < 0) return f.mode; if (m === 'private' && !f.signed) m = 'open'; f._modeChosen = true; if (m !== f.mode) { f.mode = m; var s = store(); if (s) { try { s.setItem('dv.field.mode', m); } catch (e) {} } emit('mode', { mode: m }); } return f.mode; };
    f.cycleMode = function () { var i = M.MODES.indexOf(f.mode), next = M.MODES[(i + 1) % M.MODES.length]; if (next === 'private' && !f.signed) next = 'open'; return f.setMode(next); };
    f.connect = function (sid) { if (sid && !f.links.has(sid)) { f.links.add(sid); emit('links', { links: Array.from(f.links), added: sid }); } return f; };
    f.disconnect = function (sid) { if (f.links.delete(sid)) emit('links', { links: Array.from(f.links), removed: sid }); return f; };
    f.linked = function (sid) { return f.links.has(sid); };
    f.visibleTo = function (viewerSid, viewerInflow) { return M.visibleTo({ mode: f.mode, links: f.links }, f.sessionId, viewerSid, viewerInflow); };

    // ---- items -----------------------------------------------------------------------------
    f.attach = function (item, o) { o = o || {}; var obj = objOf(item), name = o.name || (item && (item.name || item.id)) || ('item-' + (items.length + 1)); var slot = o.slot || M.ringSlots(items.length + 1, 0.15, 0.6)[items.length]; if (obj && group) { if (obj.parent) obj.parent.remove(obj); group.add(obj); } items.push({ name: name, item: item, obj: obj, slot: { theta: +slot.theta || 0, phi: +slot.phi || 0 } }); if (sel < 0) sel = 0; layout(); return f; };
    f.detach = function (name) { for (var i = 0; i < items.length; i++) if (items[i].name === name) { if (items[i].obj && group) group.remove(items[i].obj); items.splice(i, 1); if (sel >= items.length) sel = items.length - 1; layout(); return true; } return false; };
    f.names = function () { return items.map(function (i) { return i.name; }); };
    f.selected = function () { return sel >= 0 ? items[sel] : null; };
    f.select = function (which) {
      if (!items.length) return null; var i = sel;
      if (which === 'next') i = M.wrap(sel + 1, items.length); else if (which === 'prev') i = M.wrap(sel - 1, items.length); else if (typeof which === 'number') i = M.wrap(which, items.length); else { for (var k = 0; k < items.length; k++) if (items[k].name === which) i = k; }
      if (i !== sel) { sel = i; var d = { name: items[sel].name, index: sel, item: items[sel].item }; emit('select', d); emit('item', { name: d.name, action: 'select' }); }
      return items[sel];
    };
    f.use = function () { var it = f.selected(); if (!it) return null; pulse = 1; if (it.item && typeof it.item.use === 'function') { try { it.item.use(); } catch (e) {} } var d = { name: it.name, action: 'use', item: it.item }; emit('use', d); emit('item', d); dispatch('dv:item', d); return it; };
    f.raise = function () { var it = f.selected(); if (!it) return null; it.slot = M.raise(it.slot); layout(); var d = { name: it.name, action: 'raise', slot: it.slot }; emit('item', d); dispatch('dv:item', d); return it; };
    f.lower = function () { var it = f.selected(); if (!it) return null; it.slot = M.lower(it.slot); layout(); var d = { name: it.name, action: 'lower', slot: it.slot }; emit('item', d); dispatch('dv:item', d); return it; };
    f.point = function () { var it = f.selected(); return M.qRotate(f.q, M.slotPoint(it ? it.slot : { theta: 0, phi: 0 })); };
    f.worldPoint = function (out) { var p = f.point(), c = f.center(); if (out && out.set) return out.set(c.x + p.x * f.radius, c.y + p.y * f.radius, c.z + p.z * f.radius); return { x: c.x + p.x * f.radius, y: c.y + p.y * f.radius, z: c.z + p.z * f.radius }; };
    f.armTarget = function () { return M.armTarget(f.point(), f.radius, f.max); };
    f.items = function () { return items.slice(); };

    // ---- drivers -------------------------------------------------------------------------------
    f.rotate = function (yaw, pitch) { f.q = M.rotate(f.q, yaw, pitch); emit('rotate', { q: f.q }); return f; };
    f.drag = function (p0, p1) { f.q = M.qNormalize(M.qMul(M.dragRotation(p0, p1), f.q)); emit('rotate', { q: f.q }); return f; };
    f.stick = function (x, y, dt) { if (x || y) f.rotate(-(+x || 0) * f.rates.yaw * (dt || 0), (+y || 0) * f.rates.pitch * (dt || 0)); return f; };
    f.mouse = function (canvas, o) {
      o = o || {}; var btn = o.button == null ? 2 : o.button, tb = o.tbRadius || 0.67, drag = null;
      function pt(e) { var r = canvas.getBoundingClientRect(), half = Math.min(r.width, r.height) / 2 || 1; return M.surface((e.clientX - r.left - r.width / 2) / half, -(e.clientY - r.top - r.height / 2) / half, tb); }
      function down(e) { if (e.button !== btn && !f.grab) return; drag = pt(e); e.preventDefault(); e.stopImmediatePropagation(); }
      function move(e) { if (!drag) return; var p = pt(e); f.drag(drag, p); drag = p; }
      function up() { drag = null; }
      canvas.addEventListener('pointerdown', down, true); global.addEventListener('pointermove', move); global.addEventListener('pointerup', up); global.addEventListener('blur', up);
      return function () { canvas.removeEventListener('pointerdown', down, true); global.removeEventListener('pointermove', move); global.removeEventListener('pointerup', up); global.removeEventListener('blur', up); };
    };
    f.xr = function (ctrls) {
      var offs = []; (ctrls || []).forEach(function (c) { var prev = null; var s = function () { prev = { x: c.quaternion.x, y: c.quaternion.y, z: c.quaternion.z, w: c.quaternion.w }; }, e = function () { prev = null; }; c.addEventListener('squeezestart', s); c.addEventListener('squeezeend', e); c.userData.dvFieldTick = function () { if (!prev) return; var cur = { x: c.quaternion.x, y: c.quaternion.y, z: c.quaternion.z, w: c.quaternion.w }; f.q = M.qNormalize(M.qMul(M.qMul(cur, M.qConj(prev)), f.q)); prev = cur; }; offs.push(function () { c.removeEventListener('squeezestart', s); c.removeEventListener('squeezeend', e); delete c.userData.dvFieldTick; }); });
      f._xr = ctrls || []; return function () { offs.forEach(function (o) { o(); }); f._xr = []; };
    };
    f.energy = function (e) { energy = clamp(+e || 0, 0, 1); return f; };
    /** Which entries (with world positions) are inside the field now; edges since the last sweep. */
    f.sweep = function (entries) { var c = f.center(), out = { enter: [], leave: [] }, seen = {}; for (var i = 0; i < entries.length; i++) { var e = entries[i]; if (!e || !e.position) continue; var isIn = M.contains(c, f.radius, e.position); seen[e.id] = 1; if (isIn && !inside[e.id]) out.enter.push(e.id); if (!isIn && inside[e.id]) out.leave.push(e.id); inside[e.id] = isIn; } for (var k in inside) if (!seen[k] && inside[k]) { out.leave.push(k); inside[k] = false; } return out; };
    f.inside = function (id) { return !!inside[id]; };
    f.update = function (dt, t) {
      t = t == null ? now() : t;
      if (f._xr) for (var i = 0; i < f._xr.length; i++) if (f._xr[i].userData && f._xr[i].userData.dvFieldTick) f._xr[i].userData.dvFieldTick();
      if (group) { group.quaternion.set(f.q.x, f.q.y, f.q.z, f.q.w); var deg = f.degree(), at = f.atBound(); if (guide && guide.material) { guide.material.opacity = 0.12 + 0.38 * deg + (at ? 0.15 * Math.sin(t / 180) : 0); if (opts.skyTint && at) guide.material.color.set(opts.skyTint); else guide.material.color.set(f.tint); } var it = f.selected(); for (var k = 0; k < items.length; k++) { var o = items[k].obj; if (!o) continue; var s = (items[k] === it ? 1.2 : 1) * (1 + 0.25 * pulse) * (1 + 0.2 * energy); o.scale.setScalar(s); if (items[k].item && items[k].item.glow) { try { items[k].item.glow(0.4 + 0.6 * energy + pulse, items[k] === it); } catch (e) {} } } }
      if (pulse > 0) pulse = Math.max(0, pulse - (dt || 0) * 1.8);
      recognise(t, false);
      return f;
    };
    f.dispose = function () { if (group && group.parent) group.parent.remove(group); if (guide) { guide.geometry.dispose(); guide.material.dispose(); } items = []; listeners = {}; };

    // ---- init ------------------------------------------------------------------------------------------
    f.setRank(f.rank); if (opts.policy) f.setPolicy(opts.policy);
    var saved = null; try { var s0 = store(); saved = s0 && s0.getItem('dv.field.mode'); } catch (e) {}
    if (opts.mode) f.setMode(opts.mode); else if (saved && M.MODES.indexOf(saved) >= 0) f.setMode(saved);
    f.setBounds(opts.extent != null ? { extent: opts.extent } : (opts.doc || opts.bounds || { extent: 70 }));
    f.radius = 0; f.setRadius(opts.radius == null ? 1.2 : +opts.radius);
    if (opts.subject) f.setSubject(opts.subject);
    wasAt = f.atBound(); f.recognized = wasAt; lastDeg = f.degree();
    return f;
  }
  var api = { create: create, version: '0.1.0', rule: 'max radius = the space extent − 1 — a thing has to be separate from infinity to recognise it (infinity − 1), and the DeltaVerse recognised itself' };
  var NS = global.DVVerse = global.DVVerse || {}; NS.field = api; NS.sphere = api;
  global.DVField = api; global.DVSphere = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
