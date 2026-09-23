/*! dvengine — component thot-memory (components/thot-memory/index.js) · the agent's THOT memory tree on a panel: DVMerkleCanopy when present, a procedural tree otherwise · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · DeltaVerse-native */
/*
 * Props: { root (bytes32 hex), depth (4), nodes:[{hash,parent}], position, size (2.2), fps (12), label }
 * With window.DVMerkleCanopy the canvas hosts a real Field (SHA-256d merkle canopy, DeltaVerse
 * engine/ngn/merkle-canopy.js) as a CanvasTexture. Without it the memories given by setNodes() (or a
 * pseudo tree grown from `root`) are laid out by depth and drawn as a rooted tree with hash labels.
 * API: setNodes([{hash,parent}]), nodes, texture. Pure: DVThotMemory.layout(nodes) → [{hash,parent,depth,x,y}].
 */
(function (global) {
  'use strict';
  function layout(nodes) {
    nodes = nodes || [];
    var byHash = {}, i, out = [];
    for (i = 0; i < nodes.length; i++) byHash[nodes[i].hash] = nodes[i];
    function depthOf(n, guard) { if (!n.parent || !byHash[n.parent] || guard > 64) return 0; return 1 + depthOf(byHash[n.parent], guard + 1); }
    var rows = {};
    for (i = 0; i < nodes.length; i++) { var d = depthOf(nodes[i], 0); (rows[d] = rows[d] || []).push(nodes[i]); }
    var depths = Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }), maxD = depths.length ? depths[depths.length - 1] : 0;
    for (i = 0; i < depths.length; i++) {
      var row = rows[depths[i]];
      for (var k = 0; k < row.length; k++) out.push({ hash: row[k].hash, parent: row[k].parent || null, depth: depths[i], x: (k + 1) / (row.length + 1), y: maxD ? depths[i] / maxD : 0.5 });
    }
    return out;
  }
  function pseudoTree(root, depth) {
    var nodes = [{ hash: root, parent: null }], frontier = [root], h = 0;
    function next(s, j) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i) + j * 7) >>> 0; return '0x' + ('00000000' + x.toString(16)).slice(-8) + ('00000000' + ((x * 2654435761) >>> 0).toString(16)).slice(-8); }
    for (var d = 1; d <= (depth || 4); d++) {
      var nf = [];
      for (var i = 0; i < frontier.length && nf.length < 8; i++) for (var j = 0; j < 2; j++) { var hh = next(frontier[i], j + d); nodes.push({ hash: hh, parent: frontier[i] }); nf.push(hh); }
      frontier = nf; h++;
    }
    return nodes;
  }
  var pure = { layout: layout, pseudoTree: pseudoTree };
  if (!global.DVEngine) { if (typeof module !== 'undefined' && module.exports) module.exports = pure; global.DVThotMemory = pure; return; }

  function paint(cv, laid, t, label) {
    var g = cv.getContext('2d'); if (!g) return;
    var w = cv.width, h = cv.height; g.fillStyle = '#070912'; g.fillRect(0, 0, w, h);
    var pos = {}; laid.forEach(function (n) { pos[n.hash] = { x: 40 + n.x * (w - 80), y: 50 + n.y * (h - 120) }; });
    g.strokeStyle = 'rgba(34,211,238,0.5)'; g.lineWidth = 1.2;
    laid.forEach(function (n) { if (n.parent && pos[n.parent]) { g.beginPath(); g.moveTo(pos[n.parent].x, pos[n.parent].y); g.lineTo(pos[n.hash].x, pos[n.hash].y); g.stroke(); } });
    laid.forEach(function (n, i) {
      var p = pos[n.hash], pulse = 0.5 + 0.5 * Math.sin(t * 2 + i);
      g.fillStyle = n.depth === 0 ? '#f5c451' : '#c77dff'; g.beginPath(); g.arc(p.x, p.y, 4 + pulse * 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9aa4b2'; g.font = '11px ui-monospace, monospace'; g.textAlign = 'center'; g.fillText(String(n.hash).slice(2, 10), p.x, p.y + 16);
    });
    g.fillStyle = '#ff7ac8'; g.font = 'bold 18px ui-monospace, monospace'; g.textAlign = 'left'; g.fillText(label || 'THOT memory', 16, h - 16);
  }

  global.DVEngine.register('thot-memory', function (props) {
    props = props || {};
    var THREE, mesh, geo, mat, tex, cv, field = null, acc = 0, fps = props.fps > 0 ? +props.fps : 12, nodes = props.nodes || pseudoTree(props.root || '0x0', props.depth || 4), laid = layout(nodes);
    var comp = {
      type: 'thot-memory',
      init: function (ctx) {
        THREE = ctx.THREE;
        cv = global.document.createElement('canvas'); cv.width = 768; cv.height = 512;
        if (global.DVMerkleCanopy && global.DVMerkleCanopy.Field) { try { field = new global.DVMerkleCanopy.Field(cv, { demo: true }); field.start(); } catch (e) { field = null; } }
        if (!field) paint(cv, laid, 0, props.label);
        tex = new THREE.CanvasTexture(cv); if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        var size = props.size || 2.2;
        geo = new THREE.PlaneGeometry(size, size * 2 / 3); mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
        mesh = new THREE.Mesh(geo, mat); mesh.name = 'thot-memory';
        var p = props.position || { x: 0, y: 2.2, z: -6 }; mesh.position.set(+p.x || 0, +p.y || 0, +p.z || 0);
        var r = props.rotation; if (r) mesh.rotation.set(+r.x || 0, +r.y || 0, +r.z || 0);
        mesh.userData.dvThot = comp;
        return mesh;
      },
      setNodes: function (list) { nodes = list || []; laid = layout(nodes); if (!field && cv) { paint(cv, laid, 0, props.label); if (tex) tex.needsUpdate = true; } },
      get nodes() { return nodes; }, get texture() { return tex; }, get canopy() { return field; },
      update: function (dt, t) { if (!tex) return; acc += dt; if (acc < 1 / fps) return; acc = 0; if (!field) paint(cv, laid, t, props.label); tex.needsUpdate = true; },
      dispose: function () { if (field) { try { field.stop(); } catch (e) {} } if (tex) tex.dispose(); if (mat) mat.dispose(); if (geo) geo.dispose(); }
    };
    return comp;
  });
  global.DVThotMemory = pure;
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
