/*! dvengine — DVHost (net/host.js) · the triad's host role: run the daemon's isomorphic core locally, serve peers, mirror the anchor · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 * THE TRIAD: every participant is both client and server. Roles —
 *   client   the default: state to the anchor (or to the host peer when one is named), snaps back
 *   host     host{sessionId} names me: I run window.CyborgdCore.createRoom(doc, {now}) — the daemon's OWN
 *            simulation core (cyborgd dist/cyborgd-core.js) — feed it my peers' state/cmd/event messages
 *            from the RTCDataChannels, broadcast `snap` to peers and `mirror{tick,snap}` to the anchor at 20 Hz
 *   anchor   the daemon: rendezvous, identity (claims), vouchers, the canonical snapshot, failover host
 *
 *   var host = DVHost.create(conn, mesh, { doc, now });    host.status: 'idle'|'hosting'|'forwarding'|'unavailable'
 *   host.on('status'|'snap', fn) · host.local(stateMsg) (my own state into the room when hosting) · host.stop()
 *
 * When CyborgdCore is absent at runtime the host reports `unavailable` and everyone stays a client of the
 * anchor — the space keeps working, only the local-serve lane is off. The core's surface is read
 * defensively (createRoom / room.receive|handle / room.step|triadStep / room.snapshot|snap) because the
 * daemon is built beside this; whichever names land, the adapter below says which one it found.
 * Zero-dependency UMD: window.DVHost + module.exports.
 */
(function (global) {
  'use strict';
  var NET_MS = 50;

  function Emitter() { this._h = {}; }
  Emitter.prototype.on = function (ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); var self = this; return function () { self.off(ev, fn); }; };
  Emitter.prototype.off = function (ev, fn) { var a = this._h[ev]; if (a) this._h[ev] = a.filter(function (f) { return f !== fn; }); };
  Emitter.prototype.emit = function (ev, d) { var a = this._h[ev]; if (a) for (var i = 0; i < a.length; i++) { try { a[i](d); } catch (e) {} } };

  /** Adapt whatever the isomorphic core exposes to { receive(sid,msg), step(now), snapshot() } or null. */
  function adaptCore(core, doc, nowFn) {
    if (!core || typeof core.createRoom !== 'function') return null;
    var room; try { room = core.createRoom(doc, { now: nowFn }); } catch (e) { return null; }
    if (!room) return null;
    var receive = room.receive || room.handle || room.onMessage || room.feed;
    var step = room.step || room.tick || (typeof core.triadStep === 'function' ? function (t) { return core.triadStep(room, t); } : null);
    var snapshot = room.snapshot || room.snap || room.state;
    if (!receive || !step || !snapshot) return null;
    return { room: room, receive: function (sid, msg) { return receive.call(room, sid, msg); }, step: function (t) { return step.call(room, t); }, snapshot: function () { return snapshot.call(room); }, found: { receive: receive.name, step: step.name, snapshot: snapshot.name } };
  }

  function Host(conn, mesh, opts) {
    Emitter.call(this);
    opts = opts || {};
    this.conn = conn; this.mesh = mesh; this.doc = opts.doc || null; this.now = opts.now || function () { return Date.now(); };
    this.status = 'idle'; this.core = null; this.tick = 0; this._timer = null; this.hostSid = null;
    var self = this;
    this._offHost = conn.on('triad', function (t) { self._onTriad(t); });
    this._offMsg = mesh ? mesh.on('message', function (d) { self._onPeer(d.from, d.msg); }) : null;
    this._offClose = conn.on('closed', function () { self.stop(); });
    if (conn.triad) this._onTriad(conn.triad);
  }
  Host.prototype = Object.create(Emitter.prototype);
  Host.prototype.constructor = Host;
  Host.prototype._set = function (s, extra) { if (this.status === s) return; this.status = s; this.emit('status', { status: s, host: this.hostSid, extra: extra || null }); };
  Host.prototype._onTriad = function (t) {
    this.hostSid = t.host || null;
    if (this.hostSid && this.hostSid === this.conn.sessionId) this._becomeHost();
    else { this._stopLoop(); this._set(this.hostSid ? 'forwarding' : 'idle'); }
  };
  Host.prototype._becomeHost = function () {
    if (this.status === 'hosting') return;
    var core = adaptCore(global.CyborgdCore, this.doc, this.now);
    if (!core) { this._set('unavailable', { reason: global.CyborgdCore ? 'core surface not recognised' : 'window.CyborgdCore absent' }); return; }
    this.core = core; this._set('hosting', core.found);
    var self = this;
    this._timer = setInterval(function () { self._loop(); }, NET_MS);
  };
  Host.prototype._stopLoop = function () { if (this._timer) { clearInterval(this._timer); this._timer = null; } this.core = null; };
  Host.prototype._loop = function () {
    if (!this.core) return;
    var t = this.now();
    try { this.core.step(t); } catch (e) { this.emit('error', e); return; }
    var snap; try { snap = this.core.snapshot(); } catch (e) { this.emit('error', e); return; }
    if (!snap) return;
    this.tick++;
    var out = { type: 'snap', tick: snap.tick != null ? snap.tick : this.tick, ts: snap.ts || t, players: snap.players || {}, agents: snap.agents || {} };
    if (this.mesh) this.mesh.broadcast(out);
    this.conn.mirror(out.tick, out);
    this.emit('snap', out);
  };
  /** A peer's message from the data channel: fed to the room when hosting; a host's snap replayed locally when forwarding. */
  Host.prototype._onPeer = function (sid, msg) {
    if (!msg) return;
    var type = msg.type || msg.t;
    if (this.status === 'hosting' && this.core && (type === 'state' || type === 'cmd' || type === 'event')) { try { this.core.receive(sid, msg); } catch (e) {} return; }
    if (this.status === 'forwarding' && sid === this.hostSid && type === 'snap') { this.conn.emit('snap', msg); this.emit('snap', msg); }
  };
  /** My own state: into the room when hosting, to the host peer when forwarding (the anchor always gets it too via conn.state). */
  Host.prototype.local = function (stateMsg) {
    if (this.status === 'hosting' && this.core) { try { this.core.receive(this.conn.sessionId, stateMsg); } catch (e) {} return true; }
    if (this.status === 'forwarding' && this.mesh && this.hostSid) return this.mesh.sendTo(this.hostSid, stateMsg);
    return false;
  };
  Host.prototype.stop = function () { this._stopLoop(); if (this._offHost) this._offHost(); if (this._offMsg) this._offMsg(); if (this._offClose) this._offClose(); this._set('idle'); };

  var DVHost = { create: function (conn, mesh, opts) { return new Host(conn, mesh, opts); }, Host: Host, adaptCore: adaptCore, NET_MS: NET_MS, version: '0.1.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVHost;
  global.DVHost = DVHost;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
