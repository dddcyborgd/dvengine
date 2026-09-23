/*!
 * awe runtime component — mesh
 * Mirrors awe MeshComponent (engine-src/space/components/mesh): a configurable primitive shape with a
 * standard material. Realized as a single THREE.Mesh whose geometry is chosen by prop, given a gentle
 * idle spin so it reads as alive. Props:
 * { shape:'box'|'sphere'|'torus'|'cylinder', color, metalness, roughness, position, spin }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('mesh.js: AweRuntime not loaded');

  global.AweRuntime.register('mesh', function (props) {
    props = props || {};
    var mesh, geo, mat, THREE, spin;

    function makeGeometry(THREE, shape) {
      switch (shape) {
        case 'sphere':   return new THREE.SphereGeometry(1, 32, 24);
        case 'torus':    return new THREE.TorusGeometry(0.9, 0.32, 20, 48);
        case 'cylinder': return new THREE.CylinderGeometry(0.8, 0.8, 1.6, 32);
        default:         return new THREE.BoxGeometry(1.4, 1.4, 1.4);
      }
    }

    return {
      type: 'mesh',
      init: function (ctx) {
        THREE = ctx.THREE;
        spin = props.spin !== false;
        geo = makeGeometry(THREE, props.shape || 'box');
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(props.color != null ? props.color : 0x4dd0e1),
          metalness: props.metalness != null ? props.metalness : 0.2,
          roughness: props.roughness != null ? props.roughness : 0.45,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'mesh';
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        var pos = props.position || { x: 0, y: 1.6, z: 0 };
        mesh.position.set(pos.x, pos.y, pos.z);
        return mesh;
      },
      update: function (dt, t) {
        if (!mesh || !spin) return;
        mesh.rotation.y = t * 0.6;
        mesh.rotation.x = Math.sin(t * 0.4) * 0.25;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
