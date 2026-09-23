/*!
 * awe runtime component — postprocessing
 * Mirrors awe PostProcessingComponent (engine-src/space/components/postprocessing): a full-screen FX
 * pass (vignette / grain / tint). A real EffectComposer + addon passes may not be loaded offline, and
 * the AweRuntime render loop does not expose a render hook — so this is a clean-room overlay approach:
 * a transparent full-screen quad parented to the camera, drawn last on top of the scene, running a
 * fragment shader that darkens the edges (vignette), adds a faint chromatic tint and animated grain.
 * Props: { vignette, grain, tint }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('postprocessing.js: AweRuntime not loaded');

  global.AweRuntime.register('postprocessing', function (props) {
    props = props || {};
    var obj, geo, mat, camera, THREE;

    return {
      type: 'postprocessing',
      init: function (ctx) {
        THREE = ctx.THREE; camera = ctx.camera;
        var tint = new THREE.Color(props.tint != null ? props.tint : 0x000814);
        // a unit quad that we keep filling the view, drawn in front of the near plane
        geo = new THREE.PlaneGeometry(2, 2);
        mat = new THREE.ShaderMaterial({
          transparent: true,
          depthTest: false,
          depthWrite: false,
          uniforms: {
            vignette: { value: props.vignette != null ? props.vignette : 0.6 },
            grain: { value: props.grain != null ? props.grain : 0.08 },
            tint: { value: tint },
            time: { value: 0.0 },
          },
          vertexShader: [
            'varying vec2 vUv;',
            'void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
          ].join('\n'),
          fragmentShader: [
            'uniform float vignette; uniform float grain; uniform vec3 tint; uniform float time;',
            'varying vec2 vUv;',
            'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
            'void main(){',
            '  vec2 p = vUv - 0.5;',
            '  float r = length(p) * 1.41421;',
            '  float vig = smoothstep(1.0, 0.4, r);',          // 1 at center, ->0 at corners
            '  float dark = (1.0 - vig) * vignette;',
            '  float g = (hash(vUv * vec2(1920.0, 1080.0) + time) - 0.5) * grain;',
            '  vec3 col = tint;',
            '  float a = dark + abs(g);',
            '  gl_FragColor = vec4(col + g, clamp(a, 0.0, 1.0));',
            '}'
          ].join('\n'),
        });
        obj = new THREE.Mesh(geo, mat);
        obj.name = 'postprocessing';
        obj.frustumCulled = false;
        obj.renderOrder = 999;             // drawn last, over the scene
        camera.add(obj);                   // ride with the camera so it always fills the view
        obj.position.set(0, 0, -1);
        return obj;
      },
      update: function (dt, t) {
        if (mat) mat.uniforms.time.value = t;
      },
      dispose: function () {
        if (obj && obj.parent) obj.parent.remove(obj);
        if (geo) geo.dispose(); if (mat) mat.dispose();
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
