/*! dvengine — component aivatar + DVAivatar (components/aivatar/index.js) · THE cyborg AI avatar: primitive humanoid, substrate face, breath · walk · turn · gestures · the arcball arm · speech · focus · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · rig after the awe avatar port (© oncyberio, MIT) */
/*
 * Props: { id, type:'iNFT'|'THOT'|'dNFT'|'aNFT', name, seed, tint, dims?:number[], say?:string[], position, facePreset, pick (true) }
 *   dims[0] → hue (fractional part × 360) · 1 + 0.2·dims[1] → scale · dims[2] → idle speed. Without dims the seed decides.
 *
 * MOTION  breathing (torso), head tracking toward the nearest participant (space.local, space.participants[]),
 *         walk cycle when the position changes (legs swing, bob), turn-to-face by the shortest arc,
 *         gestures greet · nod · wave · think, and THE ARM EXTENSION on an arcball (verse/arcball.math.js):
 *         the participant relative to the SHOULDER is the cursor on a trackball of radius = reach; the arm's
 *         yaw/pitch/extend follow the projected point. setArm({extend,yaw,pitch}) takes the server's value
 *         (snap.agents[id].arm); reachToward(worldPos) computes the same locally so the local participant
 *         feels it at once (local wins for 300 ms after each call).
 * RESPONSE  say(text, emotion) → a speech-bubble sprite for 4 s (queued) + an emotion tint pulse;
 *         focus(true) → turn to the local participant + greet + `dv:focus` on the space (the verse swaps the
 *         camera to ArcballControls around this agent); a click on any part of the rig focuses it.
 * API on the comp: setPose({p,r,a,arm}), setArm(arm, force) (force: the participant's FIELD of influence wins over the local prediction), reachToward(v3),
 *         influence (m, set by the verse: the participant's field radius × outflow when the field covers this agent — widens turn-to-face / head tracking beyond 6 m), say(text,emotion), gesture(name), focus(bool),
 *         root, rig, id, emotion, state{walking,phase,yaw}. Pure helpers on window.DVAivatar (node-testable, no three):
 *         walkPhase · angleDelta · turnToward · yawTo · dimsStyle · SayQueue · armFor · EMOTIONS · GESTURES · buildRig(THREE,opts)
 */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2;
  var EMOTIONS = { neutral: '#9fe9ff', joy: '#ffd166', calm: '#7fdcff', curious: '#c77dff', alert: '#ff6b6b', warm: '#ffa36b', think: '#a3b1ff' };
  var GESTURES = { greet: 1.6, nod: 1.0, wave: 2.6, think: 2.2 };
  var SAY_MS = 4000;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function frac(x) { return x - Math.floor(x); }
  function angleDelta(a, b) { var d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  /** Turn `cur` toward `target` by at most `maxStep` radians along the shortest arc. */
  function turnToward(cur, target, maxStep) { var d = angleDelta(cur, target); if (Math.abs(d) <= maxStep) return cur + d; return cur + Math.sign(d) * maxStep; }
  /** The yaw that faces `to` from `from` for a rig whose face is +z. */
  function yawTo(from, to) { return Math.atan2((to.x || 0) - (from.x || 0), (to.z || 0) - (from.z || 0)); }
  /** Advance the walk phase by the distance moved: one full cycle per `stride` metres (0.9). */
  function walkPhase(prev, dist, stride) { return (prev || 0) + (dist / (stride || 0.9)) * TAU; }
  function hexOf(hue, s, l) {
    var C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((hue / 60) % 2 - 1)), m = l - C / 2, r = 0, g = 0, b = 0;
    if (hue < 60) { r = C; g = X; } else if (hue < 120) { r = X; g = C; } else if (hue < 180) { g = C; b = X; } else if (hue < 240) { g = X; b = C; } else if (hue < 300) { r = X; b = C; } else { r = C; b = X; }
    function h(v) { var n = Math.round((v + m) * 255); return (n < 16 ? '0' : '') + n.toString(16); }
    return '#' + h(r) + h(g) + h(b);
  }
  /** dims → look. dims[0] hue, dims[1] scale (1 + 0.2·d clamped 0.7..1.6), dims[2] idle speed; seed fills gaps. */
  function dimsStyle(dims, seed) {
    var s = ((+seed || 1) >>> 0) || 1; function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    var d0 = dims && dims.length > 0 ? +dims[0] : rnd(), d1 = dims && dims.length > 1 ? +dims[1] : rnd() - 0.5, d2 = dims && dims.length > 2 ? +dims[2] : rnd();
    var hue = frac(isFinite(d0) ? d0 : 0) * 360;
    return { hue: hue, tint: hexOf(hue, 0.7, 0.6), scale: clamp(1 + 0.2 * (isFinite(d1) ? d1 : 0), 0.7, 1.6), idleSpeed: 0.6 + 0.8 * frac(isFinite(d2) ? d2 : 0) };
  }
  /** The speech queue: one line at a time, 4 s each, in order. */
  function SayQueue(opts) { opts = opts || {}; this.now = opts.now || function () { return Date.now(); }; this.ms = opts.ms || SAY_MS; this.q = []; this.cur = null; }
  SayQueue.prototype.push = function (text, emotion) { this.q.push({ text: String(text || ''), emotion: emotion || 'neutral' }); this.tick(); return this; };
  SayQueue.prototype.tick = function () {
    var t = this.now();
    if (this.cur && t - this.cur.t0 >= this.ms) this.cur = null;
    if (!this.cur && this.q.length) { this.cur = this.q.shift(); this.cur.t0 = t; this.changed = true; }
    return this.cur;
  };
  SayQueue.prototype.current = function () { return this.tick(); };
  SayQueue.prototype.clear = function () { this.q = []; this.cur = null; };
  /** The arm for a relative vector in the agent frame — the arcball when the math is loaded, a straight line otherwise. */
  function armFor(rel, opts) {
    var M = global.DVArcballMath;
    if (M) return M.arm(rel, opts);
    var x = +rel.x || 0, y = +rel.y || 0, z = +rel.z || 0, d = Math.sqrt(x * x + y * y + z * z) || 1;
    var near = (opts && opts.near) || 0.9, far = (opts && opts.far) || 3.2, u = clamp((far - d) / (far - near), 0, 1);
    return { extend: u * u * (3 - 2 * u), yaw: Math.atan2(x, Math.max(z, 0.01)), pitch: Math.asin(clamp(y / d, -1, 1)), distance: d, sheet: 'line' };
  }

  /** The primitive humanoid rig (shared by participant + remote-participant). Faces +z. */
  function buildRig(THREE, o) {
    o = o || {};
    var geos = [], mats = [], color = o.color != null ? o.color : 0x4cc9f0, legColor = o.legColor != null ? o.legColor : 0x2b2d42;
    function capsule(col, w, h) { var g = new THREE.CapsuleGeometry(w, h, 4, 10); var m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.15, emissive: col, emissiveIntensity: 0.08 }); geos.push(g); mats.push(m); var mesh = new THREE.Mesh(g, m); mesh.castShadow = true; return mesh; }
    var root = new THREE.Group(); root.name = o.name || 'rig';
    var pelvis = new THREE.Group(); pelvis.position.y = 0.95; root.add(pelvis);
    var torso = capsule(color, 0.27, 0.62); torso.position.y = 0.42; pelvis.add(torso);
    var neck = new THREE.Group(); neck.position.y = 0.82; pelvis.add(neck);
    var hg = new THREE.SphereGeometry(0.25, 24, 16); var hm = new THREE.MeshStandardMaterial({ color: o.headColor != null ? o.headColor : 0x1b2030, roughness: 0.4, metalness: 0.5 }); geos.push(hg); mats.push(hm);
    var head = new THREE.Mesh(hg, hm); head.position.y = 0.2; head.castShadow = true; neck.add(head);
    var face = null;
    if (o.face !== false) {
      var fg = new THREE.PlaneGeometry(0.3, 0.22); geos.push(fg);
      var fm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide }); mats.push(fm);
      face = new THREE.Mesh(fg, fm); face.position.set(0, 0.02, 0.235); head.add(face);
    }
    function arm(side) {
      var sh = new THREE.Group(); sh.position.set(side * 0.4, 0.68, 0); sh.rotation.order = 'YXZ'; pelvis.add(sh);
      var up = capsule(color, 0.085, 0.3); up.position.y = -0.22; sh.add(up);
      var el = new THREE.Group(); el.position.y = -0.44; sh.add(el);
      var lo = capsule(color, 0.075, 0.28); lo.position.y = -0.2; el.add(lo);
      var hand = new THREE.Group(); hand.position.y = -0.42; el.add(hand);
      return { shoulder: sh, elbow: el, hand: hand, upper: up, lower: lo };
    }
    function leg(side) { var hip = new THREE.Group(); hip.position.set(side * 0.16, 0, 0); pelvis.add(hip); var l = capsule(legColor, 0.11, 0.55); l.position.y = -0.48; hip.add(l); return { hip: hip, mesh: l }; }
    var rig = { root: root, pelvis: pelvis, torso: torso, neck: neck, head: head, face: face, armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1), geos: geos, mats: mats, height: 2.0,
      setTint: function (hex) { var c = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex; [torso, rig.armL.upper, rig.armL.lower, rig.armR.upper, rig.armR.lower].forEach(function (m) { m.material.color.set(c); m.material.emissive.set(c); }); },
      dispose: function () { for (var i = 0; i < geos.length; i++) geos[i].dispose(); for (var j = 0; j < mats.length; j++) mats[j].dispose(); } };
    return rig;
  }

  function bubbleSprite(THREE, text, emotion) {
    var cv = global.document.createElement('canvas'); cv.width = 768; cv.height = 192; var g = cv.getContext('2d');
    var col = EMOTIONS[emotion] || EMOTIONS.neutral;
    g.fillStyle = 'rgba(7,9,18,0.86)'; g.strokeStyle = col; g.lineWidth = 6;
    g.beginPath(); g.roundRect ? g.roundRect(8, 8, 752, 150, 28) : g.rect(8, 8, 752, 150); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(354, 158); g.lineTo(384, 188); g.lineTo(414, 158); g.fillStyle = 'rgba(7,9,18,0.86)'; g.fill();
    g.fillStyle = '#eef2ff'; g.font = '34px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var words = String(text).split(' '), lines = [], line = '';
    for (var i = 0; i < words.length; i++) { var test = line ? line + ' ' + words[i] : words[i]; if (g.measureText(test).width > 700 && line) { lines.push(line); line = words[i]; } else line = test; }
    if (line) lines.push(line); lines = lines.slice(0, 3);
    for (var k = 0; k < lines.length; k++) g.fillText(lines[k], 384, 84 + (k - (lines.length - 1) / 2) * 40);
    var tex = new THREE.CanvasTexture(cv); if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(2.4, 0.6, 1); return s;
  }

  function paintFace(cv, t, emotion, blink, talking) {
    var g = cv.getContext('2d'); if (!g) return;
    var w = cv.width, h = cv.height, col = EMOTIONS[emotion] || EMOTIONS.neutral;
    g.fillStyle = '#05070e'; g.fillRect(0, 0, w, h);
    g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 18;
    var eh = blink ? 3 : 22 + 4 * Math.sin(t * 3);
    g.fillRect(w * 0.28 - 16, h * 0.42 - eh / 2, 32, eh); g.fillRect(w * 0.72 - 16, h * 0.42 - eh / 2, 32, eh);
    g.shadowBlur = 0; g.strokeStyle = col; g.lineWidth = 4; g.beginPath();
    var mw = talking ? 10 + 14 * Math.abs(Math.sin(t * 12)) : 4;
    g.moveTo(w * 0.38, h * 0.72); g.quadraticCurveTo(w * 0.5, h * 0.72 + mw, w * 0.62, h * 0.72); g.stroke();
  }

  var pure = { walkPhase: walkPhase, angleDelta: angleDelta, turnToward: turnToward, yawTo: yawTo, dimsStyle: dimsStyle, SayQueue: SayQueue, armFor: armFor, EMOTIONS: EMOTIONS, GESTURES: GESTURES, SAY_MS: SAY_MS, buildRig: buildRig, bubbleSprite: bubbleSprite, version: '0.1.0' };
  global.DVAivatar = pure;
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
  if (!global.DVEngine) return;

  global.DVEngine.register('aivatar', function (props) {
    props = props || {};
    var id = props.id || ('agent-' + (props.seed || 1));
    var style = dimsStyle(props.dims, props.seed), tint = props.tint || style.tint;
    var THREE, space, rig, root, faceCv, faceTex, faceCore = null, faceAcc = 0, bubble = null, bubbleFor = null, say = new SayQueue();
    var st = { walking: false, phase: 0, yaw: 0, targetYaw: 0, target: null, speed: 0, lastP: null, anim: 'idle', focused: false };
    var arm = { extend: 0, yaw: 0, pitch: 0, cur: { extend: 0, yaw: 0, pitch: 0 }, side: 'R', localUntil: 0 };
    var gesture = null, emotion = 'neutral', tintPulse = 0, blinkT = 0, blink = false, dom = null, onClick = null, rc = null, v3 = null, headTarget = 0, headPitch = 0;
    var tintHex = typeof tint === 'string' ? tint : '#' + ('000000' + (tint >>> 0).toString(16)).slice(-6);

    function nearestParticipant() {
      var list = [];
      if (space.local) list.push(space.local);
      if (space.participants) for (var k in space.participants) if (space.participants[k]) list.push(space.participants[k]);
      var best = null, bd = Infinity;
      for (var i = 0; i < list.length; i++) { var o = list[i]; var p = o.getWorldPosition ? o.getWorldPosition(v3) : o.position; var dx = p.x - root.position.x, dz = p.z - root.position.z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { x: p.x, y: p.y, z: p.z, d: Math.sqrt(d) }; } }
      return best;
    }
    function localRel(worldPos, side) {
      var sh = side === 'L' ? rig.armL.shoulder : rig.armR.shoulder;
      var sp = sh.getWorldPosition(new THREE.Vector3());
      var rel = { x: worldPos.x - sp.x, y: worldPos.y - sp.y, z: worldPos.z - sp.z };
      var M = global.DVArcballMath; if (M) return M.toLocal(rel, root.rotation.y);
      var c = Math.cos(-root.rotation.y), s = Math.sin(-root.rotation.y); return { x: c * rel.x + s * rel.z, y: rel.y, z: -s * rel.x + c * rel.z };
    }

    var comp = {
      type: 'aivatar', id: id,
      init: function (ctx) {
        THREE = ctx.THREE; space = ctx.space; v3 = new THREE.Vector3();
        rig = buildRig(THREE, { color: parseInt(tintHex.slice(1), 16), name: 'aivatar:' + id });
        root = rig.root; root.scale.setScalar(style.scale);
        var p = props.position || { x: 0, y: 0, z: 0 }; root.position.set(+p.x || 0, +p.y || 0, +p.z || 0);
        st.yaw = st.targetYaw = props.yaw || 0; root.rotation.y = st.yaw; st.lastP = root.position.clone();
        faceCv = global.document.createElement('canvas'); faceCv.width = 256; faceCv.height = 192;
        var C = global.DVNgnCore, P = global.DVNgnPresets, fp = props.facePreset;
        if (C && P && fp && P[fp] && P[fp].backend === 'fragment') { try { faceCore = C.create(faceCv); faceCore.mount(P[fp]); faceCore.start(); if (!faceCore.ok) faceCore = null; } catch (e) { faceCore = null; } }
        if (!faceCore) paintFace(faceCv, 0, emotion, false, false);
        faceTex = new THREE.CanvasTexture(faceCv); if ('colorSpace' in faceTex && THREE.SRGBColorSpace) faceTex.colorSpace = THREE.SRGBColorSpace;
        rig.face.material.map = faceTex; rig.face.material.needsUpdate = true;
        root.traverse(function (o) { o.userData.dvAivatar = id; });
        root.userData.dvAgent = comp;
        if (props.name) { var lbl = bubbleSprite(THREE, props.name + (props.type ? ' · ' + props.type : ''), 'calm'); lbl.scale.set(1.6, 0.4, 1); lbl.position.y = rig.height + 0.25; root.add(lbl); comp._label = lbl; }
        if (props.pick !== false && ctx.renderer && ctx.renderer.domElement && THREE.Raycaster) {
          dom = ctx.renderer.domElement; rc = new THREE.Raycaster();
          onClick = function (ev) {
            var r = dom.getBoundingClientRect(), m = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
            rc.setFromCamera(m, ctx.camera); if (rc.intersectObject(root, true).length) comp.focus(!st.focused);
          };
          dom.addEventListener('click', onClick);
        }
        return root;
      },
      setPose: function (pose) {
        if (!root || !pose) return;
        if (pose.p) { st.target = { x: +pose.p[0] || 0, y: +pose.p[1] || 0, z: +pose.p[2] || 0 }; }
        if (pose.r) st.targetYaw = +pose.r[1] || 0;
        if (pose.a) st.anim = pose.a;
        if (pose.arm) comp.setArm(pose.arm);
      },
      influence: 0,
      setArm: function (a, force) { if (!a) return; if (!force && Date.now() < arm.localUntil) return; if (force) arm.localUntil = 0; arm.extend = clamp(+a.extend || 0, 0, 1); arm.yaw = +a.yaw || 0; arm.pitch = +a.pitch || 0; arm.side = arm.yaw > 0 ? 'L' : 'R'; },
      reachToward: function (worldPos) {
        if (!root || !worldPos) return null;
        var relR = localRel(worldPos, 'R'), side = relR.x > 0.15 ? 'L' : 'R';
        var rel = side === 'L' ? localRel(worldPos, 'L') : relR;
        var a = armFor(rel, { radius: 0.7 * style.scale, near: 0.9, far: 3.2 });
        arm.extend = a.extend; arm.yaw = a.yaw; arm.pitch = a.pitch; arm.side = side; arm.localUntil = Date.now() + 300;
        return a;
      },
      say: function (text, emo) { say.push(text, emo); if (emo && EMOTIONS[emo]) { emotion = emo; tintPulse = 1; } return comp; },
      gesture: function (name) { if (!GESTURES[name]) return false; gesture = { name: name, t0: Date.now(), dur: GESTURES[name] * 1000 }; if (name === 'think') { emotion = 'think'; tintPulse = 0.6; } return true; },
      focus: function (v) {
        st.focused = !!v;
        if (st.focused) { var n = nearestParticipant(); if (n) st.targetYaw = yawTo(root.position, n); comp.gesture('greet'); if (props.say && props.say.length) comp.say(props.say[0], 'joy'); }
        space._emit('dv:focus', { id: id, object: root, focused: st.focused, agent: comp });
      },
      get root() { return root; }, get rig() { return rig; }, get emotion() { return emotion; }, get state() { return st; }, get arm() { return arm; }, get focused() { return st.focused; }, get name() { return props.name || id; },
      update: function (dt, t) {
        if (!root) return;
        var k = style.idleSpeed;
        // position: ease to the server target; walking when moving
        if (st.target) { var dx = st.target.x - root.position.x, dz = st.target.z - root.position.z, dist = Math.sqrt(dx * dx + dz * dz); var a = Math.min(1, dt * 8); root.position.x += dx * a; root.position.z += dz * a; if (dist > 0.05) st.targetYaw = Math.atan2(dx, dz); }
        var moved = Math.sqrt(Math.pow(root.position.x - st.lastP.x, 2) + Math.pow(root.position.z - st.lastP.z, 2));
        st.speed = dt > 0 ? moved / dt : 0; st.walking = st.speed > 0.08 || st.anim === 'walk' || st.anim === 'run';
        st.lastP.copy(root.position);
        if (st.walking) st.phase = walkPhase(st.phase, Math.max(moved, dt * 0.6));
        // turn to face (shortest arc)
        var infl = Math.max(6, +comp.influence || 0);
        if (!st.walking && !st.focused) { var n = nearestParticipant(); if (n && n.d < infl) st.targetYaw = yawTo(root.position, n); }
        st.yaw = turnToward(st.yaw, st.targetYaw, dt * 3.2); root.rotation.y = st.yaw;
        // breathing + bob
        rig.torso.scale.y = 1 + 0.025 * Math.sin(t * 1.3 * k); rig.torso.position.y = 0.42 + 0.01 * Math.sin(t * 1.3 * k);
        rig.pelvis.position.y = 0.95 + (st.walking ? Math.abs(Math.sin(st.phase)) * 0.035 : 0.012 * Math.sin(t * 1.3 * k));
        // legs
        var swing = st.walking ? Math.sin(st.phase) * 0.55 : 0;
        rig.legL.hip.rotation.x += (swing - rig.legL.hip.rotation.x) * Math.min(1, dt * 10); rig.legR.hip.rotation.x += (-swing - rig.legR.hip.rotation.x) * Math.min(1, dt * 10);
        // head tracking toward the nearest participant
        var np = nearestParticipant(), hy = 0, hp = 0;
        if (np && np.d < Math.max(8, infl)) { hy = clamp(angleDelta(st.yaw, yawTo(root.position, np)), -1.0, 1.0); hp = clamp(Math.atan2((np.y + 1.5) - (root.position.y + 1.72 * style.scale), np.d), -0.5, 0.4); }
        headTarget += (hy - headTarget) * Math.min(1, dt * 5); headPitch += (hp - headPitch) * Math.min(1, dt * 5);
        rig.neck.rotation.y = headTarget; rig.neck.rotation.x = -headPitch;
        // gestures (overrides on top of the base pose)
        var gArmL = null, gArmR = null, gHead = 0;
        if (gesture) {
          var u = (Date.now() - gesture.t0) / gesture.dur; if (u >= 1) gesture = null; else {
            var env = Math.sin(Math.min(1, u * 4) * Math.PI / 2) * Math.sin(Math.min(1, (1 - u) * 4) * Math.PI / 2);
            if (gesture.name === 'greet') gArmR = { x: -2.6 * env, z: 0.5 * env + 0.25 * Math.sin(u * 14) * env, elbow: -0.8 * env };
            else if (gesture.name === 'wave') gArmR = { x: -2.8 * env, z: 0.6 * env + 0.45 * Math.sin(u * 22) * env, elbow: -0.9 * env };
            else if (gesture.name === 'nod') gHead = 0.28 * Math.sin(u * Math.PI * 3) * env;
            else if (gesture.name === 'think') { gArmR = { x: -2.1 * env, z: -0.55 * env, elbow: -2.2 * env }; gHead = -0.12 * env; rig.neck.rotation.z = 0.18 * env; }
          }
        } else rig.neck.rotation.z += (0 - rig.neck.rotation.z) * Math.min(1, dt * 4);
        rig.neck.rotation.x += gHead;
        // THE ARM: arcball extension, eased; the other arm idles/swings
        var ac = arm.cur, ea = Math.min(1, dt * 7);
        ac.extend += (arm.extend - ac.extend) * ea; ac.yaw += angleDelta(ac.yaw, arm.yaw) * ea; ac.pitch += (arm.pitch - ac.pitch) * ea;
        var reach = arm.side === 'L' ? rig.armL : rig.armR, idle = arm.side === 'L' ? rig.armR : rig.armL;
        var idleSwing = st.walking ? -Math.sin(st.phase) * 0.45 : 0.06 * Math.sin(t * 1.3 * k);
        function setArmPose(A, x, y, z, elbow) { A.shoulder.rotation.x += (x - A.shoulder.rotation.x) * ea; A.shoulder.rotation.y += (y - A.shoulder.rotation.y) * ea; A.shoulder.rotation.z += (z - A.shoulder.rotation.z) * ea; A.elbow.rotation.x += (elbow - A.elbow.rotation.x) * ea; }
        var gR = arm.side === 'L' ? gArmL : gArmR, gI = arm.side === 'L' ? gArmR : gArmL;
        if (gR) setArmPose(reach, gR.x, 0, (arm.side === 'L' ? -1 : 1) * gR.z, gR.elbow);
        else setArmPose(reach, -ac.extend * (Math.PI / 2 + ac.pitch), ac.yaw * ac.extend, 0, -(1 - ac.extend) * 0.35 - (st.walking ? 0.2 : 0));
        if (gI) setArmPose(idle, gI.x, 0, (arm.side === 'L' ? 1 : -1) * gI.z, gI.elbow);
        else setArmPose(idle, idleSwing + (st.walking ? 0 : 0), 0, 0, -0.35);
        // face: substrate or drawn; blink; talking mouth
        var cur = say.current();
        blinkT -= dt; if (blinkT <= 0) { blink = !blink; blinkT = blink ? 0.12 : 2.5 + 3 * Math.random(); }
        faceAcc += dt; if (faceAcc > 1 / 12) { faceAcc = 0; if (!faceCore) paintFace(faceCv, t, emotion, blink, !!cur); faceTex.needsUpdate = true; }
        // speech bubble
        if (cur !== bubbleFor) { if (bubble) { root.remove(bubble); bubble.material.map.dispose(); bubble.material.dispose(); bubble = null; } bubbleFor = cur; if (cur) { bubble = bubbleSprite(THREE, cur.text, cur.emotion); bubble.position.y = rig.height + (props.name ? 0.7 : 0.35); root.add(bubble); } }
        if (bubble) bubble.position.y = rig.height + (props.name ? 0.7 : 0.35) + 0.03 * Math.sin(t * 2);
        // emotion tint pulse
        if (tintPulse > 0) { tintPulse = Math.max(0, tintPulse - dt * 0.6); var ec = parseInt((EMOTIONS[emotion] || EMOTIONS.neutral).slice(1), 16); rig.torso.material.emissive.set(ec); rig.torso.material.emissiveIntensity = 0.08 + 0.7 * tintPulse; }
        else if (rig.torso.material.emissiveIntensity > 0.081) { rig.torso.material.emissiveIntensity = 0.08; rig.torso.material.emissive.set(parseInt(tintHex.slice(1), 16)); }
        if (st.focused && rig.head.material) rig.head.material.emissive.setHex(0x223344).multiplyScalar(0.5 + 0.5 * Math.sin(t * 3)); else if (rig.head.material.emissive) rig.head.material.emissive.setHex(0x000000);
        if (comp._label) comp._label.visible = !bubble;
      },
      dispose: function () { if (onClick && dom) dom.removeEventListener('click', onClick); if (faceCore) { try { faceCore.stop(); } catch (e) {} } if (faceTex) faceTex.dispose(); if (bubble) { bubble.material.map.dispose(); bubble.material.dispose(); } if (comp._label) { comp._label.material.map.dispose(); comp._label.material.dispose(); } if (rig) rig.dispose(); root = null; }
    };
    return comp;
  });
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
