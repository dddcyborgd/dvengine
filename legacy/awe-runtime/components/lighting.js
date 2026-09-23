/*!
 * awe runtime component — lighting
 * Mirrors awe LightingComponent (engine-src/space/components/lighting): an ambient base light + a
 * directional "sun" (with shadows) + an optional hemisphere fill. The sun orbits slowly (animated).
 * Props: { intensity, sunColor, ambientColor, ambientIntensity, hemisphere, sunPosition, animate }
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('lighting.js: AweRuntime not loaded');

  global.AweRuntime.register('lighting', function (props) {
    props = props || {};
    var group, ambient, sun, hemi, sunPos, animate;

    return {
      type: 'lighting',
      init: function (ctx) {
        var THREE = ctx.THREE;
        group = new THREE.Group();
        group.name = 'lighting';

        ambient = new THREE.AmbientLight(props.ambientColor != null ? props.ambientColor : 0x404a5c,
          props.ambientIntensity != null ? props.ambientIntensity : 0.6);
        group.add(ambient);

        sun = new THREE.DirectionalLight(props.sunColor != null ? props.sunColor : 0xfff2d6,
          props.intensity != null ? props.intensity : 1.4);
        sunPos = props.sunPosition || { x: 8, y: 14, z: 6 };
        sun.position.set(sunPos.x, sunPos.y, sunPos.z);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 80;
        if (sun.shadow.camera.left !== undefined) {
          sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
          sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25;
        }
        group.add(sun);
        group.add(sun.target);

        if (props.hemisphere !== false) {
          hemi = new THREE.HemisphereLight(0x9fc6ff, 0x2a2018, 0.5);
          group.add(hemi);
        }

        animate = props.animate !== false;
        return group;
      },
      update: function (dt, t) {
        if (!animate || !sun) return;
        var r = Math.sqrt(sunPos.x * sunPos.x + sunPos.z * sunPos.z) || 10;
        sun.position.x = Math.cos(t * 0.15) * r;
        sun.position.z = Math.sin(t * 0.15) * r;
        sun.position.y = sunPos.y + Math.sin(t * 0.3) * 2;
      },
      dispose: function () {
        if (sun && sun.shadow && sun.shadow.map) sun.shadow.map.dispose();
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
