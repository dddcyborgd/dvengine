/*!
 * awe runtime component — fog
 * Mirrors awe FogComponent (engine-src/space/components/fog): distance fog on the scene. Realizes
 * both THREE.Fog (linear near/far) and THREE.FogExp2 (exponential). Props:
 * { type:'linear'|'exp2', color, near, far, density }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('fog.js: AweRuntime not loaded');

  global.AweRuntime.register('fog', function (props) {
    props = props || {};
    var scene, prevFog;

    return {
      type: 'fog',
      init: function (ctx) {
        var THREE = ctx.THREE;
        scene = ctx.scene;
        prevFog = scene.fog;
        var color = props.color != null ? props.color : 0x0a0e18;
        if (props.type === 'exp2') {
          scene.fog = new THREE.FogExp2(color, props.density != null ? props.density : 0.012);
        } else {
          scene.fog = new THREE.Fog(color, props.near != null ? props.near : 8, props.far != null ? props.far : 60);
        }
        return null; // fog is a scene property, not an Object3D
      },
      update: function () {},
      dispose: function () { if (scene) scene.fog = prevFog || null; },
    };
  });
})(typeof window !== 'undefined' ? window : this);
