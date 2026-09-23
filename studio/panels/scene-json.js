/*! dvengine — studio scene JSON drawer (studio/panels/scene-json.js) · live serialize + DVScene.validate · copy · download · apply pasted JSON · open file · legacy static-scene · agora · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
(function (global) {
  'use strict';
  var P = global.DVStudioPanels = global.DVStudioPanels || {};
  P.sceneJson = { mount: function (S, els) {
    var d = global.document, host = d.getElementById(els.scenejson), state = d.getElementById(els.jstate), dirty = false;
    host.innerHTML = ''; var box = d.createElement('div'); box.className = 'json';
    var bar = d.createElement('div'); bar.className = 'bar'; var ta = d.createElement('textarea'); ta.spellcheck = false;
    function b(label, title, fn) { var x = d.createElement('button'); x.className = 'mini'; x.textContent = label; x.title = title; x.addEventListener('click', fn); bar.appendChild(x); }
    b('copy', 'copy the document', function () { navigator.clipboard.writeText(ta.value).then(function () { S.toast('copied'); }); });
    b('download', 'space.json', function () { S.save('download'); });
    b('apply', 'load the JSON in this drawer (DVScene.validate first)', function () { S.loadText(ta.value).then(function () { dirty = false; }); });
    var file = d.createElement('input'); file.type = 'file'; file.accept = '.json'; file.style.display = 'none'; file.addEventListener('change', function () { var f = file.files[0]; if (f) f.text().then(S.loadText); file.value = ''; }); bar.appendChild(file);
    b('open…', 'load a cyborg-space/1 file', function () { file.click(); });
    b('legacy', '../legacy/static-scene.json via DVLegacyScene', function () { S.loadLegacy('../legacy/static-scene.json'); });
    b('agora', '../live/spaces/agora.json', function () { S.loadUrl('../live/spaces/agora.json'); });
    b('tokenURI', 'copy DVScene.toTokenURI(doc) — the space IS the token', function () { navigator.clipboard.writeText(global.DVScene.toTokenURI(S.serialize())).then(function () { S.toast('tokenURI copied'); }); });
    ta.addEventListener('input', function () { dirty = true; check(ta.value); });
    function check(text) { try { var v = global.DVScene.validate(JSON.parse(text)); if (state) { state.textContent = v.ok ? 'valid cyborg-space/1 · ' + global.DVScene.digest(JSON.parse(text)).slice(0, 12) + '…' : v.errors[0]; state.className = v.ok ? 'valid' : 'invalid'; } } catch (e) { if (state) { state.textContent = 'not JSON'; state.className = 'invalid'; } } }
    box.appendChild(bar); box.appendChild(ta); host.appendChild(box);
    function render() { if (dirty && d.activeElement === ta) return; var doc = S.serialize(); ta.value = JSON.stringify(doc, null, 2); dirty = false; check(ta.value); }
    render(); return { refresh: render };
  } };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
