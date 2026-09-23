# vendor/gltf-transform — glTF-Transform 3.2.0, brought home as zero-dependency ESM

**Upstream:** [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) 3.2.0 · MIT © 2020 Don McCurdy · docs [gltf-transform.dev](https://gltf-transform.dev)
**Via the fork:** [oncyberio/gltftransform](https://github.com/oncyberio/gltftransform) @ `1026a2f74e32e134a4a46df4f1cbe8e43872edcc` (master, MIT) — vendored source in `archive/gltftransform/` (`archive/SOURCES.json`, tarball sha256 `5a71a570…3af8618`).

Everything under `core/`, `extensions/` and `functions/` is **generated** from `archive/gltftransform/packages/*/src/**/*.ts` by `scripts/strip-types.mjs` — do not edit; regenerate. The externals and shims are copied once and kept.

## Exact commands

```bash
node scripts/strip-types.mjs            # regenerate core/ extensions/ functions/ (idempotent)
node scripts/strip-types.mjs --check    # CI gate: exit 1 if the tree would change
# externals were fetched ONCE (2026-09-22) and copied — no lockfile, no node_modules:
curl -sL -o pg.tgz  https://registry.npmjs.org/property-graph/-/property-graph-1.3.1.tgz   # sha256 a53d705489e6ae19d677ed3ae341a305e86a6a9f85fc1f71a449a68f9b412325
curl -sL -o glm.tgz https://registry.npmjs.org/gl-matrix/-/gl-matrix-3.4.3.tgz             # sha256 b1ec4d97dc97f9884f5f017b7f9c3555884b4d3191534cdc59b7ede27dc4ea75
tar xzf pg.tgz;  cp package/dist/property-graph.modern.js package/LICENSE vendor/gltf-transform/property-graph/
tar xzf glm.tgz; cp package/esm/{common,mat3,mat4,vec3,vec4,quat}.js package/LICENSE.md vendor/gltf-transform/gl-matrix/
```

## The type-stripping path (Node 24.20.0, no tsc)

`import { stripTypeScriptTypes } from 'node:module'` with `mode: 'transform'` (strip-only refuses the fork's
`enum`s, parameter properties and `declare` fields). Three things the built-in transpiler does not do, and
`strip-types.mjs` does:

1. **Link-time pruning.** swc leaves type-only names inside `import { … }` and `export { … } from` lists
   (it cannot see across files); native ESM refuses to link them (`does not provide an export named`).
   A fixed-point pass computes each module's *runtime* export set and prunes the lists (4 erasures).
2. **Namespace defaults.** `import quat, { getAngle } from 'gl-matrix/quat'` is a TS `esModuleInterop`
   default over a namespace-style module → rewritten to `import * as quat`.
3. **Build-time defines / ambient modules.** `` `v${PACKAGE_VERSION}` `` → `"v3.2.0"`; `core/types/gltf.ts`
   (`export declare module GLTF`, unsupported syntax) → an empty module.

## Layout

| path | what | provenance |
|---|---|---|
| `core/index.js` → `core/src/**` | Document · NodeIO/WebIO · properties · utils · constants | generated from `packages/core/src` |
| `extensions/index.js` → `extensions/src/**` | `KHRONOS_EXTENSIONS` (18) · `ALL_EXTENSIONS` (22) | generated from `packages/extensions/src` |
| `functions/index.js` → `functions/src/**` | **pure transforms only** (curated list in `scripts/strip-types.mjs`) | generated from `packages/functions/src` |
| `property-graph/` | `property-graph.modern.js` 1.3.1 (satisfies core's `^1.1.0`) · MIT © Don McCurdy | npm tarball, copied |
| `gl-matrix/` | `common mat3 mat4 vec3 vec4 quat` 3.4.3 ESM — the modules imported at top level · MIT © Brandon Jones, Colin MacKenzie IV | npm tarball, copied |
| `shims/ktx-parse.js` | from-the-spec KTX2 header/level/DFD reader for the two `readKTX` call sites (basisu, inspect) | authored (clean-room) |
| `shims/ndarray-pixels.js` | loadable stand-in; `getPixels/savePixels` throw `unavailable: needs ndarray-pixels` | authored |

## Gating (what is and is not reachable)

- `functions/index.js` re-exports 36 names: center, clearNodeParent, clearNodeTransform, dedup, dequantize, flatten,
  getNodeScene, inspect, instance, joinPrimitives, join, listNodeScenes, listTextureChannels, getTextureChannelMask,
  listTextureInfo, listTextureSlots, metalRough, normals, partition, prune, quantize, resample, sequence,
  sortPrimitiveWeights, sparse, transformMesh, transformPrimitive, unlit, unpartition, unweld, vertexColorSpace,
  weld, weldPrimitive, getGLPrimitiveCount, isTransformPending, createTransform.
- **wasm-gated** (`functions/src/draco.js`, `meshopt.js`, `reorder.js`, `simplify.js`) load fine but need codec modules
  registered (`io.registerDependencies`) — `transform/gates.mjs` turns them on only when `vendor/{draco,meshopt}/*.wasm` exist.
- **native-gated** (`texture-compress.js` → sharp, `texture-resize.js` → ndarray*, `tangents.js` → mikktspace) are emitted
  for reference but NOT re-exported; importing `texture-resize.js` fails on its bare `ndarray` import by design.
- `metalRough()` on a *textured* spec-gloss material reaches the ndarray-pixels shim and throws its `unavailable` message.

Licence: MIT throughout (upstream notices kept beside each copy). Node ≥ 24 for `stripTypeScriptTypes`; the emitted ESM itself runs on any modern Node.
