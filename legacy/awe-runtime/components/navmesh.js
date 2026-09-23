/*!
 * awe runtime component — navmesh
 * Mirrors awe NavmeshComponent (engine-src/space/components/navmesh): a baked walkable navigation
 * mesh + crowd. Clean-room debug realization: a ground plane subdivided into a wireframe grid of
 * walkable cells, with a colored polyline path overlay (a precomputed route across the grid) and a
 * little agent dot that walks the path. Props: { size, cells, color, pathColor, position }.
 * Upstream design © oncyberio — MIT.
 */
(function (global) {
  'use strict';
  if (!global.AweRuntime) throw new Error('navmesh.js: AweRuntime not loaded');

  global.AweRuntime.register('navmesh', function (props) {
    props = props || {};
    var root, geos = [], mats = [], path = [], agent, pathLen = 0, segLens = [];

    return {
      type: 'navmesh',
      init: function (ctx) {
        var THREE = ctx.THREE;
        root = new THREE.Group();
        root.name = 'navmesh';
        var pos = props.position || { x: 0, y: 0.02, z: 0 };
        root.position.set(pos.x, pos.y, pos.z);

        var size = props.size || 18;
        var cells = props.cells || 12;
        var color = props.color != null ? props.color : 0x3a86ff;

        // wireframe grid of walkable cells
        var pgeo = new THREE.PlaneGeometry(size, size, cells, cells);
        var pmat = new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: 0.4 });
        geos.push(pgeo); mats.push(pmat);
        var grid = new THREE.Mesh(pgeo, pmat);
        grid.rotation.x = -Math.PI / 2;
        root.add(grid);

        // translucent walkable fill
        var fgeo = new THREE.PlaneGeometry(size, size);
        var fmat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
        geos.push(fgeo); mats.push(fmat);
        var fill = new THREE.Mesh(fgeo, fmat);
        fill.rotation.x = -Math.PI / 2;
        root.add(fill);

        // precomputed zig-zag path across the grid (A*-lite route)
        var h = size / 2;
        var route = [
          [-h * 0.8, -h * 0.8], [-h * 0.3, -h * 0.4], [h * 0.2, -h * 0.5],
          [h * 0.4, 0], [0, h * 0.3], [-h * 0.4, h * 0.5], [h * 0.6, h * 0.8],
        ];
        var pts = [];
        for (var i = 0; i < route.length; i++) {
          var p = new THREE.Vector3(route[i][0], 0.05, route[i][1]);
          pts.push(p); path.push(p);
        }
        for (var j = 0; j < path.length - 1; j++) {
          var l = path[j].distanceTo(path[j + 1]); segLens.push(l); pathLen += l;
        }
        var lgeo = new THREE.BufferGeometry().setFromPoints(pts);
        var lmat = new THREE.LineBasicMaterial({ color: props.pathColor != null ? props.pathColor : 0xff006e });
        geos.push(lgeo); mats.push(lmat);
        root.add(new THREE.Line(lgeo, lmat));

        // agent dot walking the path
        var ageo = new THREE.SphereGeometry(0.25, 16, 12);
        var amat = new THREE.MeshStandardMaterial({ color: 0xffbe0b, emissive: 0x4a3200, roughness: 0.4 });
        geos.push(ageo); mats.push(amat);
        agent = new THREE.Mesh(ageo, amat);
        agent.position.copy(path[0]);
        root.add(agent);

        return root;
      },
      update: function (dt, t) {
        if (!agent || path.length < 2 || pathLen <= 0) return;
        // 0..1 along the path, ping-pong
        var u = (t * 0.08) % 2; if (u > 1) u = 2 - u;
        var dist = u * pathLen, acc = 0;
        for (var i = 0; i < segLens.length; i++) {
          if (acc + segLens[i] >= dist) {
            var f = (dist - acc) / segLens[i];
            agent.position.lerpVectors(path[i], path[i + 1], f);
            agent.position.y = 0.25;
            return;
          }
          acc += segLens[i];
        }
      },
      dispose: function () {
        for (var i = 0; i < geos.length; i++) { geos[i].dispose(); mats[i].dispose(); }
        root = null; path = []; segLens = [];
      },
    };
  });
})(typeof window !== 'undefined' ? window : this);
