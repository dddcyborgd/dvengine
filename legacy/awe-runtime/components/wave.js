/*!
 * awe runtime component — wave
 * Mirrors awe WaveComponent (engine-src/space/components/wave): an animated wave effect. Distinct
 * from water.js — a more stylized, larger-swell surface. A subdivided plane displaced by summed
 * traveling sine waves in a ShaderMaterial, shaded by height. Props: { size, amplitude, color }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('wave.js: AweRuntime not loaded');

  global.AweRuntime.register('wave', function (props) {
    props = props || {};
    var mesh, geo, mat;

    return {
      type: 'wave',
      init: function (ctx) {
        var THREE = ctx.THREE;
        var size = props.size || 40;
        var seg = props.segments || 120;
        var amp = props.amplitude != null ? props.amplitude : 1.5;
        geo = new THREE.PlaneGeometry(size, size, seg, seg);
        mat = new THREE.ShaderMaterial({
          transparent: true,
          uniforms: {
            uTime: { value: 0 },
            uAmp: { value: amp },
            uColor: { value: new THREE.Color(props.color != null ? props.color : 0x3ad6c4) },
            uCrest: { value: new THREE.Color(0xeafff9) },
          },
          vertexShader: [
            'uniform float uTime; uniform float uAmp; varying float vH; varying vec3 vN;',
            'float swell(vec2 p){ return sin(p.x*0.15 + uTime*0.9)*0.6 + sin(p.y*0.22 - uTime*0.6)*0.45 + sin((p.x+p.y)*0.1 + uTime*0.4)*0.3; }',
            'void main(){ vec3 pos = position; float h = swell(position.xy) * uAmp; pos.z += h; vH = h / uAmp;',
            '  float e = 1.0; float hx = swell(position.xy + vec2(e,0.0))*uAmp; float hy = swell(position.xy + vec2(0.0,e))*uAmp;',
            '  vN = normalize(vec3(h-hx, h-hy, e));',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0); }'
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 uColor; uniform vec3 uCrest; varying float vH; varying vec3 vN;',
            'void main(){ float m = clamp(vH*0.6 + 0.5, 0.0, 1.0);',
            '  vec3 col = mix(uColor, uCrest, m);',
            '  float spec = pow(max(vN.z, 0.0), 4.0);',
            '  col += spec * 0.5;',
            '  gl_FragColor = vec4(col, 0.92); }'
          ].join('\n'),
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'wave';
        mesh.rotation.x = -Math.PI / 2;
        var p = props.position || { x: 0, y: 0.05, z: 0 };
        mesh.position.set(p.x, p.y, p.z);
        return mesh;
      },
      update: function (dt, t) { if (mat) mat.uniforms.uTime.value = t; },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
