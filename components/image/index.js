/*!
 * dvengine component — image (components/image/index.js) · folder-is-module · awe port
 * Mirrors awe ImageComponent (engine-src/space/components/image): a 2D image rendered as a flat plane.
 * Since there is no network/CDN offline, the texture is a procedurally-generated canvas (vertical
 * gradient + label) standing in for the image asset — clean-room, no remote URL. Props:
 * { text, color, width, height, position, billboard }. Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/image/index.js: DVEngine not loaded');

  global.DVEngine.register('image', function (props) {
    props = props || {};
    var mesh, geo, mat, tex, THREE, camera, billboard;

    function makeTexture(text, color) {
      var cv = global.document.createElement('canvas');
      cv.width = 512; cv.height = 512;
      var g = cv.getContext('2d');
      var grad = g.createLinearGradient(0, 0, 0, cv.height);
      var c = color || '#4dd0e1';
      grad.addColorStop(0, c);
      grad.addColorStop(1, '#101826');
      g.fillStyle = grad; g.fillRect(0, 0, cv.width, cv.height);
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 8;
      g.strokeRect(12, 12, cv.width - 24, cv.height - 24);
      g.font = 'bold 64px ui-monospace, monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffffff';
      g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 12;
      g.fillText(String(text), cv.width / 2, cv.height / 2);
      return new THREE.CanvasTexture(cv);
    }

    return {
      type: 'image',
      init: function (ctx) {
        THREE = ctx.THREE; camera = ctx.camera;
        billboard = props.billboard === true;
        tex = makeTexture(props.text != null ? props.text : 'IMAGE', props.color);
        if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        var w = props.width || 4, h = props.height || 4;
        geo = new THREE.PlaneGeometry(w, h);
        mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'image';
        var pos = props.position || { x: 0, y: 3, z: 0 };
        mesh.position.set(pos.x, pos.y, pos.z);
        return mesh;
      },
      update: function (dt, t) {
        if (mesh && billboard && camera) mesh.lookAt(camera.position);
      },
      dispose: function () { if (tex) tex.dispose(); if (mat) mat.dispose(); if (geo) geo.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
