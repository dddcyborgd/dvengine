/*!
 * awe runtime component — avatar
 * Mirrors awe AvatarComponent (engine-src/space/components/avatar): an in-world character. Upstream
 * loads a VRM rig; this is the clean-room placeholder — a simple humanoid built from primitives
 * (capsule body + sphere head + limbs) that idles/bobs and slowly turns. Props: { color, height,
 * position }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('avatar.js: AweRuntime not loaded');

  global.AweRuntime.register('avatar', function (props) {
    props = props || {};
    var root, geos = [], mats = [], armL, armR;

    function limb(THREE, color, w, h) {
      var geo = new THREE.CapsuleGeometry(w, h, 4, 8);
      var mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.1 });
      geos.push(geo); mats.push(mat);
      var m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      return m;
    }

    return {
      type: 'avatar',
      init: function (ctx) {
        var THREE = ctx.THREE;
        root = new THREE.Group();
        root.name = 'avatar';
        var pos = props.position || { x: -3, y: 0, z: 2 };
        root.position.set(pos.x, pos.y, pos.z);

        var height = props.height || 1.8;
        var color = props.color != null ? props.color : 0x4cc9f0;
        var s = height / 1.8;
        root.scale.set(s, s, s);

        // torso (capsule body)
        var body = limb(THREE, color, 0.28, 0.7);
        body.position.y = 1.05;
        root.add(body);

        // head (sphere)
        var headGeo = new THREE.SphereGeometry(0.26, 24, 16);
        var headMat = new THREE.MeshStandardMaterial({ color: 0xffe0bd, roughness: 0.5, metalness: 0.05 });
        geos.push(headGeo); mats.push(headMat);
        var head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.72; head.castShadow = true;
        root.add(head);

        // arms
        armL = limb(THREE, color, 0.1, 0.55); armL.position.set(-0.42, 1.05, 0);
        armR = limb(THREE, color, 0.1, 0.55); armR.position.set(0.42, 1.05, 0);
        root.add(armL); root.add(armR);

        // legs
        var legL = limb(THREE, 0x2b2d42, 0.12, 0.6); legL.position.set(-0.16, 0.35, 0);
        var legR = limb(THREE, 0x2b2d42, 0.12, 0.6); legR.position.set(0.16, 0.35, 0);
        root.add(legL); root.add(legR);

        return root;
      },
      update: function (dt, t) {
        if (!root) return;
        root.rotation.y = Math.sin(t * 0.3) * 0.6;     // slowly turns
        root.position.y = (props.position ? props.position.y : 0) + Math.sin(t * 1.6) * 0.04; // idle bob
        if (armL) armL.rotation.x = Math.sin(t * 1.6) * 0.25;
        if (armR) armR.rotation.x = -Math.sin(t * 1.6) * 0.25;
      },
      dispose: function () {
        for (var i = 0; i < geos.length; i++) { geos[i].dispose(); mats[i].dispose(); }
        root = null;
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
