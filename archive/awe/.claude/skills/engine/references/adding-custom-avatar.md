# Adding a Custom VRM Avatar

When the user provides a custom VRM file (not from `vrms.json`), use the `add-avatar` command. It replicates the full studio pipeline: upload, optimize, and register.

## Usage

```bash
pnpm add-avatar <path-to-file.vrm>
```

Returns JSON with everything needed for the scene component:
```json
{
  "url": "/assets/uploaded-assets-a1b2c3d4.vrm",
  "urlCompressed": "/assets/optimized/uploaded-assets-a1b2c3d4_compressed.glb",
  "name": "my-avatar.vrm"
}
```

## Add to static-scene.json

Use the returned `url` and `urlCompressed` fields directly:

```json
{
  "my-npc": {
    "id": "my-npc",
    "name": "NPC Guard",
    "type": "avatar",
    "url": "/assets/uploaded-assets-a1b2c3d4.vrm",
    "urlCompressed": "/assets/optimized/uploaded-assets-a1b2c3d4_compressed.glb",
    "animation": "IDLE",
    "opacity": 1,
    "position": { "x": 0, "y": 0, "z": 0 }
  }
}
```

The engine uses `urlCompressed` on platforms that support it, falling back to `url`.

## What it does under the hood

1. Hashes the file (SHA-256) and deduplicates against existing uploads
2. Copies to `public/assets/uploaded-assets-{hash}.vrm`
3. Registers in `public/data/uploaded_assets.json`
4. Optimizes VRM: textures resized to 256×256, material cleanup, VRM extensions preserved
5. Saves compressed version to `public/assets/optimized/`
6. Registers in `public/data/uploaded_avatars.json` with both URLs

## Options

- `--name=NAME` — override the avatar name

## VRM vs Model differences

| | Model (GLB) | Avatar (VRM) |
|---|---|---|
| Command | `pnpm add-model` | `pnpm add-avatar` |
| Scene type | `"model"` | `"avatar"` |
| Optimized field | `optimized: { high, low, low_compressed }` | `urlCompressed` (single file) |
| Optimization | 3 quality variants, Draco + mesh simplification | Single compressed, textures → 256×256 |
