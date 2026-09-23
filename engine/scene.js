/*!
 * dvengine — DVScene (engine/scene.js) · the cyborg-space/1 scene document
 *
 * A cyborg space document is THREE things at once: (1) the scene the engine mounts (a superset of the
 * oncyberio awe static-scene.json SceneData: components keyed by id with type/position/rotation/scale/
 * parentId/data/collider/script), (2) the DeltaVerse room-token manifest (the live/rooms/bubbleroom.json
 * fields: token · skin · theme · traits · nfts, so DVNeuralNode.loadRoom(doc) reads it), and (3) an
 * ERC-721 tokenURI document (name/description/image/animation_url) — the space IS the token.
 *
 *   DVScene.FORMAT                     'cyborg-space/1'
 *   DVScene.create(partial) -> doc     a valid empty document with defaults
 *   DVScene.validate(doc) -> { ok, errors[] }
 *   DVScene.fromLegacy(staticScene, roomManifest?) -> doc     awe static-scene.json → cyborg-space/1
 *   DVScene.merge(doc, roomManifest) -> doc                   fold a bubbleroom.json manifest in
 *   DVScene.canonical(doc) -> string   sorted-key JSON (the bytes that are hashed)
 *   DVScene.digest(doc) -> 0x…        keccak256(canonical) — the on-chain sceneHash (self-contained keccak)
 *   DVScene.toTokenURI(doc) -> 'data:application/json;base64,…'   DVScene.fromTokenURI(uri) -> doc
 *   DVScene.keccak256(bytes|string) -> 0x…
 *
 * Zero-dependency UMD. (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · scene shape after oncyberio awe (MIT)
 */
