/*!
 * awe runtime component — video
 * Mirrors awe VideoComponent (engine-src/space/components/video): a video played on a flat plane.
 * Offline there is no real video stream, so the plane shows an animated canvas texture that *simulates*
 * playback — scrolling color bars, a sweeping scanline, and a live timecode — repainted every frame.
 * Clean-room, no remote URL. Props: { color, width, height, position }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('video.js: AweRuntime not loaded');

  global.AweRuntime.register('video', function (props) {
    props = props || {};
    var mesh, geo, mat, tex, cv, g, THREE, base;

    function pad(n) { n = n | 0; return n < 10 ? '0' + n : '' + n; }

    function paint(t) {
      var w = cv.width, h = cv.height;
      g.fillStyle = '#05070d'; g.fillRect(0, 0, w, h);
      // scrolling color bars
      var bars = 8, bw = w / bars, off = (t * 80) % bw;
      for (var i = -1; i < bars + 1; i++) {
        var hue = ((i / bars) * 360 + t * 40) % 360;
        g.fillStyle = 'hsl(' + hue.toFixed(0) + ',70%,' + (base + 18) + '%)';
        g.fillRect(i * bw + off, 0, bw + 1, h);
      }
      // sweeping scanline
      var sx = (Math.sin(t * 1.5) * 0.5 + 0.5) * w;
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(sx - 3, 0, 6, h);
      // timecode
      g.font = 'bold 48px ui-monospace, monospace';
      g.textAlign = 'left'; g.textBaseline = 'bottom';
      g.fillStyle = '#ffffff';
      g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10;
      var f = (t * 30) % 30;
      g.fillText(pad(t / 60) + ':' + pad(t % 60) + ':' + pad(f), 20, h - 16);
      g.shadowBlur = 0;
    }

    return {
      type: 'video',
      init: function (ctx) {
        THREE = ctx.THREE;
        var col = new THREE.Color(props.color != null ? props.color : 0x4dd0e1);
        base = Math.round(col.getHSL({ h: 0, s: 0, l: 0 }).l * 30) + 25;
        cv = global.document.createElement('canvas');
        cv.width = 640; cv.height = 360;
        g = cv.getContext('2d');
        paint(0);
        tex = new THREE.CanvasTexture(cv);
        if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        var w = props.width || 6.4, h = props.height || 3.6;
        geo = new THREE.PlaneGeometry(w, h);
        mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'video';
        var pos = props.position || { x: 0, y: 3, z: 0 };
        mesh.position.set(pos.x, pos.y, pos.z);
        return mesh;
      },
      update: function (dt, t) {
        if (!tex) return;
        paint(t);
        tex.needsUpdate = true;
      },
      dispose: function () { if (tex) tex.dispose(); if (mat) mat.dispose(); if (geo) geo.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
