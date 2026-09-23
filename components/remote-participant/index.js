/*! dvengine — component remote-participant (components/remote-participant/index.js) · a peer's avatar fed by DVNet.TransformSync, with a name label and their txt · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · DeltaVerse-native (interpolation © oncyberio awe, MIT) */
/*
 * Props: { sessionId, name, avatar:{kind,seed,tint}, position }
 * push(state{p,r,a,s,txt}, ts) feeds the snapshot buffer; every frame the rig eases to the interpolated
 * transform (net/interp.js: 200 ms buffer at 20 Hz, ≤100 ms extrapolation, shortest-arc yaw). The
 * animation state `a` drives the legs; `txt` shows as a bubble. The verse registers the root in
 * space.participants[sessionId] so aivatars can look at peers too.
 * API: push(state, ts), root, sessionId, name, setField({ r, max, mode, at }, visible) — a faint ring at shoulder height sized to the
 *      peer's FIELD of influence (verse/field.js), shown only when the peer's mode allows this viewer and the local inflow > 0.
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) { if (typeof module !== 'undefined' && module.exports) module.exports = {}; return; }

  global.DVEngine.register('remote-participant', function (props) {
    props = props || {};
    var THREE, space, rig, root, sync = null, label = null, bubble = null, bubbleTxt = null, st = { anim: 'idle', phase: 0, last: null }, sid = props.sessionId || 'peer';
    var av = props.avatar || {};
    var ring = null, ringR = 0, ringWant = 0;
    var comp = {
      type: 'remote-participant', sessionId: sid,
      init: function (ctx) {
        THREE = ctx.THREE; space = ctx.space;
        var tint = av.tint || (global.DVAivatar ? global.DVAivatar.dimsStyle(null, av.seed || sid.length * 97).tint : '#c77dff');
        var col = parseInt(String(tint).replace('#', ''), 16);
        if (global.DVAivatar) rig = global.DVAivatar.buildRig(THREE, { color: col, face: false, name: 'remote:' + sid });
        else { var g = new THREE.CapsuleGeometry(0.3, 1.1, 4, 12), m = new THREE.MeshStandardMaterial({ color: col }), mesh = new THREE.Mesh(g, m); mesh.position.y = 0.9; var r = new THREE.Group(); r.add(mesh); rig = { root: r, pelvis: r, legL: null, armL: null, height: 1.9, dispose: function () { g.dispose(); m.dispose(); } }; }
        root = rig.root;
        var p = props.position || { x: 0, y: 0, z: 0 }; root.position.set(+p.x || 0, +p.y || 0, +p.z || 0);
        st.last = root.position.clone();
        if (global.DVNet && global.DVNet.TransformSync) sync = new global.DVNet.TransformSync({ tickRate: 20 });
        if (global.DVAivatar) { label = global.DVAivatar.bubbleSprite(THREE, props.name || sid.slice(0, 8), 'calm'); label.scale.set(1.4, 0.35, 1); label.position.y = rig.height + 0.2; root.add(label); }
        space.participants = space.participants || {}; space.participants[sid] = root;
        root.userData.dvRemote = comp;
        return root;
      },
      push: function (s, ts) {
        if (!s) return;
        st.anim = s.a || 'idle';
        if (s.txt !== bubbleTxt) { bubbleTxt = s.txt || null; if (bubble) { root.remove(bubble); bubble.material.map.dispose(); bubble.material.dispose(); bubble = null; } if (bubbleTxt && global.DVAivatar) { bubble = global.DVAivatar.bubbleSprite(THREE, bubbleTxt, 'neutral'); bubble.position.y = rig.height + 0.6; root.add(bubble); } }
        if (sync) sync.push({ position: { x: +s.p[0] || 0, y: +s.p[1] || 0, z: +s.p[2] || 0 }, rotation: { x: 0, y: +(s.r && s.r[1]) || 0, z: 0 }, updatedAt: ts || Date.now() });
        else { root.position.set(+s.p[0] || 0, +s.p[1] || 0, +s.p[2] || 0); root.rotation.y = +(s.r && s.r[1]) || 0; }
        if (s.s > 0) root.scale.setScalar(+s.s);
      },
      setField: function (fd, visible) {
        if (!root || !fd) return; ringWant = visible && fd.r > 0 ? +fd.r : 0;
        if (!ring && ringWant) { var g = new THREE.RingGeometry(0.96, 1, 48).rotateX(-Math.PI / 2), mm = new THREE.MeshBasicMaterial({ color: fd.at === 'bound' ? 0xf5c451 : 0x9fe9ff, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }); ring = new THREE.Mesh(g, mm); ring.position.y = 1.3; ring.name = 'remote-field'; root.add(ring); }
        if (ring) { ring.material.color.setHex(fd.at === 'bound' ? 0xf5c451 : 0x9fe9ff); ring.userData.mode = fd.mode || 'open'; }
      },
      get root() { return root; }, get name() { return props.name || sid; }, get field() { return ring ? { r: ringR, mode: ring.userData.mode } : null; },
      update: function (dt, t) {
        if (!root) return;
        if (sync) sync.update(root, dt);
        if (ring) { ringR += (ringWant - ringR) * Math.min(1, dt * 3); ring.visible = ringR > 0.05; if (ring.visible) { ring.scale.setScalar(ringR); ring.material.opacity = 0.1 + 0.05 * Math.sin(t * 1.5); } }
        var moved = root.position.distanceTo(st.last); st.last.copy(root.position);
        var moving = st.anim !== 'idle' || moved / (dt || 1) > 0.1;
        if (moving) st.phase += Math.max(moved, dt * 0.6) / 0.9 * Math.PI * 2;
        var swing = moving ? Math.sin(st.phase) * 0.5 : 0, ea = Math.min(1, dt * 10);
        if (rig.legL) { rig.legL.hip.rotation.x += (swing - rig.legL.hip.rotation.x) * ea; rig.legR.hip.rotation.x += (-swing - rig.legR.hip.rotation.x) * ea; rig.armL.shoulder.rotation.x += (-swing * 0.8 - rig.armL.shoulder.rotation.x) * ea; rig.armR.shoulder.rotation.x += (swing * 0.8 - rig.armR.shoulder.rotation.x) * ea; }
        if (rig.pelvis !== root) rig.pelvis.position.y = 0.95 + (moving ? Math.abs(Math.sin(st.phase)) * 0.04 : 0.01 * Math.sin(t * 1.4));
        if (label) label.visible = !bubble;
      },
      dispose: function () { if (ring) { ring.geometry.dispose(); ring.material.dispose(); } if (space && space.participants) delete space.participants[sid]; if (label) { label.material.map.dispose(); label.material.dispose(); } if (bubble) { bubble.material.map.dispose(); bubble.material.dispose(); } if (rig) rig.dispose(); root = null; }
    };
    return comp;
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = { type: 'remote-participant' };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
