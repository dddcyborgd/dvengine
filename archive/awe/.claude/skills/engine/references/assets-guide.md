# Assets Guide

Asset sources, storage locations, and workflows for adding assets to the scene.

## Asset Sources

There are two kinds of assets: **official** (pre-built, hosted remotely) and **custom** (user-provided, stored locally).

### Official assets

Pre-built assets shipped with the engine. Read-only catalogs — browse them to find assets to add to the scene.

- **3D Models** — `packages/studio/src/data/library-3d.json` — GLB models with pre-optimized variants (high/low/low_compressed). See [adding-model-from-library.md](adding-model-from-library.md)
- **VRM Avatars** — `packages/studio/src/data/vrms.json` — VRM characters with compressed versions. See [adding-avatar-from-library.md](adding-avatar-from-library.md)

### Custom assets

User-provided files processed via CLI tools. Stored locally in `public/assets/` with metadata in `public/data/`.

- **3D Models** (`.glb`, `.gltf`) — uploaded, optimized, registered. See [adding-custom-model.md](adding-custom-model.md)
- **VRM Avatars** (`.vrm`) — uploaded, optimized, registered. See [adding-custom-avatar.md](adding-custom-avatar.md)
- **VRM Animations** (`.fbx`) — baked from Mixamo FBX to JSON. See [adding-custom-vrm-anim.md](adding-custom-vrm-anim.md)
- **Images, Audio, Video** (`.png`, `.jpg`, `.mp3`, `.wav`, `.mp4`, `.webm`) — uploaded, registered. See [adding-custom-media.md](adding-custom-media.md)

### Storage locations

| Content               | Path                               |
| --------------------- | ---------------------------------- |
| 3D model library      | `packages/studio/src/data/library-3d.json` |
| Avatar library        | `packages/studio/src/data/vrms.json`       |
| Custom asset metadata | `public/data/uploaded_assets.json` |
| Custom avatar metadata| `public/data/uploaded_avatars.json` |
| Custom asset files    | `public/assets/`                   |
| Optimized assets      | `public/assets/optimized/`         |
| Baked animations      | `public/assets/anims/`             |
| Scene definition      | `public/data/static-scene.json`    |

## Automatic URL Selection

The engine automatically selects the best asset URL based on device capabilities. Include all URL variants when adding assets to the scene.

- **Models:** `url` + `optimized.high` / `optimized.low` / `optimized.low_compressed` (GPU-tier based)
- **Avatars:** `url` + `urlCompressed` (platform-based)
