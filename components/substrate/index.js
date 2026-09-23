/*! dvengine — component substrate (components/substrate/index.js) · a DeltaVerse nGn substrate as a live CanvasTexture on a sky, floor, panel or ring · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · DeltaVerse-native */
/*
 * Props: { preset ('shadow-field' …, a DVNgnPresets fragment id), shape:'sky'|'floor'|'panel'|'ring', radius, width, height,
 *          fps (texture upload rate, 24), position, seed, opacity }
 * When window.DVNgnCore + window.DVNgnPresets exist the preset is mounted on an offscreen canvas (the
 * gallery-room skydome pattern) and the texture is re-uploaded at `fps`. Without them a procedural gradient
 * (theme palette from DVThemeRead when present) drifts slowly — the space is never blank.
 * API on the entry's comp: setPreset(id), texture, canvas, core.
 */
(function (global) {
  'use strict';
  if (!global.DVEngine) { if (typeof module !== 'undefined' && module.exports) module.exports = {}; return; }

  function palette() {
    var P = global.DVThemeRead && global.DVThemeRead.palette ? global.DVThemeRead.palette() : null;
    var g = function (k, d) { return (P && P[k] && P[k].hex) || d; };
    return { bg: g('bg', '#070912'), primary: g('primary', '#8b5cf6'), accent: g('accent', '#22d3ee'), gold: g('gold', '#f5c451'), agent: g('agent', '#ff7ac8') };
  }
  function paintGradient(cv, t, seed) {
    var g = cv.getContext('2d'); if (!g) return;
    var w = cv.width, h = cv.height, P = palette(), s = (seed || 7) * 0.37;
    var grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, P.bg); grad.addColorStop(0.55, P.primary); grad.addColorStop(1, P.bg);
    g.globalAlpha = 1; g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 5; i++) {
      var x = w * (0.5 + 0.42 * Math.sin(t * 0.05 * (i + 1) + s + i)), y = h * (0.5 + 0.35 * Math.cos(t * 0.04 * (i + 1) + s * 1.3 + i * 2));
      var r = Math.min(w, h) * (0.18 + 0.08 * Math.sin(t * 0.1 + i));
      var rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, [P.accent, P.gold, P.agent, P.primary, P.accent][i]); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.22; g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }

  global.DVEngine.register('substrate', function (props) {
    props = props || {};
    var THREE, mesh, geo, mat, tex, cv, core = null, fps = props.fps > 0 ? +props.fps : 24, acc = 0, mounted = false, fallbackAcc = 0;
    var comp = {
      type: 'substrate',
      init: function (ctx) {
        THREE = ctx.THREE;
        var shape = props.shape || 'sky';
        cv = global.document.createElement('canvas');
        cv.width = props.width || (shape === 'sky' ? 1024 : 512); cv.height = props.height || (shape === 'sky' ? 512 : 512);
        tex = new THREE.CanvasTexture(cv);
        if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        comp.setPreset(props.preset);
        var r = props.radius || (shape === 'sky' ? 70 : shape === 'floor' ? 12 : 2);
        var opts = { map: tex, transparent: props.opacity != null, opacity: props.opacity != null ? +props.opacity : 1 };
        if (shape === 'sky') { geo = new THREE.SphereGeometry(r, 40, 24); opts.side = THREE.BackSide; mat = new THREE.MeshBasicMaterial(opts); mesh = new THREE.Mesh(geo, mat); }
        else if (shape === 'floor') { geo = new THREE.CircleGeometry(r, 64); mat = new THREE.MeshBasicMaterial(opts); mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true; }
        else if (shape === 'ring') { geo = new THREE.RingGeometry(r * 0.8, r, 64); opts.side = THREE.DoubleSide; mat = new THREE.MeshBasicMaterial(opts); mesh = new THREE.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; }
        else { geo = new THREE.PlaneGeometry(props.width ? props.width / 256 : 2, props.height ? props.height / 256 : 2); opts.side = THREE.DoubleSide; mat = new THREE.MeshBasicMaterial(opts); mesh = new THREE.Mesh(geo, mat); }
        mesh.name = 'substrate:' + (props.preset || 'gradient');
        var p = props.position; if (p) mesh.position.set(+p.x || 0, +p.y || 0, +p.z || 0);
        mesh.userData.dvSubstrate = comp;
        return mesh;
      },
      setPreset: function (id) {
        mounted = false;
        var C = global.DVNgnCore, P = global.DVNgnPresets;
        if (!C || !P || !id || !P[id] || P[id].backend !== 'fragment') { if (core) { try { core.stop(); } catch (e) {} core = null; } paintGradient(cv, 0, props.seed); if (tex) tex.needsUpdate = true; return false; }
        try { if (!core) core = C.create(cv); core.mount(P[id]); core.start(); mounted = !!core.ok; } catch (e) { mounted = false; }
        if (!mounted) { paintGradient(cv, 0, props.seed); }
        if (tex) tex.needsUpdate = true;
        return mounted;
      },
      update: function (dt, t) {
        if (!tex) return;
        acc += dt;
        if (acc < 1 / fps) return; acc = 0;
        if (!mounted) { fallbackAcc += 1; if (fallbackAcc % 3 !== 0) return; paintGradient(cv, t, props.seed); }
        tex.needsUpdate = true;
      },
      dispose: function () { if (core) { try { core.stop(); } catch (e) {} core = null; } if (tex) tex.dispose(); if (mat) mat.dispose(); if (geo) geo.dispose(); },
      get texture() { return tex; }, get canvas() { return cv; }, get core() { return core; }, get live() { return mounted; }
    };
    return comp;
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = { type: 'substrate', paintGradient: paintGradient };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
