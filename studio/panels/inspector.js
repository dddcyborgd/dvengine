/*! dvengine — studio inspector (studio/panels/inspector.js) · schema-driven from DVEditors; every edit is a DVCommands.update through history (undo works) · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit/src/editors, MIT) where derived */
(function (global) {
  'use strict';
  var P = global.DVStudioPanels = global.DVStudioPanels || {};
  P.inspector = { mount: function (S, els) {
    var d = global.document, host = d.getElementById(els.inspector), title = d.getElementById(els.itype), ed = S.ed, ED = global.DVEditors, shown = null;
    function valueOf(c, row) { if (row.group === 'transform') return c[row.key] || row.default; var v = c.data ? c.data[row.key] : undefined; return v === undefined ? row.default : v; }
    function commit(id, row, raw) { var v = ED.coerce(row, raw), patch = {}; patch[row.key] = v; ed.commands.update(id, patch).then(function () { S.refresh(); }); }
    function input(id, row, v) {
      var w = d.createElement('div');
      if (row.kind === 'vec3') { w.className = 'v3'; v = v || { x: 0, y: 0, z: 0 }; ['x', 'y', 'z'].forEach(function (ax) { var i = d.createElement('input'); i.type = 'number'; i.step = row.key === 'rotation' ? '0.01' : '0.1'; i.value = +(+v[ax] || 0).toFixed(4); i.title = ax; i.addEventListener('change', function () { var n = { x: +w.children[0].value, y: +w.children[1].value, z: +w.children[2].value }; commit(id, row, n); }); w.appendChild(i); }); return w; }
      if (row.kind === 'bool') { var c = d.createElement('input'); c.type = 'checkbox'; c.checked = !!v; c.addEventListener('change', function () { commit(id, row, c.checked); }); return c; }
      if (row.kind === 'color') { var col = d.createElement('input'); col.type = 'color'; col.value = ED.hex(v == null ? 0xffffff : v); col.addEventListener('change', function () { commit(id, row, col.value); }); return col; }
      if (row.kind === 'enum') { var s = d.createElement('select'); (row.options || []).forEach(function (o) { var op = d.createElement('option'); op.value = o; op.textContent = o; s.appendChild(op); }); s.value = v == null ? '' : v; s.addEventListener('change', function () { commit(id, row, s.value); }); return s; }
      if (row.kind === 'number' || row.kind === 'int' || row.kind === 'range') { w.className = 'rng'; var r = d.createElement('input'); r.type = 'range'; r.min = row.min == null ? 0 : row.min; r.max = row.max == null ? 10 : row.max; r.step = row.step || 0.1; var n = d.createElement('input'); n.type = 'number'; n.step = row.step || 0.1; r.value = n.value = v == null ? '' : v; r.addEventListener('input', function () { n.value = r.value; }); r.addEventListener('change', function () { commit(id, row, r.value); }); n.addEventListener('change', function () { r.value = n.value; commit(id, row, n.value); }); w.appendChild(r); w.appendChild(n); return w; }
      var t = d.createElement('input'); t.type = 'text'; t.value = row.json && v != null && typeof v !== 'string' ? JSON.stringify(v) : (v == null ? '' : v); t.placeholder = row.kind === 'asset' ? 'url (.glb / .vrm / image / audio)' : (row.json ? 'json' : ''); t.addEventListener('change', function () { commit(id, row, t.value); }); return t;
    }
    function render() {
      var sel = ed.selection(), id = sel[0], c = id ? S.doc().components[id] : null;
      if (!c) { host.innerHTML = '<div class="insp dim">select a component — the rows come from editors/&lt;type&gt;/index.js (DVEditors)</div>'; if (title) title.textContent = ''; shown = null; return; }
      if (title) title.textContent = c.type + (sel.length > 1 ? ' +' + (sel.length - 1) : '');
      var schema = ED.get(c.type);
      if (!schema) { host.innerHTML = '<div class="insp dim">loading editors/' + c.type + '/index.js…</div>'; ED.lazy(c.type).then(render, function () { host.innerHTML = '<div class="insp warn">no editor for ' + c.type + ' — run node scripts/gen-editors.mjs</div>'; }); return; }
      var box = d.createElement('div'); box.className = 'insp'; var last = '';
      var nameRow = d.createElement('div'); nameRow.className = 'row'; nameRow.innerHTML = '<label>name</label>'; var ni = d.createElement('input'); ni.type = 'text'; ni.value = c.name || ''; ni.addEventListener('change', function () { ed.commands.update(id, { name: ni.value }).then(S.refresh); }); nameRow.appendChild(ni); box.appendChild(nameRow);
      var idRow = d.createElement('div'); idRow.className = 'row'; idRow.innerHTML = '<label>id</label><span class="faint">' + id + (c.parentId ? ' ← ' + c.parentId : '') + '</span>'; box.appendChild(idRow);
      schema.rows.forEach(function (row) {
        if (row.group !== last) { last = row.group; var g = d.createElement('div'); g.className = 'grp'; g.textContent = row.group; box.appendChild(g); }
        var r = d.createElement('div'); r.className = 'row'; var l = d.createElement('label'); l.textContent = row.label || row.key; l.title = row.key + ' · ' + row.kind; r.appendChild(l); r.appendChild(input(id, row, valueOf(c, row))); box.appendChild(r);
      });
      var up = d.createElement('div'); up.className = 'faint'; up.style.marginTop = '8px'; up.innerHTML = schema.upstream === 'DeltaVerse-native' ? 'DeltaVerse-native' : '<a class="dim" href="' + schema.upstream + '" target="_blank" rel="noopener">upstream awe component</a>'; box.appendChild(up);
      host.innerHTML = ''; host.appendChild(box); shown = id;
    }
    render(); return { refresh: render };
  } };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
