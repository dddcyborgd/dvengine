/*! dvengine — DVCommands (edit/commands.js) · document-editing commands (add · remove · duplicate · group · ungroup · update · transform · reparent) that edit space._doc.components and re-mount ONLY the affected ids · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe studio services/editor/commands/* + engine-edit commands/index.ts, MIT) where derived */
/*
 * Every command is { label, ids, do() → Promise, undo() → Promise, redo()? } for DVHistory. The scene
 * DOCUMENT (cyborg-space/1, space._doc) is the source of truth: a command edits the document first,
 * then mounts/unmounts/re-mounts exactly the components it touched through DVEngine's Space API
 * (space.add / space.remove / space.byId), so serialize() always round-trips.
 *
 *   DVCommands.add(space, comp)                 comp = { type, id?, name?, position?, data? … } → cmd (cmd.id)
 *   DVCommands.remove(space, id)                subtree removed, restored on undo (parents-first)
 *   DVCommands.duplicate(space, id)             deep copy with new ids, root shifted +0.5 on x → cmd.newIds
 *   DVCommands.group(space, ids) / ungroup(space, groupId)   world transforms preserved
 *   DVCommands.update(space, id, patch)         patch keys → data (or position/rotation/scale/name), re-mounts that id only
 *   DVCommands.transform(space, id|ids, next, prev)  no re-mount; batchKey + merge() for DVHistory auto-batching
 *   DVCommands.transformMany(space, changes)    changes = [{ id, changes:{position?,rotation?,scale?}, undo:{…} }] (DragHandler output)
 *   DVCommands.reparent(space, id, parentId)    world transform preserved
 *   DVCommands.mount / unmount / remount        the primitives (exported for the studio panels)
 */
