/*!
 * dvengine component — water (components/water/index.js) · folder-is-module · awe port
 * Mirrors awe WaterComponent (engine-src/space/components/water): an animated water surface. A
 * subdivided plane whose vertices are displaced by summed sine waves in the vertex shader, with a
 * fresnel-ish color blend in the fragment shader. Props: { size, segments, color, deep, position }.
 * Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/water/index.js: DVEngine not loaded');

  global.DVEngine.register('water', function (props) {
    props = props || {};
    var mesh, geo, mat;

    return {
      type: 'water',
      init: function (ctx) {
        var THREE = ctx.THREE;
        var size = props.size || 20;
        var seg = props.segments || 96;
        geo = new THREE.PlaneGeometry(size, size, seg, seg);
        mat = new THREE.ShaderMaterial({
          transparent: true,
          uniforms: {
            uTime: { value: 0 },
            uShallow: { value: new THREE.Color(props.color != null ? props.color : 0x2a9df4) },
            uDeep: { value: new THREE.Color(props.deep != null ? props.deep : 0x06243a) },
          },
          vertexShader: [
            'uniform float uTime; varying float vH; varying vec3 vN;',
            'float wave(vec2 p){ return sin(p.x*0.6 + uTime*1.2)*0.25 + sin(p.y*0.9 - uTime*0.8)*0.18 + sin((p.x+p.y)*0.4 + uTime)*0.12; }',
            'void main(){ vec3 pos = position; float h = wave(position.xy); pos.z += h; vH = h;',
            '  float e = 0.5; float hx = wave(position.xy + vec2(e,0.0)); float hy = wave(position.xy + vec2(0.0,e));',
            '  vN = normalize(vec3(h-hx, h-hy, e));',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0); }'
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 uShallow; uniform vec3 uDeep; varying float vH; varying vec3 vN;',
            'void main(){ float m = clamp(vH*1.5 + 0.5, 0.0, 1.0);',
            '  vec3 col = mix(uDeep, uShallow, m);',
            '  float spec = pow(max(vN.z, 0.0), 3.0);',
            '  col += spec * 0.4;',
            '  gl_FragColor = vec4(col, 0.88); }'
          ].join('\n'),
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'water';
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
