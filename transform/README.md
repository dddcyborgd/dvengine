# transform/ — the Node asset desk

The oncyberio [awe `packages/tools`](https://github.com/oncyberio/awe/tree/main/packages/tools) asset pipeline
(optimize · inspect · validate · bake · vrm) re-homed as a **zero-npm-dependency Node 24 desk** over the vendored
[glTF-Transform](https://github.com/donmccurdy/glTF-Transform) fork ([vendor/gltf-transform/README.md](../vendor/gltf-transform/README.md)).
Upstream tools reach for draco3d, meshoptimizer, sharp and toktx; here every op is **gated** by what is actually
present on disk, and the pure JS ops are always on.

```bash
node transform/desk.mjs optimize model.glb --out=model.opt.glb --ops=dedup,prune,weld,quantize
node transform/desk.mjs inspect  model.glb --json
node transform/desk.mjs validate legacy/static-scene.json           # or any cyborg-space/1 space.json
node transform/desk.mjs bake     clips.glb --out=public/assets/anims  # glTF clips → awe anims JSON
node transform/desk.mjs vrm      avatar.vrm                          # → avatar_compressed.glb, VRMC_* kept
node transform/desk.mjs gates                                        # the table below
```

Every command takes `--json` (machine output, errors as `{error:true,message}` on exit 1).

## API (`transform/desk.mjs` is also a module)

| export | does |
|---|---|
| `optimize(in, {out, ops})` | `NodeIO` (KHRONOS_EXTENSIONS registered) → `document.transform(...ops)` → write; returns before/after vertices · bytes |
| `inspect(in)` | port of `inspect-gltf.ts`: file · asset · extensions · counts (scenes/nodes/meshes/primitives/vertices/triangles/materials/textures/animations/skins) · per-mesh/material/texture/animation rows · skeleton |
| `validate(in, {public})` | port of `validate-scene.ts` against `DVScene.validate` (via `createRequire('engine/scene.js')`) + unknown types vs `components/manifest.json` + circular parents + model/avatar/anim URL existence + spawn warning; legacy `static-scene.json` is converted with `DVScene.fromLegacy` first |
| `bake(in, {out, name})` | port of `bake-animation.ts`: glTF animation clips → `{name, duration, tracks:[{name:'<node>.<position|quaternion|scale>', type, times, values}], uuid}` JSON in the awe anims shape (mixamo rig names normalised, sha256 hash, `/assets/anims/<name>.json` url). `.fbx` → `unavailable: FBXLoader needs a DOM` |
| `vrm(in, {out})` | port of `vrm-processing.ts` (pure subset `metalRough → resample → dedup`); `VRMPassthrough(name)` extension classes keep `VRM`, `VRMC_vrm`, `VRMC_springBone`, `VRMC_materials_mtoon`, `VRMC_node_constraint` byte-for-byte (root, per-node, per-material), thumbnail refs nulled like upstream |
| `gates()` / `loadOp(name)` / `table(rows)` | `transform/gates.mjs` — the live verdict per op from `transform/registry.json` |

## Gate table (`node transform/desk.mjs gates`)

| op | portable | on | verdict |
|---|---|---|---|
| dedup · prune · weld · unweld · quantize · dequantize · center · flatten · join · joinPrimitives · instance · resample · sparse · unlit · normals · partition · unpartition · metalRough · vertexColorSpace · sequence · clearNodeParent · clearNodeTransform · sortPrimitiveWeights · listTextureSlots · listTextureChannels · listTextureInfo · inspect | pure | **on** | pure JS over vendor/gltf-transform |
| draco | wasm | off | unavailable: needs vendor/draco/draco_decoder.wasm + draco_encoder.wasm |
| meshopt · reorder · simplify | wasm | off | unavailable: needs vendor/meshopt/*.wasm |
| textureCompress | native | off | unavailable: needs sharp |
| textureResize | native | off | unavailable: needs ndarray + ndarray-pixels + ndarray-lanczos |
| tangents | native | off | unavailable: needs mikktspace |
| toktx · ktx | native | off | unavailable: needs ktx-software (catalogued, not ported) |

Drop the `.wasm` files into `vendor/draco/` / `vendor/meshopt/` and the wasm rows flip on (the hooks are in `gates.mjs`; the encoder/decoder still have to be registered with `io.registerDependencies`, which is the next step once a codec is vendored).

## Upstream mapping

| upstream | here |
|---|---|
| `packages/tools/src/gltf/optimize-gltf.ts` | `optimize()` — pure ops only; draco/meshopt/sharp variants gated |
| `packages/tools/src/inspect/inspect-gltf.ts` | `inspect()` — over glTF-Transform instead of three's GLTFLoader (no DOM, no draco) |
| `packages/tools/src/scene/validate-scene.ts` | `validate()` |
| `packages/tools/src/bake/bake-animation.ts` | `bake()` — glTF path; FBX path needs the browser |
| `packages/tools/src/vrm/{vrm-extensions,vrm-processing}.ts` | `VRMPassthrough`, `vrm()` |
| `packages/tools/src/texture/*` | catalogued only (`registry.json` native rows) |
| `packages/tools/src/cli.ts` | the CLI surface of `desk.mjs` |
| glTF-Transform `packages/{core,extensions,functions}` | `vendor/gltf-transform/` via `scripts/strip-types.mjs` |

Tests: `node --test test/desk.test.mjs` (programmatic duplicated-vertex glb → optimize drops 6→4 vertices and re-reads; inspect counts; bake; vrm pass-through; validate flags an unknown type; gates).
