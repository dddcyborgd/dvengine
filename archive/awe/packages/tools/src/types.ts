/**
 * Optimized file variants for 3D assets
 */
export interface OptimizedFiles {
  /** High quality variant URL */
  high: string;
  /** Low quality variant URL */
  low: string;
  /** Low quality compressed variant URL (with KTX2 textures) */
  low_compressed: string;
}

/**
 * Asset metadata for optimization
 */
export interface OOAsset {
  /** Asset unique identifier */
  id?: string;
  /** Asset type */
  type: "audio" | "image" | "video" | "model";
  /** Asset URL */
  url: string;
  /** MIME type */
  mime_type: string;
  /** Optimized file variants */
  optimized?: OptimizedFiles;
  /** Optimized IPFS file variants */
  optimized_ipfs?: OptimizedFiles;
  /** Content hash */
  hash?: string;
}
