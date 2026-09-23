# Adding a 3D Model from library3D.json

`packages/studio/src/data/library-3d.json` is an array of pre-built 3D models with pre-optimized variants. Each entry has a `name`, `url`, and `d_optimized_files` (high/low/low_compressed). URLs are nested under the upload provider key (currently only `pinata` is supported).

## Add to static-scene.json

Look up the model in `library-3d.json`, then add a component to `public/data/static-scene.json`:

```json
{
  "my-building": {
    "id": "my-building",
    "name": "Building",
    "type": "model",
    "position": { "x": 0, "y": 0, "z": 0 },
    "url": "https://cyber.mypinata.cloud/ipfs/...",
    "optimized": {
      "high": "https://cyber.mypinata.cloud/ipfs/...",
      "low": "https://cyber.mypinata.cloud/ipfs/...",
      "low_compressed": "https://cyber.mypinata.cloud/ipfs/..."
    }
  }
}
```

Copy `url.pinata` → `url`, and map `d_optimized_files.high.pinata` → `optimized.high`, etc.
