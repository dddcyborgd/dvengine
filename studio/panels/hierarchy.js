/*! dvengine — studio hierarchy (studio/panels/hierarchy.js) · the tree by parentId; click selects through DVTransform (shift = additive); right-click → duplicate · delete · group · ungroup · frame · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe studio, MIT) where derived */
(function (global) {
  'use strict';
  var P = global.DVStudioPanels = global.DVStudioPanels || {};
  var NATIVE = { substrate: 1, portal: 1, zone: 1, piece: 1, aivatar: 1, 'thot-memory': 1, participant: 1, 'remote-participant': 1 };
  P.hierarchy = { mount: function (S, els) {
    var d = global.document, host = d.getElementById(els.hierarchy), count = d.getElementById(els.hcount), ed = S.ed, menu = null;
    function closeMenu() { if (menu) { menu.remove(); menu = null; } }
    d.addEventListener('click', closeMenu); d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    function openMenu(x, y, id) {
      closeMenu(); menu = d.createElement('div'); menu.className = 'ctx';
      var items = [['duplicate (D)', function () { ed.commands.duplicate(id); }], ['delete (X)', function () { ed.commands.remove(id); }], ['frame (F)', function () { ed.frame(id); }]];
      var sel = ed.selection(); if (sel.length > 1) items.push(['group selection', function () { ed.commands.group(sel); }]);
      var c = S.doc().components[id]; if (c && c.type === 'group') items.push(['ungroup', function () { ed.commands.ungroup(id); }]);
      if (c && c.parentId) items.push(['unparent', function () { ed.commands.reparent(id, null); }]);
      items.forEach(function (it) { var b = d.createElement('button'); b.textContent = it[0]; b.addEventListener('click', function () { closeMenu(); it[1](); }); menu.appendChild(b); });
      menu.style.left = Math.min(x, global.innerWidth - 160) + 'px'; menu.style.top = Math.min(y, global.innerHeight - 160) + 'px'; d.body.appendChild(menu);
    }
    function render() {
      var comps = S.doc().components, ids = Object.keys(comps), sel = ed.selection(), kids = {};
      ids.forEach(function (id) { var p = comps[id].parentId && comps[comps[id].parentId] ? comps[id].parentId : ''; (kids[p] = kids[p] || []).push(id); });
      host.innerHTML = ''; var tree = d.createElement('div'); tree.className = 'tree';
      (function walk(parent, depth) {
        (kids[parent] || []).sort().forEach(function (id) {
          var c = comps[id], n = d.createElement('div'); n.className = 'node' + (sel.indexOf(id) >= 0 ? ' sel' : ''); n.style.paddingLeft = (6 + depth * 12) + 'px';
          var live = S.space.byId(id); n.innerHTML = '<span class="' + (NATIVE[c.type] ? 'native' : 'cyan') + '">' + (kids[id] ? '▾' : '·') + '</span> <span>' + (c.name || id) + '</span> <span class="type">' + c.type + (live ? '' : ' · not mounted') + '</span>';
          n.title = id; n.addEventListener('click', function (e) { e.stopPropagation(); ed.select(id, { additive: e.shiftKey }); });
          n.addEventListener('contextmenu', function (e) { e.preventDefault(); if (sel.indexOf(id) < 0) ed.select(id); openMenu(e.clientX, e.clientY, id); });
          tree.appendChild(n); walk(id, depth + 1);
        });
      })('', 0);
      host.appendChild(tree); if (count) count.textContent = ids.length + (sel.length ? ' · ' + sel.length + ' selected' : '');
    }
    render(); return { refresh: render };
  } };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
