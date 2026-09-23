/*!
 * dvengine — DVEngine (engine/index.js) · the DeltaVerse 3D participant engine core
 *
 * A running three.js-backed realization of the oncyberio awe component-scene-graph contract
 * (register → create → init → update → dispose), extended for the DeltaVerse: scene DOCUMENTS
 * (DVScene · cyborg-space/1), LAZY component loading (folder-is-module: components/<type>/index.js),
 * dv:* EVENTS, and parent/child mounting from a document. The awe surface is kept 1:1 so every
 * component written for DVEngine runs unchanged under DVEngine.
 *
 * UMD / classic IIFE. Reads window.THREE at USE time (never at load time) — node --check safe; loads
 * with a plain <script> after an importmap module sets window.THREE (the nGn pattern).
 *
 *   DVEngine.register(type, factory)   factory(props) -> { type, init(ctx) -> obj3d?, update(dt,t), dispose() }
 *   var space = DVEngine.Space(canvas, opts)   opts: { antialias, alpha, shadows, fov, cameraPosition, controls, pixelRatioCap }
 *   space.add(type, props, meta?) / remove(handle) / clear() / start() / stop() / dispose()
 *   space.load(doc, { lazy:true }) -> Promise      mount a cyborg-space/1 document (see engine/scene.js)
 *   space.serialize() -> doc                       round-trip
 *   space.on('dv:ready'|'dv:added'|'dv:removed', fn)
 *   DVEngine.lazy(type) -> Promise                 load components/<type>/index.js on first use
 *
 * (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream component designs © oncyberio (awe, MIT)
 * https://github.com/oncyberio/awe
 */
