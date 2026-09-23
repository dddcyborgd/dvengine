/*! dvengine — component participant (components/participant/index.js) · the local avatar: WASD/arrows + pointer, the DVParticipantInput ladder when present, or DVControls' merged stick through drive(); pose() for conn.state; setArm() for the field of influence · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · DeltaVerse-native (rig after the awe avatar port, © oncyberio MIT) */
/*
 * Props: { name, seed, tint, position, speed (2.2 m/s), run (4.4), height }
 * Input: keyboard W/A/S/D + arrows (Shift = run) always; when window.DVParticipantInput exists and the
 * pointer is held down, its ladder drives the walk — heading (compass, 0 = N = camera-forward) and
 * speed (px/s, > 40 walks, > 400 runs). Movement is CAMERA-relative (forward = camera → participant, flat).
 * The verse sets space.local = this root so zones, portals and aivatars can find the participant.
 * API: pose() → {p:[x,y,z], r:[0,yaw,0], a:'idle'|'walk'|'run', s}, teleport({x,y,z}), root, rig, state,
 *      drive({x,y,run,strafe}) (DVControls' merged stick, camera-relative like the keys; wins over the built-in keys while non-zero),
 *      setKeyboard(bool) (DVControls turns the built-in W/A/S/D off — S is `left` in ESDF), setArm({extend,yaw,pitch}) (the field's arm target on the right arm),
 *      jump() (a hop; `dv:jump` on the space), gesture(name) (greet | wave | nod | think on the own rig).
 * Pure: DVParticipant.moveVector(keys, camYaw) → {x,z,run}.
 */
