/*!
 * awe runtime component — model
 * Mirrors awe ModelComponent (engine-src/space/components/model): a glTF / GLB model node. Loads a
 * GLTF via the addon GLTFLoader (exposed as window.GLTFLoader) when available; otherwise falls back
 * to a procedural placeholder mesh so the component ALWAYS renders. Spins. Props:
 * { url, scale, position, color, spin }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('model.js: AweRuntime not loaded');

  global.AweRuntime.register('model', function (props) {
    props = props || {};
    var root, geo, mat, spin, loaded = false;

    function placeholder(THREE) {
      var g = new THREE.Group();
      geo = new THREE.TorusKnotGeometry(0.7, 0.25, 120, 16);
      mat = new THREE.MeshStandardMaterial({
        color: props.color != null ? props.color : 0xffa726,
        roughness: 0.3, metalness: 0.5, emissive: 0x331400,
      });
      var m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      return g;
    }

    return {
      type: 'model',
      init: function (ctx) {
        var THREE = ctx.THREE;
        root = new THREE.Group();
        root.name = 'model';
        var pos = props.position || { x: 5, y: 2.2, z: 0 };
        root.position.set(pos.x, pos.y, pos.z);
        var s = props.scale != null ? props.scale : 1;
        root.scale.set(s, s, s);
        spin = props.spin !== false;

        if (props.url && global.GLTFLoader) {
          try {
            var loader = new global.GLTFLoader();
            loader.load(props.url, function (gltf) {
              if (!root) return;            // disposed before load finished
              gltf.scene.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
              root.add(gltf.scene);
              loaded = true;
            }, undefined, function () {
              if (root && !loaded) root.add(placeholder(THREE)); // load error -> placeholder
            });
          } catch (e) { root.add(placeholder(THREE)); }
        } else {
          root.add(placeholder(THREE)); // no url or no loader -> placeholder
        }
        return root;
      },
      update: function (dt, t) { if (root && spin) { root.rotation.y = t * 0.6; root.rotation.x = Math.sin(t * 0.4) * 0.2; } },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); root = null; },
    };
  });
})(typeof window !== 'undefined' ? window : this);
