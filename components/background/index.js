/*!
 * dvengine component — background (components/background/index.js) · folder-is-module · awe port
 * Mirrors awe BackgroundComponent (background-data.ts tagged union: "color" | "sky" | …). Here we
 * realize "color" (solid scene background) and "gradient"/"sky" (a large back-facing dome with a
 * vertical color gradient). Singleton-ish in spirit. Props: { type:'color'|'gradient', color,
 * top, bottom }. Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/background/index.js: DVEngine not loaded');

  global.DVEngine.register('background', function (props) {
    props = props || {};
    var dome, scene, prevBg;

    return {
      type: 'background',
      init: function (ctx) {
        var THREE = ctx.THREE;
        scene = ctx.scene;
        var type = props.type || 'gradient';

        if (type === 'color') {
          prevBg = scene.background;
          scene.background = new THREE.Color(props.color != null ? props.color : 0x0a0e18);
          return null;
        }

        // gradient sky dome
        var top = new THREE.Color(props.top != null ? props.top : 0x16203a);
        var bottom = new THREE.Color(props.bottom != null ? props.bottom : 0x05070d);
        var geo = new THREE.SphereGeometry(800, 32, 16);
        var mat = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: { topColor: { value: top }, bottomColor: { value: bottom }, offset: { value: 0.0 }, expo: { value: 0.7 } },
          vertexShader: [
            'varying vec3 vPos;',
            'void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float expo;',
            'varying vec3 vPos;',
            'void main(){ float h = normalize(vPos + vec3(0.0, offset, 0.0)).y; float m = pow(max(h,0.0), expo);',
            '  gl_FragColor = vec4(mix(bottomColor, topColor, m), 1.0); }'
          ].join('\n'),
        });
        dome = new THREE.Mesh(geo, mat);
        dome.name = 'background';
        dome.frustumCulled = false;
        return dome;
      },
      update: function () {},
      dispose: function () {
        if (dome) { dome.geometry.dispose(); dome.material.dispose(); }
        if (scene && prevBg !== undefined) scene.background = prevBg;
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
