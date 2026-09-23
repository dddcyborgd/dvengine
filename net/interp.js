/*! dvengine — DVNet.SnapshotBuffer + DVNet.TransformSync (net/interp.js) · snapshot interpolation for remote transforms · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe, MIT) where derived */
/*
 * Port of awe examples/multiplayer/shared/snapshot-interpolation.ts + src/multiplayer/transform-sync.ts
 * (network-constants.ts folded in, re-tuned for cyborg/1's 20 Hz net rate):
 *
 *   buffer      50 ms + 3 net ticks     (20 Hz → 200 ms)     INTERPOLATION_BUFFER_MS
 *   extrapolate ≤ 2 net ticks           (→ 100 ms)           MAX_EXTRAPOLATION_MS
 *   offset      smoothing 0.1 · snap when |Δ| > 250 ms       OFFSET_SMOOTHING / OFFSET_SNAP_THRESHOLD_MS
 *   smoothing   position 18 · rotation 22 (1 − e^(−k·dt))    POSITION/ROTATION_SMOOTHING_SPEED
 *   angles      shortest-arc lerpAngle                        (a rotation never spins the long way)
 *   teleport    distance² > 100 → snap                        (awe's rule)
 *
 *   var buf = new DVNet.SnapshotBuffer(60); buf.push(state, serverTime); buf.sample(renderTime)
 *   var sync = new DVNet.TransformSync({ tickRate: 20, now: Date.now, lockPosition:{y:true} });
 *   sync.push({ position:{x,y,z}, rotation:{x,y,z}, updatedAt: serverTs }); sync.update(target, dt)
 *
 * Pure (no three.js): `target` is anything with position{x,y,z[,set]} + rotation{x,y,z}.
 * Zero-dependency UMD: attaches to window.DVNet (created if absent) + module.exports.
 */
