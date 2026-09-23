/*! dvengine — DVVerse (verse/index.js) · enter a cyborg space: document → world → participant → net → senses → journey; the refined DeltaVerse mode · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe, MIT) where derived */
/*
 *   DVVerse.enter({ canvas, doc | spaceId | tokenURI, claim, net:{ url, name, avatar }, senses:true, xr:true, controls:true, field:true, legacy:false, spaceBase:'./live/spaces/' })
 *     → Promise<verse>   verse{ space, doc, conn, participant, agents{id→comp}, zones{id→comp}, pieces, theme, rung, rank, identity, camera, senses, journey,
 *                               field (DVField: the field of influence), controls (DVControls.mount), items{name→comp},
 *                               zone (current zone id), focused, focus(agentId|null), teleport({x,y,z}), leave(), on(ev, fn) → off, emit }
 *   events  ready · portal{to,locked} · zone{id,inside} · focus{id} · say{agent,text,emotion} · snap · voucher{…, typed} · senses · gesture · peak · stage · triad · error · left
 *           recognized{degree,atBound} · unrecognized · field{id,inside} · item{name,action} · fieldmode · links
 *
 * WIRING  dv:portal → conn.event('portal',{to}) (+ a local teleport when `to` is a zone of this document)
 *         snap → remote-participants (TransformSync) + aivatar.setPose({p,r,a,arm}) + say
 *         say → aivatar.say(text, emotion)      voucher → dv:voucher + verse.on('voucher') (redemption is the participant's OWN wallet tx —
 *                                                  the typed data is shown, never signed here; DVVerse.describeVoucher(v) renders it)
 *         dv:focus (a click on an aivatar) → the camera swaps to ArcballControls around that agent AND the field of influence moves onto it
 *                  (the mouse / the right stick / an XR controller turn it; its arm follows the selected item); Escape / focus(null) swaps back — the field is the participant's own reach again
 *         the local participant near an aivatar → aivatar.reachToward(participant) every frame (the arcball arm, predicted locally); the field widens `near`
 *         THE FIELD  verse/field.js: max radius = the space extent − 1 (infinity − 1); recognized/unrecognized → theme pulse × inflow, every aivatar inside
 *                  faces the participant and greets, conn.event('field', snapshot) (2 Hz); item → conn.event('item', {name, action}); remote fields from snap.players[sid].field
 *                  render on remote-participant when their mode allows us and our inflow > 0; welcome.policy sets the dials, welcome.rank the ladder default
 * OPTIONAL globals (all degrade): DVNgnCore/DVNgnPresets (substrate skins), DVParticipantInput, DVDirector, DVThemeSynth, DVThemeRead,
 *         DVMerkleCanopy, DVNeuralNode, DVComposites, DVJourney, ArcballControls, VRButton, ethers, CyborgdCore.
 */
