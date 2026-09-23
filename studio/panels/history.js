/*! dvengine — studio history (studio/panels/history.js) · the DVHistory entries with undo/redo · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe studio undo-manager, MIT) where derived */
(function (global) {
  'use strict';
  var P = global.DVStudioPanels = global.DVStudioPanels || {};
  P.history = { mount: function (S, els) {
    var d = global.document, host = d.getElementById(els.history), undo = d.getElementById(els.undo), redo = d.getElementById(els.redo), h = S.ed.history;
    if (undo) undo.addEventListener('click', function () { h.undo(); }); if (redo) redo.addEventListener('click', function () { h.redo(); });
    function render() {
      var list = h.entries(); host.innerHTML = ''; var box = d.createElement('div'); box.className = 'hist';
      if (!list.length) box.innerHTML = '<div class="faint">no edits yet — every command lands here (cap 200, rapid transforms auto-batch)</div>';
      list.forEach(function (e, i) { var r = d.createElement('div'); r.className = 'e' + (e.active ? ' active' : ' future'); r.textContent = (i + 1) + '. ' + e.label + (e.batched ? ' ×' + e.batched : ''); box.appendChild(r); });
      host.appendChild(box); if (undo) undo.disabled = !h.canUndo(); if (redo) redo.disabled = !h.canRedo(); host.scrollTop = host.scrollHeight;
    }
    h.on('change', render); render(); return { refresh: render };
  } };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
