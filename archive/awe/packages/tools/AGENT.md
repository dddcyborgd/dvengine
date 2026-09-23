# AGENT.md

This file provides guidance to AI coding assistants when working with code in this package.

## Package Overview

`@oncyberio/tools` is a Node.js library for optimizing 3D assets (GLTF/GLB, VRM) and textures. It provides compression, format conversion, and upload utilities for the oncyberio engine ecosystem.

## Commands

```bash
# From monorepo root
pnpm tools:check             # Typecheck

# From this package directory
pnpm check                   # Typecheck
```

## Architecture

### Entry Point

All public APIs are exported from `src/index.ts`. Import as:

```typescript
import {
  optimizeGLTF,
  processVRMBuffer,
  OptimizeService,
} from "@oncyberio/tools";
```

### Module Structure

| Directory  | Purpose                                                        |
| ---------- | -------------------------------------------------------------- |
| `gltf/`    | GLTF/GLB optimization with Draco, MeshOptimizer compression    |
| `vrm/`     | VRM avatar processing and glTF extensions                      |
| `texture/` | Texture compression (sharp), resizing, KTX2 conversion (toktx) |
| `upload/`  | IPFS/Pinata upload utilities                                   |
| `utils/`   | MIME type utilities                                            |

### Key Functions

- `optimizeGLTF(buffer, ids, options)` - Optimize GLTF with quality variants (high/low/compressed)
- `processVRMBuffer(buffer, filename)` - Process and compress VRM avatars
- `textureCompress(options)` - gltf-transform plugin for texture compression
- `textureResize(options)` - gltf-transform plugin for texture resizing
- `toktx(options)` - Convert textures to KTX2 format

### OptimizeService Class

Main orchestration class with static methods:

- `saveOptimizedAsset(buffer, filename, publicDir)` - Save buffer to public directory
- `optimizeAsset(asset, compressionOptions, { publicDir })` - Full GLTF optimization pipeline
- `optimizeVRM(buffer, filename, publicDir)` - Full VRM optimization pipeline
- `is3DAssetOptimized(asset, compressionOptions)` - Check if asset already optimized

All methods that read/write files require a `publicDir` parameter specifying the path to the public directory.

### Dependencies

Built on:

- `@gltf-transform/*` - glTF processing pipeline
- `sharp` - Image processing
- `draco3dgltf` - Mesh compression
- `meshoptimizer` - Mesh simplification
- `basisu` - KTX2 texture compression

## Code Conventions

**File naming**: Use kebab-case (`optimize-gltf.ts`, `vrm-processing.ts`)

**JSDoc**: All exported functions must have JSDoc with `@param`, `@returns`, and `@example`

**Error handling**: Throw descriptive errors, log progress with `console.log` for long operations

## Environment Variables

- `PINATA_JWT_KEY` - JWT key for IPFS uploads via Pinata
