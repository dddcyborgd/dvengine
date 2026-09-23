/*!
 * awe runtime component — object
 * Mirrors awe ObjectComponent (engine-src/space/components/object): the generic transform/container
 * node — the base "object" in the scene graph. Realized as a THREE.Group (the transform/container)
 * wrapping a small placeholder mesh so the node is visible, with the usual position/rotation/scale
 * transform exposed via props. Props: { color, position, rotation, scale }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('object.js: AweRuntime not loaded');

  global.AweRuntime.register('object', function (props) {
    props = props || {};
    var group, geo, mat, THREE;

    return {
      type: 'object',
      init: function (ctx) {
        THREE = ctx.THREE;
        group = new THREE.Group();
        group.name = 'object';

        // small placeholder mesh so the container node reads in-world
        geo = new THREE.IcosahedronGeometry(0.6, 0);
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(props.color != null ? props.color : 0xffd166),
          roughness: 0.4,
          metalness: 0.1,
          flatShading: true,
        });
        var placeholder = new THREE.Mesh(geo, mat);
        placeholder.castShadow = true;
        group.add(placeholder);

        var pos = props.position || { x: 0, y: 1, z: 0 };
        var rot = props.rotation || { x: 0, y: 0, z: 0 };
        var scl = props.scale || { x: 1, y: 1, z: 1 };
        group.position.set(pos.x, pos.y, pos.z);
        group.rotation.set(rot.x, rot.y, rot.z);
        group.scale.set(scl.x, scl.y, scl.z);
        return group;
      },
      update: function (dt, t) {
        if (group) group.rotation.y = t * 0.4;
      },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
