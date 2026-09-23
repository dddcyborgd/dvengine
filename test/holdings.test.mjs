// dvengine — verse/holdings.js: tokenURI resolution (data: · ipfs:// · http), metadata → nft, the doc fallback, a fake ethers enumeration · node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const holdings = require('../verse/holdings.js');
const H = holdings;

test('resolveTokenURI: data:application/json;base64 and data:application/json,', async () => {
  const meta = { name: 'First Thought', image: 'ipfs://QmABC/art.png', attributes: [{ trait_type: 'type', value: 'THOT' }] };
  const b64 = 'data:application/json;base64,' + Buffer.from(JSON.stringify(meta)).toString('base64');
  assert.deepEqual(await H.resolveTokenURI(b64), meta);
  assert.deepEqual(await H.resolveTokenURI('data:application/json,' + encodeURIComponent(JSON.stringify(meta))), meta);
  await assert.rejects(H.resolveTokenURI('data:application/json;base64,!!!'));
  await assert.rejects(H.resolveTokenURI(42));
});

test('resolveTokenURI: ipfs:// goes through the gateway, http passes through, with an injected fetch', async () => {
  const seen = [];
  const fetch = async (u) => { seen.push(u); return { ok: true, json: async () => ({ name: 'x', url: u }) }; };
  globalThis.DV_IPFS_GATEWAY = 'https://gw.example/ipfs/';
  await H.resolveTokenURI('ipfs://QmXYZ/1.json', fetch); await H.resolveTokenURI('ipfs://ipfs/QmXYZ/2.json', fetch); await H.resolveTokenURI('https://a.b/c.json', fetch);
  assert.deepEqual(seen, ['https://gw.example/ipfs/QmXYZ/1.json', 'https://gw.example/ipfs/QmXYZ/2.json', 'https://a.b/c.json']);
  delete globalThis.DV_IPFS_GATEWAY;
  assert.equal(H.toHttp('ipfs://Qm1'), '/ipfs/Qm1', 'default gateway');
  await assert.rejects(H.resolveTokenURI('https://a.b/404', async () => ({ ok: false, status: 404 })));
});

test('metaToNft: title, artist, type from attributes, image via gateway, deterministic seed', () => {
  const n = H.metaToNft({ name: 'Aurora', artist: 'nGn', image: 'ipfs://QmA', attributes: [{ trait_type: 'Type', value: 'dNFT' }] }, { contract: '0xAbC', tokenId: 7 });
  assert.equal(n.title, 'Aurora'); assert.equal(n.artist, 'nGn'); assert.equal(n.type, 'dNFT'); assert.equal(n.image, '/ipfs/QmA'); assert.equal(n.tokenId, '7'); assert.equal(n.id, '0xAbC#7');
  assert.equal(n.seed, H.seedOf('0xAbC', 7)); assert.equal(H.seedOf('0xabc', '7'), n.seed, 'case-insensitive contract');
  assert.equal(H.metaToNft({}, {}).type, 'aNFT', 'default type');
  assert.equal(H.metaToNft({ format: 'cyborg-space/1', token: { type: 'iNFT' } }, {}).type, 'iNFT', 'a space document is its own token type');
});

test('fromDoc keeps the document list as the fallback ring', () => {
  const doc = { nfts: [{ id: 'a', title: 'A', artist: 'x', type: 'THOT', seed: 7 }, { id: 'b', title: 'B', type: 'aNFT', seed: 9 }] };
  const list = H.fromDoc(doc);
  assert.equal(list.length, 2); assert.equal(list[0].seed, 7); assert.equal(list[0].type, 'THOT'); assert.equal(list[1].title, 'B');
  assert.deepEqual(H.fromDoc(null), []);
});

test('holdings(): without ethers/rpc → doc fallback; with a fake ethers → enumerates and resolves data: tokenURIs', async () => {
  const doc = { nfts: [{ id: 'fallback', title: 'F', type: 'aNFT', seed: 1 }] };
  const fb = await holdings('0xowner', { doc }); assert.equal(fb[0].id, 'fallback');
  const meta = (i) => 'data:application/json;base64,' + Buffer.from(JSON.stringify({ name: 'Token ' + i, attributes: [{ trait_type: 'type', value: 'iNFT' }] })).toString('base64');
  const ethers = { JsonRpcProvider: function () {}, Contract: function (addr) { this.balanceOf = async () => 2n; this.tokenOfOwnerByIndex = async (o, i) => BigInt(100 + i); this.tokenURI = async (t) => meta(t); } };
  const got = await holdings('0xowner', { rpc: 'http://rpc', contracts: [{ address: '0xC' }], doc, ethers });
  assert.equal(got.length, 2); assert.equal(got[0].title, 'Token 100'); assert.equal(got[1].tokenId, '101'); assert.equal(got[0].type, 'iNFT'); assert.equal(got[0].contract, '0xC');
  const broken = { JsonRpcProvider: function () {}, Contract: function () { this.balanceOf = async () => { throw new Error('rpc down'); }; } };
  const again = await holdings('0xowner', { rpc: 'http://rpc', contracts: [{ address: '0xC' }], doc, ethers: broken });
  assert.equal(again[0].id, 'fallback', 'a dead RPC never empties the ring');
});
