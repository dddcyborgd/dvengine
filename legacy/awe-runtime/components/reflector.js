/*!
 * awe runtime component — reflector
 * Mirrors awe ReflectorComponent (engine-src/space/components/reflector): a flat reflective mirror
 * floor. A true planar mirror (second-camera render-to-texture) is heavy; this is a clean-room,
 * lightweight planar *look* — a tinted glossy plane whose shader blends a vertical gradient with a
 * slow-moving specular sheen, reading as polished without an extra render pass. Singleton in spirit.
 * Props: { size, color, opacity, position }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('reflector.js: AweRuntime not loaded');

  global.AweRuntime.register('reflector', function (props) {
    props = props || {};
    var mesh, geo, mat, THREE;

    return {
      type: 'reflector',
      init: function (ctx) {
        THREE = ctx.THREE;
        var size = props.size || 60;
        var tint = new THREE.Color(props.color != null ? props.color : 0x9fbada);
        geo = new THREE.PlaneGeometry(size, size, 1, 1);
        mat = new THREE.ShaderMaterial({
          transparent: true,
          uniforms: {
            tint: { value: tint },
            opacity: { value: props.opacity != null ? props.opacity : 0.55 },
            time: { value: 0.0 },
          },
          vertexShader: [
            'varying vec2 vUv;',
            'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 tint; uniform float opacity; uniform float time;',
            'varying vec2 vUv;',
            'void main(){',
            '  vec2 p = vUv - 0.5;',
            '  float r = length(p);',
            '  float grad = smoothstep(0.75, 0.0, r);',
            '  float sheen = 0.5 + 0.5 * sin((vUv.x + vUv.y) * 6.2831 + time * 0.6);',
            '  vec3 col = tint * (0.25 + 0.55 * grad) + sheen * 0.18;',
            '  gl_FragColor = vec4(col, opacity * grad);',
            '}'
          ].join('\n'),
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'reflector';
        mesh.rotation.x = -Math.PI / 2;
        var pos = props.position || { x: 0, y: 0.01, z: 0 };
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.receiveShadow = true;
        return mesh;
      },
      update: function (dt, t) {
        if (mat) mat.uniforms.time.value = t;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
