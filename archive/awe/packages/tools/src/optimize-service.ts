import path from "path";
import { writeFile, mkdir, readFile, stat } from "fs/promises";
import { optimizeGLTF } from "./gltf/optimize-gltf";
import { processVRMBuffer } from "./vrm/vrm-processing";
import { OOAsset, OptimizedFiles } from "./types";

const VERSION = "v0";

/**
 * Read file with size limit check
 * 
 * @param url - File URL path
 * @param limit - Size limit in bytes
 * @param publicDir - Path to the public directory
 * @returns ArrayBuffer or null if exceeds limit
 * @throws Error if file exceeds size limit
 * 
 * @internal
 */
async function arrayBufferWithLimit(
  url: string,
  limit: number,
  publicDir: string
): Promise<ArrayBuffer | null> {

  // Convert URL to file path
  const filePath = path.join(publicDir, url);

  // Get file stats to check content length
  const fileStats = await stat(filePath);
  const fileSize = fileStats.size;

  if (fileSize > limit) {
    throw new Error("Upload size limit exceeded (content-length)");
  }

  // Read file directly
  const buffer = await readFile(filePath);
  // Convert Buffer to ArrayBuffer
  return new Uint8Array(buffer).buffer;
}

/**
 * Get file content and compute SHA-256 hash
 * 
 * @param url - File URL path
 * @param limit - Size limit in bytes
 * @param publicDir - Path to the public directory
 * @returns Object containing buffer and hash
 * 
 * @internal
 */
async function getContent(
  url: string,
  limit: number,
  publicDir: string
): Promise<{ buffer: ArrayBuffer; hash: string } | null> {
  const buffer = await arrayBufferWithLimit(url, limit, publicDir);

  if (!buffer) return null;

  const hash = await crypto.subtle.digest("SHA-256", buffer);

  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return { buffer, hash: hashHex };
}

/**
 * Get upload size limit for asset type
 * 
 * @param type - Asset type
 * @returns Size limit in bytes
 * 
 * @internal
 */
function getUploadSizeLimit(type: string): number {
  const LIMITS: Record<string, number> = {
    image: 10 * 1024 * 1024,
    video: 30 * 1024 * 1024,
    audio: 30 * 1024 * 1024,
    model: 30 * 1024 * 1024,
  };

  if (type in LIMITS) {
    return LIMITS[type];
  }

  return LIMITS.image;
}

/**
 * Result of asset optimization
 */
export interface OptimizeAssetResult {
  /** Content hash of the original asset */
  hash: string;
  /** URL to the raw (unoptimized) asset */
  raw: string;
  /** URLs to optimized variants */
  optimized: OptimizedFiles;
  /** Property ID for storing optimization metadata */
  propertyId: string;
}

/**
 * Service for optimizing 3D assets and VRM avatars.
 * 
 * Provides methods for:
 * - Saving optimized assets to disk
 * - Optimizing GLTF/GLB files with multiple quality variants
 * - Optimizing VRM avatar files
 * - Checking if assets are already optimized
 * 
 * @example
 * ```typescript
 * // Optimize a 3D asset
 * const result = await OptimizeService.optimizeAsset(asset, {
 *   useWeld: true,
 *   useDraco: true,
 *   useMeshOpt: true
 * });
 * 
 * // Optimize a VRM avatar
 * const vrmUrl = await OptimizeService.optimizeVRM(buffer, 'avatar.vrm');
 * ```
 */
export class OptimizeService {
  /**
   * Save an optimized asset buffer to the public/assets/optimized/ directory.
   * 
   * @param buffer - The asset buffer to save
   * @param filename - The filename to use
   * @param publicDir - Path to the public directory
   * @returns The URL path to access the saved file
   * 
   * @example
   * ```typescript
   * const url = await OptimizeService.saveOptimizedAsset(
   *   buffer, 
   *   'model_high.glb',
   *   '/path/to/public'
   * );
   * // Returns: '/assets/optimized/model_high.glb'
   * ```
   */
  static async saveOptimizedAsset(
    buffer: ArrayBuffer | Uint8Array,
    filename: string,
    publicDir: string
  ): Promise<string> {
    const assetsDir = path.join(publicDir, "assets", "optimized");
    await mkdir(assetsDir, { recursive: true });

    const filePath = path.join(assetsDir, filename);
    
    // Convert to Buffer if needed
    const bufferToWrite = Buffer.isBuffer(buffer)
      ? buffer
      : buffer instanceof ArrayBuffer
      ? Buffer.from(buffer)
      : Buffer.from(buffer.buffer);

    await writeFile(filePath, bufferToWrite);

    return `/assets/optimized/${filename}`;
  }

  /**
   * Get compression options ID for filename generation.
   * 
   * @param compressionOptions - Compression settings
   * @returns ID string representing disabled options
   * 
   * @internal
   */
  private static getCompressionOptionsId(compressionOptions: {
    useWeld?: boolean;
    useDraco?: boolean;
    useMeshOpt?: boolean;
  }): string {
    let id = "";

    if (!compressionOptions.useWeld) {
      id += "nweld";
    }

    if (!compressionOptions.useDraco) {
      if (id.length > 0) {
        id += "_";
      }
      id += "ndraco";
    }

    if (!compressionOptions.useMeshOpt) {
      if (id.length > 0) {
        id += "_";
      }
      id += "nmeshopt";
    }

    return id;
  }

