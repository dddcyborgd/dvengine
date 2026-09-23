/*!
 * awe runtime component — vrmanims
 * Mirrors awe VrmAnimsComponent (engine-src/space/components/vrmanims): an animation driver for the
 * avatar-style rig. Upstream retargets FBX/VRM clips onto a humanoid skeleton; this is the clean-room
 * realization — a small skeleton of jointed boxes performing a looping wave/idle animation driven by
 * update(). Visible jointed figure. Props: { speed, color, position }. Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('vrmanims.js: AweRuntime not loaded');

  global.AweRuntime.register('vrmanims', function (props) {
    props = props || {};
    var root, geos = [], mats = [], speed;
    var shoulder, elbow, hipL, hipR, kneeL, kneeR, spine;

    function box(THREE, color, w, h, d) {
      var geo = new THREE.BoxGeometry(w, h, d);
      var mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.2, emissive: 0x0a0a14 });
      geos.push(geo); mats.push(mat);
      var m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      return m;
    }

    // a jointed pivot: a Group at the joint, with a bone box offset along it
    function joint(THREE, parent, jx, jy, jz, color, len) {
      var g = new THREE.Group();
      g.position.set(jx, jy, jz);
      var bone = box(THREE, color, 0.12, len, 0.12);
      bone.position.y = -len / 2;     // bone hangs below the joint pivot
      g.add(bone);
      parent.add(g);
      return g;
    }

    return {
      type: 'vrmanims',
      init: function (ctx) {
        var THREE = ctx.THREE;
        speed = props.speed != null ? props.speed : 1;
        var color = props.color != null ? props.color : 0xf72585;
        root = new THREE.Group();
        root.name = 'vrmanims';
        var pos = props.position || { x: 3, y: 0, z: 2 };
        root.position.set(pos.x, pos.y, pos.z);

        spine = new THREE.Group(); spine.position.y = 1.0; root.add(spine);
        var torso = box(THREE, color, 0.5, 0.8, 0.3); torso.position.y = 0.4; spine.add(torso);
        var head = box(THREE, 0xffe0bd, 0.32, 0.32, 0.32); head.position.y = 1.0; spine.add(head);

        // right arm: shoulder -> elbow (the waving arm)
        shoulder = joint(THREE, spine, 0.36, 0.7, 0, color, 0.4);
        elbow = joint(THREE, shoulder, 0, -0.4, 0, color, 0.38);

        // left arm (static-ish swing)
        joint(THREE, spine, -0.36, 0.7, 0, color, 0.4);

        // legs
        hipL = joint(THREE, root, -0.16, 1.0, 0, 0x3a0ca3, 0.5);
        kneeL = joint(THREE, hipL, 0, -0.5, 0, 0x3a0ca3, 0.48);
        hipR = joint(THREE, root, 0.16, 1.0, 0, 0x3a0ca3, 0.5);
        kneeR = joint(THREE, hipR, 0, -0.5, 0, 0x3a0ca3, 0.48);

        return root;
      },
      update: function (dt, t) {
        if (!root) return;
        var s = t * speed;
        // wave: shoulder raised, elbow oscillating
        if (shoulder) shoulder.rotation.z = -1.9;
        if (elbow) elbow.rotation.z = Math.sin(s * 4) * 0.6 - 0.3;
        // idle gait sway on legs + spine
        if (hipL) hipL.rotation.x = Math.sin(s * 2) * 0.18;
        if (hipR) hipR.rotation.x = -Math.sin(s * 2) * 0.18;
        if (kneeL) kneeL.rotation.x = Math.max(0, Math.sin(s * 2)) * 0.3;
        if (kneeR) kneeR.rotation.x = Math.max(0, -Math.sin(s * 2)) * 0.3;
        if (spine) spine.rotation.y = Math.sin(s) * 0.1;
      },
      dispose: function () {
        for (var i = 0; i < geos.length; i++) { geos[i].dispose(); mats[i].dispose(); }
        root = null;
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
