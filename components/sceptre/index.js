/*! dvengine — component sceptre (components/sceptre/index.js) · the first item of influence: a rod with a glowing, pulsing head, placed on the field of influence; use() pulses + dv:item · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · DeltaVerse-native */
/*
 * Props: { length:0.9, color (rod, 0x2b2d42), tint (head, '#f5c451'), glow:0.8, position }
 * API on the comp: use() → pulse + `dv:item` { name, action:'use' } on the space; glow(level, selected) (the field drives it from the voice energy);
 * root, head. Held by DVField.attach(comp, { name:'sceptre', slot }) — the field re-parents `root` onto its surface.
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) { if (typeof module !== 'undefined' && module.exports) module.exports = { type: 'sceptre' }; return; }
  global.DVEngine.register('sceptre', function (props) {
    props = props || {};
    var THREE, space, root, rod, head, halo, geos = [], mats = [], pulse = 0, level = 0, selected = false, name = props.name || 'sceptre';
    var length = props.length > 0 ? +props.length : 0.9, glow = props.glow != null ? +props.glow : 0.8;
    var tint = props.tint || '#f5c451', color = props.color != null ? props.color : 0x2b2d42;
    function hex(c) { return typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c; }
    var comp = {
      type: 'sceptre', name: name,
      init: function (ctx) {
        THREE = ctx.THREE; space = ctx.space; root = new THREE.Group(); root.name = 'sceptre';
        var rg = new THREE.CylinderGeometry(0.02, 0.028, length, 10), rm = new THREE.MeshStandardMaterial({ color: hex(color), metalness: 0.7, roughness: 0.35 }); geos.push(rg); mats.push(rm);
        rod = new THREE.Mesh(rg, rm); rod.position.y = length / 2; rod.castShadow = true; root.add(rod);
        var hg = new THREE.IcosahedronGeometry(0.075, 1), hm = new THREE.MeshStandardMaterial({ color: hex(tint), emissive: hex(tint), emissiveIntensity: glow, metalness: 0.3, roughness: 0.25, flatShading: true }); geos.push(hg); mats.push(hm);
        head = new THREE.Mesh(hg, hm); head.position.y = length + 0.06; root.add(head);
        var ag = new THREE.SphereGeometry(0.13, 16, 12), am = new THREE.MeshBasicMaterial({ color: hex(tint), transparent: true, opacity: 0.12, depthWrite: false }); geos.push(ag); mats.push(am);
        halo = new THREE.Mesh(ag, am); head.add(halo);
        var p = props.position || { x: 0, y: 0, z: 0 }; root.position.set(+p.x || 0, +p.y || 0, +p.z || 0);
        root.userData.dvItem = comp;
        return root;
      },
      use: function () { pulse = 1; if (space && space._emit) space._emit('dv:item', { name: name, action: 'use', item: comp }); return comp; },
      glow: function (lv, sel) { level = Math.max(0, Math.min(1, +lv || 0)); selected = !!sel; return comp; },
      get root() { return root; }, get head() { return head; },
      update: function (dt, t) {
        if (!head) return;
        pulse = Math.max(0, pulse - dt * 1.6);
        var k = glow * (0.6 + 0.4 * Math.sin(t * 2.2)) + 0.8 * pulse + 0.5 * level + (selected ? 0.3 : 0);
        head.material.emissiveIntensity = k; head.rotation.y = t * 0.8; head.rotation.x = Math.sin(t * 0.7) * 0.3;
        halo.material.opacity = 0.08 + 0.25 * pulse + 0.15 * level; halo.scale.setScalar(1 + 0.6 * pulse);
      },
      dispose: function () { for (var i = 0; i < geos.length; i++) geos[i].dispose(); for (var j = 0; j < mats.length; j++) mats[j].dispose(); root = null; head = null; }
    };
    return comp;
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = { type: 'sceptre' };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
