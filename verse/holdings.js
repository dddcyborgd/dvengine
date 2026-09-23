/*! dvengine — DVVerse.holdings (verse/holdings.js) · the first wallet-NFT reader: read-only ERC-721 enumeration via window.ethers, tokenURI resolution, doc.nfts fallback · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · (studio dApp precedent © oncyberio, MIT — no OpenSea key here) */
/*
 *   DVVerse.holdings(address, { rpc, contracts:[{ address, chain?, type? }], doc, ethers, fetch, max:24 }) → Promise<nft[]>
 *     for each contract: balanceOf(owner) → tokenOfOwnerByIndex(owner,i) (ERC-721Enumerable) → tokenURI → metadata → nft
 *     a contract without enumeration, a failed RPC, or no ethers at all → the document's nfts (doc.nfts) so the ring is never empty
 *   nft = { id, title, artist, type, seed, image, contract, tokenId, tokenURI, meta }
 * Pure: resolveTokenURI(uri, fetchImpl) → Promise<meta> (data:application/json;base64 · data:application/json, · ipfs:// · http(s))
 *       metaToNft(meta, ref) · seedOf(contract, tokenId) · fromDoc(doc) · IPFS gateway: window.DV_IPFS_GATEWAY || '/ipfs/'
 */
(function (global) {
  'use strict';
  var ABI = ['function balanceOf(address) view returns (uint256)', 'function tokenOfOwnerByIndex(address,uint256) view returns (uint256)', 'function ownerOf(uint256) view returns (address)', 'function tokenURI(uint256) view returns (string)', 'function name() view returns (string)'];
  function b64decode(b64) {
    if (typeof atob === 'function') { var bin = atob(b64), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(out) : bin; }
    return Buffer.from(b64, 'base64').toString('utf8');
  }
  function gateway() { return global.DV_IPFS_GATEWAY || '/ipfs/'; }
  function toHttp(u) { u = String(u || ''); if (/^ipfs:\/\//i.test(u)) return gateway() + u.replace(/^ipfs:\/\/(ipfs\/)?/i, ''); if (/^ar:\/\//i.test(u)) return (global.DV_AR_GATEWAY || 'https://arweave.net/') + u.slice(5); return u; }
  function resolveTokenURI(uri, fetchImpl) {
    if (!uri || typeof uri !== 'string') return Promise.reject(new Error('tokenURI: string expected'));
    var m = /^data:application\/json;base64,(.+)$/i.exec(uri);
    if (m) { try { return Promise.resolve(JSON.parse(b64decode(m[1]))); } catch (e) { return Promise.reject(e); } }
    var m2 = /^data:application\/json(?:;charset=utf-8)?(?:;utf8)?,(.+)$/i.exec(uri);
    if (m2) { try { return Promise.resolve(JSON.parse(decodeURIComponent(m2[1]))); } catch (e) { try { return Promise.resolve(JSON.parse(m2[1])); } catch (e2) { return Promise.reject(e2); } } }
    var f = fetchImpl || global.fetch; if (!f) return Promise.reject(new Error('tokenURI: no fetch for ' + uri.slice(0, 32)));
    return f(toHttp(uri)).then(function (r) { if (!r.ok) throw new Error('tokenURI fetch ' + r.status); return r.json(); });
  }
  function seedOf(contract, tokenId) {
    var s = String(contract || '').toLowerCase() + ':' + String(tokenId || '');
    if (global.DVScene && global.DVScene.keccak256) { try { return parseInt(global.DVScene.keccak256(s).slice(2, 10), 16) >>> 0; } catch (e) {} }
    var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0;
  }
  function typeOf(meta, ref) {
    if (ref && ref.type) return ref.type;
    var attrs = (meta && meta.attributes) || [];
    for (var i = 0; i < attrs.length; i++) { var k = String(attrs[i].trait_type || attrs[i].k || '').toLowerCase(); if (k === 'type' || k === 'class' || k === 'token') { var v = String(attrs[i].value || attrs[i].v || ''); if (/^(aNFT|dNFT|iNFT|THOT)$/.test(v)) return v; } }
    if (meta && meta.format === 'cyborg-space/1' && meta.token && meta.token.type) return meta.token.type;
    return 'aNFT';
  }
  function metaToNft(meta, ref) {
    meta = meta || {}; ref = ref || {};
    var id = ref.id || ((ref.contract ? String(ref.contract).slice(0, 8) : 'nft') + '#' + (ref.tokenId != null ? ref.tokenId : '?'));
    return { id: id, title: meta.name || ref.title || id, artist: meta.artist || (meta.properties && meta.properties.artist) || ref.artist || (meta.creator || ''), type: typeOf(meta, ref),
      seed: ref.seed != null ? ref.seed : seedOf(ref.contract, ref.tokenId), image: toHttp(meta.image || meta.image_url || meta.animation_url || ''), contract: ref.contract || null, tokenId: ref.tokenId != null ? String(ref.tokenId) : null, tokenURI: ref.tokenURI || null, meta: meta };
  }
  function fromDoc(doc) { return ((doc && doc.nfts) || []).map(function (n) { return metaToNft({ name: n.title, image: n.image }, { id: n.id, title: n.title, artist: n.artist, type: n.type, seed: n.seed, contract: n.contract, tokenId: n.tokenId }); }); }

  function holdings(address, opts) {
    opts = opts || {};
    var E = opts.ethers || global.ethers, contracts = opts.contracts || [], max = opts.max || 24, out = [];
    var fallback = function () { return fromDoc(opts.doc); };
    if (!E || !opts.rpc || !contracts.length || !address) return Promise.resolve(fallback());
    var provider; try { provider = E.JsonRpcProvider ? new E.JsonRpcProvider(opts.rpc) : new E.providers.JsonRpcProvider(opts.rpc); } catch (e) { return Promise.resolve(fallback()); }
    var chain = Promise.resolve();
    contracts.forEach(function (ref) {
      chain = chain.then(function () {
        var c = new E.Contract(ref.address, ABI, provider);
        return c.balanceOf(address).then(function (bal) {
          var n = Math.min(Number(bal), max - out.length), ids = [];
          for (var i = 0; i < n; i++) ids.push(i);
          return ids.reduce(function (p, i) { return p.then(function () { return c.tokenOfOwnerByIndex(address, i).then(function (tid) { return c.tokenURI(tid).then(function (uri) { return resolveTokenURI(uri, opts.fetch).catch(function () { return {}; }).then(function (meta) { out.push(metaToNft(meta, { contract: ref.address, tokenId: String(tid), tokenURI: uri, type: ref.type })); }); }); }).catch(function () {}); }); }, Promise.resolve());
        }).catch(function () {});
      });
    });
    return chain.then(function () { return out.length ? out : fallback(); });
  }

  var NS = global.DVVerse = global.DVVerse || {};
  NS.holdings = holdings; NS.holdings.resolveTokenURI = resolveTokenURI; NS.holdings.metaToNft = metaToNft; NS.holdings.seedOf = seedOf; NS.holdings.fromDoc = fromDoc; NS.holdings.toHttp = toHttp; NS.holdings.ABI = ABI;
  if (typeof module !== 'undefined' && module.exports) module.exports = holdings;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
