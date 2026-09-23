/*! dvengine — DVTransform (edit/index.js) · the transform-tools editor over a DVEngine Space: raycast selection (shift multi-select), a gizmo (three/addons TransformControls when present, else the own DVPivot), TransformProxy for multi-selection, DragHandler → history commands, snapping (grid · angle · 2d · 3d) · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit index.ts + transformer/{index,transform-proxy,group-transform-proxy,drag-handler}.ts + selection/*, MIT) where derived */
/*
 *   var ed = DVTransform.attach(space, { gizmo:'auto'|'three'|'pivot', mode:'translate', snap:{grid:0.5, angle:15, mode:'off'|'2d'|'3d', gap:0.2}, grid:true })
 *   ed.mode / ed.setMode(m)            'translate' | 'rotate' | 'scale'
 *   ed.snap / ed.setSnap({grid, angle(deg), mode, gap})
 *   ed.select(id | ids | null, {additive}) · ed.selection() → ids · ed.hover(id|null) · ed.hovered
 *   ed.history (DVHistory) · ed.commands (bound DVCommands: add/remove/duplicate/group/ungroup/update/transform/reparent — each runs through history)
 *   ed.enabled · ed.detach() · ed.frame(id?) · ed.grid (DVGrid) · ed.gizmo · ed.proxy · ed.drag · ed.uiScene
 *   events on the space: dv:select {ids} · dv:transform {ids, phase:'start'|'drag'|'end', changes} · dv:command {type,label,…} · dv:hover {id}
 */
