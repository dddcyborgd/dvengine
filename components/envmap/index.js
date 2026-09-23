/*!
 * dvengine component — envmap (components/envmap/index.js) · folder-is-module · awe port
 * Mirrors awe EnvmapComponent (engine-src/space/components/envmap): supplies the scene environment map
 * used for image-based reflections/lighting. Offline there is no preset image to load, so the env map
 * is procedurally generated — a vertical gradient painted to a canvas and wrapped as an equirectangular
 * texture (EquirectangularReflectionMapping). It sets scene.environment (and optionally background) and
 * returns an empty Object3D, since its effect lives on the scene. Props:
 * { top, bottom, intensity, background, position }. Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/envmap/index.js: DVEngine not loaded');

  global.DVEngine.register('envmap', function (props) {
    props = props || {};
    var obj, tex, scene, THREE, prevEnv, prevBg, setBg;

    function makeEquirect(THREE, top, bottom, intensity) {
      var cv = global.document.createElement('canvas');
      cv.width = 512; cv.height = 256;
      var g = cv.getContext('2d');
      var grad = g.createLinearGradient(0, 0, 0, cv.height);
      grad.addColorStop(0, '#' + top.getHexString());
      grad.addColorStop(1, '#' + bottom.getHexString());
      g.fillStyle = grad; g.fillRect(0, 0, cv.width, cv.height);
      // a soft bright band near the horizon acts as a key light for reflections
      var band = g.createLinearGradient(0, cv.height * 0.35, 0, cv.height * 0.65);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.5, 'rgba(255,255,255,' + (0.25 * intensity).toFixed(3) + ')');
      band.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = band; g.fillRect(0, cv.height * 0.35, cv.width, cv.height * 0.3);
      var t = new THREE.CanvasTexture(cv);
      t.mapping = THREE.EquirectangularReflectionMapping;
      if ('colorSpace' in t && THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }

    return {
      type: 'envmap',
      init: function (ctx) {
        THREE = ctx.THREE; scene = ctx.scene;
        var top = new THREE.Color(props.top != null ? props.top : 0x6f8bb0);
        var bottom = new THREE.Color(props.bottom != null ? props.bottom : 0x101826);
        var intensity = props.intensity != null ? props.intensity : 1;
        setBg = props.background === true;
        tex = makeEquirect(THREE, top, bottom, intensity);
        prevEnv = scene.environment;
        scene.environment = tex;
        if (setBg) { prevBg = scene.background; scene.background = tex; }
        obj = new THREE.Object3D();
        obj.name = 'envmap';
        var pos = props.position || { x: 0, y: 0, z: 0 };
        obj.position.set(pos.x, pos.y, pos.z);
        return obj;
      },
      update: function () {},
      dispose: function () {
        if (scene) {
          if (prevEnv !== undefined) scene.environment = prevEnv;
          if (setBg && prevBg !== undefined) scene.background = prevBg;
        }
        if (tex) tex.dispose();
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
