/*! dvengine — component portal (components/portal/index.js) · a ring + light column + substrate face; step within reach and the space emits dv:portal · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · DeltaVerse-native */
/*
 * Props: { to (zone/space id), minRole, locked, label, r (reach, 1.6), position, color, height }
 * Each frame the local participant (space.local — an Object3D set by the verse — else the camera) is
 * measured against the portal; entering `r` emits `dv:portal {id,to,minRole,locked}` ONCE and re-arms
 * when the participant leaves 1.5·r. A locked portal is veiled (dim, barred) and emits `dv:portal:locked`.
 * API: setLocked(bool), locked, reach(p) → bool. Pure: DVPortal.reach(portalPos, p, r).
 */
(function (global) {
  'use strict';
  function reach(c, p, r) { var dx = (p.x || 0) - (c.x || 0), dz = (p.z || 0) - (c.z || 0); return dx * dx + dz * dz <= (r || 1.6) * (r || 1.6); }
  var pure = { reach: reach };
  if (!global.DVEngine) { if (typeof module !== 'undefined' && module.exports) module.exports = pure; global.DVPortal = pure; return; }

  function faceCanvas(seed) {
    var cv = global.document.createElement('canvas'); cv.width = cv.height = 256;
    return cv;
  }
  function paintFace(cv, t, seed, color, locked) {
    var g = cv.getContext('2d'); if (!g) return;
    var w = cv.width, h = cv.height, cx = w / 2, cy = h / 2;
    g.clearRect(0, 0, w, h);
    for (var i = 0; i < 9; i++) {
      var a = t * 0.6 + i * 0.7 + seed, rr = 20 + i * 12 + 6 * Math.sin(t + i);
      g.beginPath(); g.arc(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, rr, 0, Math.PI * 2);
      g.strokeStyle = locked ? 'rgba(120,120,140,' + (0.5 - i * 0.05) + ')' : color; g.globalAlpha = locked ? 0.35 : 0.75 - i * 0.07; g.lineWidth = 2; g.stroke();
    }
    g.globalAlpha = 1;
    if (locked) { g.strokeStyle = '#ff6b6b'; g.lineWidth = 8; g.beginPath(); g.moveTo(60, 60); g.lineTo(196, 196); g.moveTo(196, 60); g.lineTo(60, 196); g.stroke(); }
  }
  function labelSprite(THREE, text, color) {
    var cv = global.document.createElement('canvas'); cv.width = 512; cv.height = 128; var g = cv.getContext('2d');
    g.font = 'bold 56px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 12;
    g.fillText(String(text), 256, 64);
    var tex = new THREE.CanvasTexture(cv); if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(2.4, 0.6, 1); return s;
  }

  global.DVEngine.register('portal', function (props) {
    props = props || {};
    var THREE, root, ring, column, face, faceTex, faceCv, label, geos = [], mats = [], locked = !!props.locked, armed = true, acc = 0, space;
    var r = props.r > 0 ? +props.r : 1.6, seed = (props.seed || 3) * 0.1;
    var color = props.color != null ? props.color : 0x22d3ee, colorCss = '#' + ('000000' + (color >>> 0).toString(16)).slice(-6);
    function mkMat(o) { var m = new THREE.MeshStandardMaterial(o); mats.push(m); return m; }
    var comp = {
      type: 'portal',
      init: function (ctx) {
        THREE = ctx.THREE; space = ctx.space;
        root = new THREE.Group(); root.name = 'portal:' + (props.to || '?');
        var H = props.height || 2.6;
        var rg = new THREE.TorusGeometry(1.1, 0.08, 16, 64); geos.push(rg);
        ring = new THREE.Mesh(rg, mkMat({ color: color, emissive: color, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.4 })); ring.position.y = H * 0.55; root.add(ring);
        var cg = new THREE.CylinderGeometry(0.9, 1.2, H, 32, 1, true); geos.push(cg);
        column = new THREE.Mesh(cg, mkMat({ color: color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); column.position.y = H / 2; root.add(column);
        faceCv = faceCanvas(seed); faceTex = new THREE.CanvasTexture(faceCv);
        var fg = new THREE.CircleGeometry(1.0, 48); geos.push(fg);
        var fm = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }); mats.push(fm);
        face = new THREE.Mesh(fg, fm); face.position.y = H * 0.55; root.add(face);
        label = labelSprite(THREE, props.label || props.to || 'portal', colorCss); label.position.y = H + 0.3; root.add(label);
        var p = props.position; if (p) root.position.set(+p.x || 0, +p.y || 0, +p.z || 0);
        root.userData.dvPortal = comp;
        comp.setLocked(locked);
        return root;
      },
      setLocked: function (v) { locked = !!v; if (ring) { ring.material.emissiveIntensity = locked ? 0.15 : 0.8; ring.material.color.set(locked ? 0x555566 : color); } if (column) column.material.opacity = locked ? 0.05 : 0.12; },
      get locked() { return locked; },
      reach: function (p) { return root ? reach(root.position, p, r) : false; },
      update: function (dt, t) {
        if (!root) return;
        ring.rotation.y = t * 0.4; ring.rotation.x = Math.sin(t * 0.5) * 0.2;
        acc += dt; if (acc > 1 / 12) { acc = 0; paintFace(faceCv, t, seed, colorCss, locked); faceTex.needsUpdate = true; }
        var local = space.local || space.camera; if (!local) return;
        var wp = local.getWorldPosition ? local.getWorldPosition(new THREE.Vector3()) : local.position;
        var inside = reach(root.position, wp, r);
        if (inside && armed) { armed = false; space._emit(locked ? 'dv:portal:locked' : 'dv:portal', { id: props.id, to: props.to, minRole: props.minRole || null, locked: locked }); }
        else if (!inside && !armed) { var dx = wp.x - root.position.x, dz = wp.z - root.position.z; if (dx * dx + dz * dz > r * r * 2.25) armed = true; }
      },
      dispose: function () { for (var i = 0; i < geos.length; i++) geos[i].dispose(); for (var j = 0; j < mats.length; j++) mats[j].dispose(); if (faceTex) faceTex.dispose(); if (label) { label.material.map.dispose(); label.material.dispose(); } }
    };
    return comp;
  });
  global.DVPortal = pure;
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