(function (global) {
  'use strict';

  // ---- global component-type registry (the awe "factories") ------------------
  var _registry = Object.create(null);

  /**
   * Register a component type. `factory(props)` returns a component instance with the lifecycle
   * hooks { init, update, dispose }. Matches awe's typed-factory-by-type model.
   */
  function register(type, factory) {
    if (!type || typeof type !== 'string') throw new Error('register: type must be a non-empty string');
    if (typeof factory !== 'function') throw new Error('register: factory must be a function');
    _registry[type] = factory;
    return factory;
  }

  function registered() { return Object.keys(_registry).sort(); }
  function has(type) { return !!_registry[type]; }

  var _uid = 0;
  function uid(p) { return (p || 'c') + '_' + (++_uid).toString(36); }

  function prefersReducedMotion() {
    return (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) || false;
  }

  // ---- Space: the live host (scene + camera + renderer + loop + components) ---
  function Space(canvas, opts) {
    if (!(this instanceof Space)) return new Space(canvas, opts);
    var THREE = global.THREE;
    if (!THREE) throw new Error('DVEngine.Space: window.THREE not loaded');
    opts = opts || {};

    this.THREE = THREE;
    this.canvas = canvas;
    this.reduceMotion = prefersReducedMotion();

    // renderer
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: opts.antialias !== false, alpha: !!opts.alpha });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, opts.pixelRatioCap || 2));
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = opts.shadows !== false;
    if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    // scene
    var scene = new THREE.Scene();
    this.scene = scene;

    // camera
    var camera = new THREE.PerspectiveCamera(opts.fov || 55, 1, 0.05, 2000);
    var cp = opts.cameraPosition || { x: 0, y: 6, z: 16 };
    camera.position.set(cp.x, cp.y, cp.z);
    this.camera = camera;

    // optional OrbitControls (loaded from addons as window.OrbitControls)
    this.controls = null;
    if (opts.controls !== false && global.OrbitControls) {
      try {
        this.controls = new global.OrbitControls(camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.set(0, 1.5, 0);
        this.controls.update();
      } catch (e) { this.controls = null; }
    }

    this.clock = new THREE.Clock();
    this._components = [];   // { handle, type, comp, object, props, id, parentId, doc }
    this._listeners = {};
    this._doc = null;
    this._raf = 0;
    this._running = false;
    this._elapsed = 0;

    var self = this;
    this._onResize = function () { self.resize(); };
    global.addEventListener('resize', this._onResize);
    this.resize();
  }

  Space.prototype.resize = function () {
    var c = this.canvas;
    var w = (c.clientWidth || c.width || global.innerWidth) | 0;
    var h = (c.clientHeight || c.height || global.innerHeight) | 0;
    if (w <= 0 || h <= 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** ctx passed to every component lifecycle hook. */
  Space.prototype._ctx = function () {
    return { THREE: this.THREE, scene: this.scene, camera: this.camera, renderer: this.renderer, space: this };
  };

  /**
   * Instantiate a registered component, run init, add its returned Object3D to the scene, track it.
   * Returns a handle string usable with remove().
   */
  Space.prototype.add = function (type, props, meta) {
    var factory = _registry[type];
    if (!factory) throw new Error('DVEngine: unknown component type "' + type + '"');
    var comp = factory(props || {});
    comp.type = comp.type || type;
    var obj = null;
    if (typeof comp.init === 'function') obj = comp.init(this._ctx()) || null;
    if (obj && obj.isObject3D) this.scene.add(obj);
    var handle = uid(type);
    meta = meta || {};
    var entry = { handle: handle, type: type, comp: comp, object: obj, props: props || {}, id: meta.id || handle, parentId: meta.parentId || null, doc: meta.doc || null };
    if (obj && obj.isObject3D) { obj.userData.dvId = entry.id; obj.userData.dvType = type; }
    this._components.push(entry);
    this._emit('dv:added', { handle: handle, type: type, id: entry.id });
    return handle;
  };

  /** Look up a tracked entry by handle. */
  Space.prototype._find = function (handle) {
    for (var i = 0; i < this._components.length; i++) if (this._components[i].handle === handle) return i;
    return -1;
  };

  /** Dispose + detach a component by handle (or by type: removes the first of that type). */
  Space.prototype.remove = function (handleOrType) {
    var i = this._find(handleOrType);
    if (i === -1) {
      // try by type
      for (var k = 0; k < this._components.length; k++) if (this._components[k].type === handleOrType) { i = k; break; }
    }
    if (i === -1) return false;
    var entry = this._components[i];
    if (entry.object && entry.object.parent) entry.object.parent.remove(entry.object);
    try { if (typeof entry.comp.dispose === 'function') entry.comp.dispose(); } catch (e) { /* awe logs + continues */ }
    this._components.splice(i, 1);
    this._emit('dv:removed', { handle: entry.handle, type: entry.type, id: entry.id });
    return true;
  };

  /** Remove every component. */
  Space.prototype.clear = function () {
    var all = this._components.slice();
    for (var i = 0; i < all.length; i++) this.remove(all[i].handle);
  };

  /** Is there a live component of this type? */
  Space.prototype.hasType = function (type) {
    for (var i = 0; i < this._components.length; i++) if (this._components[i].type === type) return true;
    return false;
  };

  Space.prototype.count = function () { return this._components.length; };

  Space.prototype._renderFrame = function () {
    var dt = this.clock.getDelta();
    if (this.reduceMotion) dt = 0;          // freeze animation under reduced-motion
    this._elapsed += dt;
    var t = this._elapsed;
    for (var i = 0; i < this._components.length; i++) {
      var comp = this._components[i].comp;
      if (typeof comp.update === 'function') {
        try { comp.update(dt, t); } catch (e) { /* keep the loop alive */ }
      }
    }
    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  Space.prototype.start = function () {
    if (this._running) return this;
    this._running = true;
    var self = this;
    function loop() {
      if (!self._running) return;
      self._renderFrame();
      self._raf = global.requestAnimationFrame(loop);
    }
    if (this.reduceMotion) { this._renderFrame(); /* one static frame, no loop */ }
    else this._raf = global.requestAnimationFrame(loop);
    return this;
  };

  Space.prototype.stop = function () {
    this._running = false;
    if (this._raf) { global.cancelAnimationFrame(this._raf); this._raf = 0; }
    return this;
  };

  Space.prototype.dispose = function () {
    this.stop();
    this.clear();
    global.removeEventListener('resize', this._onResize);
    if (this.controls && this.controls.dispose) try { this.controls.dispose(); } catch (e) {}
    try { this.renderer.dispose(); } catch (e) {}
  };

  // ---- DV extension: events -------------------------------------------------
  Space.prototype.on = function (ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); var self = this; return function () { self.off(ev, fn); }; };
  Space.prototype.off = function (ev, fn) { var l = this._listeners[ev]; if (!l) return; var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
  Space.prototype._emit = function (ev, detail) { var l = this._listeners && this._listeners[ev]; if (l) for (var i = 0; i < l.length; i++) { try { l[i](detail); } catch (e) {} } };
  Space.prototype.byId = function (id) { for (var i = 0; i < this._components.length; i++) if (this._components[i].id === id) return this._components[i]; return null; };
  Space.prototype.byType = function (type) { var out = []; for (var i = 0; i < this._components.length; i++) if (this._components[i].type === type) out.push(this._components[i]); return out; };
  Space.prototype.entries = function () { return this._components.slice(); };

  // ---- DV extension: lazy folder-is-module components -------------------------
  var _lazy = Object.create(null);
  var componentBase = './components/';
  function setComponentBase(url) { componentBase = url; }
  function lazy(type) {
    if (has(type)) return Promise.resolve(true);
    if (_lazy[type]) return _lazy[type];
    if (!global.document) return Promise.reject(new Error('DVEngine.lazy: no document'));
    var src = componentBase + type + '/index.js';
    _lazy[type] = new Promise(function (res, rej) {
      var s = global.document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { if (has(type)) res(true); else rej(new Error('DVEngine.lazy: ' + type + ' loaded but did not register')); };
      s.onerror = function () { delete _lazy[type]; rej(new Error('DVEngine.lazy: failed to load ' + src)); };
      global.document.head.appendChild(s);
    });
    return _lazy[type];
  }

  // ---- DV extension: scene documents (DVScene · cyborg-space/1) ---------------
  var TRANSFORM_KEYS = { id: 1, name: 1, type: 1, position: 1, rotation: 1, scale: 1, parentId: 1, data: 1, collider: 1, script: 1 };
  function propsOf(c) {
    var p = {};
    for (var k in c) if (!TRANSFORM_KEYS[k]) p[k] = c[k];
    if (c.data) for (var d in c.data) p[d] = c.data[d];
    if (c.position) p.position = c.position;
    if (c.rotation) p.rotation = c.rotation;
    if (c.scale) p.scale = c.scale;
    p.id = c.id; p.name = c.name;
    return p;
  }
  function applyTransform(obj, c) {
    if (!obj || !obj.isObject3D) return;
    if (c.position) obj.position.set(+c.position.x || 0, +c.position.y || 0, +c.position.z || 0);
    if (c.rotation) obj.rotation.set(+c.rotation.x || 0, +c.rotation.y || 0, +c.rotation.z || 0);
    if (c.scale) obj.scale.set(c.scale.x == null ? 1 : +c.scale.x, c.scale.y == null ? 1 : +c.scale.y, c.scale.z == null ? 1 : +c.scale.z);
  }
  /** Order components parents-first (a child never mounts before its parent). */
  function ordered(components) {
    var ids = Object.keys(components), seen = {}, out = [];
    function visit(id, depth) {
      if (seen[id] || depth > 64) return; var c = components[id]; if (!c) return;
      if (c.parentId && components[c.parentId]) visit(c.parentId, depth + 1);
      seen[id] = 1; out.push(c);
    }
    for (var i = 0; i < ids.length; i++) visit(ids[i], 0);
    return out;
  }
  /**
   * Mount a cyborg-space/1 document. opts.lazy (default true) loads unregistered component types via
   * DVEngine.lazy; unknown types that cannot load are skipped and reported in the resolved summary.
   */
  Space.prototype.load = function (doc, opts) {
    opts = opts || {}; var self = this;
    var comps = (doc && doc.components) || {};
    var list = ordered(comps);
    var skipped = [], mounted = [];
    var chain = Promise.resolve();
    list.forEach(function (c) {
      chain = chain.then(function () {
        var type = c.type;
        if (!type) { skipped.push({ id: c.id, reason: 'no type' }); return; }
        var ready = has(type) ? Promise.resolve(true) : (opts.lazy === false ? Promise.reject(new Error('not registered')) : lazy(type));
        return ready.then(function () {
          var h = self.add(type, propsOf(c), { id: c.id || h, parentId: c.parentId || null, doc: c });
          var e = self._find(h) >= 0 ? self._components[self._find(h)] : null;
          if (e && e.object) {
            applyTransform(e.object, c);
            if (c.parentId) { var p = self.byId(c.parentId); if (p && p.object && p.object.isObject3D) p.object.add(e.object); }
          }
          mounted.push(c.id);
        }, function (err) { skipped.push({ id: c.id, type: type, reason: String(err && err.message || err) }); });
      });
    });
    return chain.then(function () {
      self._doc = doc;
      var summary = { mounted: mounted, skipped: skipped, doc: doc };
      self._emit('dv:ready', summary);
      return summary;
    });
  };
  /** Serialize the live space back into a cyborg-space/1 document (transforms read from the objects). */
  Space.prototype.serialize = function () {
    var base = this._doc ? JSON.parse(JSON.stringify(this._doc)) : { format: 'cyborg-space/1', id: 'space', components: {} };
    base.format = base.format || 'cyborg-space/1';
    var comps = {};
    for (var i = 0; i < this._components.length; i++) {
      var e = this._components[i];
      var c = e.doc ? JSON.parse(JSON.stringify(e.doc)) : { id: e.id, name: e.id, type: e.type, data: e.props };
      c.id = e.id; c.type = e.type; if (e.parentId) c.parentId = e.parentId;
      var o = e.object;
      if (o && o.isObject3D) {
        c.position = { x: o.position.x, y: o.position.y, z: o.position.z };
        c.rotation = { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z };
        c.scale = { x: o.scale.x, y: o.scale.y, z: o.scale.z };
      }
      comps[c.id] = c;
    }
    base.components = comps;
    base.updatedAt = Date.now();
    return base;
  };

  // ---- public surface --------------------------------------------------------
  var DVEngine = {
    Space: function (canvas, opts) { return new Space(canvas, opts); },
    register: register,
    registered: registered,
    has: has,
    prefersReducedMotion: prefersReducedMotion,
    _Space: Space,
    lazy: lazy,
    setComponentBase: setComponentBase,
    propsOf: propsOf,
    ordered: ordered,
    version: '0.0.2-alpha',
    upstream: 'https://github.com/oncyberio/awe — @oncyberio/engine © oncyberio — MIT — component designs',
    home: 'https://github.com/dddcyborgd/dvengine',
    legacy: global.AweRuntime || null,
    note: 'three.js r182 realization of the awe component-scene-graph contract (port/component-model.js)',
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DVEngine;
  global.DVEngine = DVEngine;
})(typeof window !== 'undefined' ? window : this);
