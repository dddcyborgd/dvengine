/*! dvengine — studio assets (studio/panels/assets.js) · every asset url the document references, drop a .glb/.vrm/image onto the canvas to add a model/image (object URL — run the transform desk before shipping) · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe studio assets, MIT) where derived */
(function (global) {
  'use strict';
  var P = global.DVStudioPanels = global.DVStudioPanels || {};
  var ASSET_KEYS = /^(url|src|model|vrm|texture|image|audio|video|file|href|glb)$/i;
  P.assets = { mount: function (S, els) {
    var d = global.document, host = d.getElementById(els.assets), cv = S.space.canvas;
    cv.addEventListener('dragover', function (e) { e.preventDefault(); });
    cv.addEventListener('drop', function (e) {
      e.preventDefault(); var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f) return;
      var url = URL.createObjectURL(f), ext = (f.name.split('.').pop() || '').toLowerCase(), type = /^(glb|gltf|vrm)$/.test(ext) ? 'model' : /^(png|jpe?g|webp|gif|svg)$/.test(ext) ? 'image' : /^(mp3|ogg|wav)$/.test(ext) ? 'audio' : /^(mp4|webm)$/.test(ext) ? 'video' : 'model';
      global.DVEngine.lazy(type).then(function () { return S.ed.commands.add({ type: type, name: f.name, position: { x: 0, y: 1, z: 0 }, data: { url: url, name: f.name } }); }).then(function () { S.toast('dropped ' + f.name + ' → ' + type + ' (object URL, session-only)'); S.refresh(); }, function (err) { S.toast('drop failed: ' + err.message); });
    });
    function render() {
      var comps = S.doc().components, rows = [];
      Object.keys(comps).forEach(function (id) { var c = comps[id], data = c.data || {}; Object.keys(data).forEach(function (k) { if (ASSET_KEYS.test(k) && typeof data[k] === 'string' && data[k]) rows.push({ id: id, key: k, url: data[k], type: c.type }); }); });
      host.innerHTML = ''; var box = d.createElement('div'); box.className = 'assets';
      if (!rows.length) box.innerHTML = '<div class="faint">no asset urls yet — drop a .glb / .vrm / image onto the canvas, or set a url row in the inspector. Ship assets through the desk: <code>node transform/desk.mjs optimize in.glb</code> (transform/README.md).</div>';
      rows.forEach(function (r) { var a = d.createElement('div'); a.className = 'a'; a.innerHTML = '<span><span class="cyan">' + r.type + '</span> <span class="dim">' + r.id + '.' + r.key + '</span></span><span class="faint" title="' + r.url + '">' + (r.url.length > 28 ? '…' + r.url.slice(-26) : r.url) + '</span>'; a.style.cursor = 'pointer'; a.addEventListener('click', function () { S.ed.select(r.id); }); box.appendChild(a); });
      host.appendChild(box);
    }
    render(); return { refresh: render };
  } };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