(function (global) {
  'use strict';
  var FORMAT = 'cyborg-space/1';
  var SCHEMA = 'https://deltaverse.pythai.net/schema/cyborg-space.v1.json';
  var RUNGS = ['participant', 'recognized-participant', 'member', 'player', 'trader', 'owner', 'overseer', 'overlord', 'mastermind', 'public'];
  var TOKEN_TYPES = ['aNFT', 'dNFT', 'iNFT', 'THOT'];

  // ---- keccak-256 (FIPS-202 Keccak, NOT SHA3: pad 0x01) — BigInt lanes, self-contained -------------
  var RC = ['0x1', '0x8082', '0x800000000000808a', '0x8000000080008000', '0x808b', '0x80000001', '0x8000000080008081', '0x8000000000008009',
    '0x8a', '0x88', '0x80008009', '0x8000000a', '0x8000808b', '0x800000000000008b', '0x8000000000008089', '0x8000000000008003',
    '0x8000000000008002', '0x8000000000000080', '0x800a', '0x800000008000000a', '0x8000000080008081', '0x8000000000008080', '0x80000001', '0x8000000080008008'];
  var ROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];
  var M64 = (BigInt(1) << BigInt(64)) - BigInt(1);
  function rotl(x, n) { n = BigInt(n); return ((x << n) | (x >> (BigInt(64) - n))) & M64; }
  function keccakF(s) {
    var C = new Array(5), D = new Array(5), B = new Array(25), x, y, r;
    for (r = 0; r < 24; r++) {
      for (x = 0; x < 5; x++) C[x] = s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20];
      for (x = 0; x < 5; x++) D[x] = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1);
      for (x = 0; x < 25; x++) s[x] ^= D[x % 5];
      for (x = 0; x < 5; x++) for (y = 0; y < 5; y++) B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(s[x + 5 * y], ROT[x + 5 * y]);
      for (x = 0; x < 5; x++) for (y = 0; y < 5; y++) s[x + 5 * y] = B[x + 5 * y] ^ ((~B[(x + 1) % 5 + 5 * y]) & M64 & B[(x + 2) % 5 + 5 * y]);
      s[0] ^= BigInt(RC[r]);
    }
  }
  function toBytes(input) {
    if (input instanceof Uint8Array) return input;
    if (typeof input === 'string') {
      if (/^0x[0-9a-fA-F]*$/.test(input) && input.length % 2 === 0) { var h = input.slice(2), out = new Uint8Array(h.length / 2); for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16); return out; }
      if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(input);
      var b = []; for (var j = 0; j < input.length; j++) { var c = input.charCodeAt(j); if (c < 128) b.push(c); else if (c < 2048) b.push(192 | (c >> 6), 128 | (c & 63)); else b.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); } return Uint8Array.from(b);
    }
    throw new Error('DVScene.keccak256: bytes or string expected');
  }
  function keccak256(input) {
    var bytes = toBytes(input), rate = 136;
    var s = []; for (var i = 0; i < 25; i++) s.push(BigInt(0));
    var padded = new Uint8Array(Math.ceil((bytes.length + 1) / rate) * rate);
    padded.set(bytes); padded[bytes.length] ^= 0x01; padded[padded.length - 1] ^= 0x80;
    for (var off = 0; off < padded.length; off += rate) {
      for (var l = 0; l < rate / 8; l++) { var v = BigInt(0); for (var k = 7; k >= 0; k--) v = (v << BigInt(8)) | BigInt(padded[off + l * 8 + k]); s[l] ^= v; }
      keccakF(s);
    }
    var hex = '0x';
    for (var m = 0; m < 4; m++) { var lane = s[m]; for (var n = 0; n < 8; n++) { var byte = Number((lane >> BigInt(8 * n)) & BigInt(255)); hex += (byte < 16 ? '0' : '') + byte.toString(16); } }
    return hex;
  }

  // ---- canonical JSON ------------------------------------------------------------------------------
  function canonicalize(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
    var keys = Object.keys(v).sort(), parts = [];
    for (var i = 0; i < keys.length; i++) { if (v[keys[i]] === undefined) continue; parts.push(JSON.stringify(keys[i]) + ':' + canonicalize(v[keys[i]])); }
    return '{' + parts.join(',') + '}';
  }
  function canonical(doc) { var d = JSON.parse(JSON.stringify(doc)); delete d.updatedAt; delete d.sceneHash; return canonicalize(d); }
  function digest(doc) { return keccak256(canonical(doc)); }

  // ---- document ------------------------------------------------------------------------------------
  function create(p) {
    p = p || {};
    return {
      $schema: SCHEMA, format: FORMAT,
      id: p.id || 'space', name: p.name || 'Cyborg Space', concept: p.concept || 'cyborg', description: p.description || '',
      creatorId: p.creatorId || 'anon', editors: p.editors || [],
      room: p.room || { roomId: 0, contract: null, chain: null },
      token: p.token || { standard: 'ERC-721', type: 'iNFT', compatible: ['ERC-7857', 'ERC-6551', 'ERC-5192'], chain: null, soulbound: false, tba: true },
      agent: p.agent || { inft: null, thotRoot: null },
      skin: p.skin || 'default-dark', theme: p.theme || 'default-dark',
      traits: p.traits || [], nfts: p.nfts || [],
      zones: p.zones || [{ id: 'agora', name: 'The Agora', minRole: 'public', bounds: { c: [0, 0, 0], r: 12 } }],
      agents: p.agents || [],
      components: p.components || {}, params: p.params || {},
      image: p.image || '', animation_url: p.animation_url || '',
      legacy: p.legacy || null,
      createdAt: p.createdAt || Date.now()
    };
  }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function isVec(v) { return v && isNum(+v.x) && isNum(+v.y) && isNum(+v.z); }
  function validate(doc) {
    var errors = [];
    if (!doc || typeof doc !== 'object') return { ok: false, errors: ['document must be an object'] };
    if (doc.format !== FORMAT) errors.push('format must be ' + FORMAT);
    if (!doc.id || typeof doc.id !== 'string' || !/^[a-z0-9][a-z0-9-_.]{0,63}$/i.test(doc.id)) errors.push('id must be a short slug');
    if (!doc.components || typeof doc.components !== 'object' || Array.isArray(doc.components)) errors.push('components must be an object keyed by id');
    else Object.keys(doc.components).forEach(function (id) {
      var c = doc.components[id];
      if (!c || typeof c !== 'object') { errors.push('component ' + id + ' must be an object'); return; }
      if (c.id !== id) errors.push('component ' + id + ': id mismatch');
      if (!c.type || typeof c.type !== 'string') errors.push('component ' + id + ': type required');
      if (c.position && !isVec(c.position)) errors.push('component ' + id + ': bad position');
      if (c.rotation && !isVec(c.rotation)) errors.push('component ' + id + ': bad rotation');
      if (c.scale && !isVec(c.scale)) errors.push('component ' + id + ': bad scale');
      if (c.parentId && !doc.components[c.parentId]) errors.push('component ' + id + ': parentId ' + c.parentId + ' not found');
      if (c.parentId === id) errors.push('component ' + id + ': cannot parent itself');
    });
    if (doc.zones) { if (!Array.isArray(doc.zones)) errors.push('zones must be an array'); else doc.zones.forEach(function (z, i) {
      if (!z.id) errors.push('zone ' + i + ': id required');
      if (z.minRole && RUNGS.indexOf(z.minRole) < 0) errors.push('zone ' + z.id + ': unknown minRole ' + z.minRole);
      if (z.bounds && (!Array.isArray(z.bounds.c) || z.bounds.c.length !== 3 || !isNum(z.bounds.r))) errors.push('zone ' + z.id + ': bounds need c[3] + r');
    }); }
    if (doc.token && doc.token.type && TOKEN_TYPES.indexOf(doc.token.type) < 0) errors.push('token.type must be one of ' + TOKEN_TYPES.join('/'));
    if (doc.nfts && !Array.isArray(doc.nfts)) errors.push('nfts must be an array');
    if (doc.agents && !Array.isArray(doc.agents)) errors.push('agents must be an array');
    return { ok: errors.length === 0, errors: errors };
  }
  /** awe static-scene.json (SceneData) → cyborg-space/1. The legacy source is recorded, never lost. */
  function fromLegacy(scene, roomManifest) {
    scene = scene || {};
    var comps = {};
    var src = scene.components && !Array.isArray(scene.components) ? scene.components : {};
    if (Array.isArray(scene.items)) scene.items.forEach(function (it) { if (it && it.id) src[it.id] = it; });
    Object.keys(src).forEach(function (id) {
      var c = src[id]; if (!c || typeof c !== 'object') return;
      var n = { id: id, name: c.name || id, type: c.type || 'object' };
      if (c.position) n.position = c.position; if (c.rotation) n.rotation = c.rotation; if (c.scale) n.scale = c.scale;
      if (c.parentId) n.parentId = c.parentId; if (c.collider) n.collider = c.collider; if (c.script) n.script = c.script;
      var data = {}; Object.keys(c).forEach(function (k) { if (['id', 'name', 'type', 'position', 'rotation', 'scale', 'parentId', 'collider', 'script', 'kit', '_version'].indexOf(k) < 0) data[k] = c[k]; });
      if (c.data && typeof c.data === 'object') Object.keys(c.data).forEach(function (k) { data[k] = c.data[k]; });
      n.data = data;
      comps[id] = n;
    });
    var doc = create({ id: (scene.id || 'legacy-space').toString().replace(/[^a-z0-9-_.]/gi, '-').toLowerCase(), name: scene.name || scene.id || 'Legacy space', creatorId: scene.creatorId || 'anon', editors: scene.editors || [], components: comps, params: scene.params || {},
      legacy: { source: 'static-scene.json', engine: 'oncyberio/awe', format: 'SceneData', upstream: 'https://github.com/oncyberio/awe' } });
    return roomManifest ? merge(doc, roomManifest) : doc;
  }
  /** Fold a DeltaVerse room-token manifest (live/rooms/bubbleroom.json) into the document. */
  function merge(doc, m) {
    if (!m) return doc;
    var out = JSON.parse(JSON.stringify(doc));
    if (m.roomId != null || m.contract) out.room = { roomId: m.roomId || 0, contract: (m.contract && (m.contract.address || m.contract.name)) || null, chain: (m.token && m.token.chain) || (m.contract && m.contract.chains && m.contract.chains[0]) || null, concept: m.concept || out.room.concept };
    if (m.token) out.token = Object.assign({}, out.token, m.token);
    if (m.skin) out.skin = m.skin; if (m.theme) out.theme = m.theme;
    if (m.traits) out.traits = m.traits; if (m.nfts) out.nfts = m.nfts;
    if (m.name && !doc.name) out.name = m.name;
    if (m.concept) out.concept = m.concept;
    return out;
  }
  function b64encode(str) {
    var bytes = toBytes(str);
    if (typeof btoa === 'function') { var bin = ''; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin); }
    return Buffer.from(bytes).toString('base64');
  }
  function b64decode(b64) {
    if (typeof atob === 'function') { var bin = atob(b64), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(out) : bin; }
    return Buffer.from(b64, 'base64').toString('utf8');
  }
  function toTokenURI(doc) { var d = JSON.parse(JSON.stringify(doc)); d.sceneHash = digest(doc); return 'data:application/json;base64,' + b64encode(JSON.stringify(d)); }
  function fromTokenURI(uri) {
    if (typeof uri !== 'string') throw new Error('DVScene.fromTokenURI: string expected');
    var m = /^data:application\/json;base64,(.+)$/.exec(uri);
    if (m) return JSON.parse(b64decode(m[1]));
    var m2 = /^data:application\/json(?:;utf8)?,(.+)$/.exec(uri);
    if (m2) return JSON.parse(decodeURIComponent(m2[1]));
    throw new Error('DVScene.fromTokenURI: not a data: JSON uri (fetch http/ipfs uris with DVScene.fetch)');
  }
  function fetchDoc(uri, fetchImpl) {
    var f = fetchImpl || global.fetch; if (!f) return Promise.reject(new Error('no fetch'));
    if (/^data:/.test(uri)) return Promise.resolve(fromTokenURI(uri));
    var url = uri.replace(/^ipfs:\/\//, (global.DV_IPFS_GATEWAY || '/ipfs/'));
    return f(url).then(function (r) { if (!r.ok) throw new Error('fetch ' + r.status); return r.json(); });
  }

  var DVScene = { FORMAT: FORMAT, SCHEMA: SCHEMA, RUNGS: RUNGS, TOKEN_TYPES: TOKEN_TYPES, create: create, validate: validate, fromLegacy: fromLegacy, merge: merge,
    canonical: canonical, digest: digest, keccak256: keccak256, toTokenURI: toTokenURI, fromTokenURI: fromTokenURI, fetch: fetchDoc, version: '0.0.1-alpha' };
  if (typeof module !== 'undefined' && module.exports) module.exports = DVScene;
  global.DVScene = DVScene;
})(typeof window !== 'undefined' ? window : this);
