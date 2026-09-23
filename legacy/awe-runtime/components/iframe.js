/*!
 * awe runtime component — iframe
 * Mirrors awe IframeComponent (engine-src/space/components/iframe): an embedded web-surface panel
 * (a webpage / YouTube embed mapped onto an in-world quad). Clean-room OFFLINE realization: a framed
 * quad with a CanvasTexture standing in for the live surface — a browser-chrome title bar plus
 * placeholder content lines. No network, no real iframe. Props: { title, color, width, height,
 * position }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('iframe.js: AweRuntime not loaded');

  global.AweRuntime.register('iframe', function (props) {
    props = props || {};
    var root, tex, mat, geo, fgeo, fmat, THREE;

    function makeTexture(title, color) {
      var cv = global.document.createElement('canvas');
      cv.width = 1024; cv.height = 576;
      var g = cv.getContext('2d');
      // page background
      g.fillStyle = '#0e1320'; g.fillRect(0, 0, cv.width, cv.height);
      // title bar
      g.fillStyle = color || '#1f6feb'; g.fillRect(0, 0, cv.width, 80);
      // traffic-light dots
      var dots = ['#ff5f56', '#ffbd2e', '#27c93f'];
      for (var d = 0; d < 3; d++) { g.fillStyle = dots[d]; g.beginPath(); g.arc(40 + d * 44, 40, 14, 0, Math.PI * 2); g.fill(); }
      // url / title
      g.font = '40px ui-monospace, monospace'; g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
      g.fillText(String(title || 'web surface'), 190, 40);
      // placeholder content lines
      g.fillStyle = '#26324a';
      var widths = [0.9, 0.7, 0.95, 0.6, 0.8, 0.5, 0.85];
      for (var i = 0; i < widths.length; i++) {
        g.fillRect(60, 140 + i * 56, (cv.width - 120) * widths[i], 28);
      }
      // a content "image" block
      g.fillStyle = (color || '#1f6feb'); g.globalAlpha = 0.25;
      g.fillRect(cv.width - 360, 150, 300, 200); g.globalAlpha = 1;
      return new THREE.CanvasTexture(cv);
    }

    return {
      type: 'iframe',
      init: function (ctx) {
        THREE = ctx.THREE;
        root = new THREE.Group();
        root.name = 'iframe';
        var pos = props.position || { x: -6, y: 4, z: -2 };
        root.position.set(pos.x, pos.y, pos.z);
        var w = props.width || 6.4, h = props.height || 3.6;

        // frame border (slightly larger box behind the surface)
        fgeo = new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.15);
        fmat = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.7, metalness: 0.3 });
        var frame = new THREE.Mesh(fgeo, fmat);
        frame.position.z = -0.08;
        root.add(frame);

        // the web surface quad
        tex = makeTexture(props.title, props.color);
        if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        geo = new THREE.PlaneGeometry(w, h);
        mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        var surface = new THREE.Mesh(geo, mat);
        root.add(surface);

        return root;
      },
      update: function (dt, t) {
        if (root) root.position.y = (props.position ? props.position.y : 4) + Math.sin(t * 0.6) * 0.06;
      },
      dispose: function () {
        if (tex) tex.dispose(); if (mat) mat.dispose(); if (geo) geo.dispose();
        if (fgeo) fgeo.dispose(); if (fmat) fmat.dispose();
        root = null;
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
