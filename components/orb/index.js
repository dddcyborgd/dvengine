/*! dvengine — component orb (components/orb/index.js) · an item of influence: a floating, breathing sphere with an inner light; use() flares + dv:item · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · DeltaVerse-native */
/*
 * Props: { radius:0.11, color ('#7fdcff'), glow:0.7, float:true, position }
 * API on the comp: use() → flare + `dv:item` { name, action:'use' }; glow(level, selected); root. Held by DVField.attach(comp, { name:'orb', slot }).
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) { if (typeof module !== 'undefined' && module.exports) module.exports = { type: 'orb' }; return; }
  global.DVEngine.register('orb', function (props) {
    props = props || {};
    var THREE, space, root, ball, shell, geos = [], mats = [], pulse = 0, level = 0, selected = false, name = props.name || 'orb';
    var radius = props.radius > 0 ? +props.radius : 0.11, glow = props.glow != null ? +props.glow : 0.7, float = props.float !== false;
    var color = props.color || '#7fdcff';
    function hex(c) { return typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c; }
    var comp = {
      type: 'orb', name: name,
      init: function (ctx) {
        THREE = ctx.THREE; space = ctx.space; root = new THREE.Group(); root.name = 'orb';
        var bg = new THREE.SphereGeometry(radius, 24, 18), bm = new THREE.MeshStandardMaterial({ color: hex(color), emissive: hex(color), emissiveIntensity: glow, metalness: 0.1, roughness: 0.2 }); geos.push(bg); mats.push(bm);
        ball = new THREE.Mesh(bg, bm); ball.castShadow = true; root.add(ball);
        var sg = new THREE.SphereGeometry(radius * 1.7, 20, 14), sm = new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, opacity: 0.1, depthWrite: false, side: THREE.BackSide }); geos.push(sg); mats.push(sm);
        shell = new THREE.Mesh(sg, sm); root.add(shell);
        var p = props.position || { x: 0, y: 0, z: 0 }; root.position.set(+p.x || 0, +p.y || 0, +p.z || 0);
        root.userData.dvItem = comp;
        return root;
      },
      use: function () { pulse = 1; if (space && space._emit) space._emit('dv:item', { name: name, action: 'use', item: comp }); return comp; },
      glow: function (lv, sel) { level = Math.max(0, Math.min(1, +lv || 0)); selected = !!sel; return comp; },
      get root() { return root; },
      update: function (dt, t) {
        if (!ball) return;
        pulse = Math.max(0, pulse - dt * 1.4);
        ball.material.emissiveIntensity = glow * (0.7 + 0.3 * Math.sin(t * 1.7)) + pulse + 0.5 * level + (selected ? 0.3 : 0);
        if (float) ball.position.y = 0.03 * Math.sin(t * 1.3);
        shell.material.opacity = 0.08 + 0.3 * pulse + 0.15 * level; shell.scale.setScalar(1 + 0.8 * pulse); shell.position.copy(ball.position);
      },
      dispose: function () { for (var i = 0; i < geos.length; i++) geos[i].dispose(); for (var j = 0; j < mats.length; j++) mats[j].dispose(); root = null; ball = null; }
    };
    return comp;
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = { type: 'orb' };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