(function (global) {
  'use strict';
  function moveVector(keys, camYaw, ladder, drive) {
    var fx = 0, fz = 0;
    if (keys.w || keys.up) fz += 1; if (keys.s || keys.down) fz -= 1; if (keys.a || keys.left) fx += 1; if (keys.d || keys.right) fx -= 1;
    var run = !!keys.shift;
    if (drive && (drive.x || drive.y)) { fx = -(+drive.x || 0); fz = +drive.y || 0; run = !!drive.run; var dl = Math.sqrt(fx * fx + fz * fz); if (dl > 1) { fx /= dl; fz /= dl; } var c0 = Math.cos(camYaw || 0), s0 = Math.sin(camYaw || 0); return { x: fx * c0 + fz * s0, z: -fx * s0 + fz * c0, run: run, moving: dl > 0.02, strafe: !!drive.strafe, mag: Math.min(1, dl) }; }
    if (!fx && !fz && ladder && ladder.down && ladder.speed > 40) { var h = (ladder.heading || 0) * Math.PI / 180; fx = -Math.sin(h); fz = Math.cos(h); run = ladder.speed > 400; }
    var len = Math.sqrt(fx * fx + fz * fz); if (len > 0) { fx /= len; fz /= len; }
    var c = Math.cos(camYaw || 0), s = Math.sin(camYaw || 0);
    return { x: fx * c + fz * s, z: -fx * s + fz * c, run: run, moving: len > 0 };
  }
  var pure = { moveVector: moveVector };
  if (!global.DVEngine) { if (typeof module !== 'undefined' && module.exports) module.exports = pure; global.DVParticipant = pure; return; }

  global.DVEngine.register('participant', function (props) {
    props = props || {};
    var THREE, space, camera, rig, root, keys = {}, st = { yaw: 0, anim: 'idle', phase: 0, speed: 0, drive: null, keyboard: true, vy: 0, arm: null, armCur: { extend: 0, yaw: 0, pitch: 0 }, gesture: null }, onKD, onKU, ladder = null, tok = null, v3;
    var walk = props.speed || 2.2, run = props.run || 4.4;
    function buildFallback(THREE) {
      var g = new THREE.CapsuleGeometry(0.3, 1.1, 4, 12), m = new THREE.MeshStandardMaterial({ color: props.tint || 0x4cc9f0 }), mesh = new THREE.Mesh(g, m); mesh.position.y = 0.9; var r = new THREE.Group(); r.add(mesh);
      return { root: r, pelvis: r, torso: mesh, legL: null, legR: null, armL: null, armR: null, height: 1.9, dispose: function () { g.dispose(); m.dispose(); } };
    }
    var comp = {
      type: 'participant',
      init: function (ctx) {
        THREE = ctx.THREE; space = ctx.space; camera = ctx.camera; v3 = new THREE.Vector3();
        var tint = props.tint || (global.DVAivatar ? global.DVAivatar.dimsStyle(null, props.seed || 11).tint : '#4cc9f0');
        rig = global.DVAivatar ? global.DVAivatar.buildRig(THREE, { color: parseInt(String(tint).replace('#', ''), 16), face: false, name: 'participant' }) : buildFallback(THREE);
        root = rig.root; root.name = 'participant';
        var p = props.position || { x: 0, y: 0, z: 4 }; root.position.set(+p.x || 0, +p.y || 0, +p.z || 0);
        if (props.height) root.scale.setScalar(props.height / 2.0);
        space.local = root; root.userData.dvParticipant = comp;
        onKD = function (e) { if (!st.keyboard) return; var k = keyOf(e); if (k) { keys[k] = true; if (e.key !== 'Shift' && !e.metaKey && !e.ctrlKey) e.preventDefault(); } };
        onKU = function (e) { var k = keyOf(e); if (k) keys[k] = false; };
        global.addEventListener('keydown', onKD); global.addEventListener('keyup', onKU);
        if (global.DVParticipantInput && global.DVParticipantInput.shared) { try { ladder = global.DVParticipantInput.shared(); tok = ladder.attach(); } catch (e) { ladder = null; } }
        return root;
      },
      pose: function () { return { p: [root.position.x, root.position.y, root.position.z], r: [0, st.yaw, 0], a: st.anim, s: root.scale.x || 1 }; },
      drive: function (d) { st.drive = d || null; return comp; },
      setKeyboard: function (on) { st.keyboard = !!on; if (!on) keys = {}; return comp; },
      setArm: function (a) { st.arm = a ? { extend: Math.max(0, Math.min(1, +a.extend || 0)), yaw: +a.yaw || 0, pitch: +a.pitch || 0 } : null; return comp; },
      jump: function () { if (!root || st.vy) return false; st.vy = 3.6; if (space && space._emit) space._emit('dv:jump', { x: root.position.x, y: root.position.y, z: root.position.z }); return true; },
      gesture: function (name) { var G = global.DVAivatar && global.DVAivatar.GESTURES; if (!G || !G[name]) return false; st.gesture = { name: name, t0: Date.now(), dur: G[name] * 1000 }; return true; },
      teleport: function (p) { if (!root || !p) return; root.position.set(+p.x || 0, +p.y || 0, +p.z || 0); space._emit('dv:teleport', { x: root.position.x, y: root.position.y, z: root.position.z, via: 'verse' }); },
      get root() { return root; }, get rig() { return rig; }, get state() { return st; }, get keys() { return keys; },
      update: function (dt, t) {
        if (!root) return;
        var cp = camera.getWorldPosition ? camera.getWorldPosition(v3) : camera.position;
        var camYaw = Math.atan2(root.position.x - cp.x, root.position.z - cp.z);
        var mv = moveVector(keys, camYaw, ladder && ladder.state, st.drive);
        var sp = mv.moving ? (mv.run ? run : walk) * (mv.mag || 1) : 0;
        st.speed += (sp - st.speed) * Math.min(1, dt * 10);
        if (mv.moving) {
          root.position.x += mv.x * st.speed * dt; root.position.z += mv.z * st.speed * dt;
          var ty = Math.atan2(mv.x, mv.z), d = ty - st.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
          if (!mv.strafe) { st.yaw += d * Math.min(1, dt * 10); root.rotation.y = st.yaw; }
        }
        if (st.vy || root.position.y > 0) { st.vy -= 9.8 * dt; root.position.y = Math.max(0, root.position.y + st.vy * dt); if (root.position.y === 0) st.vy = 0; }
        st.anim = st.speed > 3 ? 'run' : st.speed > 0.15 ? 'walk' : 'idle';
        if (st.anim !== 'idle') st.phase += st.speed * dt / 0.9 * Math.PI * 2;
        var swing = st.anim !== 'idle' ? Math.sin(st.phase) * (st.anim === 'run' ? 0.8 : 0.5) : 0, ea = Math.min(1, dt * 10);
        if (rig.legL) { rig.legL.hip.rotation.x += (swing - rig.legL.hip.rotation.x) * ea; rig.legR.hip.rotation.x += (-swing - rig.legR.hip.rotation.x) * ea; }
        if (rig.armL) {
          rig.armL.shoulder.rotation.x += (-swing * 0.8 - rig.armL.shoulder.rotation.x) * ea;
          var g = st.gesture, gx = null; if (g) { var u = (Date.now() - g.t0) / g.dur; if (u >= 1) st.gesture = null; else { var env = Math.sin(Math.min(1, u * 4) * Math.PI / 2) * Math.sin(Math.min(1, (1 - u) * 4) * Math.PI / 2); gx = g.name === 'nod' ? null : { x: -2.6 * env, z: 0.5 * env + 0.3 * Math.sin(u * (g.name === 'wave' ? 22 : 14)) * env, el: -0.8 * env }; if (g.name === 'nod' && rig.neck) rig.neck.rotation.x = 0.28 * Math.sin(u * Math.PI * 3) * env; } }
          var A = rig.armR, ac = st.armCur, a = st.arm, ea7 = Math.min(1, dt * 7);
          if (gx) { A.shoulder.rotation.x += (gx.x - A.shoulder.rotation.x) * ea7; A.shoulder.rotation.z += (gx.z - A.shoulder.rotation.z) * ea7; A.elbow.rotation.x += (gx.el - A.elbow.rotation.x) * ea7; }
          else if (a && a.extend > 0.02) { ac.extend += (a.extend - ac.extend) * ea7; ac.yaw += (a.yaw - ac.yaw) * ea7; ac.pitch += (a.pitch - ac.pitch) * ea7; A.shoulder.rotation.x += (-ac.extend * (Math.PI / 2 + ac.pitch) - A.shoulder.rotation.x) * ea7; A.shoulder.rotation.y += (ac.yaw * ac.extend - A.shoulder.rotation.y) * ea7; A.shoulder.rotation.z += (0 - A.shoulder.rotation.z) * ea7; A.elbow.rotation.x += (-(1 - ac.extend) * 0.35 - A.elbow.rotation.x) * ea7; }
          else { ac.extend *= 0.9; A.shoulder.rotation.x += (swing * 0.8 - A.shoulder.rotation.x) * ea; A.shoulder.rotation.y += (0 - A.shoulder.rotation.y) * ea; A.shoulder.rotation.z += (0 - A.shoulder.rotation.z) * ea; A.elbow.rotation.x += (-0.35 - A.elbow.rotation.x) * ea; }
        }
        if (rig.pelvis && rig.pelvis !== root) rig.pelvis.position.y = 0.95 + (st.anim !== 'idle' ? Math.abs(Math.sin(st.phase)) * 0.04 : 0.01 * Math.sin(t * 1.4));
      },
      dispose: function () { global.removeEventListener('keydown', onKD); global.removeEventListener('keyup', onKU); if (tok) tok.detach(); if (space && space.local === root) space.local = null; if (rig) rig.dispose(); root = null; }
    };
    function keyOf(e) { var k = (e.key || '').toLowerCase(); return { w: 'w', a: 'a', s: 's', d: 'd', arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', shift: 'shift' }[k] || null; }
    return comp;
  });
  global.DVParticipant = pure;
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