  /**
   * Get property ID for the optimized asset.
   * 
   * @param compressionOptions - Compression settings
   * @returns Property ID for storing optimization metadata
   * 
   * @internal
   */
  private static getPropertyId(compressionOptions: any): string {
    const id = this.getCompressionOptionsId(compressionOptions);

    if (id) {
      return `optimized-${id}`;
    }

    return "optimized";
  }

  /**
   * Check if a 3D asset is already optimized.
   * 
   * @param asset - Asset to check
   * @param compressionOptions - Compression settings used
   * @returns True if the asset has optimization metadata
   * 
   * @example
   * ```typescript
   * if (!OptimizeService.is3DAssetOptimized(asset, options)) {
   *   await OptimizeService.optimizeAsset(asset, options);
   * }
   * ```
   */
  static is3DAssetOptimized(asset: OOAsset, compressionOptions: any): boolean {
    const id = this.getPropertyId(compressionOptions);
    return (asset as any)[id] != null;
  }

  /**
   * Optimize a 3D asset (GLB/GLTF).
   * 
   * Downloads the asset, optimizes it with multiple quality variants, and saves them locally.
   * Generates three variants:
   * - High quality (2048x2048 textures, 90% quality)
   * - Low quality (1024x1024 textures, 80% quality)
   * - Low compressed (1024x1024 KTX2 textures)
   * 
   * @param asset - Asset to optimize
   * @param compressionOptions - Compression settings
   * @param options - Additional options including publicDir
   * @returns Optimization result with URLs and metadata
   * 
   * @throws Error if asset exceeds size limit
   * 
   * @example
   * ```typescript
   * const result = await OptimizeService.optimizeAsset(asset, {
   *   useWeld: true,
   *   useDraco: true,
   *   useMeshOpt: true
   * }, { publicDir: '/path/to/public' });
   * 
   * console.log('High quality:', result.optimized.high);
   * console.log('Low quality:', result.optimized.low);
   * console.log('Compressed:', result.optimized.low_compressed);
   * ```
   */
  static async optimizeAsset(
    asset: OOAsset,
    compressionOptions: {
      useWeld?: boolean;
      useDraco?: boolean;
      useMeshOpt?: boolean;
    },
    options: { publicDir: string }
  ): Promise<OptimizeAssetResult> {
    const { publicDir } = options;
    const url = asset.url;

    const content = await getContent(url, getUploadSizeLimit(asset.type), publicDir);

    if (content == null) {
      throw new Error("Exceeded upload size limit");
    }

    console.log("optimize3DAsset/Hash computed", {
      url,
      hash: content.hash,
    });

    const { hash, buffer } = content;

    const compressionOptionsId = this.getCompressionOptionsId(compressionOptions);

    const baseId =
      hash + "_" + VERSION + (compressionOptionsId ? `_${compressionOptionsId}` : "");

    const rawId = `${baseId}.glb`;

    const ids = {
      high: `${baseId}_high.glb`,
      low: `${baseId}_low.glb`,
      lowCompressed: `${baseId}_low_compressed.glb`,
    };

    console.log("optimize3DAsset/optimizing", {
      assetId: asset.id,
    });

    const { high, low, lowCompressed } = await optimizeGLTF(
      buffer,
      ids,
      compressionOptions
    );

    // Save all variants locally
    const urls = await Promise.all([
      this.saveOptimizedAsset(buffer, rawId, publicDir),
      this.saveOptimizedAsset(new Uint8Array(high.buffer), high.name, publicDir),
      this.saveOptimizedAsset(new Uint8Array(low.buffer), low.name, publicDir),
      this.saveOptimizedAsset(new Uint8Array(lowCompressed.buffer), lowCompressed.name, publicDir),
    ]);

    console.log("optimize3DAsset/asset optimized", {
      assetId: asset.id,
      urls,
    });

    const optimized = {
      high: urls[1],
      low: urls[2],
      low_compressed: urls[3],
    } as OptimizedFiles;

    return {
      hash,
      raw: urls[0],
      optimized,
      propertyId: this.getPropertyId(compressionOptions),
    };
  }

  /**
   * Optimize a VRM avatar file.
   * 
   * Processes the VRM with:
   * - Texture compression to 256x256
   * - KTX2 format conversion
   * - Material optimization
   * 
   * @param buffer - VRM file buffer
   * @param filename - Original filename
   * @param publicDir - Path to the public directory
   * @returns URL to the optimized VRM
   * 
   * @example
   * ```typescript
   * const vrmBuffer = await fs.readFile('avatar.vrm');
   * const url = await OptimizeService.optimizeVRM(vrmBuffer, 'avatar.vrm', '/path/to/public');
   * console.log('Optimized VRM saved at:', url);
   * ```
   */
  static async optimizeVRM(
    buffer: Buffer,
    filename: string,
    publicDir: string
  ): Promise<string> {
    console.log("optimizeVRM/processing", { filename });

    // Process VRM
    const optimizedVrm = await processVRMBuffer(buffer, filename);

    // Save to local public folder
    const savedUrl = await this.saveOptimizedAsset(
      optimizedVrm.buffer,
      optimizedVrm.filename,
      publicDir
    );

    console.log("optimizeVRM/complete", { savedUrl });

    return savedUrl;
  }
}
