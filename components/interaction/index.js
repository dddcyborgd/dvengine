/*!
 * dvengine component — interaction (components/interaction/index.js) · folder-is-module · awe port
 * Mirrors awe InteractionComponent (engine-src/space/components/interaction): pointer raycast hover /
 * click handling on in-world targets. Clean-room realization: returns a small target mesh; a
 * pointermove/click listener (added in init, removed in dispose) tracks the pointer; on update it
 * raycasts from ctx.camera through the pointer and highlights the target when hovered, scaling/
 * flashing it on click. Guards `typeof window`/`typeof document` so it is node-load safe.
 * Props: { color, hoverColor, position, size }. Upstream design © oncyberio — MIT. https://github.com/oncyberio/awe · (c) 2026 BANKON / PYTHAI · MIT
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) throw new Error('components/interaction/index.js: DVEngine not loaded');

  global.DVEngine.register('interaction', function (props) {
    props = props || {};
    var mesh, geo, mat, ray, ndc, THREE, camera, baseColor, hoverColor;
    var hovered = false, clickPulse = 0;
    var onMove = null, onDown = null, domEl = null;

    return {
      type: 'interaction',
      init: function (ctx) {
        THREE = ctx.THREE;
        camera = ctx.camera;
        baseColor = new THREE.Color(props.color != null ? props.color : 0x06d6a0);
        hoverColor = new THREE.Color(props.hoverColor != null ? props.hoverColor : 0xffd166);

        var size = props.size || 1.2;
        geo = new THREE.IcosahedronGeometry(size, 0);
        mat = new THREE.MeshStandardMaterial({
          color: baseColor.clone(), roughness: 0.35, metalness: 0.3, emissive: 0x000000,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'interaction';
        mesh.castShadow = true;
        var pos = props.position || { x: 0, y: 2, z: 5 };
        mesh.position.set(pos.x, pos.y, pos.z);

        ray = new THREE.Raycaster();
        ndc = new THREE.Vector2(2, 2); // off-screen until first pointer event

        // pointer listeners — guarded for node-load safety
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          domEl = (ctx.renderer && ctx.renderer.domElement) || document;
          var self = this;
          onMove = function (e) {
            var rect = (domEl.getBoundingClientRect && domEl.getBoundingClientRect()) ||
              { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
            ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          };
          onDown = function () { if (hovered) clickPulse = 1; };
          window.addEventListener('pointermove', onMove);
          (domEl.addEventListener ? domEl : window).addEventListener('pointerdown', onDown);
        }

        return mesh;
      },
      update: function (dt, t) {
        if (!mesh) return;
        mesh.rotation.y = t * 0.5;
        if (ray && camera && ndc.x >= -1 && ndc.x <= 1) {
          ray.setFromCamera(ndc, camera);
          var hits = ray.intersectObject(mesh, false);
          hovered = hits.length > 0;
        } else {
          hovered = false;
        }
        clickPulse = Math.max(0, clickPulse - dt * 2);
        var s = 1 + clickPulse * 0.4 + (hovered ? 0.08 : 0);
        mesh.scale.setScalar(s);
        mat.color.copy(hovered ? hoverColor : baseColor);
        mat.emissive.setScalar(hovered ? 0.25 + clickPulse * 0.5 : clickPulse * 0.5);
      },
      dispose: function () {
        if (typeof window !== 'undefined') {
          if (onMove) window.removeEventListener('pointermove', onMove);
          if (onDown) (domEl && domEl.removeEventListener ? domEl : window).removeEventListener('pointerdown', onDown);
        }
        onMove = onDown = domEl = null;
        if (geo) geo.dispose(); if (mat) mat.dispose(); mesh = null; camera = null;
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
