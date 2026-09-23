/*! dvengine — DVHistory (edit/history.js) · undo/redo stack with a 200-entry cap and auto-batching of rapid same-key commands inside 300 ms · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe studio services/undo-manager.ts + editor/commands, MIT) where derived */
/*
 *   var h = DVHistory.create({ cap: 200, batchWindow: 300 })
 *   h.push(cmd) → Promise      runs cmd.do() then records it (truncates any redo tail)
 *   h.undo() / h.redo() → Promise · h.canUndo() / h.canRedo() · h.clear() · h.entries() → [{label, active, batched}]
 *   h.on('change', fn) → off    fires after every push/undo/redo/clear with { type, label, index, length }
 *
 * Command shape (edit/commands.js): { label, do() → any|Promise, undo() → any|Promise, redo()?,
 *   batchKey?: string, merge?(next) → command }. When two pushes share a batchKey within `batchWindow`
 *   milliseconds and the earlier one has merge(), they collapse into ONE history entry (the earlier
 *   undo state, the later do state) — the awe auto-batch pattern for pointer-driven transform streams.
 *   DVHistory.Command(label, doFn, undoFn) and DVHistory.compound(label, [cmds]) are the two helpers.
 */
(function (global) {
  'use strict';

  function now() { return (global.performance && global.performance.now) ? global.performance.now() : Date.now(); }

  function History(opts) {
    opts = opts || {};
    this.cap = opts.cap || 200;
    this.batchWindow = opts.batchWindow != null ? opts.batchWindow : 300;
    this.stack = []; this.index = -1;
    this.busy = false; this._chain = Promise.resolve(); this._lastPush = 0; this._listeners = {};
  }
  History.prototype.on = function (ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); var self = this; return function () { self.off(ev, fn); }; };
  History.prototype.off = function (ev, fn) { var l = this._listeners[ev]; if (!l) return; var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
  History.prototype._emit = function (ev, d) { var l = this._listeners[ev]; if (!l) return; for (var i = 0; i < l.length; i++) { try { l[i](d); } catch (e) { /* listeners never break the stack */ } } };
  History.prototype._state = function (type, label) { return { type: type, label: label || '', index: this.index, length: this.stack.length, canUndo: this.canUndo(), canRedo: this.canRedo() }; };

  /** serialise async commands: every push/undo/redo waits for the previous one */
  History.prototype._run = function (fn) {
    var self = this;
    var p = this._chain.then(function () { self.busy = true; return fn(); });
    this._chain = p.then(function () { self.busy = false; }, function () { self.busy = false; });
    return p;
  };

  History.prototype.push = function (cmd) {
    if (!cmd || typeof cmd.do !== 'function' || typeof cmd.undo !== 'function') return Promise.reject(new Error('DVHistory.push: command needs do() and undo()'));
    var self = this;
    return this._run(function () {
      return Promise.resolve(cmd.do()).then(function (result) {
        var t = now();
        var last = self.index >= 0 ? self.stack[self.index] : null;
        var batched = false;
        if (last && cmd.batchKey && last.batchKey === cmd.batchKey && typeof last.merge === 'function' && (t - self._lastPush) <= self.batchWindow) {
          var merged = last.merge(cmd);
          if (merged) { merged.batched = (last.batched || 1) + 1; self.stack[self.index] = merged; batched = true; }
        }
        if (!batched) {
          self.stack.length = self.index + 1;      // drop the redo tail
          self.stack.push(cmd); self.index++;
          if (self.stack.length > self.cap) { var drop = self.stack.length - self.cap; self.stack.splice(0, drop); self.index -= drop; }
        }
        self._lastPush = t;
        self._emit('change', self._state(batched ? 'batch' : 'do', cmd.label));
        return result;
      });
    });
  };
  History.prototype.canUndo = function () { return this.index >= 0; };
  History.prototype.canRedo = function () { return this.index < this.stack.length - 1; };
  History.prototype.undo = function () {
    var self = this;
    return this._run(function () {
      if (!self.canUndo()) return false;
      var cmd = self.stack[self.index];
      return Promise.resolve(cmd.undo()).then(function () { self.index--; self._lastPush = 0; self._emit('change', self._state('undo', cmd.label)); return true; });
    });
  };
  History.prototype.redo = function () {
    var self = this;
    return this._run(function () {
      if (!self.canRedo()) return false;
      var cmd = self.stack[self.index + 1];
      return Promise.resolve((cmd.redo || cmd.do).call(cmd)).then(function () { self.index++; self._lastPush = 0; self._emit('change', self._state('redo', cmd.label)); return true; });
    });
  };
  History.prototype.clear = function () { this.stack = []; this.index = -1; this._lastPush = 0; this._emit('change', this._state('clear')); };
  History.prototype.entries = function () { var self = this; return this.stack.map(function (c, i) { return { label: c.label || 'command', active: i <= self.index, current: i === self.index, batched: c.batched || 1, ids: c.ids || [] }; }); };

  /** plain command from two closures */
  function Command(label, doFn, undoFn, extra) { var c = { label: label, do: doFn, undo: undoFn }; if (extra) for (var k in extra) c[k] = extra[k]; return c; }
  /** run several commands as one entry (do in order, undo in reverse) */
  function compound(label, cmds) {
    cmds = cmds.slice();
    function seq(list, fnName) { var p = Promise.resolve(); list.forEach(function (c) { p = p.then(function () { return (fnName === 'redo' && c.redo ? c.redo : c[fnName === 'redo' ? 'do' : fnName]).call(c); }); }); return p; }
    return { label: label, ids: [].concat.apply([], cmds.map(function (c) { return c.ids || []; })), do: function () { return seq(cmds, 'do'); }, redo: function () { return seq(cmds, 'redo'); }, undo: function () { return seq(cmds.slice().reverse(), 'undo'); } };
  }

  var DVHistory = { create: function (opts) { return new History(opts); }, History: History, Command: Command, compound: compound, version: '0.1.0',
    upstream: 'https://github.com/oncyberio/awe/blob/main/packages/studio/src/services/undo-manager.ts' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVHistory;
  global.DVHistory = DVHistory;
})(typeof window !== 'undefined' ? window : this);