(function (global) {
  'use strict';
  var TWO_D_TYPES = { image: 1, video: 1, iframe: 1, text: 1, dialog: 1 };

  // ---- TransformProxy (port of transform-proxy.ts + group-transform-proxy.ts) ----------------------
  /** invisible AABB box around N attached objects; the gizmo drives the box, the box drives the objects in local space */
  function TransformProxy(THREE) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false, transparent: true, color: 0xff0000, opacity: 0.2, depthTest: false, depthWrite: false }));
    mesh.name = 'DVTransformProxy'; mesh.userData.dvGizmo = true; mesh.userData.dvProxy = true; mesh.visible = false;
    mesh.attachedObjects = []; mesh._fakeChildren = []; mesh.isDragging = false; mesh.enabled = false;
    var _box = new THREE.Box3(), localMatrix = new THREE.Matrix4(), invMatrix = new THREE.Matrix4();
    mesh.setAttachedObjects = function (objects) {
      mesh._fakeChildren.forEach(function (c) { mesh.remove(c); }); mesh._fakeChildren.length = 0;
      mesh.attachedObjects = objects.slice();
      objects.forEach(function () { var f = new THREE.Object3D(); f.matrixAutoUpdate = false; f.userData.dvGizmo = true; mesh.add(f); mesh._fakeChildren.push(f); });
      mesh.enabled = objects.length > 0; mesh.visible = false;
      if (mesh.enabled) mesh.updateBoundingBox();
    };
    mesh.detach = function () { mesh.setAttachedObjects([]); };
    mesh.updateBoundingBox = function () {
      _box.makeEmpty();
      mesh.attachedObjects.forEach(function (o) { o.updateMatrixWorld(true); _box.expandByObject(o, true); });
      if (_box.isEmpty()) return;
      _box.min.addScalar(-0.01); _box.max.addScalar(0.01);
      _box.getCenter(mesh.position); _box.getSize(mesh.scale); mesh.quaternion.identity();
      mesh.updateMatrixWorld(true);
      invMatrix.copy(mesh.matrixWorld).invert();
      mesh.attachedObjects.forEach(function (o, i) { localMatrix.copy(o.matrixWorld).premultiply(invMatrix); mesh._fakeChildren[i].matrix.copy(localMatrix); });
    };
    mesh.dragStart = function () { mesh.isDragging = true; };
    mesh.dragEnd = function () { mesh.isDragging = false; };
    /** fake children world transforms → the real objects' local transforms (under their own parents) */
    mesh.syncWithTransform = function () {
      mesh.updateMatrixWorld(true);
      var inverses = new Map();
      mesh.attachedObjects.forEach(function (o, i) {
        var f = mesh._fakeChildren[i], parent = o.parent; if (!parent) return;
        var inv = inverses.get(parent); if (!inv) { parent.updateMatrixWorld(true); inv = parent.matrixWorld.clone().invert(); inverses.set(parent, inv); }
        localMatrix.copy(f.matrixWorld).premultiply(inv);
        localMatrix.decompose(o.position, o.quaternion, o.scale);
      });
    };
    return mesh;
  }

  // ---- DragHandler (port of drag-handler.ts) --------------------------------------------------------
  function DragHandler() { this.entries = []; this.initTransformData = []; }
  DragHandler.prototype.dragStart = function (entries) {
    this.entries = entries.slice();
    this.initTransformData = this.entries.map(function (e) { return global.DVCommands.readTransform(e.object); });
  };
  function same(a, b) { return a && b && Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9 && Math.abs(a.z - b.z) < 1e-9; }
  /** → [{ id, changes:{position?,rotation?,scale?}, undo:{…} }] with unchanged fields removed */
  DragHandler.prototype.dragEnd = function () {
    var self = this, changes = [];
    this.entries.forEach(function (e, i) {
      var data = global.DVCommands.readTransform(e.object), start = self.initTransformData[i], c = {}, u = {};
      ['position', 'rotation', 'scale'].forEach(function (k) { if (!same(data[k], start[k])) { c[k] = data[k]; u[k] = start[k]; } });
      if (Object.keys(c).length) changes.push({ id: e.id, changes: c, undo: u });
    });
    this.entries = []; this.initTransformData = [];
    return changes;
  };

  // ---- the editor ---------------------------------------------------------------------------------
  function attach(space, opts) {
    opts = opts || {};
    var THREE = space.THREE || global.THREE;
    if (!THREE) throw new Error('DVTransform: window.THREE not loaded');
    if (!global.DVCommands || !global.DVHistory) throw new Error('DVTransform: load edit/commands.js and edit/history.js first');
    var canvas = space.renderer.domElement, camera = space.camera, orbit = opts.orbit !== undefined ? opts.orbit : space.controls;
    var ed = { space: space, mode: opts.mode || 'translate', enabled: true, hovered: null, _sel: [], uiScene: new THREE.Scene(), listeners: [] };
    ed.snap = Object.assign({ grid: 0.5, angle: 15, mode: 'off', gap: 0.2, scale: 0.1 }, opts.snap || {});
    ed.history = global.DVHistory.create({ cap: opts.cap || 200, batchWindow: opts.batchWindow != null ? opts.batchWindow : 300 });
    ed.proxy = TransformProxy(THREE); ed.uiScene.add(ed.proxy);
    ed.drag = new DragHandler();
    if (opts.grid !== false && global.DVGrid) ed.grid = global.DVGrid.create(space, Object.assign({ scene: space.scene }, opts.gridOpts || {}));

    // ---- gizmo: three/addons TransformControls when present, else DVPivot ----
    var kind = opts.gizmo || 'auto';
    var useThree = (kind === 'three' || kind === 'auto') && typeof global.TransformControls === 'function';
    if (kind === 'three' && !useThree) throw new Error('DVTransform: window.TransformControls not loaded');
    if (!useThree && !(global.DVPivot && global.DVPivot.Controls)) throw new Error('DVTransform: load edit/pivot/*.js (or three/addons TransformControls) first');
    ed.gizmoKind = useThree ? 'three' : 'pivot';
    if (useThree) {
      ed.gizmo = new global.TransformControls(camera, canvas);
      ed.gizmo.setMode(ed.mode);
      var helper = typeof ed.gizmo.getHelper === 'function' ? ed.gizmo.getHelper() : (ed.gizmo.isObject3D ? ed.gizmo : null);
      if (helper) { helper.traverse(function (o) { o.userData.dvGizmo = true; }); ed.uiScene.add(helper); }
    } else {
      ed.gizmo = global.DVPivot.Controls({ camera: camera, domElement: canvas, getSnapTargets: function (obj) { return snapTargets(obj); } });
      ed.gizmo.setMode(ed.mode); ed.uiScene.add(ed.gizmo);
    }

    // ---- snappable wrappers over space entries (for DVSnap.Snap3D) ----
    function snapWrap(e) {
      return { entry: e, object: e.object, info: { is2D: !!TWO_D_TYPES[e.type] },
        getBBox: function (t) { var b = new THREE.Box3().setFromObject(e.object, true); t.min.x = b.min.x; t.min.y = b.min.y; t.min.z = b.min.z; t.max.x = b.max.x; t.max.y = b.max.y; t.max.z = b.max.z; return t; },
        getCollisionMesh: function () { return e.object; }, updateMatrixWorld: function () { e.object.updateMatrixWorld(true); },
        isDescendantOf: function (o) { var target = o.object || o, p = e.object.parent; while (p) { if (p === target) return true; p = p.parent; } return false; } };
    }
    function snapTargets(draggedObj) {
      if (ed.snap.mode === 'off') return [];
      var selected = {}; ed._sel.forEach(function (id) { selected[id] = 1; });
      return space.entries().filter(function (e) { return e.object && e.object.isObject3D && !selected[e.id] && e.object !== draggedObj && (ed.snap.mode === '3d' ? !TWO_D_TYPES[e.type] : !!TWO_D_TYPES[e.type]); }).map(snapWrap);
    }
    var snap3d = global.DVSnap ? new global.DVSnap.Snap3D() : null;

    function applySnapSettings() {
      var s = ed.snap, on = s.mode !== 'off';
      ed.gizmo.setTranslationSnap(on && s.grid ? s.grid : null);
      ed.gizmo.setRotationSnap(on && s.angle ? THREE.MathUtils.degToRad(s.angle) : null);
      ed.gizmo.setScaleSnap(on && s.scale ? s.scale : null);
      if (ed.gizmo.setBBoxSnap) ed.gizmo.setBBoxSnap(on ? s.gap : 0);
      if (snap3d) snap3d.maxGap = on ? s.gap : 0;
    }
    ed.setSnap = function (partial) { Object.assign(ed.snap, partial || {}); applySnapSettings(); space._emit('dv:snap', Object.assign({}, ed.snap)); return ed.snap; };
    ed.setMode = function (m) { ed.mode = m; ed.gizmo.setMode(m); space._emit('dv:mode', { mode: m }); return m; };
    ed.setSpace = function (s) { ed.gizmo.setSpace(s); return s; };
    applySnapSettings();

    // ---- selection ----
    function attachSelection() {
      ed.gizmo.detach(); ed.proxy.detach();
      var entries = ed._sel.map(function (id) { return space.byId(id); }).filter(function (e) { return e && e.object && e.object.isObject3D; });
      if (entries.length === 1) ed.gizmo.attach(entries[0].object);
      else if (entries.length > 1) { ed.proxy.setAttachedObjects(entries.map(function (e) { return e.object; })); ed.gizmo.attach(ed.proxy); }
      if (ed.gizmo.isDVPivot) ed.gizmo.update(true);
    }
    ed.select = function (idOrIds, o) {
      o = o || {};
      var ids = idOrIds == null ? [] : (Array.isArray(idOrIds) ? idOrIds : [idOrIds]).filter(function (id) { return !!space.byId(id); });
      if (o.additive) { ids.forEach(function (id) { var i = ed._sel.indexOf(id); if (i >= 0) ed._sel.splice(i, 1); else ed._sel.push(id); }); }
      else ed._sel = ids;
      attachSelection();
      space._emit('dv:select', { ids: ed._sel.slice() });
      return ed._sel.slice();
    };
    ed.selection = function () { return ed._sel.slice(); };
    ed.hover = function (id) { if (ed.hovered === id) return; ed.hovered = id || null; space._emit('dv:hover', { id: ed.hovered }); };
    ed.selectedEntries = function () { return ed._sel.map(function (id) { return space.byId(id); }).filter(Boolean); };

    var raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(event) {
      var r = canvas.getBoundingClientRect(); ndc.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      var hits = raycaster.intersectObjects(space.scene.children, true);
      for (var i = 0; i < hits.length; i++) {
        var o = hits[i].object, skip = false, owner = null;
        for (var p = o; p; p = p.parent) { if (p.userData && (p.userData.dvGizmo || p.userData.dvProxy)) { skip = true; break; } if (!owner && p.userData && p.userData.dvId && space.byId(p.userData.dvId)) owner = p; }
        if (skip || !owner) continue;
        return { entry: space.byId(owner.userData.dvId), hit: hits[i] };
      }
      return null;
    }
    ed.raycast = pick;
    var down = null;
    function onDown(e) { if (!ed.enabled || e.button !== 0) return; if (ed.gizmo.dragging || ed.gizmo.axis) { down = null; return; } down = { x: e.clientX, y: e.clientY, shift: e.shiftKey }; }
    function onUp(e) {
      if (!down || !ed.enabled) { down = null; return; }
      var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y); var d = down; down = null;
      if (moved > 4 || ed.gizmo.dragging) return;
      var hit = pick(e);
      if (hit) ed.select(hit.entry.id, { additive: d.shift || e.shiftKey });
      else if (!d.shift) ed.select(null);
    }
    function onMove(e) { if (!ed.enabled || ed.gizmo.dragging || down) return; if (ed.gizmo.axis) { ed.hover(null); return; } var hit = pick(e); ed.hover(hit ? hit.entry.id : null); }
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointermove', onMove);
    ed.listeners.push(function () { canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointermove', onMove); });

    // ---- transform flow: gizmo → proxy → objects → history ----
    var dragEntries = [];
    function onDraggingChanged(ev) {
      if (orbit) orbit.enabled = !ev.value;
      if (ev.value) {
        dragEntries = ed.selectedEntries().filter(function (e) { return e.object; });
        ed.drag.dragStart(dragEntries); if (ed.proxy.enabled) ed.proxy.dragStart();
        if (snap3d && ed.gizmoKind === 'three' && dragEntries.length === 1 && ed.snap.mode !== 'off') { snap3d.setObject(snapWrap(dragEntries[0])); snap3d.onPointerDown(snapTargets(dragEntries[0].object)); }
        space._emit('dv:transform', { ids: dragEntries.map(function (e) { return e.id; }), phase: 'start' });
      } else {
        if (ed.proxy.enabled) { ed.proxy.syncWithTransform(); ed.proxy.dragEnd(); ed.proxy.updateBoundingBox(); }
        var changes = ed.drag.dragEnd();
        if (changes.length) { changes.forEach(function (c) { var comp = global.DVCommands.components(space)[c.id]; if (comp) ['position', 'rotation', 'scale'].forEach(function (k) { if (c.changes[k]) comp[k] = c.changes[k]; }); }); ed.history.push(markApplied(global.DVCommands.transformMany(space, changes))); }
        space._emit('dv:transform', { ids: dragEntries.map(function (e) { return e.id; }), phase: 'end', changes: changes });
        dragEntries = [];
      }
    }
    /** the drag already moved the objects: the first do() is a no-op, redo re-applies */
    function markApplied(cmd) { var first = true, orig = cmd.do; cmd.do = function () { if (first) { first = false; return; } return orig.call(cmd); }; cmd.redo = function () { return orig.call(cmd); }; return cmd; }
    function onObjectChange() {
      if (!ed.gizmo.dragging) return;
      if (ed.gizmoKind === 'three' && ed.mode === 'translate' && snap3d && ed.snap.mode !== 'off' && dragEntries.length === 1 && ed.gizmo.object) {
        var o = snap3d.getWorldAxesSnapOffset([true, true, true]);
        if (o.x || o.y || o.z) { var obj = ed.gizmo.object; obj.parent.updateMatrixWorld(true); var w = obj.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(o.x, o.y, o.z)); obj.position.copy(obj.parent.worldToLocal(w)); }
      }
      if (ed.proxy.enabled) ed.proxy.syncWithTransform();
      space._emit('dv:transform', { ids: dragEntries.map(function (e) { return e.id; }), phase: 'drag' });
    }
    ed.gizmo.addEventListener('dragging-changed', onDraggingChanged);
    ed.gizmo.addEventListener('objectChange', onObjectChange);
    ed.listeners.push(function () { ed.gizmo.removeEventListener('dragging-changed', onDraggingChanged); ed.gizmo.removeEventListener('objectChange', onObjectChange); });

    // ---- history → events; commands bound to the space and the history ----
    ed.history.on('change', function (s) { space._emit('dv:command', s); if (s.type === 'undo' || s.type === 'redo' || s.type === 'do' || s.type === 'batch') { ed._sel = ed._sel.filter(function (id) { return !!space.byId(id); }); attachSelection(); } });
    var C = global.DVCommands;
    ed.commands = {
      add: function (comp) { var c = C.add(space, comp); return ed.history.push(c).then(function () { ed.select(c.id); return c.id; }); },
      remove: function (id) { var ids = id != null ? [id] : ed.selection(); if (!ids.length) return Promise.resolve(); var cmds = ids.map(function (i) { return C.remove(space, i); }); ed.select(null); return ed.history.push(cmds.length === 1 ? cmds[0] : global.DVHistory.compound('remove ' + ids.length, cmds)); },
      duplicate: function (id) { var ids = id != null ? [id] : ed.selection(); if (!ids.length) return Promise.resolve([]); var cmds = ids.map(function (i) { return C.duplicate(space, i); }); var cmd = cmds.length === 1 ? cmds[0] : global.DVHistory.compound('duplicate ' + ids.length, cmds); return ed.history.push(cmd).then(function () { var roots = cmds.map(function (c) { return c.newIds[0]; }); ed.select(roots); return roots; }); },
      group: function (ids) { ids = ids || ed.selection(); var c = C.group(space, ids); return ed.history.push(c).then(function () { ed.select(c.groupId); return c.groupId; }); },
      ungroup: function (id) { id = id != null ? id : ed.selection()[0]; var kids = C.childrenOf(space, id); return ed.history.push(C.ungroup(space, id)).then(function () { ed.select(kids); return kids; }); },
      update: function (id, patch) { return ed.history.push(C.update(space, id, patch)); },
      transform: function (id, next, prev) { return ed.history.push(C.transform(space, id, next, prev)); },
      reparent: function (id, parentId) { return ed.history.push(C.reparent(space, id, parentId)); },
      undo: function () { return ed.history.undo(); }, redo: function () { return ed.history.redo(); },
    };

    // ---- frame the selection (F) ----
    ed.frame = function (id) {
      var ids = id != null ? [id] : ed.selection(); var box = new THREE.Box3();
      ids.forEach(function (i) { var e = space.byId(i); if (e && e.object) box.expandByObject(e.object, true); });
      if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(0, 1, 0), new THREE.Vector3(10, 10, 10));
      var c = box.getCenter(new THREE.Vector3()), r = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.5);
      var dist = r / Math.sin(THREE.MathUtils.degToRad(camera.fov || 50) / 2), dir = camera.position.clone().sub(orbit && orbit.target ? orbit.target : c).normalize();
      if (dir.lengthSq() === 0) dir.set(0, 0.5, 1).normalize();
      camera.position.copy(c).add(dir.multiplyScalar(dist * 1.15));
      if (orbit && orbit.target) { orbit.target.copy(c); orbit.update(); } else camera.lookAt(c);
    };

    // ---- render hook: gizmo update before, UI overlay after ----
    var origRender = space._renderFrame;
    space._renderFrame = function () {
      if (ed.gizmo.isDVPivot && ed.gizmo.object) ed.gizmo.update();
      origRender.call(space);
      var r = space.renderer, ac = r.autoClear; r.autoClear = false; r.clearDepth(); r.render(ed.uiScene, camera); r.autoClear = ac;
    };
    ed.listeners.push(function () { space._renderFrame = origRender; });
    // keep the proxy box fresh when a command moves things under it
    space.on('dv:mounted', function () { if (ed.proxy.enabled) ed.proxy.updateBoundingBox(); });

    Object.defineProperty(ed, 'enabled', { get: function () { return ed._enabled !== false; }, set: function (v) { ed._enabled = !!v; ed.gizmo.enabled = !!v; if (!v) ed.select(null); } });
    ed.detach = function () { ed.select(null); ed.listeners.forEach(function (f) { f(); }); ed.listeners = []; if (ed.gizmo.dispose) ed.gizmo.dispose(); if (ed.grid) ed.grid.dispose(); ed.uiScene.remove(ed.proxy); if (orbit) orbit.enabled = true; };
    ed.TransformProxy = ed.proxy; ed.DragHandler = ed.drag;
    return ed;
  }

  var DVTransform = { attach: attach, TransformProxy: TransformProxy, DragHandler: DragHandler, TWO_D_TYPES: TWO_D_TYPES, version: '0.1.0', upstream: 'https://github.com/oncyberio/awe/tree/main/packages/engine-edit' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVTransform;
  global.DVTransform = DVTransform;
})(typeof window !== 'undefined' ? window : this);