(function (global) {
  'use strict';
  var NS = global.DVVerse = global.DVVerse || {};

  function Emitter() { this._h = {}; }
  Emitter.prototype.on = function (ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); var self = this; return function () { self.off(ev, fn); }; };
  Emitter.prototype.off = function (ev, fn) { var a = this._h[ev]; if (a) this._h[ev] = a.filter(function (f) { return f !== fn; }); };
  Emitter.prototype.emit = function (ev, d) { var a = this._h[ev]; if (a) for (var i = 0; i < a.length; i++) { try { a[i](d); } catch (e) {} } };

  function resolveDoc(opts) {
    if (opts.doc) return Promise.resolve(opts.doc);
    var S = global.DVScene;
    if (opts.tokenURI) return S ? S.fetch(opts.tokenURI) : Promise.reject(new Error('DVScene needed for tokenURI'));
    if (opts.spaceId) { var url = /\/|\.json$/.test(opts.spaceId) ? opts.spaceId : ((opts.spaceBase || NS.spaceBase || './live/spaces/') + opts.spaceId + '.json'); return global.fetch(url).then(function (r) { if (!r.ok) throw new Error('space ' + opts.spaceId + ' → ' + r.status); return r.json(); }); }
    return Promise.resolve(S ? S.create({ id: 'agora', name: 'Agora' }) : { format: 'cyborg-space/1', id: 'agora', zones: [], nfts: [], agents: [], components: {} });
  }
  function describeVoucher(v) {
    if (!v) return '';
    var lines = ['VOUCHER ' + (v.kind || '') + ' · ' + (v.method || ''), 'contract ' + (v.contract || '-') + ' · chain ' + (v.chain || '-'), 'to ' + (v.to || '-') + (v.amount != null ? ' · amount ' + v.amount : '') + (v.token ? ' · token ' + v.token : ''), 'nonce ' + (v.nonce != null ? v.nonce : '-') + ' · deadline ' + (v.deadline != null ? v.deadline : '-'), 'sig ' + (v.sig ? String(v.sig).slice(0, 18) + '…' : '-')];
    if (v.typed) { try { lines.push('typed ' + JSON.stringify(v.typed, null, 1).replace(/\n\s*/g, ' ')); } catch (e) {} }
    lines.push('redeem with YOUR wallet: it is your transaction, never signed here.');
    return lines.join('\n');
  }

  var tickRegistered = false;
  function ensureTick() {
    if (tickRegistered || !global.DVEngine) return;
    global.DVEngine.register('verse-tick', function (props) { return { type: 'verse-tick', init: function () { return null; }, update: function (dt, t) { props.tick(dt, t); }, dispose: function () {} }; });
    tickRegistered = true;
  }

  function enter(opts) {
    opts = opts || {};
    var E = global.DVEngine; if (!E) return Promise.reject(new Error('DVVerse.enter: DVEngine not loaded'));
    if (!opts.canvas) return Promise.reject(new Error('DVVerse.enter: canvas required'));
    var verse = new Emitter();
    verse.space = null; verse.doc = null; verse.conn = null; verse.participant = null; verse.agents = {}; verse.zones = {}; verse.pieces = {}; verse.remotes = {}; verse.zone = null; verse.focused = null; verse.theme = null; verse.mesh = null; verse.host = null; verse.xr = null; verse.field = null; verse.controls = null; verse.items = {};
    var identity = NS.rung ? NS.rung.identify(opts.claim) : { rung: 0, rank: 'participant' };
    verse.identity = identity; verse.rung = identity.rung; verse.rank = identity.rank;

    return resolveDoc(opts).then(function (doc) {
      verse.doc = doc;
      if (opts.legacy) {
        var sp = E.Space(opts.canvas, { controls: true }); verse.space = sp;
        return (global.DVLegacyScene ? global.DVLegacyScene.mount(sp, doc) : sp.load(doc)).then(function () { sp.start(); verse.leave = function () { sp.dispose(); }; verse.emit('ready', { legacy: true }); return verse; });
      }
      // theme + veil for this rung
      if (NS.rung) { verse.theme = NS.rung.theme(verse.rung, doc.theme); verse.veil = NS.rung.veil(doc, verse.rung); }
      var space = E.Space(opts.canvas, { controls: false, fov: 60, cameraPosition: { x: 0, y: 2.4, z: 8 } }); verse.space = space;
      space.participants = {};
      ensureTick();
      // the document's own components first (lighting/background/fog/grass/dust/text …), lazily
      // every component type the world needs is registered FIRST (the concatenated lanes carry no components: DVEngine.lazy loads them)
      return (NS.world ? NS.world.ensure(doc) : Promise.resolve()).then(function () { return space.load(doc, { lazy: opts.lazy !== false }); }).then(function (summary) {
        verse.mounted = summary;
        var H = NS.world ? NS.world.build(space, doc, { veil: verse.veil, skyPreset: opts.skyPreset, floorPreset: opts.floorPreset, debugZones: !!opts.debugZones }) : {};
        verse.handles = H;
        function compOf(h) { if (!h) return null; var i = space._find(h); return i >= 0 ? space._components[i].comp : null; }
        for (var a in H.agents || {}) { var ac = compOf(H.agents[a]); if (ac) verse.agents[a] = ac; }
        for (var z in H.zones || {}) { var zc = compOf(H.zones[z]); if (zc) verse.zones[z] = zc; }
        for (var p in H.pieces || {}) { var pc = compOf(H.pieces[p]); if (pc) verse.pieces[p] = pc; }
        verse.thot = compOf(H.thot);
        // the participant + camera
        var z0 = doc.zones && doc.zones[0], start = z0 && z0.bounds ? { x: z0.bounds.c[0], y: z0.bounds.c[1], z: z0.bounds.c[2] + 3 } : { x: 0, y: 0, z: 4 };
        var ph = space.add('participant', { name: (opts.net && opts.net.name) || identity.name || 'participant', seed: (opts.net && opts.net.avatar && opts.net.avatar.seed) || 11, tint: opts.net && opts.net.avatar && opts.net.avatar.tint, position: opts.start || start }, { id: 'participant' });
        verse.participant = compOf(ph);
        verse.camera = NS.camera ? NS.camera.create(space, verse.participant.root, opts.camera) : null;
        verse.teleport = function (p) { if (verse.participant) verse.participant.teleport(p); if (verse.camera && verse.camera.mode === 'third') verse.camera.update(1); };
        // XR
        if (opts.xr !== false && global.DVXR) { try { verse.xr = { teleport: global.DVXR.teleport(space, { floor: H.floorMesh || (compOf(H.floor) && space.byId('floor') && space.byId('floor').object) || null }), button: global.DVXR.button(space) }; } catch (e) { verse.xr = null; } }
        // THE FIELD OF INFLUENCE (+ its items) and the controls
        var fieldOff = [];
        if (opts.field !== false && NS.field && space.THREE) {
          var F = verse.field = NS.field.create({ subject: verse.participant.root, THREE: space.THREE, doc: doc, radius: opts.fieldRadius, rank: verse.rank, claim: opts.claim, tint: (verse.theme && verse.theme.accent) || '#9fe9ff', skyTint: verse.theme && (verse.theme.sky || verse.theme.primary), storage: opts.storage });
          ['sceptre', 'orb'].forEach(function (ty) { if (!E.has(ty)) return; var ih = space.add(ty, { name: ty }, { id: 'item:' + ty }); var ic = compOf(ih); if (ic) { verse.items[ty] = ic; F.attach(ic, { name: ty }); } });
          fieldOff.push(F.mouse(opts.canvas));
          if (verse.xr && verse.xr.teleport && verse.xr.teleport.controllers) fieldOff.push(F.xr(verse.xr.teleport.controllers));
          F.on('field', function (snap) { if (verse.conn) verse.conn.event('field', snap); });
          F.on('item', function (d) { verse.emit('item', d); if (verse.conn) verse.conn.event('item', { name: d.name, action: d.action }); });
          F.on('mode', function (d) { verse.emit('fieldmode', d); F.recognise(Date.now(), true); }); F.on('links', function (d) { verse.emit('links', d); F.recognise(Date.now(), true); });
          F.on('recognized', function (d) {
            verse.emit('recognized', d);
            if (!d.atBound || verse._wasAtBound) { verse._wasAtBound = d.atBound; return; }
            verse._wasAtBound = true;
            var inflow = F.policy ? F.policy.inflow : 1;
            if (inflow > 0 && NS.rung) { try { NS.rung.theme(verse.rung, doc.theme, { t: 0.5 + 0.5 * inflow }); } catch (e) {} }
            for (var id in verse.agents) { var ag = verse.agents[id]; if (ag.root && F.contains(ag.root.position) && (F.policy ? F.policy.outflow : 1) > 0) { ag.state.targetYaw = global.DVAivatar.yawTo(ag.root.position, verse.participant.root.position); ag.gesture('greet'); } }
          });
          F.on('unrecognized', function (d) { verse._wasAtBound = false; verse.emit('unrecognized', d); });
          space.on('dv:item', function (d) { verse.emit('item', d); });
        }
        if (opts.controls !== false && global.DVControls) { try { verse.controls = global.DVControls.mount({ participant: verse.participant, field: verse.field, verse: verse, canvas: opts.canvas, senses: false, gamepad: opts.gamepad, mouse: opts.mouse, chords: opts.chords, storage: opts.storage }); } catch (e) { verse.controls = null; verse.emit('error', { code: 'controls', message: String(e && e.message || e) }); } }
        // focus: dv:focus from a click on an aivatar (or verse.focus)
        space.on('dv:focus', function (d) {
          if (d.focused) { if (verse.focused && verse.focused !== d.id && verse.agents[verse.focused]) verse.agents[verse.focused].focus(false); verse.focused = d.id; if (verse.camera) verse.camera.focus(d.object); if (verse.field) verse.field.setSubject(d.object); }
          else if (verse.focused === d.id) { verse.focused = null; if (verse.camera) verse.camera.unfocus(); if (verse.field) verse.field.setSubject(verse.participant.root); }
          if (verse.conn) verse.conn.event('focus', { agent: verse.focused });
          verse.emit('focus', { id: verse.focused, agent: verse.focused ? verse.agents[verse.focused] : null });
        });
        verse.focus = function (id) {
          if (!id) { if (verse.focused && verse.agents[verse.focused]) verse.agents[verse.focused].focus(false); else if (verse.camera) verse.camera.unfocus(); return null; }
          var ag = verse.agents[id]; if (!ag) return null; ag.focus(true); return ag;
        };
        var onKey = function (e) { if (e.key === 'Escape') verse.focus(null); };
        global.addEventListener('keydown', onKey);
        // zones + portals
        space.on('dv:zone', function (d) { if (d.inside) verse.zone = d.id; else if (verse.zone === d.id) verse.zone = null; verse.emit('zone', d); });
        space.on('dv:portal', function (d) {
          verse.emit('portal', d);
          if (verse.conn) verse.conn.event('portal', { to: d.to });
          var zt = NS.world ? NS.world.zoneById(doc, d.to) : null;
          if (zt && zt.bounds) verse.teleport({ x: zt.bounds.c[0], y: zt.bounds.c[1], z: zt.bounds.c[2] + Math.min(2, zt.bounds.r * 0.4) });
        });
        space.on('dv:portal:locked', function (d) { verse.emit('portal', { to: d.to, locked: true, minRole: d.minRole }); });
        // senses + journey
        verse.senses = NS.senses ? NS.senses.create(verse, { host: opts.host, audio: opts.senses !== false, video: opts.senses !== false }) : null;
        if (verse.senses && opts.senses !== false && opts.sensesButton !== false) verse.senses.button(opts.host);
        verse.journey = NS.journey ? NS.journey.attach(verse, verse.senses && verse.senses.director) : null;
        if (verse.journey) verse.journey.on('stage', function (s) { verse.emit('stage', s); });
        // net
        if (opts.net && opts.net.url && global.DVNet && global.DVNet.connect) connectNet(verse, opts, doc);
        // tick
        var reachV = space.THREE ? new space.THREE.Vector3() : null, sweepN = 0;
        space.add('verse-tick', { tick: function (dt, t) {
          if (verse.camera) verse.camera.update(dt);
          if (verse.senses) verse.senses.tick(dt, t);
          if (verse.controls) verse.controls.tick(dt);
          var F = verse.field; if (F) F.update(dt);
          if (verse.participant && verse.participant.root) {
            var pr = verse.participant.root.position, out = F && F.policy ? F.policy.outflow : 1, armT = F ? F.armTarget() : null;
            for (var id in verse.agents) {
              var ag = verse.agents[id]; if (!ag.root) continue; var d = ag.root.position.distanceTo(pr);
              if (F && verse.focused === id) { ag.setArm(armT, true); continue; }
              ag.influence = F && F.inside(id) ? F.radius * out : 0;
              if (d < Math.max(3.4, ag.influence)) { if (reachV) reachV.set(pr.x, pr.y + 1.3, pr.z); ag.reachToward(reachV || { x: pr.x, y: pr.y + 1.3, z: pr.z }); }
            }
            if (F && armT && !verse.focused && verse.participant.setArm) verse.participant.setArm(armT);
            if (F && (++sweepN % 6) === 0) {
              var entries = [];
              for (var a2 in verse.agents) if (verse.agents[a2].root) entries.push({ id: a2, position: verse.agents[a2].root.position });
              for (var p2 in verse.pieces) if (verse.pieces[p2].root || verse.pieces[p2].object) entries.push({ id: p2, position: (verse.pieces[p2].root || verse.pieces[p2].object).position });
              var sw = F.sweep(entries);
              sw.enter.forEach(function (i) { space._emit('dv:field', { id: i, inside: true, radius: F.radius }); verse.emit('field', { id: i, inside: true }); });
              sw.leave.forEach(function (i) { space._emit('dv:field', { id: i, inside: false, radius: F.radius }); verse.emit('field', { id: i, inside: false }); });
            }
            if (verse.conn) { var pose = verse.participant.pose(); verse.conn.state(pose.p, pose.r, pose.a, pose.s); if (verse.host && verse.host.status !== 'idle') verse.host.local({ type: 'state', p: pose.p, r: pose.r, a: pose.a, s: pose.s }); }
          }
        } }, { id: 'verse-tick' });
        verse.leave = function () {
          global.removeEventListener('keydown', onKey);
          if (verse.controls) { try { verse.controls.dispose(); } catch (e) {} } fieldOff.forEach(function (f) { try { f(); } catch (e) {} }); if (verse.field) verse.field.dispose();
          if (verse.conn) verse.conn.close(); if (verse.mesh) verse.mesh.close(); if (verse.host) verse.host.stop();
          if (verse.senses) verse.senses.dispose(); if (verse.journey) verse.journey.detach(); if (verse.camera) verse.camera.dispose(); if (verse.xr && verse.xr.teleport) verse.xr.teleport.dispose();
          space.dispose(); verse.emit('left', {});
        };
        space.start();
        verse.emit('ready', { mounted: summary.mounted, skipped: summary.skipped, agents: Object.keys(verse.agents), zones: Object.keys(verse.zones) });
        return verse;
      });
    });
  }

  function connectNet(verse, opts, doc) {
    var N = global.DVNet, space = verse.space, net = opts.net;
    var seen = {};
    var conn = N.connect(net.url, { space: doc.id || net.space || 'agora', claim: opts.claim, name: net.name, avatar: net.avatar || { kind: 'primitive', seed: 11 },
      onError: function (e) { verse.emit('error', e); } });
    verse.conn = conn;
    conn.on('welcome', function (w) { verse.rung = w.rung | 0; verse.rank = w.rank || verse.rank; if (verse.field) { verse.field.sessionId = w.sessionId; verse.field.setRank(verse.rank); if (w.policy) verse.field.setPolicy(w.policy); verse.field.recognise(Date.now(), true); } verse.emit('welcome', w); });
    conn.on('snap', function (s) {
      var now = Date.now();
      for (var sid in (s.players || {})) {
        if (sid === conn.sessionId) continue;
        var rp = verse.remotes[sid];
        if (!rp) { var h = space.add('remote-participant', { sessionId: sid, name: (seen[sid] && seen[sid].name) || sid.slice(0, 6), avatar: seen[sid] && seen[sid].avatar }, { id: 'remote:' + sid }); var i = space._find(h); rp = verse.remotes[sid] = { handle: h, comp: space._components[i].comp, at: now }; }
        rp.at = now; rp.comp.push(s.players[sid], s.ts);
        var fd = s.players[sid].field; if (fd && rp.comp.setField) { var FM = global.DVFieldMath; rp.comp.setField(fd, FM ? FM.visibleTo(fd, sid, conn.sessionId, verse.field && verse.field.policy ? verse.field.policy.inflow : 1) : fd.mode !== 'private'); }
      }
      for (var sid2 in verse.remotes) if (now - verse.remotes[sid2].at > 4000) { space.remove(verse.remotes[sid2].handle); delete verse.remotes[sid2]; }
      for (var aid in (s.agents || {})) { var ag = verse.agents[aid]; if (!ag) continue; var st = s.agents[aid]; ag.setPose({ p: st.p, r: st.r, a: st.a, arm: st.arm }); if (st.say) ag.say(st.say.text || st.say, st.say.emotion); }
      verse.emit('snap', s);
    });
    conn.on('joined', function (j) { seen[j.sessionId] = j; verse.emit('joined', j); });
    conn.on('left', function (l) { var rp = verse.remotes[l.sessionId]; if (rp) { space.remove(rp.handle); delete verse.remotes[l.sessionId]; } verse.emit('peer-left', l); });
    conn.on('say', function (m) { var ag = verse.agents[m.agent]; if (ag) ag.say(m.text, m.emotion); verse.emit('say', m); });
    conn.on('voucher', function (v) { space._emit('dv:voucher', v); verse.emit('voucher', v); });
    conn.on('triad', function (t) { verse.emit('triad', t); });
    conn.on('denied', function (d) { verse.emit('denied', d); });
    if (global.DVPeer && global.DVPeer.mesh) {
      verse.mesh = global.DVPeer.mesh(conn);
      if (global.DVHost && global.DVHost.create) { verse.host = global.DVHost.create(conn, verse.mesh, { doc: doc }); verse.host.on('status', function (s) { verse.emit('host', s); }); }
    }
  }

  NS.enter = enter; NS.describeVoucher = describeVoucher; NS.resolveDoc = resolveDoc; NS.version = '0.2.0'; NS.spaceBase = NS.spaceBase || './live/spaces/';
  NS.optionalGlobals = ['DVNgnCore', 'DVNgnPresets', 'DVParticipantInput', 'DVDirector', 'DVThemeSynth', 'DVThemeRead', 'DVComposites', 'DVNeuralNode', 'DVMerkleCanopy', 'DVJourney', 'ArcballControls', 'VRButton', 'ethers', 'CyborgdCore'];
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
