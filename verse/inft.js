/*! dvengine — DVVerse.inftAgent (verse/inft.js) · read an iNFT_7857 agent (getAgentId · dimensions64 · getPayload · thotRootOf · ownerOf · tokenURI) via ethers, or derive 64 pseudo-dims from keccak256(agentId) · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
/*
 * The view names are the EXACT ones in DeltaVerse/deploy/artifacts/cognition-inft/iNFT_7857.json (ABI):
 *   getAgentId(uint256) → string · dimensions64(uint256) → uint64 · getPayload(uint256) → IntelligencePayload{contentRoot,storageURI,metadataRoot,dimensions,parallelUnits,mintedAt,sealedKeyHash,verified}
 *   thotRootOf(uint256) → bytes32 · ownerOf(uint256) → address · tokenURI(uint256) → string
 *   DVVerse.inftAgent(rpc, contract, tokenId, { ethers }) → Promise<{ agentId, dims64:number[64], thotRoot, owner, tokenURI, payload, source:'chain'|'derived' }>
 * Pure: bitsOf(uint64 as bigint|string|number) → 64 bits · pseudoDims(agentId, keccakFn?) → 64 numbers in 0..1 (nibbles of keccak256(agentId)/15)
 */
(function (global) {
  'use strict';
  var ABI = [
    { type: 'function', name: 'getAgentId', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
    { type: 'function', name: 'dimensions64', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'uint64' }] },
    { type: 'function', name: 'getPayload', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'tuple', components: [
      { name: 'contentRoot', type: 'bytes32' }, { name: 'storageURI', type: 'string' }, { name: 'metadataRoot', type: 'bytes32' }, { name: 'dimensions', type: 'uint256' }, { name: 'parallelUnits', type: 'uint8' }, { name: 'mintedAt', type: 'uint40' }, { name: 'sealedKeyHash', type: 'bytes32' }, { name: 'verified', type: 'bool' }] }] },
    { type: 'function', name: 'thotRootOf', stateMutability: 'view', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }] },
    { type: 'function', name: 'ownerOf', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
    { type: 'function', name: 'tokenURI', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] }
  ];
  function bitsOf(v) {
    var big; try { big = typeof v === 'bigint' ? v : BigInt(String(v || 0)); } catch (e) { big = BigInt(0); }
    var out = []; for (var i = 0; i < 64; i++) out.push(Number((big >> BigInt(i)) & BigInt(1)));
    return out;
  }
  function pseudoDims(agentId, keccak) {
    var K = keccak || (global.DVScene && global.DVScene.keccak256);
    var hex;
    if (K) hex = K(String(agentId || '')).slice(2);
    else { var h = 0, s = String(agentId || ''); hex = ''; for (var i = 0; i < 64; i++) { h = (Math.imul(h ^ (s.charCodeAt(i % Math.max(1, s.length)) || 0), 16777619) + i * 7919) >>> 0; hex += (h & 15).toString(16); } }
    var dims = []; for (var j = 0; j < 64; j++) dims.push(parseInt(hex[j] || '0', 16) / 15);
    return dims;
  }
  function inftAgent(rpc, contract, tokenId, opts) {
    opts = opts || {}; var E = opts.ethers || global.ethers;
    var derived = function (agentId, extra) { var o = { agentId: agentId, dims64: pseudoDims(agentId), thotRoot: null, owner: null, tokenURI: null, payload: null, source: 'derived' }; for (var k in (extra || {})) o[k] = extra[k]; return o; };
    if (!E || !rpc || !contract) return Promise.resolve(derived(opts.agentId || (String(contract || 'agent') + ':' + tokenId)));
    var provider, c;
    try { provider = E.JsonRpcProvider ? new E.JsonRpcProvider(rpc) : new E.providers.JsonRpcProvider(rpc); c = new E.Contract(contract, ABI, provider); } catch (e) { return Promise.resolve(derived(opts.agentId || (contract + ':' + tokenId))); }
    var id = String(tokenId);
    return c.getAgentId(id).then(function (agentId) {
      return Promise.all([c.dimensions64(id).catch(function () { return null; }), c.getPayload(id).catch(function () { return null; }), c.thotRootOf(id).catch(function () { return null; }), c.ownerOf(id).catch(function () { return null; }), c.tokenURI(id).catch(function () { return null; })])
        .then(function (r) {
          var dims = r[0] != null ? bitsOf(r[0]) : pseudoDims(agentId);
          var payload = r[1] ? { contentRoot: r[1].contentRoot || r[1][0], storageURI: r[1].storageURI || r[1][1], metadataRoot: r[1].metadataRoot || r[1][2], dimensions: Number(r[1].dimensions != null ? r[1].dimensions : r[1][3]), parallelUnits: Number(r[1].parallelUnits != null ? r[1].parallelUnits : r[1][4]), mintedAt: Number(r[1].mintedAt != null ? r[1].mintedAt : r[1][5]), sealedKeyHash: r[1].sealedKeyHash || r[1][6], verified: !!(r[1].verified != null ? r[1].verified : r[1][7]) } : null;
          return { agentId: agentId, dims64: dims, thotRoot: r[2], owner: r[3], tokenURI: r[4], payload: payload, source: 'chain' };
        });
    }).catch(function () { return derived(opts.agentId || (contract + ':' + tokenId), { error: 'rpc' }); });
  }
  var NS = global.DVVerse = global.DVVerse || {};
  NS.inftAgent = inftAgent; NS.inftAgent.ABI = ABI; NS.inftAgent.bitsOf = bitsOf; NS.inftAgent.pseudoDims = pseudoDims;
  if (typeof module !== 'undefined' && module.exports) module.exports = inftAgent;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
