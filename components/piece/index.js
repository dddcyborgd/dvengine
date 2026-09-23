/*! dvengine — component piece (components/piece/index.js) · an NFT on the wall: frame + art plane, procedural art from the seed or the token image, focus glow · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · DeltaVerse-native (after DeltaVerse interaction/gallery-room.html) */
/*
 * Props: { nft:{ id, title, artist, type:'aNFT'|'dNFT'|'iNFT'|'THOT', seed, image?, contract?, tokenId? }, position, rotation, size (1.7), frameColor }
 * With `image` (http(s)://, ipfs://, data:) the texture is loaded (ipfs via window.DV_IPFS_GATEWAY || '/ipfs/'); until it
 * lands — and always without it — the art is DRAWN from the seed (the gallery-room artTexture: seeded rings + caption),
 * so a piece is never a grey square. `userData.dvPiece` = the nft on the group and the art plane (raycast targets).
 * API: focus(bool), nft. Pure: DVPiece.TYPE_COLOR, DVPiece.resolveImage(url).
 */
(function (global) {
  'use strict';
  var TYPE_COLOR = { aNFT: '#f5c451', dNFT: '#22d3ee', iNFT: '#c77dff', THOT: '#ff7ac8' };
  function resolveImage(u) {
    if (!u) return null;
    u = String(u);
    if (/^ipfs:\/\//i.test(u)) return (global.DV_IPFS_GATEWAY || '/ipfs/') + u.replace(/^ipfs:\/\/(ipfs\/)?/i, '');
    return u;
  }
  var pure = { TYPE_COLOR: TYPE_COLOR, resolveImage: resolveImage };
  if (!global.DVEngine) { if (typeof module !== 'undefined' && module.exports) module.exports = pure; global.DVPiece = pure; return; }

  function artCanvas(nft) {
    var c = global.document.createElement('canvas'); c.width = c.height = 512; var x = c.getContext('2d');
    var seed = ((nft.seed || 1) >>> 0) || 1; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var col = TYPE_COLOR[nft.type] || '#9fe9ff';
    x.fillStyle = '#0a0c14'; x.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 44; i++) { x.strokeStyle = (i % 2) ? col : '#3a3550'; x.globalAlpha = 0.15 + rnd() * 0.6; x.lineWidth = 1 + rnd() * 3; x.beginPath(); x.arc(256 + (rnd() - 0.5) * 340, 230 + (rnd() - 0.5) * 340, 8 + rnd() * 180, 0, 6.2832); x.stroke(); }
    x.globalAlpha = 1; x.fillStyle = col; x.font = 'bold 30px ui-monospace,monospace'; x.fillText(String(nft.title || nft.id || 'untitled'), 22, 462);
    x.fillStyle = '#9aa4b2'; x.font = '16px ui-monospace,monospace'; x.fillText((nft.type || '') + ' · ' + (nft.artist || ''), 22, 490);
    return c;
  }

  global.DVEngine.register('piece', function (props) {
    props = props || {};
    var nft = props.nft || { id: 'piece', title: 'Untitled', artist: '', type: 'aNFT', seed: 1 };
    var THREE, root, frame, art, artMat, artTex, geos = [], mats = [], focused = false, glow = 0;
    var size = props.size || 1.7, colHex = TYPE_COLOR[nft.type] || '#9fe9ff', col = parseInt(colHex.slice(1), 16);
    var comp = {
      type: 'piece',
      init: function (ctx) {
        THREE = ctx.THREE;
        root = new THREE.Group(); root.name = 'piece:' + nft.id;
        var fg = new THREE.BoxGeometry(size + 0.16, size + 0.16, 0.06); geos.push(fg);
        var fm = new THREE.MeshStandardMaterial({ color: props.frameColor != null ? props.frameColor : 0x1a1f2b, emissive: col, emissiveIntensity: 0.15, roughness: 0.5, metalness: 0.4 }); mats.push(fm);
        frame = new THREE.Mesh(fg, fm); frame.castShadow = true; root.add(frame);
        artTex = new THREE.CanvasTexture(artCanvas(nft)); if ('colorSpace' in artTex && THREE.SRGBColorSpace) artTex.colorSpace = THREE.SRGBColorSpace;
        var ag = new THREE.PlaneGeometry(size, size); geos.push(ag);
        artMat = new THREE.MeshBasicMaterial({ map: artTex }); mats.push(artMat);
        art = new THREE.Mesh(ag, artMat); art.position.z = 0.035; root.add(art);
        root.userData.dvPiece = nft; art.userData.dvPiece = nft; frame.userData.dvPiece = nft;
        var p = props.position; if (p) root.position.set(+p.x || 0, +p.y || 0, +p.z || 0);
        var r = props.rotation; if (r) root.rotation.set(+r.x || 0, +r.y || 0, +r.z || 0);
        var url = resolveImage(nft.image);
        if (url && THREE.TextureLoader) {
          try { new THREE.TextureLoader().load(url, function (t) { if (!artMat) { t.dispose(); return; } if ('colorSpace' in t && THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; artMat.map = t; artMat.needsUpdate = true; }, undefined, function () {}); } catch (e) {}
        }
        return root;
      },
      focus: function (v) { focused = !!v; },
      get focused() { return focused; },
      get nft() { return nft; },
      update: function (dt, t) {
        if (!frame) return;
        glow += ((focused ? 1 : 0) - glow) * Math.min(1, dt * 6);
        frame.material.emissiveIntensity = 0.15 + glow * 0.9 + (focused ? 0.15 * Math.sin(t * 4) : 0);
        var s = 1 + glow * 0.06; root.scale.set(s, s, s);
      },
      dispose: function () { for (var i = 0; i < geos.length; i++) geos[i].dispose(); for (var j = 0; j < mats.length; j++) { if (mats[j].map) mats[j].map.dispose(); mats[j].dispose(); } artMat = null; }
    };
    return comp;
  });
  global.DVPiece = pure;
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
