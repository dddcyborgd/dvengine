/*!
 * dvengine component — cloud (components/cloud/index.js) · folder-is-module · awe port
 * Mirrors awe CloudComponent (engine-src/space/components/cloud): a billboard cloud layer. Realized
 * as a set of additive, soft radial-gradient sprites clustered into puffs, drifting slowly — a
 * cheap volumetric-ish look without a 3D texture. Props: { puffs, color, height, spread, drift }.
 * Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/cloud/index.js: DVEngine not loaded');

  global.DVEngine.register('cloud', function (props) {
    props = props || {};
    var grp, tex, mat, drift, sprites = [];

    function softTexture(THREE, color) {
      var cv = global.document.createElement('canvas');
      cv.width = cv.height = 128;
      var g = cv.getContext('2d');
      var grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      grad.addColorStop(0, color || 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(cv);
    }

    return {
      type: 'cloud',
      init: function (ctx) {
        var THREE = ctx.THREE;
        grp = new THREE.Group();
        grp.name = 'cloud';
        tex = softTexture(THREE, props.color);
        mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
        drift = props.drift != null ? props.drift : 0.4;
        var puffs = props.puffs || 28;
        var spread = props.spread || 26;
        var height = props.height != null ? props.height : 14;
        for (var i = 0; i < puffs; i++) {
          var s = new THREE.Sprite(mat);
          var sc = 4 + Math.random() * 6;
          s.scale.set(sc, sc, 1);
          s.position.set((Math.random() - 0.5) * spread, height + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * spread);
          s.userData.phase = Math.random() * Math.PI * 2;
          s.userData.x0 = s.position.x;
          grp.add(s);
          sprites.push(s);
        }
        return grp;
      },
      update: function (dt, t) {
        for (var i = 0; i < sprites.length; i++) {
          var s = sprites[i];
          s.position.x = s.userData.x0 + Math.sin(t * 0.1 + s.userData.phase) * drift * 4;
        }
      },
      dispose: function () { if (tex) tex.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
