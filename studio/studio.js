/*! dvengine — DVStudio (studio/studio.js) · the framework-free studio shell: one Space + DVTransform, seven panels, shortcuts, load/save/capture · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe packages/studio, MIT) where derived */
/*
 *   DVStudio.mount({ canvas, els:{…ids}, componentBase, editorBase, cyborgd }) → S
 *   S.space · S.ed (DVTransform) · S.doc() · S.load(doc) · S.loadUrl(url) · S.loadLegacy(url) · S.addComponent(type) · S.save('download'|'cyborgd')
 *   S.capture() · S.toast(msg) · S.refresh() · S.types() → addable types · S.panels.{toolbar,hierarchy,inspector,history,sceneJson,assets,wallet}
 * Shortcuts (canvas focused or no input focused): G/R/S modes · X/Delete delete · D duplicate · Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) · F frame · Esc deselect
 */
(function (global) {
  'use strict';
  var P = global.DVStudioPanels = global.DVStudioPanels || {};
  function el(id) { return typeof id === 'string' ? global.document.getElementById(id) : id; }
  function isTyping() { var a = global.document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); }

  function mount(opts) {
    opts = opts || {}; var E = global.DVEngine, ED = global.DVEditors, els = opts.els || {};
    if (opts.componentBase) E.setComponentBase(opts.componentBase);
    if (ED && opts.editorBase) ED.setBase(opts.editorBase);
    var S = { opts: opts, panels: {}, manifest: null, cyborgd: opts.cyborgd || 'http://127.0.0.1:8790' };
    var space = S.space = E.Space(opts.canvas, { controls: true, cameraPosition: { x: 8, y: 6, z: 12 } });
    var ed = S.ed = global.DVTransform.attach(space, { gizmo: 'auto', grid: true, snap: { grid: 0.5, angle: 15, mode: 'off', gap: 0.2 } });
    space.start();
    S.doc = function () { return global.DVCommands.doc(space); };
    S.toast = function (msg, ms) { var t = el(els.toast); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, ms || 1800); };
    S.refresh = function () { for (var k in S.panels) if (S.panels[k] && S.panels[k].refresh) { try { S.panels[k].refresh(); } catch (e) {} } };
    S.types = function () { var t = ED ? ED.types().slice() : []; if (S.registryTypes) S.registryTypes.forEach(function (x) { if (t.indexOf(x) < 0) t.push(x); }); if (S.manifest) S.manifest.forEach(function (c) { if (t.indexOf(c.type) < 0) t.push(c.type); }); return t.sort(); };

    // ---- documents -------------------------------------------------------------
    S.load = function (doc) {
      var v = global.DVScene.validate(doc); if (!v.ok) { S.toast('invalid: ' + v.errors[0]); return Promise.reject(new Error(v.errors.join('; '))); }
      ed.select(null); space.clear(); space._doc = null; ed.history.clear();
      var types = Object.keys(doc.components || {}).map(function (k) { return doc.components[k].type; });
      var p = ED ? Promise.all(types.map(function (t) { return ED.lazy(t).catch(function () { return null; }); })) : Promise.resolve();
      return p.then(function () { return space.load(doc, { lazy: true }); }).then(function (sum) { S.toast('loaded ' + doc.id + ' · ' + sum.mounted.length + ' mounted' + (sum.skipped.length ? ' · ' + sum.skipped.length + ' skipped' : '')); S.refresh(); return sum; });
    };
    S.loadUrl = function (url) { return global.fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' → ' + r.status); return r.json(); }).then(S.load).catch(function (e) { S.toast(String(e.message || e)); }); };
    S.loadLegacy = function (url) { return global.DVLegacyScene.load(url).then(S.load).catch(function (e) { S.toast(String(e.message || e)); }); };
    S.loadText = function (text) { try { return S.load(JSON.parse(text)); } catch (e) { S.toast('bad JSON: ' + e.message); return Promise.reject(e); } };
    S.addComponent = function (type) {
      return E.lazy(type).then(function () { return ED ? ED.lazy(type).catch(function () { return null; }) : null; }).then(function () {
        var d = ED && ED.has(type) ? ED.defaults(type) : {}, comp = { type: type, name: type, position: d.position || { x: 0, y: 1, z: 0 }, data: {} };
        Object.keys(d).forEach(function (k) { if (k !== 'position' && k !== 'rotation' && k !== 'scale') comp.data[k] = d[k]; });
        return ed.commands.add(comp);
      }).then(function (id) { S.toast('added ' + type); S.refresh(); return id; }, function (e) { S.toast('cannot add ' + type + ': ' + (e.message || e)); });
    };
    S.capture = function () { var uri = global.DVCapture.captureThumbnail(space, { w: 512, h: 288 }); S.doc().image = uri; S.toast('thumbnail captured → doc.image'); S.refresh(); return uri; };
    S.serialize = function () { var d = space.serialize(); var base = S.doc(); ['image', 'name', 'zones', 'nfts', 'agents', 'token', 'room', 'skin', 'theme'].forEach(function (k) { if (base[k] != null && d[k] == null) d[k] = base[k]; }); return d; };
    S.download = function () { var d = S.serialize(), blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }), a = global.document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'space.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); S.toast('space.json'); };
    S.save = function (where) {
      if (where !== 'cyborgd') return Promise.resolve(S.download());
      var d = S.serialize(), claim = ''; try { claim = global.localStorage.getItem('dv.claim') || ''; } catch (e) {}
      return global.fetch(S.cyborgd.replace(/\/$/, '') + '/space/' + encodeURIComponent(d.id), { method: 'POST', headers: { 'content-type': 'application/json', 'x-dv-claim': claim }, body: JSON.stringify({ doc: d, claim: claim }) })
        .then(function (r) { S.toast(r.ok ? 'saved to cyborgd · ' + d.id : 'cyborgd → ' + r.status); return r.ok; }, function (e) { S.toast('cyborgd unreachable: ' + e.message); return false; });
    };

    // ---- panels ----------------------------------------------------------------
    ['toolbar', 'hierarchy', 'inspector', 'history', 'sceneJson', 'assets', 'wallet'].forEach(function (n) { if (P[n] && P[n].mount) S.panels[n] = P[n].mount(S, els); });
    ['dv:select', 'dv:command', 'dv:added', 'dv:removed', 'dv:mode', 'dv:snap'].forEach(function (ev) { space.on(ev, function () { S.refresh(); }); });
    space.on('dv:transform', function (d) { if (d.phase === 'end' || d.phase === 'apply') S.refresh(); });

    // ---- shortcuts -------------------------------------------------------------
    global.addEventListener('keydown', function (e) {
      if (isTyping()) return; var k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && k === 'z') { e.preventDefault(); return e.shiftKey ? ed.commands.redo() : ed.commands.undo(); }
      if (ctrl && k === 'y') { e.preventDefault(); return ed.commands.redo(); }
      if (ctrl) return;
      if (k === 'g') ed.setMode('translate'); else if (k === 'r') ed.setMode('rotate'); else if (k === 's') ed.setMode('scale');
      else if (k === 'x' || k === 'delete' || k === 'backspace') { if (ed.selection().length) { e.preventDefault(); ed.commands.remove(); } }
      else if (k === 'd') { if (ed.selection().length) ed.commands.duplicate(); }
      else if (k === 'f') ed.frame(); else if (k === 'escape') ed.select(null);
    });

    // ---- the addable list + the first document ---------------------------------
    global.fetch((opts.componentBase || './components/') + 'manifest.json').then(function (r) { return r.json(); }).then(function (m) { S.manifest = m.components || []; S.refresh(); }).catch(function () {});
    global.fetch((opts.editorBase || './editors/') + 'registry.json').then(function (r) { return r.json(); }).then(function (m) { S.registryTypes = Object.keys(m.editors || {}); S.refresh(); }).catch(function () {});
    S.load(global.DVScene.create({ id: 'studio-space', name: 'Studio space', components: { lighting: { id: 'lighting', name: 'lighting', type: 'lighting', data: { animate: false } }, mesh: { id: 'mesh', name: 'mesh', type: 'mesh', position: { x: 0, y: 1, z: 0 }, data: { shape: 'box' } } } }));
    // ---- ?selftest — a scripted pass over the command surface (console: "DVStudio selftest ok") ----
    S.selfTest = function () {
      var out = { steps: [] }, C = ed.commands, id;
      function step(n, f) { return function () { return Promise.resolve().then(f).then(function (r) { out.steps.push(n); return r; }); }; }
      return Promise.resolve()
        .then(step('add', function () { return S.addComponent('mesh').then(function (i) { id = i; if (!id || !space.byId(id)) throw new Error('add failed'); }); }))
        .then(step('update', function () { return C.update(id, { shape: 'torus', color: 0xff0000 }).then(function () { if (S.doc().components[id].data.shape !== 'torus') throw new Error('update failed'); }); }))
        .then(step('undo', function () { return C.undo().then(function () { if (S.doc().components[id].data.shape === 'torus') throw new Error('undo failed'); }); }))
        .then(step('redo', function () { return C.redo().then(function () { if (S.doc().components[id].data.shape !== 'torus') throw new Error('redo failed'); }); }))
        .then(step('duplicate', function () { var n = Object.keys(S.doc().components).length; return C.duplicate(id).then(function () { if (Object.keys(S.doc().components).length !== n + 1) throw new Error('duplicate failed'); }); }))
        .then(step('remove', function () { ed.select(id); return C.remove().then(function () { if (S.doc().components[id]) throw new Error('remove failed'); }); }))
        .then(step('serialize', function () { var v = global.DVScene.validate(S.serialize()); if (!v.ok) throw new Error('serialize invalid: ' + v.errors.join('; ')); }))
        .then(step('capture', function () { if (!/^data:image/.test(S.capture())) throw new Error('capture failed'); }))
        .then(function () { global.console.log('DVStudio selftest ok · ' + out.steps.join(' → ') + ' · history ' + ed.history.entries().length); return out; }, function (e) { global.console.error('DVStudio selftest FAILED at ' + (out.steps.length + 1) + ': ' + (e.message || e)); throw e; });
    };
    if (/[?&]selftest/.test(global.location && global.location.search || '')) setTimeout(function () { S.selfTest(); }, 800);
    global.DVStudio.current = S;
    return S;
  }
  var DVStudio = { mount: mount, current: null, version: '0.0.1-alpha', upstream: 'https://github.com/oncyberio/awe/tree/main/packages/studio' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVStudio;
  global.DVStudio = DVStudio;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
