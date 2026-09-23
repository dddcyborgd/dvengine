/*!
 * awe runtime component — terrain
 * Mirrors awe TerrainComponent (engine-src/space/components/terrain): a procedural heightfield
 * ground. A PlaneGeometry whose vertices are displaced by layered sine "value noise" in JS, with
 * per-vertex colors blended by height (low=valley, high=peak). Props: { size, segments, height }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('terrain.js: AweRuntime not loaded');

  global.AweRuntime.register('terrain', function (props) {
    props = props || {};
    var mesh, geo, mat;

    // layered, deterministic pseudo-noise from summed sines (clean-room, no deps)
    function heightAt(x, z, amp) {
      var h = 0;
      h += Math.sin(x * 0.30 + 1.3) * Math.cos(z * 0.28 - 0.7) * 1.0;
      h += Math.sin(x * 0.62 - 2.1) * Math.cos(z * 0.55 + 1.9) * 0.5;
      h += Math.sin(x * 1.31 + 0.4) * Math.cos(z * 1.18 - 1.2) * 0.22;
      return h * amp;
    }

    return {
      type: 'terrain',
      init: function (ctx) {
        var THREE = ctx.THREE;
        var size = props.size || 40;
        var seg = props.segments || 96;
        var amp = props.height != null ? props.height : 3.0;

        geo = new THREE.PlaneGeometry(size, size, seg, seg);
        var pos = geo.attributes.position;
        var colors = new Float32Array(pos.count * 3);
        var low = new THREE.Color(props.low != null ? props.low : 0x214027);
        var mid = new THREE.Color(props.mid != null ? props.mid : 0x6b7b3a);
        var high = new THREE.Color(props.high != null ? props.high : 0xe8e4d6);
        var c = new THREE.Color();

        for (var i = 0; i < pos.count; i++) {
          var x = pos.getX(i), y = pos.getY(i);   // plane is in XY before rotation
          var h = heightAt(x, y, amp);
          pos.setZ(i, h);
          var m = (h / amp) * 0.5 + 0.5;           // 0..1
          if (m < 0.5) c.copy(low).lerp(mid, m * 2);
          else c.copy(mid).lerp(high, (m - 0.5) * 2);
          colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        }
        pos.needsUpdate = true;
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        mat = new THREE.MeshStandardMaterial({
          vertexColors: true, roughness: 0.95, metalness: 0.0, flatShading: !!props.flat,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'terrain';
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        var p = props.position || { x: 0, y: 0, z: 0 };
        mesh.position.set(p.x, p.y, p.z);
        return mesh;
      },
      update: function (dt, t) { /* static heightfield */ },
      dispose: function () { if (geo) geo.dispose(); if (mat) mat.dispose(); },
    };
  });
})(typeof window !== 'undefined' ? window : this);
