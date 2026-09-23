/*!
 * dvengine component — dialog (components/dialog/index.js) · folder-is-module · awe port
 * Mirrors awe DialogComponent (engine-src/space/components/dialog): an in-world speech / dialog panel
 * (NPC speech bubbles, floating labels, prompts). Clean-room realization: a canvas-texture panel with
 * wrapped text rendered to a CanvasTexture, billboarded to face ctx.camera, bobbing gently. Props:
 * { text, color, bg, width, position }. Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/dialog/index.js: DVEngine not loaded');

  global.DVEngine.register('dialog', function (props) {
    props = props || {};
    var obj, tex, mat, geo, THREE, camera, baseY;

    function wrap(g, text, maxW) {
      var words = String(text).split(/\s+/), lines = [], line = '';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (g.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
        else line = test;
      }
      if (line) lines.push(line);
      return lines;
    }

    function makeTexture(text, color, bg) {
      var cv = global.document.createElement('canvas');
      cv.width = 1024; cv.height = 512;
      var g = cv.getContext('2d');
      // rounded panel background
      g.fillStyle = bg || 'rgba(18,18,28,0.88)';
      var r = 36, w = cv.width, h = cv.height;
      g.beginPath();
      g.moveTo(r, 0); g.lineTo(w - r, 0); g.quadraticCurveTo(w, 0, w, r);
      g.lineTo(w, h - r); g.quadraticCurveTo(w, h, w - r, h);
      g.lineTo(r, h); g.quadraticCurveTo(0, h, 0, h - r);
      g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.closePath(); g.fill();
      g.strokeStyle = color || '#7bdff2'; g.lineWidth = 6; g.stroke();
      // text
      g.font = '56px ui-monospace, monospace';
      g.fillStyle = color || '#e6f7ff';
      g.textBaseline = 'top';
      var lines = wrap(g, text, w - 120);
      var y = 60;
      for (var i = 0; i < lines.length; i++) { g.fillText(lines[i], 60, y); y += 70; }
      return new THREE.CanvasTexture(cv);
    }

    return {
      type: 'dialog',
      init: function (ctx) {
        THREE = ctx.THREE; camera = ctx.camera;
        var text = props.text != null ? props.text : 'Welcome to DeltaVerse.';
        tex = makeTexture(text, props.color, props.bg);
        if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        var width = props.width || 5;
        geo = new THREE.PlaneGeometry(width, width / 2);
        mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
        obj = new THREE.Mesh(geo, mat);
        obj.name = 'dialog';
        var pos = props.position || { x: 0, y: 4, z: 3 };
        obj.position.set(pos.x, pos.y, pos.z);
        baseY = pos.y;
        return obj;
      },
      update: function (dt, t) {
        if (!obj) return;
        obj.position.y = baseY + Math.sin(t * 1.2) * 0.18;   // bob
        if (camera) obj.lookAt(camera.position);             // billboard
      },
      dispose: function () { if (tex) tex.dispose(); if (mat) mat.dispose(); if (geo) geo.dispose(); obj = null; },
    };
  });
})(typeof window !== 'undefined' ? window : this);
