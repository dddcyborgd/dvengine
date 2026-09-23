/*! dvengine — DVVerse.thot (verse/thot.js) · THOT memories via ethers when configured (tokenOfRoot → memories → parentRootHash chain) → [{hash,parent}], a pseudo tree otherwise · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 * THOT.sol (DeltaVerse/contracts-evm/cognition-thot): mapping memories(tokenId) → Memory{…, parentRootHash} (0 for a root memory),
 * mapping rootIndex(bytes32) and tokenOfRoot(bytes32 rootHash) → tokenId. The reader climbs parents from `root` up to `depth`.
 *   DVVerse.thot.memories(rpc, contract, root, { ethers, depth:8 }) → Promise<[{hash,parent,tokenId?}]>   (falls back to pseudoTree)
 * Pure: pseudoTree(root, depth) · chainOf(rootHash, lookup) — lookup(hash) → { parent } | null (sync, for tests)
 */
(function (global) {
  'use strict';
  var ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';
  var ABI = ['function tokenOfRoot(bytes32) view returns (uint256)', 'function memories(uint256) view returns (bytes32 rootHash, uint64 dimensions, bytes32 parentRootHash, string storageURI, uint40 committedAt, address committer)'];
  function isZero(h) { return !h || /^0x0*$/.test(String(h)); }
  function chainOf(root, lookup, depth) {
    var out = [], cur = root, guard = 0;
    while (cur && !isZero(cur) && guard++ < (depth || 8)) { var m = lookup(cur); if (!m) { out.push({ hash: cur, parent: null }); break; } out.push({ hash: cur, parent: isZero(m.parent) ? null : m.parent, tokenId: m.tokenId }); cur = m.parent; }
    return out.reverse();
  }
  function pseudoTree(root, depth) {
    var T = global.DVThotMemory; if (T && T.pseudoTree) return T.pseudoTree(root, depth);
    var nodes = [{ hash: root, parent: null }], frontier = [root];
    function next(s, j) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i) + j * 7) >>> 0; return '0x' + ('00000000' + x.toString(16)).slice(-8) + ('00000000' + ((x * 2654435761) >>> 0).toString(16)).slice(-8); }
    for (var d = 1; d <= (depth || 4); d++) { var nf = []; for (var i = 0; i < frontier.length && nf.length < 8; i++) for (var j = 0; j < 2; j++) { var hh = next(frontier[i], j + d); nodes.push({ hash: hh, parent: frontier[i] }); nf.push(hh); } frontier = nf; }
    return nodes;
  }
  function memories(rpc, contract, root, opts) {
    opts = opts || {}; var E = opts.ethers || global.ethers, depth = opts.depth || 8;
    if (!E || !rpc || !contract || isZero(root)) return Promise.resolve(pseudoTree(root || ZERO, 4));
    var c; try { var provider = E.JsonRpcProvider ? new E.JsonRpcProvider(rpc) : new E.providers.JsonRpcProvider(rpc); c = new E.Contract(contract, ABI, provider); } catch (e) { return Promise.resolve(pseudoTree(root, 4)); }
    var out = [];
    function climb(hash, n) {
      if (!hash || isZero(hash) || n >= depth) return Promise.resolve();
      return c.tokenOfRoot(hash).then(function (tid) { return c.memories(tid).then(function (m) { var parent = m.parentRootHash || m[2]; out.push({ hash: hash, parent: isZero(parent) ? null : parent, tokenId: String(tid) }); return climb(parent, n + 1); }); });
    }
    return climb(root, 0).then(function () { return out.length ? out.reverse() : pseudoTree(root, 4); }, function () { return pseudoTree(root, 4); });
  }
  var api = { memories: memories, chainOf: chainOf, pseudoTree: pseudoTree, ABI: ABI, ZERO: ZERO };
  var NS = global.DVVerse = global.DVVerse || {}; NS.thot = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