(function (global) {
  'use strict';

  function angleDelta(a, b) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function lerpAngle(a, b, t) { return a + angleDelta(a, b) * t; }

  function constants(tickRate) {
    var interval = 1000 / (tickRate || 20);
    return { TICK_RATE: tickRate || 20, TICK_INTERVAL: interval, INTERPOLATION_BUFFER_MS: 50 + interval * 3, MAX_EXTRAPOLATION_MS: interval * 2,
      OFFSET_SMOOTHING: 0.1, OFFSET_SNAP_THRESHOLD_MS: 250, POSITION_SMOOTHING_SPEED: 18, ROTATION_SMOOTHING_SPEED: 22, SNAP_DIST_SQ: 100 };
  }

  // ---- SnapshotBuffer ---------------------------------------------------------------------------
  function SnapshotBuffer(maxSize) { this.buffer = []; this.maxSize = maxSize || 60; }
  SnapshotBuffer.prototype.push = function (state, serverTime) {
    var last = this.buffer[this.buffer.length - 1];
    if (last) {
      if (serverTime < last.time) return;                 // out of order: drop
      if (serverTime === last.time) { last.state = state; return; }
    }
    this.buffer.push({ time: serverTime, state: state });
    if (this.buffer.length > this.maxSize) this.buffer.shift();
  };
  /** Bracketing pair for renderTime, pruning what is older than prev; hold the last state past the end; null before the start. */
  SnapshotBuffer.prototype.sample = function (renderTime) {
    var buf = this.buffer;
    if (buf.length === 0) return null;
    for (var i = buf.length - 2; i >= 0; i--) {
      if (buf[i].time <= renderTime && renderTime < buf[i + 1].time) {
        var prev = buf[i], next = buf[i + 1], span = next.time - prev.time;
        var t = span > 0 ? (renderTime - prev.time) / span : 1;
        if (i > 0) this.buffer.splice(0, i);
        return { prev: prev, next: next, t: t };
      }
    }
    if (renderTime >= buf[buf.length - 1].time) { var last = buf[buf.length - 1]; return { prev: last, next: last, t: 1 }; }
    return null;
  };
  SnapshotBuffer.prototype.clear = function () { this.buffer = []; };
  SnapshotBuffer.prototype.latestPair = function () {
    if (this.buffer.length < 2) return null;
    return { prev: this.buffer[this.buffer.length - 2], next: this.buffer[this.buffer.length - 1] };
  };
  SnapshotBuffer.prototype.size = function () { return this.buffer.length; };

  // ---- TransformSync ------------------------------------------------------------------------------
  function isLocked(locks, axis) { return !!(locks && locks[axis] === true); }
  function setPosition(target, next) {
    if (typeof target.set === 'function') { target.set(next.x, next.y, next.z); return; }
    target.x = next.x; target.y = next.y; target.z = next.z;
  }

  function TransformSync(config) {
    config = config || {};
    this.C = constants(config.tickRate);
    this.now = config.now || function () { return Date.now(); };
    this.buffer = new SnapshotBuffer(config.maxSize || 60);
    this.timeOffset = -1;
    this.lockPosition = config.lockPosition || {};
    this.lockRotation = config.lockRotation || {};
  }
  TransformSync.prototype.push = function (state) {
    var t = state.updatedAt || this.now();
    this._syncTimeOffset(t);
    this.buffer.push(state, t);
  };
  TransformSync.prototype.renderTime = function () { return this.now() - this.timeOffset - this.C.INTERPOLATION_BUFFER_MS; };
  /** Ease `target` toward the interpolated state; returns that state (or null when nothing is buffered yet). */
  TransformSync.prototype.update = function (target, dt) {
    if (this.timeOffset === -1) return null;
    var renderTime = this.renderTime();
    var result = this.buffer.sample(renderTime);
    if (!result) return null;
    var next = this._sample(renderTime, result);
    var pa = 1 - Math.exp(-this.C.POSITION_SMOOTHING_SPEED * dt), ra = 1 - Math.exp(-this.C.ROTATION_SMOOTHING_SPEED * dt);
    var lp = this.lockPosition;
    var dx = isLocked(lp, 'x') ? 0 : next.position.x - target.position.x;
    var dy = isLocked(lp, 'y') ? 0 : next.position.y - target.position.y;
    var dz = isLocked(lp, 'z') ? 0 : next.position.z - target.position.z;
    if (dx * dx + dy * dy + dz * dz > this.C.SNAP_DIST_SQ) {
      setPosition(target.position, { x: isLocked(lp, 'x') ? target.position.x : next.position.x, y: isLocked(lp, 'y') ? target.position.y : next.position.y, z: isLocked(lp, 'z') ? target.position.z : next.position.z });
      this._applyRotation(target.rotation, next.rotation, 1);
    } else {
      if (!isLocked(lp, 'x')) target.position.x += dx * pa;
      if (!isLocked(lp, 'y')) target.position.y += dy * pa;
      if (!isLocked(lp, 'z')) target.position.z += dz * pa;
      this._applyRotation(target.rotation, next.rotation, ra);
    }
    return next;
  };
  TransformSync.prototype.reset = function () { this.buffer.clear(); this.timeOffset = -1; };
  TransformSync.prototype._applyRotation = function (target, next, alpha) {
    var lr = this.lockRotation;
    if (!isLocked(lr, 'x')) target.x = lerpAngle(target.x, next.x, alpha);
    if (!isLocked(lr, 'y')) target.y = lerpAngle(target.y, next.y, alpha);
    if (!isLocked(lr, 'z')) target.z = lerpAngle(target.z, next.z, alpha);
  };
  TransformSync.prototype._sample = function (renderTime, r) {
    var prev = r.prev, next = r.next, t = r.t;
    if (prev.time === next.time) { var ex = this._extrapolate(renderTime); if (ex) return ex; }
    var P = prev.state, N = next.state;
    return {
      position: { x: P.position.x + (N.position.x - P.position.x) * t, y: P.position.y + (N.position.y - P.position.y) * t, z: P.position.z + (N.position.z - P.position.z) * t },
      rotation: { x: lerpAngle(P.rotation.x, N.rotation.x, t), y: lerpAngle(P.rotation.y, N.rotation.y, t), z: lerpAngle(P.rotation.z, N.rotation.z, t) },
      updatedAt: N.updatedAt, extra: N.extra
    };
  };
  TransformSync.prototype._extrapolate = function (renderTime) {
    var pair = this.buffer.latestPair();
    if (!pair) return null;
    var span = pair.next.time - pair.prev.time;
    if (span <= 0) return pair.next.state;
    var extra = Math.min(Math.max(renderTime - pair.next.time, 0), this.C.MAX_EXTRAPOLATION_MS);
    var P = pair.prev.state, N = pair.next.state;
    return {
      position: { x: N.position.x + ((N.position.x - P.position.x) / span) * extra, y: N.position.y + ((N.position.y - P.position.y) / span) * extra, z: N.position.z + ((N.position.z - P.position.z) / span) * extra },
      rotation: { x: N.rotation.x + (angleDelta(P.rotation.x, N.rotation.x) / span) * extra, y: N.rotation.y + (angleDelta(P.rotation.y, N.rotation.y) / span) * extra, z: N.rotation.z + (angleDelta(P.rotation.z, N.rotation.z) / span) * extra },
      updatedAt: N.updatedAt, extra: N.extra, extrapolated: extra
    };
  };
  TransformSync.prototype._syncTimeOffset = function (serverTime) {
    var measured = this.now() - serverTime;
    if (this.timeOffset === -1) { this.timeOffset = measured; return; }
    var delta = measured - this.timeOffset;
    if (Math.abs(delta) > this.C.OFFSET_SNAP_THRESHOLD_MS) this.timeOffset = measured;
    else this.timeOffset += delta * this.C.OFFSET_SMOOTHING;
  };

  var api = { SnapshotBuffer: SnapshotBuffer, TransformSync: TransformSync, constants: constants, lerpAngle: lerpAngle, angleDelta: angleDelta,
    upstream: 'https://github.com/oncyberio/awe/tree/main/examples/multiplayer (shared/snapshot-interpolation.ts · src/multiplayer/transform-sync.ts)' };
  var NS = global.DVNet = global.DVNet || {};
  for (var k in api) NS[k] = api[k];
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
