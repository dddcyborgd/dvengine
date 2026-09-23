/*! dvengine — DVVerse.senses (verse/senses.js) · the participant's senses in the verse: head yaw → camera, gestures → the net + the nearest aivatar, voice peak → reach; the "enable senses" button · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 * OPTIONAL globals: DVDirector (voaice + faicey senses, permission-gated, from a user gesture) and
 * DVParticipantInput (the input ladder). Without them the verse is pointer + keyboard and enable()
 * resolves { audio:false, video:false } — nothing else changes.
 *
 *   var s = DVVerse.senses.create(verse, { audio:true, video:true, host })   s.enable() (from a click) · s.button(host) · s.tick(dt) · s.dispose()
 *   gesture map (senses → aivatar): smile→greet · nod→nod · jawOpen→wave · browsUp→think; the same name goes out as conn.event('gesture',{name})
 *   voice peak → conn.event('reach', { zone }) once per 1.5 s; head yaw → camera.setHeadOffset(−yaw)
 * Pure: DVVerse.senses.GESTURE_MAP, mapGesture(name)
 */
(function (global) {
  'use strict';
  var GESTURE_MAP = { smile: 'greet', nod: 'nod', jawOpen: 'wave', browsUp: 'think' };
  var NET_GESTURES = ['smile', 'jawOpen', 'browsUp', 'nod'];
  function mapGesture(name) { return GESTURE_MAP[name] || null; }

  function create(verse, opts) {
    opts = opts || {};
    var director = null, input = null, tok = null, offs = [], lastReach = 0, enabled = { audio: false, video: false }, btn = null;
    if (global.DVDirector && global.DVDirector.create) { try { director = global.DVDirector.create({ host: opts.host || (global.document && global.document.body), chain: [] }); } catch (e) { director = null; } }
    if (global.DVParticipantInput && global.DVParticipantInput.shared) { try { input = global.DVParticipantInput.shared(); tok = input.attach(); } catch (e) { input = null; } }
    function nearestAgent() {
      var best = null, bd = Infinity, lp = verse.participant && verse.participant.root ? verse.participant.root.position : null; if (!lp) return null;
      for (var id in verse.agents) { var a = verse.agents[id]; if (!a || !a.root) continue; var d = a.root.position.distanceTo(lp); if (d < bd) { bd = d; best = a; } }
      return bd < 8 ? best : null;
    }
    var s = {
      director: director, input: input, enabled: enabled,
      enable: function (o) {
        o = o || { audio: opts.audio !== false, video: opts.video !== false };
        if (!director) return Promise.resolve(enabled);
        return director.enableSenses(o).then(function (r) { enabled.audio = !!(r && (r.audio || r.voaice)); enabled.video = !!(r && (r.video || r.faicey)); if (input && input.attachSenses && director.senses) { try { input.attachSenses(director.senses); } catch (e) {} } verse.emit('senses', enabled); if (btn) btn.textContent = 'senses: ' + (enabled.audio ? 'voice ' : '') + (enabled.video ? 'vision' : '') || 'senses: denied'; return enabled; }, function (e) { verse.emit('senses', { error: String(e && e.message || e) }); return enabled; });
      },
      button: function (host) {
        if (!global.document) return null;
        btn = global.document.createElement('button'); btn.type = 'button'; btn.className = 'dv-senses-btn'; btn.textContent = director ? 'enable senses' : 'senses unavailable (pointer + keys)';
        btn.disabled = !director; btn.addEventListener('click', function () { s.enable(); });
        (host || opts.host || global.document.body).appendChild(btn); return btn;
      },
      tick: function (dt, t) {
        if (!director) return;
        var face = director.senses && director.senses.state && director.senses.state.face;
        if (face && face.active && face.present && verse.camera && verse.camera.setHeadOffset) verse.camera.setHeadOffset(-(face.pose && face.pose.yaw || 0) * 1.2);
      },
      dispose: function () { offs.forEach(function (f) { try { f(); } catch (e) {} }); if (tok) tok.detach(); if (director) { try { director.stop(); } catch (e) {} } if (btn && btn.parentNode) btn.parentNode.removeChild(btn); }
    };
    if (director) {
      var onG = function (g) {
        if (!g || !g.name) return;
        var local = mapGesture(g.name), agent = nearestAgent();
        if (local && agent) agent.gesture(local);
        if (verse.conn && NET_GESTURES.indexOf(g.name) >= 0) verse.conn.event('gesture', { name: g.name, value: +g.value || 0 });
        verse.emit('gesture', g);
      };
      var onP = function (d) {
        var now = Date.now(); if (now - lastReach < 1500) return; lastReach = now;
        var zone = verse.zone || (verse.doc && verse.doc.zones && verse.doc.zones[0] && verse.doc.zones[0].id) || 'agora';
        if (verse.conn) verse.conn.event('reach', { zone: zone, level: +(d && d.level) || 0 });
        var agent = nearestAgent(); if (agent) agent.reachToward(verse.participant.root.position);
        verse.emit('peak', d);
      };
      director.on('gesture', onG); director.on('peak', onP);
      offs.push(function () { director.off('gesture', onG); director.off('peak', onP); });
    }
    return s;
  }
  var api = { create: create, GESTURE_MAP: GESTURE_MAP, NET_GESTURES: NET_GESTURES, mapGesture: mapGesture };
  var NS = global.DVVerse = global.DVVerse || {}; NS.senses = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
