/*! dvengine — DVEditors (editors/index.js) · the schema registry the studio inspector is driven by: one row list per component type, registered by editors/<type>/index.js at load · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © oncyberio (awe engine-edit/src/editors, MIT) where derived */
/*
 *   DVEditors.register(type, schema)   schema = { type, upstream, rows:[row] } · row = { key, kind, min, max, step, options[], default, label, group, json? }
 *   DVEditors.get(type) → schema|null · DVEditors.types() → [type] · DVEditors.has(type)
 *   DVEditors.defaults(type) → { key: default }        the values a freshly added component starts from
 *   DVEditors.coerce(row, raw) → value                 a string from an <input> → the row's typed value (number/int/bool/color/vec3/json)
 *   DVEditors.lazy(type) → Promise                     load editors/<type>/index.js on first use (browser only; DVEditors.setBase(url))
 * kinds: number · int · bool · string · color · vec3 · enum · asset · range
 */
(function (global) {
  'use strict';
  var _schemas = Object.create(null);
  function register(type, schema) {
    if (!type || typeof type !== 'string') throw new Error('DVEditors.register: type required');
    schema = schema || {}; schema.type = type; schema.rows = Array.isArray(schema.rows) ? schema.rows : [];
    _schemas[type] = schema; return schema;
  }
  function get(type) { return _schemas[type] || null; }
  function has(type) { return !!_schemas[type]; }
  function types() { return Object.keys(_schemas).sort(); }
  function defaults(type) { var s = get(type), o = {}; if (!s) return o; s.rows.forEach(function (r) { if (r.default !== undefined && r.default !== null) o[r.key] = JSON.parse(JSON.stringify(r.default)); }); return o; }
  function num(v, d) { var n = +v; return isFinite(n) ? n : d; }
  function coerce(row, raw) {
    if (!row) return raw;
    switch (row.kind) {
      case 'number': case 'range': return num(raw, row.default != null ? row.default : 0);
      case 'int': return Math.round(num(raw, row.default != null ? row.default : 0));
      case 'bool': return raw === true || raw === 'true' || raw === 1 || raw === '1' || raw === 'on';
      case 'color': if (typeof raw === 'number') return raw; raw = String(raw || '').trim(); if (/^#?[0-9a-f]{6}$/i.test(raw)) return parseInt(raw.replace('#', ''), 16); if (/^0x[0-9a-f]{1,6}$/i.test(raw)) return parseInt(raw, 16); return row.default != null ? row.default : 0xffffff;
      case 'vec3': if (raw && typeof raw === 'object') return { x: num(raw.x, 0), y: num(raw.y, 0), z: num(raw.z, 0) }; var p = String(raw || '').split(/[ ,]+/); return { x: num(p[0], 0), y: num(p[1], 0), z: num(p[2], 0) };
      case 'enum': return row.options && row.options.indexOf(raw) >= 0 ? raw : (row.default != null ? row.default : raw);
      default: if (row.json && typeof raw === 'string') { try { return JSON.parse(raw); } catch (e) { return row.default; } } return raw;
    }
  }
  function hex(v) { if (typeof v === 'string') return v; return '#' + ('000000' + ((v >>> 0) & 0xffffff).toString(16)).slice(-6); }
  var _lazy = Object.create(null), base = './editors/';
  function setBase(url) { base = url; }
  function lazy(type) {
    if (has(type)) return Promise.resolve(true);
    if (_lazy[type]) return _lazy[type];
    if (!global.document) return Promise.reject(new Error('DVEditors.lazy: no document'));
    _lazy[type] = new Promise(function (res, rej) { var s = global.document.createElement('script'); s.src = base + type + '/index.js'; s.async = true; s.onload = function () { has(type) ? res(true) : rej(new Error('DVEditors.lazy: ' + type + ' did not register')); }; s.onerror = function () { delete _lazy[type]; rej(new Error('DVEditors.lazy: failed ' + s.src)); }; global.document.head.appendChild(s); });
    return _lazy[type];
  }
  var DVEditors = { register: register, get: get, has: has, types: types, defaults: defaults, coerce: coerce, hex: hex, lazy: lazy, setBase: setBase, KINDS: ['number', 'int', 'bool', 'string', 'color', 'vec3', 'enum', 'asset', 'range'], version: '0.0.1-alpha', upstream: 'https://github.com/oncyberio/awe/tree/main/packages/engine-edit/src/editors' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVEditors;
  global.DVEditors = DVEditors;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
