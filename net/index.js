/*! dvengine — DVNet (net/index.js) · the cyborg/1 client: one WebSocket to the anchor, 20 Hz state, reconnect, repoint, the triad · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe, MIT) where derived */
/*
 * PROTOCOL cyborg/1 over ws://host:8790/ws (cyborgd daemon/protocol.mjs is the source of truth; messages
 * are JSON objects discriminated by `type` — `t` is accepted on the way in for tolerance).
 *
 *   client → server   hello{v,space,claim?,name?,vrm?,avatar?}  state{p,r,a,s,txt?} (≤20 Hz)
 *                     cmd{tick,seq,mx,my,sprint,jp,jr,jh,yaw}    msg{to?,data}   event{name,data}
 *                     ping{t}   rtc{to,kind,payload}   mirror{tick,snap}
 *   server → client   welcome{sessionId,tick,rate,rung,rank,space,players,agents,insecure?}   denied{reason,minRole}
 *                     joined{sessionId,name,avatar}  left{sessionId}  snap{tick,ts,players,agents}  ack{tick,seq,checkpoint}
 *                     msg{from,data}  voucher{…}  say{agent,text,emotion}  pong{t,serverT}  error{code,message}
 *                     peers{list}  host{sessionId}  repoint{host}
 *
 *   var conn = DVNet.connect(url, { space, claim, name, avatar, onSnap, onSay, onVoucher, onPeers, onHost, onRepoint, onError });
 *   conn.state(p, r, a, s, txt)   // throttled to 20 Hz, identical frames are not resent
 *   conn.cmd(frame) · conn.event(name, data) · conn.msg(data, to) · conn.ping() · conn.send(obj)
 *   conn.on('welcome'|'snap'|'say'|'voucher'|'peers'|'host'|'repoint'|'msg'|'joined'|'left'|'ack'|'error'|'open'|'close'|'rtc'|'triad', fn) → off
 *   conn.sessionId · conn.rung (0..8) · conn.rank (rung name) · conn.latency · conn.jitter · conn.triad{role,host,peers} · conn.close()
 *
 * Reconnect: exponential backoff 1 s → 30 s (DVNet.backoff(attempt)), the hello is re-sent, `denied` stops it.
 * Repoint: `repoint{host}` closes this socket and connects to the new anchor with the same hello.
 * THE TRIAD: DVNet.triad = { role:'client'|'host'|'anchor', host, peers } — the anchor is the daemon; a
 * participant becomes `host` when host{sessionId} names them (net/host.js runs the isomorphic core then).
 * `dv:triad` fires on the connection and as a window CustomEvent whenever the triad changes.
 *
 * Zero-dependency UMD: window.DVNet (merged with net/interp.js) + module.exports.
 */
