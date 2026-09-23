/*! dvengine — DVGrid (edit/grid.js) · the editor grid + axes (XZ / XY / YZ modes) rendered as gizmo objects the selector ignores · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit grid/index.ts, MIT) where derived */
/*
 *   var grid = DVGrid.create(space, { size: 60, divisions: 60, mode: 'XZ', axes: true })
 *   grid.setMode('XZ'|'XY'|'YZ'|'-XZ'…) · grid.setVisible(bool) · grid.setSize(size, divisions) · grid.plane() → THREE.Plane · grid.dispose()
 * Upstream's grid is a shader mesh + a nav cube rendered in a post-UI pass; here it is a GridHelper + AxesHelper
 * in a group flagged userData.dvGizmo (raycast-ignored, capture-hidden). Colours read the --dv-* palette when present.
 */
(function (global) {
  'use strict';
  function cssVar(name, fallback) { try { var v = global.getComputedStyle && global.getComputedStyle(global.document.documentElement).getPropertyValue(name).trim(); return v || fallback; } catch (e) { return fallback; } }
  var MODES = { XZ: { x: 0, y: 0, z: 0 }, XY: { x: Math.PI / 2, y: 0, z: 0 }, YZ: { x: 0, y: 0, z: Math.PI / 2 } };

  function create(space, opts) {
    opts = opts || {};
    var THREE = space.THREE || global.THREE;
    if (!THREE) throw new Error('DVGrid: window.THREE not loaded');
    var group = new THREE.Group(); group.name = 'DVGrid'; group.userData.dvGizmo = true;
    var size = opts.size || 60, div = opts.divisions || 60, grid = null, axes = null;
    var c1 = new THREE.Color(opts.color1 || cssVar('--dv-violet', '#8b5cf6')), c2 = new THREE.Color(opts.color2 || cssVar('--dv-border', '#2a2340'));
    function build() {
      if (grid) { group.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
      grid = new THREE.GridHelper(size, div, c1, c2); grid.userData.dvGizmo = true;
      grid.material.transparent = true; grid.material.opacity = opts.opacity != null ? opts.opacity : 0.45; grid.material.depthWrite = false;
      group.add(grid);
      if (opts.axes !== false && !axes) { axes = new THREE.AxesHelper(Math.max(2, size / 12)); axes.userData.dvGizmo = true; axes.material.depthWrite = false; group.add(axes); }
    }
    build();
    var api = {
      group: group, mode: 'XZ',
      setMode: function (m) { var neg = m.charAt(0) === '-', key = neg ? m.slice(1) : m, r = MODES[key] || MODES.XZ; group.rotation.set(r.x, r.y, r.z); if (neg) group.rotation.x += Math.PI; api.mode = m; return api; },
      setVisible: function (v) { group.visible = !!v; return api; },
      setSize: function (s, d) { size = s || size; div = d || div; build(); return api; },
      /** the grid's plane in world space (for pointer→plane drags) */
      plane: function () { var n = new THREE.Vector3(0, 1, 0).applyQuaternion(group.quaternion); return new THREE.Plane().setFromNormalAndCoplanarPoint(n, group.position); },
      dispose: function () { if (group.parent) group.parent.remove(group); if (grid) { grid.geometry.dispose(); grid.material.dispose(); } if (axes) { axes.geometry.dispose(); axes.material.dispose(); } },
    };
    api.setMode(opts.mode || 'XZ');
    (opts.scene || space.scene).add(group);
    return api;
  }
  var DVGrid = { create: create, MODES: MODES, version: '0.1.0', upstream: 'https://github.com/oncyberio/awe/blob/main/packages/engine-edit/src/grid/index.ts' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVGrid;
  global.DVGrid = DVGrid;
})(typeof window !== 'undefined' ? window : this);