(function (global) {
  'use strict';

  var TRANSFORM_KEYS = { id: 1, name: 1, type: 1, position: 1, rotation: 1, scale: 1, parentId: 1, data: 1, collider: 1, script: 1 };
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function engine() { if (!global.DVEngine) throw new Error('DVCommands: DVEngine not loaded'); return global.DVEngine; }

  /** the live document (created on demand so an empty space is editable too) */
  function doc(space) {
    if (!space._doc) space._doc = global.DVScene ? global.DVScene.create({ id: 'space' }) : { format: 'cyborg-space/1', id: 'space', components: {} };
    if (!space._doc.components) space._doc.components = {};
    return space._doc;
  }
  function comps(space) { return doc(space).components; }
  var _seq = 0;
  function newId(space, type) { var c = comps(space), id; do { id = (type || 'c') + '_' + (Date.now().toString(36).slice(-4)) + (++_seq).toString(36); } while (c[id]); return id; }
  /** ids of a subtree, parents first */
  function subtree(space, id) {
    var c = comps(space), out = [], queue = [id];
    while (queue.length) { var cur = queue.shift(); if (!c[cur]) continue; out.push(cur); for (var k in c[cur + '']) { /* noop */ } Object.keys(c).forEach(function (k) { if (c[k].parentId === cur && out.indexOf(k) < 0 && queue.indexOf(k) < 0) queue.push(k); }); }
    return out;
  }
  function childrenOf(space, id) { var c = comps(space); return Object.keys(c).filter(function (k) { return c[k].parentId === id; }); }

  function applyTransform(obj, c) {
    if (!obj || !obj.isObject3D) return;
    if (c.position) obj.position.set(+c.position.x || 0, +c.position.y || 0, +c.position.z || 0);
    if (c.rotation) obj.rotation.set(+c.rotation.x || 0, +c.rotation.y || 0, +c.rotation.z || 0);
    if (c.scale) obj.scale.set(c.scale.x == null ? 1 : +c.scale.x, c.scale.y == null ? 1 : +c.scale.y, c.scale.z == null ? 1 : +c.scale.z);
  }
  function readTransform(obj) {
    return { position: { x: obj.position.x, y: obj.position.y, z: obj.position.z }, rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z }, scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z } };
  }
  function ensureType(type) { var E = engine(); return E.has(type) ? Promise.resolve(true) : E.lazy(type); }

  /** mount one document component (its type is loaded lazily); re-attaches already-mounted children */
  function mount(space, c) {
    var E = engine();
    return ensureType(c.type).then(function () {
      var h = space.add(c.type, E.propsOf(c), { id: c.id, parentId: c.parentId || null, doc: c });
      var e = space.byId(c.id);
      if (e && e.object) {
        applyTransform(e.object, c);
        if (c.parentId) { var p = space.byId(c.parentId); if (p && p.object && p.object.isObject3D) p.object.add(e.object); }
        childrenOf(space, c.id).forEach(function (cid) { var ch = space.byId(cid); if (ch && ch.object && ch.object.isObject3D) e.object.add(ch.object); });
      }
      space._emit('dv:mounted', { id: c.id, type: c.type, handle: h });
      return e;
    });
  }
  /** unmount one id; its mounted children are parked on the scene root so they survive a re-mount */
  function unmount(space, id) {
    var e = space.byId(id); if (!e) return false;
    if (e.object && e.object.isObject3D) {
      var kids = e.object.children.slice();
      kids.forEach(function (k) { if (k.userData && k.userData.dvId && space.byId(k.userData.dvId)) { k.updateMatrixWorld(true); space.scene.attach(k); } });
    }
    return space.remove(e.handle);
  }
  function remount(space, id) { var c = comps(space)[id]; unmount(space, id); return c ? mount(space, c) : Promise.resolve(null); }
  function mountTree(space, ids) { var c = comps(space), p = Promise.resolve(); engine().ordered(pick(c, ids)).forEach(function (cc) { p = p.then(function () { return mount(space, cc); }); }); return p; }
  function pick(c, ids) { var o = {}; ids.forEach(function (id) { if (c[id]) o[id] = c[id]; }); return o; }
  function unmountTree(space, ids) { ids.slice().reverse().forEach(function (id) { unmount(space, id); }); }

  /** move an object under a new parent keeping its WORLD transform; writes the local transform into the doc */
  function setParentPreservingWorld(space, id, parentId) {
    var c = comps(space)[id], e = space.byId(id); if (!c) return;
    var parentEntry = parentId ? space.byId(parentId) : null;
    var target = parentEntry && parentEntry.object ? parentEntry.object : space.scene;
    if (e && e.object && e.object.isObject3D) {
      e.object.updateMatrixWorld(true); target.updateMatrixWorld(true);
      target.attach(e.object);
      var t = readTransform(e.object); c.position = t.position; c.rotation = t.rotation; c.scale = t.scale;
    }
    if (parentId) c.parentId = parentId; else delete c.parentId;
    if (e) e.parentId = parentId || null;
  }

  // ---- commands ------------------------------------------------------------------------------
  function add(space, comp) {
    var c = clone(comp || {}); c.type = c.type || 'object'; c.id = c.id || newId(space, c.type); c.name = c.name || c.id;
    if (!c.data) { c.data = {}; Object.keys(c).forEach(function (k) { if (!TRANSFORM_KEYS[k]) { c.data[k] = c[k]; delete c[k]; } }); }
    return { label: 'add ' + c.type, ids: [c.id], id: c.id, component: c,
      do: function () { comps(space)[c.id] = clone(c); return mount(space, comps(space)[c.id]); },
      undo: function () { unmount(space, c.id); delete comps(space)[c.id]; } };
  }
  function remove(space, id) {
    var ids = subtree(space, id), saved = null;
    return { label: 'remove ' + id, ids: ids,
      do: function () { var c = comps(space); saved = clone(pick(c, ids)); unmountTree(space, ids); ids.forEach(function (i) { delete c[i]; }); },
      undo: function () { var c = comps(space); ids.forEach(function (i) { c[i] = clone(saved[i]); }); return mountTree(space, ids); } };
  }
  function duplicate(space, id, opts) {
    opts = opts || {}; var dx = opts.offset != null ? opts.offset : 0.5;
    var ids = subtree(space, id), map = {}, copies = {};
    ids.forEach(function (i) { map[i] = newId(space, comps(space)[i].type); });
    ids.forEach(function (i) { var src = comps(space)[i], cp = clone(src); cp.id = map[i]; cp.name = (src.name || i) + ' copy'; if (cp.parentId && map[cp.parentId]) cp.parentId = map[cp.parentId]; if (i === id) { cp.position = cp.position || { x: 0, y: 0, z: 0 }; cp.position = { x: (+cp.position.x || 0) + dx, y: +cp.position.y || 0, z: +cp.position.z || 0 }; } copies[map[i]] = cp; });
    var newIds = ids.map(function (i) { return map[i]; });
    return { label: 'duplicate ' + id, ids: newIds, newIds: newIds, idMap: map,
      do: function () { var c = comps(space); newIds.forEach(function (n) { c[n] = clone(copies[n]); }); return mountTree(space, newIds); },
      undo: function () { var c = comps(space); unmountTree(space, newIds); newIds.forEach(function (n) { delete c[n]; }); } };
  }
  function group(space, ids, opts) {
    opts = opts || {};
    if (!ids || ids.length < 2) throw new Error('DVCommands.group: need at least 2 components');
    var c = comps(space), parentId = c[ids[0]] ? c[ids[0]].parentId || null : null;
    ids.forEach(function (i) { if (!c[i]) throw new Error('DVCommands.group: unknown id ' + i); if ((c[i].parentId || null) !== parentId) throw new Error('DVCommands.group: components have different parents'); });
    var gid = opts.id || newId(space, 'group'), prev = {};
    return { label: 'group ' + ids.length, ids: [gid].concat(ids), groupId: gid,
      do: function () {
        var cc = comps(space);
        // centre = mean of the children's world positions
        var cx = 0, cy = 0, cz = 0, n = 0, THREE = space.THREE, tmp = THREE ? new THREE.Vector3() : null;
        ids.forEach(function (i) { prev[i] = { parentId: cc[i].parentId || null, position: clone(cc[i].position), rotation: clone(cc[i].rotation), scale: clone(cc[i].scale) }; var e = space.byId(i); if (e && e.object && tmp) { e.object.getWorldPosition(tmp); cx += tmp.x; cy += tmp.y; cz += tmp.z; n++; } else if (cc[i].position) { cx += +cc[i].position.x || 0; cy += +cc[i].position.y || 0; cz += +cc[i].position.z || 0; n++; } });
        if (n) { cx /= n; cy /= n; cz /= n; }
        var g = { id: gid, name: opts.name || 'Group', type: 'group', position: { x: cx, y: cy, z: cz }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, data: { count: 0, spin: false } };
        if (parentId) g.parentId = parentId;
        cc[gid] = g;
        return mount(space, cc[gid]).then(function () { if (parentId) setParentPreservingWorld(space, gid, parentId); ids.forEach(function (i) { setParentPreservingWorld(space, i, gid); }); });
      },
      undo: function () { var cc = comps(space); ids.forEach(function (i) { setParentPreservingWorld(space, i, prev[i].parentId); }); unmount(space, gid); delete cc[gid]; } };
  }
  function ungroup(space, groupId) {
    var kids = childrenOf(space, groupId), saved = null, parentId = comps(space)[groupId] ? comps(space)[groupId].parentId || null : null;
    return { label: 'ungroup ' + groupId, ids: [groupId].concat(kids),
      do: function () { var cc = comps(space); saved = clone(cc[groupId]); kids.forEach(function (i) { setParentPreservingWorld(space, i, parentId); }); unmount(space, groupId); delete cc[groupId]; },
      undo: function () { var cc = comps(space); cc[groupId] = clone(saved); return mount(space, cc[groupId]).then(function () { kids.forEach(function (i) { setParentPreservingWorld(space, i, groupId); }); }); } };
  }
  function update(space, id, patch) {
    var before = null;
    function apply(target, p) { Object.keys(p).forEach(function (k) { var v = p[k]; if (k === 'position' || k === 'rotation' || k === 'scale' || k === 'name' || k === 'collider' || k === 'script') { if (v === undefined) delete target[k]; else target[k] = clone(v); } else if (k === 'data' && v && typeof v === 'object') { target.data = target.data || {}; Object.keys(v).forEach(function (dk) { if (v[dk] === undefined) delete target.data[dk]; else target.data[dk] = clone(v[dk]); }); } else if (k === 'id' || k === 'type' || k === 'parentId') { /* immutable here — use reparent() */ } else { target.data = target.data || {}; if (v === undefined) delete target.data[k]; else target.data[k] = clone(v); } }); }
    return { label: 'update ' + id, ids: [id], patch: patch,
      do: function () { var c = comps(space)[id]; if (!c) throw new Error('DVCommands.update: unknown id ' + id); before = clone(c); apply(c, patch); return remount(space, id); },
      undo: function () { comps(space)[id] = clone(before); return remount(space, id); } };
  }
  /** transform change without re-mount. next/prev = { position?, rotation?, scale? } (partial ok) */
  function applyXf(space, id, t) { var c = comps(space)[id]; if (!c || !t) return; ['position', 'rotation', 'scale'].forEach(function (k) { if (t[k]) c[k] = clone(t[k]); }); var e = space.byId(id); if (e && e.object) applyTransform(e.object, t); space._emit('dv:transform', { ids: [id], phase: 'apply', transform: t }); }
  function transformMany(space, changes) {
    var ids = changes.map(function (x) { return x.id; });
    var cmd = { label: 'transform ' + (ids.length === 1 ? ids[0] : ids.length + ' components'), ids: ids, changes: changes, batchKey: 'transform:' + ids.slice().sort().join(','),
      do: function () { changes.forEach(function (x) { applyXf(space, x.id, x.changes); }); },
      undo: function () { changes.slice().reverse().forEach(function (x) { applyXf(space, x.id, x.undo); }); },
      merge: function (next) { var merged = changes.map(function (x) { var n = next.changes.filter(function (y) { return y.id === x.id; })[0]; return { id: x.id, changes: n ? Object.assign({}, x.changes, n.changes) : x.changes, undo: x.undo }; }); return transformMany(space, merged); } };
    return cmd;
  }
  function transform(space, idOrIds, next, prev) {
    var ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    return transformMany(space, ids.map(function (id) { var e = space.byId(id); var cur = prev || (e && e.object ? readTransform(e.object) : {}); return { id: id, changes: next, undo: cur }; }));
  }
  function reparent(space, id, parentId) {
    var c = comps(space), prevParent = c[id] ? c[id].parentId || null : null, prevXf = c[id] ? { position: clone(c[id].position), rotation: clone(c[id].rotation), scale: clone(c[id].scale) } : null;
    // cycle guard
    var cur = parentId; while (cur) { if (cur === id) throw new Error('DVCommands.reparent: cannot parent a component under itself'); cur = c[cur] ? c[cur].parentId : null; }
    return { label: 'reparent ' + id, ids: [id],
      do: function () { setParentPreservingWorld(space, id, parentId || null); },
      undo: function () { setParentPreservingWorld(space, id, prevParent); var cc = comps(space)[id]; if (cc && prevXf) { if (prevXf.position) cc.position = prevXf.position; if (prevXf.rotation) cc.rotation = prevXf.rotation; if (prevXf.scale) cc.scale = prevXf.scale; var e = space.byId(id); if (e && e.object) applyTransform(e.object, cc); } } };
  }

  var DVCommands = { add: add, remove: remove, duplicate: duplicate, group: group, ungroup: ungroup, update: update, transform: transform, transformMany: transformMany, reparent: reparent,
    mount: mount, unmount: unmount, remount: remount, mountTree: mountTree, doc: doc, components: comps, subtree: subtree, childrenOf: childrenOf, newId: newId, readTransform: readTransform, applyTransform: applyTransform, setParentPreservingWorld: setParentPreservingWorld,
    version: '0.1.0', upstream: 'https://github.com/oncyberio/awe/tree/main/packages/studio/src/services/editor/commands' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVCommands;
  global.DVCommands = DVCommands;
})(typeof window !== 'undefined' ? window : this);