(function (global) {
  'use strict';

  var VERSION = 'cyborg/1';
  var STATE_MS = 50;             // 20 Hz
  var PING_MS = 5000;
  var EPS = 1e-4;

  function now() { return Date.now(); }
  function backoff(attempt) { return Math.min(30000, 1000 * Math.pow(2, Math.max(0, attempt | 0))); }

  function sameState(a, b) {
    if (!a || !b) return false;
    for (var i = 0; i < 3; i++) if (Math.abs(a.p[i] - b.p[i]) > EPS || Math.abs(a.r[i] - b.r[i]) > EPS) return false;
    return a.a === b.a && Math.abs(a.s - b.s) < EPS && (a.txt || '') === (b.txt || '');
  }

  function Emitter() { this._h = {}; }
  Emitter.prototype.on = function (ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); var self = this; return function () { self.off(ev, fn); }; };
  Emitter.prototype.off = function (ev, fn) { var a = this._h[ev]; if (a) this._h[ev] = a.filter(function (f) { return f !== fn; }); };
  Emitter.prototype.emit = function (ev, d) { var a = this._h[ev]; if (a) for (var i = 0; i < a.length; i++) { try { a[i](d); } catch (e) {} } };

  function Conn(url, opts) {
    Emitter.call(this);
    opts = opts || {};
    this.url = url; this.opts = opts;
    this.WS = opts.WebSocket || global.WebSocket;
    this.sessionId = null; this.rung = 0; this.rank = 'participant'; this.space = null; this.rate = { sim: 60, net: 20 }; this.insecure = false;
    this.latency = 0; this.jitter = 0; this.serverOffset = 0;
    this.triad = { role: 'client', host: null, peers: [] };
    this._ws = null; this._open = false; this._closed = false; this._attempt = 0; this._timer = null; this._pingT = null;
    this._lastSent = null; this._pending = null; this._lastSendAt = 0; this._stateT = null;
    var self = this;
    ['onSnap', 'onSay', 'onVoucher', 'onPeers', 'onHost', 'onRepoint', 'onError', 'onWelcome', 'onMsg'].forEach(function (k) {
      if (typeof opts[k] === 'function') self.on(k.slice(2).toLowerCase(), opts[k]);
    });
    this._connect();
  }
  Conn.prototype = Object.create(Emitter.prototype);
  Conn.prototype.constructor = Conn;

  Conn.prototype._hello = function () {
    var o = this.opts, h = { type: 'hello', v: VERSION, space: o.space || 'agora' };
    if (o.claim) h.claim = o.claim;
    if (o.name) h.name = String(o.name).slice(0, 32);
    if (o.vrm) h.vrm = o.vrm;
    if (o.avatar) h.avatar = o.avatar;
    return h;
  };

  Conn.prototype._connect = function () {
    if (this._closed) return;
    if (!this.WS) { this.emit('error', { code: 'no-websocket', message: 'WebSocket unavailable' }); return; }
    var self = this, ws;
    try { ws = new this.WS(this.url); } catch (e) { this.emit('error', { code: 'connect', message: String(e && e.message || e) }); this._schedule(); return; }
    this._ws = ws;
    ws.onopen = function () {
      self._open = true; self._attempt = 0;
      self.send(self._hello());
      self.emit('open', { url: self.url });
      if (self._pingT) clearInterval(self._pingT);
      self._pingT = setInterval(function () { self.ping(); }, PING_MS);
      self.ping();
    };
    ws.onmessage = function (ev) {
      var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || typeof m !== 'object') return;
      self._receive(m);
    };
    ws.onerror = function () { self.emit('error', { code: 'socket', message: 'websocket error' }); };
    ws.onclose = function (ev) {
      self._open = false; self._ws = null;
      if (self._pingT) { clearInterval(self._pingT); self._pingT = null; }
      self.emit('close', { code: ev && ev.code, reason: ev && ev.reason, willReconnect: !self._closed });
      self._schedule();
    };
  };

  Conn.prototype._schedule = function () {
    if (this._closed || this._timer) return;
    var self = this, ms = backoff(this._attempt++);
    this.emit('reconnecting', { attempt: this._attempt, inMs: ms });
    this._timer = setTimeout(function () { self._timer = null; self._connect(); }, ms);
  };

  Conn.prototype._setTriad = function (patch) {
    var t = this.triad, changed = false;
    for (var k in patch) if (JSON.stringify(t[k]) !== JSON.stringify(patch[k])) { t[k] = patch[k]; changed = true; }
    if (!changed) return;
    DVNet.triad = t;
    this.emit('triad', t);
    try { if (global.dispatchEvent && global.CustomEvent) global.dispatchEvent(new global.CustomEvent('dv:triad', { detail: t })); } catch (e) {}
  };

  Conn.prototype._receive = function (m) {
    var type = m.type || m.t;
    switch (type) {
      case 'welcome':
        this.sessionId = m.sessionId; this.rung = m.rung | 0; this.rank = m.rank || 'participant'; this.space = m.space || null;
        if (m.rate) this.rate = m.rate; this.insecure = !!m.insecure; this.tick = m.tick | 0;
        this._setTriad({ role: (m.host && m.host === m.sessionId) ? 'host' : 'client', host: m.host || null });
        this.emit('welcome', m); break;
      case 'denied': this._closed = true; this.emit('denied', m); this.emit('error', { code: 'denied', message: m.reason, minRole: m.minRole }); break;
      case 'snap': this.tick = m.tick; this.emit('snap', m); break;
      case 'say': this.emit('say', m); break;
      case 'voucher': this.emit('voucher', m); break;
      case 'peers': this._setTriad({ peers: (m.list || []).slice() }); this.emit('peers', m); break;
      case 'host': this._setTriad({ host: m.sessionId || null, role: (m.sessionId && m.sessionId === this.sessionId) ? 'host' : 'client' }); this.emit('host', m); break;
      case 'repoint': this.emit('repoint', m); this.repoint(m.host); break;
      case 'pong': this._onPong(m); this.emit('pong', m); break;
      case 'error': this.emit('error', m); break;
      case 'msg': this.emit('msg', m); break;
      case 'joined': this.emit('joined', m); break;
      case 'left': this.emit('left', m); break;
      case 'ack': this.emit('ack', m); break;
      case 'rtc': this.emit('rtc', m); break;
      default: this.emit('unknown', m);
    }
    this.emit('message', m);
  };

  Conn.prototype._onPong = function (m) {
    var rtt = now() - (+m.t || now());
    if (rtt < 0 || rtt > 60000) return;
    var prev = this.latency;
    this.latency = prev ? prev * 0.8 + rtt * 0.2 : rtt;
    this.jitter = this.jitter * 0.8 + Math.abs(rtt - this.latency) * 0.2;
    if (m.serverT != null) this.serverOffset = now() - (+m.serverT + rtt / 2);
  };

  Conn.prototype.send = function (obj) {
    if (!this._open || !this._ws) return false;
    try { this._ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); return true; } catch (e) { return false; }
  };
  /** Pose of the local participant; ≤20 Hz, identical frames are not resent. */
  Conn.prototype.state = function (p, r, a, s, txt) {
    var st = { type: 'state', p: [+p[0] || 0, +p[1] || 0, +p[2] || 0], r: [+r[0] || 0, +r[1] || 0, +r[2] || 0], a: String(a || 'idle').slice(0, 32), s: s > 0 ? +s : 1 };
    if (txt) st.txt = String(txt).slice(0, 140);
    if (sameState(st, this._lastSent)) return false;
    this._pending = st;
    var self = this, wait = STATE_MS - (now() - this._lastSendAt);
    if (wait <= 0) { this._flush(); return true; }
    if (!this._stateT) this._stateT = setTimeout(function () { self._stateT = null; self._flush(); }, wait);
    return true;
  };
  Conn.prototype._flush = function () {
    if (!this._pending) return;
    if (sameState(this._pending, this._lastSent)) { this._pending = null; return; }
    if (this.send(this._pending)) { this._lastSent = this._pending; this._lastSendAt = now(); }
    this._pending = null;
  };
  Conn.prototype.cmd = function (frame) { var f = { type: 'cmd' }; for (var k in frame) f[k] = frame[k]; return this.send(f); };
  Conn.prototype.event = function (name, data) { return this.send({ type: 'event', name: name, data: data || {} }); };
  Conn.prototype.msg = function (data, to) { var m = { type: 'msg', data: data }; if (to) m.to = to; return this.send(m); };
  Conn.prototype.ping = function () { return this.send({ type: 'ping', t: now() }); };
  Conn.prototype.rtc = function (to, kind, payload) { return this.send({ type: 'rtc', to: to, kind: kind, payload: payload }); };
  Conn.prototype.mirror = function (tick, snap) { return this.send({ type: 'mirror', tick: tick, snap: snap }); };
  Conn.prototype.repoint = function (host) {
    if (!host) return;
    this.url = /^wss?:\/\//.test(host) ? host : ('ws://' + host + '/ws');
    this._attempt = 0;
    if (this._ws) { try { this._ws.close(1000, 'repoint'); } catch (e) {} } else this._schedule();
  };
  Conn.prototype.close = function () {
    this._closed = true;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._stateT) { clearTimeout(this._stateT); this._stateT = null; }
    if (this._pingT) { clearInterval(this._pingT); this._pingT = null; }
    if (this._ws) { try { this._ws.close(1000, 'leave'); } catch (e) {} this._ws = null; }
    this.emit('closed', {});
  };
  Conn.prototype.isOpen = function () { return this._open; };

  var DVNet = global.DVNet = global.DVNet || {};
  DVNet.connect = function (url, opts) { return new Conn(url, opts); };
  DVNet.Conn = Conn; DVNet.backoff = backoff; DVNet.sameState = sameState; DVNet.VERSION = VERSION; DVNet.STATE_MS = STATE_MS;
  DVNet.triad = { role: 'client', host: null, peers: [] };
  DVNet.version = '0.1.0';
  DVNet.upstream = 'cyborg/1 (github.com/dddcyborgd/cyborgd) · awe examples/multiplayer (MIT)';
  if (typeof module !== 'undefined' && module.exports) module.exports = DVNet;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
