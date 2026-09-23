# Adding a Custom 3D Model (GLB)

When the user provides a custom GLB file (not from the library), use the `add-model` command. It replicates the full studio pipeline: upload, optimize, and register.

## Usage

```bash
pnpm add-model <path-to-file.glb>
```

Returns JSON with everything needed for the scene component:
```json
{
  "url": "/assets/uploaded-assets-a1b2c3d4.glb",
  "optimized": {
    "high": "/assets/optimized/..._v0_high.glb",
    "low": "/assets/optimized/..._v0_low.glb",
    "low_compressed": "/assets/optimized/..._v0_low_compressed.glb"
  },
  "name": "my-model.glb",
  "mimeType": "model/gltf-binary"
}
```

## Add to static-scene.json

Use the returned `url` and `optimized` fields directly:

```json
{
  "my-custom-model": {
    "id": "my-custom-model",
    "name": "My Custom Model",
    "type": "model",
    "url": "/assets/uploaded-assets-a1b2c3d4.glb",
    "optimized": {
      "high": "/assets/optimized/..._v0_high.glb",
      "low": "/assets/optimized/..._v0_low.glb",
      "low_compressed": "/assets/optimized/..._v0_low_compressed.glb"
    },
    "position": { "x": 0, "y": 0, "z": 0 }
  }
}
```

The engine automatically picks the best variant at runtime based on device capabilities.

## What it does under the hood

1. Hashes the file (SHA-256) and deduplicates against existing uploads
2. Copies to `public/assets/uploaded-assets-{hash}.glb`
3. Registers in `public/data/uploaded_assets.json`
4. Generates 3 optimized variants (Draco, mesh simplification, texture resizing)
5. Updates `uploaded_assets.json` with optimized URLs

## Options

- `--name=NAME` — override the asset name
- `--no-draco` — disable Draco compression
- `--no-meshopt` — disable MeshOptimizer simplification
- `--no-weld` — disable vertex welding
