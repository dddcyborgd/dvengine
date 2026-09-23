/*!
 * DeltaVerse — AweRuntime (oncyber/awe/runtime/runtime.js)
 *
 * A RUNNING, three.js-backed realization of the awe component-scene-graph contract distilled in
 * ../port/component-model.js. Where port/component-model.js is the framework-agnostic *pattern*
 * (register → create → mount → tick → unmount), this is the live host: it stands up a real
 * THREE.Scene / PerspectiveCamera / WebGLRenderer, an animation loop, optional OrbitControls, and
 * runs registered components — each of which builds and animates real three.js objects.
 *
 * UMD / classic IIFE. Reads `window.THREE` at USE time (never at load time) so it is
 * `node --check` safe and loads with a plain <script> after an importmap module sets window.THREE.
 * Mirrors the neural-manifold loading approach (DeltaVerse/nGn/neural-manifold/index.js).
 *
 * Component contract (the three.js realization of the awe Component3D lifecycle):
 *
 *   AweRuntime.register(type, factory)   factory(props) -> {
 *       type,
 *       init(ctx) { ...; return obj3d? },     // ctx = { THREE, scene, camera, renderer, space }
 *       update(dt, t) {},                     // called every frame
 *       dispose() {}                          // tear down GPU resources
 *   }
 *
 *   const space = AweRuntime.Space(canvas, opts);
 *   const handle = space.add('lighting', { intensity: 1 });   // create + init + add to scene
 *   space.remove(handle);                                     // dispose + detach
 *   space.clear();                                            // remove all
 *   space.start(); space.stop();                              // animation loop
 *
 * Upstream component designs: @oncyberio/engine (awe) © oncyberio — MIT. This is a local,
 * clean-room three r184 realization (no CDN, no remote dependency).
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
    if (!THREE) throw new Error('AweRuntime.Space: window.THREE not loaded');
    opts = opts || {};

    this.THREE = THREE;
    this.canvas = canvas;
    this.reduceMotion = prefersReducedMotion();

    // renderer
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: opts.antialias !== false, alpha: !!opts.alpha });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
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
    this._components = [];   // { handle, type, comp, object }
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
  Space.prototype.add = function (type, props) {
    var factory = _registry[type];
    if (!factory) throw new Error('AweRuntime: unknown component type "' + type + '"');
    var comp = factory(props || {});
    comp.type = comp.type || type;
    var obj = null;
    if (typeof comp.init === 'function') obj = comp.init(this._ctx()) || null;
    if (obj && obj.isObject3D) this.scene.add(obj);
    var handle = uid(type);
    this._components.push({ handle: handle, type: type, comp: comp, object: obj });
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

  // ---- public surface --------------------------------------------------------
  var AweRuntime = {
    Space: function (canvas, opts) { return new Space(canvas, opts); },
    register: register,
    registered: registered,
    has: has,
    prefersReducedMotion: prefersReducedMotion,
    _Space: Space,
    version: '1.0.0',
    upstream: '@oncyberio/engine (awe) © oncyberio — MIT — component designs',
    note: 'three.js r184 realization of the awe component-scene-graph contract (port/component-model.js)',
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AweRuntime;
  global.AweRuntime = AweRuntime;
})(typeof window !== 'undefined' ? window : this);
