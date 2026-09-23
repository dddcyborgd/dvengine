import { NodeIO } from "@gltf-transform/core";
// import { toktx } from "../texture/toktx"; // Disabled: cpu-features native module build issue on macOS ARM64
import {
  KHRONOS_EXTENSIONS,
  EXTTextureWebP,
  EXTMeshGPUInstancing,
} from "@gltf-transform/extensions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import {
  prune,
  dedup,
  simplify,
  metalRough,
  draco,
  weld,
  instance,
  dequantize,
  join,
  palette,
} from "@gltf-transform/functions";
import textureCompress from "../texture/texture-compress";
import { textureResize } from "../texture/texture-resize";
import draco3d from "draco3dgltf";

/**
 * Compression options for GLTF optimization
 */
export interface CompressionOptions {
  /** Apply vertex welding to remove duplicate vertices (default: true) */
  useWeld?: boolean;
  /** Apply Draco mesh compression (default: true) */
  useDraco?: boolean;
  /** Apply MeshOptimizer simplification (default: true) */
  useMeshOpt?: boolean;
}

/**
 * Result of GLTF optimization containing buffer and filename
 */
export interface OptimizedVariant {
  /** Optimized buffer */
  buffer: Uint8Array;
  /** Output filename */
  name: string;
}

/**
 * Optimizes a GLTF/GLB file with multiple quality variants.
 * 
 * Applies the following transformations:
 * - Material optimization (metallic-roughness workflow)
 * - Palette optimization for textures
 * - Mesh deduplication and pruning
 * - Vertex welding (optional)
 * - MeshOptimizer simplification (optional)
 * - Draco mesh compression (optional)
 * - Texture compression with quality variants
 * 
 * @param data - The raw GLTF/GLB buffer
 * @param ids - Output filenames for each variant (high, low, lowCompressed)
 * @param compressionOptions - Compression settings
 * @returns Object containing buffers and filenames for each quality variant
 * 
 * @example
 * ```typescript
 * const result = await optimizeGLTF(buffer, {
 *   high: 'model_high.glb',
 *   low: 'model_low.glb',
 *   lowCompressed: 'model_low_ktx.glb'
 * });
 * 
 * // Access variants
 * const highQuality = result.high.buffer;
 * const lowQuality = result.low.buffer;
 * const compressed = result.lowCompressed.buffer;
 * ```
 */
export async function optimizeGLTF(
  data: ArrayBuffer,
  ids: { high: string; low: string; lowCompressed: string },
  compressionOptions: CompressionOptions = {
    useWeld: true,
    useDraco: true,
    useMeshOpt: true,
  }
): Promise<{
  high: OptimizedVariant;
  low: OptimizedVariant;
  lowCompressed: OptimizedVariant;
}> {
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerExtensions([EXTTextureWebP, EXTMeshGPUInstancing]);

  io.registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
    "draco3d.encoder": await draco3d.createEncoderModule(),
  });

  const uint8 = new Uint8Array(data);
  const originalDocument = await io.readBinary(uint8);

  await originalDocument.transform(
    metalRough(),
    palette({ min: 5 }),
    dequantize(),
    join(),
    instance(),
    prune(),
    dedup()
  );

  if (compressionOptions.useWeld === true) {
    await originalDocument.transform(weld({ tolerance: 0.0001 }));
  }

  if (compressionOptions.useMeshOpt === true) {
    await originalDocument.transform(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: 0.0,
        error: 0.001,
        lockBorder: true,
      })
    );
  }

  if (compressionOptions.useDraco === true) {
    await originalDocument.transform(draco());
  }

  const highDocument = originalDocument.clone();

  // high buffer
  await highDocument.transform(
    textureCompress({
      encoder: sharp,
      quality: 90,
      resize: [2048, 2048],
      slots: /^(?!normalTexture).*$/,
    })
  );

  const highBuffer = await io.writeBinary(highDocument);

  const resultHigh = {
    buffer: highBuffer,
    name: ids.high,
  };

  // low buffer
  const lowDocument = highDocument.clone();

  await lowDocument.transform(
    textureCompress({
      encoder: sharp,
      quality: 80,
      resize: [1024, 1024],
      slots: /^(?!normalTexture).*$/,
    })
  );

  const lowBuffer = await io.writeBinary(lowDocument);

  const resultlow = {
    buffer: lowBuffer,
    name: ids.low,
  };

  // low compressed
  // TODO: Re-enable KTX2 compression once cpu-features native module issue is resolved
  const lowCompressedDocument = lowDocument.clone();

  await lowCompressedDocument.transform(
    textureResize({ size: [1024, 1024], square: true } as any)
    // toktx disabled due to cpu-features native module build issue on macOS ARM64
    // toktx({
    //   mode: "etc1s",
    //   powerOfTwo: true,
    // })
  );

  const lowCompressedBuffer = await io.writeBinary(lowCompressedDocument);

  const resultlowCompressed = {
    buffer: lowCompressedBuffer,
    name: ids.lowCompressed,
  };

  return {
    high: resultHigh,
    low: resultlow,
    lowCompressed: resultlowCompressed,
  };
}
