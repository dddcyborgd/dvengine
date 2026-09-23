/*!
 * awe runtime component — text
 * Mirrors awe TextComponent (engine-src/space/components/text): an in-world text label. Realized as
 * a canvas-texture sprite (always faces the camera) — no font asset needed, clean-room. Props:
 * { text, color, bg, size, position, billboard }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('text.js: AweRuntime not loaded');

  global.AweRuntime.register('text', function (props) {
    props = props || {};
    var obj, tex, mat, geo, THREE, billboard, camera;

    function makeTexture(text, color, bg) {
      var cv = global.document.createElement('canvas');
      cv.width = 1024; cv.height = 256;
      var g = cv.getContext('2d');
      if (bg != null) { g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); }
      g.font = 'bold 160px ui-monospace, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = color || '#ffd166';
      g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 16;
      g.fillText(String(text), cv.width / 2, cv.height / 2);
      return new THREE.CanvasTexture(cv);
    }

    return {
      type: 'text',
      init: function (ctx) {
        THREE = ctx.THREE; camera = ctx.camera;
        billboard = props.billboard !== false;
        tex = makeTexture(props.text != null ? props.text : 'DeltaVerse', props.color, props.bg);
        if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        var size = props.size || 4;
        var pos = props.position || { x: 0, y: 5, z: 0 };

        if (billboard) {
          mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
          obj = new THREE.Sprite(mat);
          obj.scale.set(size, size / 4, 1);
        } else {
          geo = new THREE.PlaneGeometry(size, size / 4);
          mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
          obj = new THREE.Mesh(geo, mat);
        }
        obj.name = 'text';
        obj.position.set(pos.x, pos.y, pos.z);
        return obj;
      },
      update: function (dt, t) {
        if (obj && !billboard && props.face !== false && camera) obj.lookAt(camera.position);
      },
      dispose: function () { if (tex) tex.dispose(); if (mat) mat.dispose(); if (geo) geo.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
