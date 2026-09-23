/*! dvengine — studio toolbar (studio/panels/toolbar.js) · modes G/R/S · snap + grid · add component (lazy) · load · save (download / POST cyborgd) · capture thumbnail · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe studio, MIT) where derived */
(function (global) {
  'use strict';
  var P = global.DVStudioPanels = global.DVStudioPanels || {};
  function btn(label, title, fn, cls) { var b = global.document.createElement('button'); b.textContent = label; b.title = title || ''; if (cls) b.className = cls; b.addEventListener('click', fn); return b; }
  function sep() { var s = global.document.createElement('span'); s.className = 'sep'; return s; }
  P.toolbar = { mount: function (S, els) {
    var d = global.document, host = d.getElementById(els.top), ed = S.ed;
    var modes = { translate: btn('G move', 'translate (G)', function () { ed.setMode('translate'); }), rotate: btn('R rotate', 'rotate (R)', function () { ed.setMode('rotate'); }), scale: btn('S scale', 'scale (S)', function () { ed.setMode('scale'); }) };
    host.appendChild(sep()); for (var m in modes) host.appendChild(modes[m]);
    var snap = btn('snap', 'grid 0.5 · angle 15° · bbox gap 0.2', function () { ed.setSnap({ mode: ed.snap.mode === 'off' ? '3d' : 'off' }); });
    var grid = btn('grid', 'toggle the editor grid', function () { gridOn = !gridOn; if (ed.grid) ed.grid.setVisible(gridOn); grid.classList.toggle('on', gridOn); }), gridOn = true; grid.classList.add('on');
    host.appendChild(sep()); host.appendChild(snap); host.appendChild(grid);
    var sel = d.createElement('select'); sel.title = 'component type (components/manifest.json + the DeltaVerse natives)';
    var add = btn('+ add', 'add the selected component type (loads components/<type>/index.js on first use)', function () { S.addComponent(sel.value); });
    host.appendChild(sep()); host.appendChild(sel); host.appendChild(add);
    var file = d.createElement('input'); file.type = 'file'; file.accept = '.json,application/json'; file.style.display = 'none'; file.addEventListener('change', function () { var f = file.files[0]; if (!f) return; f.text().then(S.loadText); file.value = ''; }); host.appendChild(file);
    host.appendChild(sep());
    host.appendChild(btn('open…', 'load a cyborg-space/1 file', function () { file.click(); }));
    host.appendChild(btn('paste', 'paste a cyborg-space/1 document', function () { var t = global.prompt('paste a cyborg-space/1 JSON document'); if (t) S.loadText(t); }));
    host.appendChild(btn('legacy', 'the awe static-scene.json through DVLegacyScene', function () { S.loadLegacy('../legacy/static-scene.json'); }));
    host.appendChild(btn('agora', 'live/spaces/agora.json', function () { S.loadUrl('../live/spaces/agora.json'); }));
    host.appendChild(sep());
    host.appendChild(btn('save ↓', 'download space.json', function () { S.save('download'); }));
    host.appendChild(btn('save → cyborgd', 'POST ' + S.cyborgd + '/space/:id with localStorage.dv.claim', function () { S.save('cyborgd'); }));
    host.appendChild(btn('capture', 'thumbnail → doc.image (edit/capture.js)', function () { S.capture(); }));
    var wallet = d.createElement('span'); wallet.className = 'wallet'; wallet.id = 'wallet'; host.appendChild(wallet);
    var known = '';
    return { refresh: function () {
      for (var m in modes) modes[m].classList.toggle('on', ed.mode === m);
      snap.classList.toggle('on', ed.snap.mode !== 'off');
      var t = S.types().join(','); if (t !== known) { known = t; var cur = sel.value; sel.innerHTML = ''; S.types().forEach(function (ty) { var o = d.createElement('option'); o.value = ty; o.textContent = ty; sel.appendChild(o); }); if (cur) sel.value = cur; else sel.value = 'mesh'; }
    } };
  } };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
