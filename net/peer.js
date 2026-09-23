/*! dvengine — DVPeer (net/peer.js) · RTCPeerConnection + one reliable DataChannel "cyborg/1" per peer, signalled through the anchor · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 *   var peer = DVPeer.create(conn, remoteSessionId, { initiator })   // one RTCPeerConnection, one ordered+reliable channel
 *   peer.send(obj) · peer.on('open'|'message'|'close'|'error', fn) · peer.close() · peer.state
 *   var mesh = DVPeer.mesh(conn)          // one peer per `peers.list` entry; the LOWER sessionId offers
 *   mesh.peers (sid → peer) · mesh.broadcast(obj) · mesh.sendTo(sid,obj) · mesh.on('peer'|'gone'|'message', fn) · mesh.close()
 *
 * Signalling rides the anchor socket: conn.rtc(to, kind, payload) → server relays {type:'rtc', from, kind, payload}.
 * ICE: window.DV_ICE_SERVERS (array) when set; otherwise NO servers — host candidates only (LAN / same
 * network), which is the clean-room default: nothing here reaches a third party unless the operator says so.
 * Zero-dependency UMD: window.DVPeer + module.exports. Pure helpers: DVPeer.isInitiator(a, b).
 */
(function (global) {
  'use strict';
  var LABEL = 'cyborg/1';

  function Emitter() { this._h = {}; }
  Emitter.prototype.on = function (ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); var self = this; return function () { self.off(ev, fn); }; };
  Emitter.prototype.off = function (ev, fn) { var a = this._h[ev]; if (a) this._h[ev] = a.filter(function (f) { return f !== fn; }); };
  Emitter.prototype.emit = function (ev, d) { var a = this._h[ev]; if (a) for (var i = 0; i < a.length; i++) { try { a[i](d); } catch (e) {} } };

  /** The offer comes from the lower sessionId (plain string order) — deterministic, no glare. */
  function isInitiator(mySid, theirSid) { return String(mySid) < String(theirSid); }
  function iceServers() { return Array.isArray(global.DV_ICE_SERVERS) ? global.DV_ICE_SERVERS : []; }

  function Peer(conn, sid, opts) {
    Emitter.call(this);
    opts = opts || {};
    this.conn = conn; this.sid = sid; this.initiator = !!opts.initiator; this.state = 'new'; this.channel = null; this.pc = null;
    var RTC = opts.RTCPeerConnection || global.RTCPeerConnection;
    if (!RTC) { this.state = 'unavailable'; return; }
    var self = this;
    var pc = this.pc = new RTC({ iceServers: iceServers() });
    pc.onicecandidate = function (e) { if (e.candidate) conn.rtc(sid, 'ice', e.candidate); };
    pc.onconnectionstatechange = function () {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') { self.state = pc.connectionState; self.emit('close', { sid: sid, state: pc.connectionState }); }
    };
    pc.ondatachannel = function (e) { self._bind(e.channel); };
    if (this.initiator) {
      this._bind(pc.createDataChannel(LABEL, { ordered: true }));
      pc.createOffer().then(function (offer) { return pc.setLocalDescription(offer); }).then(function () { conn.rtc(sid, 'offer', pc.localDescription); })
        .catch(function (e) { self.emit('error', e); });
    }
    this._pendingIce = [];
  }
  Peer.prototype = Object.create(Emitter.prototype);
  Peer.prototype.constructor = Peer;
  Peer.prototype._bind = function (ch) {
    var self = this; this.channel = ch;
    ch.onopen = function () { self.state = 'open'; self.emit('open', { sid: self.sid }); };
    ch.onclose = function () { self.state = 'closed'; self.emit('close', { sid: self.sid }); };
    ch.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (err) { return; } self.emit('message', { from: self.sid, msg: m }); };
  };
  /** Feed a relayed {kind, payload} signal for this peer. */
  Peer.prototype.signal = function (kind, payload) {
    var pc = this.pc, self = this; if (!pc) return;
    if (kind === 'offer') {
      pc.setRemoteDescription(payload).then(function () { return pc.createAnswer(); }).then(function (a) { return pc.setLocalDescription(a); })
        .then(function () { self.conn.rtc(self.sid, 'answer', pc.localDescription); self._drainIce(); }).catch(function (e) { self.emit('error', e); });
    } else if (kind === 'answer') {
      pc.setRemoteDescription(payload).then(function () { self._drainIce(); }).catch(function (e) { self.emit('error', e); });
    } else if (kind === 'ice') {
      if (pc.remoteDescription) pc.addIceCandidate(payload).catch(function () {}); else this._pendingIce.push(payload);
    }
  };
  Peer.prototype._drainIce = function () { var pc = this.pc, q = this._pendingIce; this._pendingIce = []; q.forEach(function (c) { pc.addIceCandidate(c).catch(function () {}); }); };
  Peer.prototype.send = function (obj) {
    if (!this.channel || this.channel.readyState !== 'open') return false;
    try { this.channel.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); return true; } catch (e) { return false; }
  };
  Peer.prototype.close = function () { try { if (this.channel) this.channel.close(); } catch (e) {} try { if (this.pc) this.pc.close(); } catch (e) {} this.state = 'closed'; };

  function Mesh(conn) {
    Emitter.call(this);
    var self = this; this.conn = conn; this.peers = {};
    this._offPeers = conn.on('peers', function (m) { self.reconcile(m.list || []); });
    this._offRtc = conn.on('rtc', function (m) { var p = self.peers[m.from]; if (!p && m.kind === 'offer') p = self._add(m.from, false); if (p) p.signal(m.kind, m.payload); });
    this._offClose = conn.on('closed', function () { self.close(); });
    if (conn.triad && conn.triad.peers && conn.triad.peers.length) this.reconcile(conn.triad.peers);
  }
  Mesh.prototype = Object.create(Emitter.prototype);
  Mesh.prototype.constructor = Mesh;
  Mesh.prototype._add = function (sid, initiator) {
    var self = this, p = new Peer(this.conn, sid, { initiator: initiator });
    this.peers[sid] = p;
    p.on('message', function (d) { self.emit('message', d); });
    p.on('open', function () { self.emit('peer', { sid: sid, peer: p }); });
    p.on('close', function () { if (self.peers[sid] === p) { delete self.peers[sid]; self.emit('gone', { sid: sid }); } });
    return p;
  };
  /** Bring the peer set in line with `peers.list` (entries {sessionId, role, rung}). */
  Mesh.prototype.reconcile = function (list) {
    var me = this.conn.sessionId, want = {}, i;
    for (i = 0; i < list.length; i++) { var sid = list[i].sessionId || list[i]; if (sid && sid !== me) want[sid] = list[i]; }
    for (var sid2 in this.peers) if (!want[sid2]) { this.peers[sid2].close(); delete this.peers[sid2]; this.emit('gone', { sid: sid2 }); }
    for (var sid3 in want) if (!this.peers[sid3] && isInitiator(me, sid3)) this._add(sid3, true);
    // non-initiators wait for the offer (see _offRtc)
  };
  Mesh.prototype.broadcast = function (obj) { var n = 0, s = typeof obj === 'string' ? obj : JSON.stringify(obj); for (var k in this.peers) if (this.peers[k].send(s)) n++; return n; };
  Mesh.prototype.sendTo = function (sid, obj) { var p = this.peers[sid]; return p ? p.send(obj) : false; };
  Mesh.prototype.count = function () { return Object.keys(this.peers).length; };
  Mesh.prototype.close = function () { for (var k in this.peers) this.peers[k].close(); this.peers = {}; if (this._offPeers) this._offPeers(); if (this._offRtc) this._offRtc(); if (this._offClose) this._offClose(); };

  var DVPeer = { create: function (conn, sid, opts) { return new Peer(conn, sid, opts); }, mesh: function (conn) { return new Mesh(conn); }, Peer: Peer, Mesh: Mesh, isInitiator: isInitiator, iceServers: iceServers, LABEL: LABEL, version: '0.1.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVPeer;
  global.DVPeer = DVPeer;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
