/*! dvengine — studio wallet bar (studio/panels/wallet.js) · READ-ONLY: eth_requestAccounts + address + chainId; nothing is ever signed here · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
(function (global) {
  'use strict';
  var P = global.DVStudioPanels = global.DVStudioPanels || {};
  var CHAINS = { '0x1': 'ethereum', '0x89': 'polygon', '0x2105': 'base', '0x38': 'bsc', '0xa4b1': 'arbitrum', '0x7a69': 'anvil', '0x4115': '0g', '0x8274f': 'scroll-sepolia' };
  P.wallet = { mount: function (S) {
    var d = global.document, host = d.getElementById('wallet'); if (!host) return { refresh: function () {} };
    var addr = null, chain = null, b = d.createElement('button'), lbl = d.createElement('span'); lbl.className = 'addr';
    function show() { if (!addr) { b.textContent = global.ethereum ? 'wallet' : 'no wallet'; b.disabled = !global.ethereum; lbl.textContent = ''; return; } b.textContent = 'read-only'; lbl.textContent = addr.slice(0, 6) + '…' + addr.slice(-4) + ' · ' + (CHAINS[chain] || chain); lbl.title = addr + ' · chainId ' + chain + ' · read-only (no signing in the studio)'; }
    b.addEventListener('click', function () {
      if (!global.ethereum || addr) return;
      global.ethereum.request({ method: 'eth_requestAccounts' }).then(function (a) { addr = a && a[0] || null; return global.ethereum.request({ method: 'eth_chainId' }); }).then(function (c) { chain = c; show(); S.toast('wallet read: ' + (addr || '?') + ' (no signing)'); }, function (e) { S.toast('wallet: ' + (e.message || e)); });
    });
    if (global.ethereum && global.ethereum.on) { try { global.ethereum.on('accountsChanged', function (a) { addr = a && a[0] || null; show(); }); global.ethereum.on('chainChanged', function (c) { chain = c; show(); }); } catch (e) {} }
    host.appendChild(b); host.appendChild(lbl); show();
    return { refresh: show };
  } };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
