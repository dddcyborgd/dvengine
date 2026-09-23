# UPSTREAM — provenance per archive/ subtree

Everything under `archive/` is fetched by `scripts/fetch-upstream.mjs` at a pinned sha (`archive/SOURCES.json` carries sha · tarball sha256 · the path filter · the fetch time) and never edited. The port lanes below are local re-realizations of the catalogued designs — see `LIBRARY.md` for the per-file verdicts.

| archive subtree | repo · sha | license | ported to |
|---|---|---|---|
| `archive/awe/packages/engine/package.json` + component designs (catalogued) | oncyberio/awe `04a07c8d75c114d8ea217d0870eeef2c6a65635a` | MIT | `engine/index.js` (the register → create → init → update → dispose contract), `components/<type>/index.js` (37 ports), `legacy/awe-runtime/` (the reflection) |
| `archive/awe/packages/engine-edit` | oncyberio/awe | MIT | `edit/index.js` (index.ts + transformer/* + selection/*), `edit/snap.js` (controls/pivot-controls/snap-2d + snap-3d), `edit/pivot/*` (pivot-controls), `edit/grid.js`, `edit/capture.js`, `editors/` (src/editors → data schemas) |
| `archive/awe/packages/studio/src/{dApp,services,server,types}` | oncyberio/awe | MIT | `edit/commands.js` + `edit/history.js` (services/editor/commands, undo-manager), `studio/` (the panels, framework-free) |
| `archive/awe/packages/tools/src` + `AGENT.md` | oncyberio/awe | MIT | `transform/desk.mjs` (inspect-gltf · validate-scene · bake-animation · vrm/* · optimize-gltf), `transform/gates.mjs`, `transform/registry.json` |
| `archive/awe/examples/starter/public/data/static-scene.json` | oncyberio/awe | MIT | `legacy/static-scene.json` (verbatim), `engine/scene.js` `fromLegacy` |
| `archive/awe/examples/{multiplayer,auth-multiplayer}` | oncyberio/awe | MIT | `net/interp.js` (shared/snapshot-interpolation + transform-sync), `net/index.js` (the client shape; the protocol itself is cyborgd's `cyborg/1`) |
| `archive/awe/.claude/skills` | oncyberio/awe | MIT | the AI scene-editing skills — catalogued, informs `editors/README.md` and the studio's command surface |
| `archive/gltftransform/packages/{core,extensions,functions}/src` | oncyberio/gltftransform `1026a2f74e32e134a4a46df4f1cbe8e43872edcc` (fork of donmccurdy/glTF-Transform 3.2.0) | MIT | `vendor/gltf-transform/{core,extensions,functions,property-graph,gl-matrix,shims}` (types stripped by `scripts/strip-types.mjs`) |
| `archive/gltftransform/packages/cli/src/transforms` | oncyberio/gltftransform | MIT | catalogued by listing only — the wasm/native lanes stay off in the zero-dep desk |
| `archive/gltftransform/docs/{CONCEPTS,EXTENSIONS,CREDITS}.md` | oncyberio/gltftransform | MIT | `transform/README.md` |

DeltaVerse-native (no upstream): `engine/scene.js` (cyborg-space/1), `components/{substrate,portal,zone,piece,aivatar,thot-memory,participant,remote-participant}`, `net/{peer,host}.js`, `xr/`, `verse/`, `live/spaces/`, `studio/panels/wallet.js`. three.js r182 is shared from the consumer (`vendor/three/`, git-ignored) — © three.js authors, MIT.
