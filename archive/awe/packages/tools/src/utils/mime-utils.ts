/**
 * File extension to MIME type mapping
 */
export const extToMime: Record<string, string> = {
  jpg: "image/jpg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg",
  gif: "image/gif",
  webp: "image/webp",
  mov: "video/quicktime",
  mp4: "video/mp4",
  avi: "video/avi",
  html: "text/html",
  htm: "text/html",
  json: "application/json",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4v: "video/x-m4v",
  vrm: "model/vrm",
};

/**
 * MIME type to file extension mapping
 */
export const mimetoExt: Record<string, string> = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg": "svg",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/quicktime": "mov",
  "video/mp4": "mp4",
  "video/avi": "avi",
  "text/html": "html",
  "application/json": "json",
  "model/gltf-binary": "glb",
  "model/gltf+json": "gltf",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "video/x-m4v": "m4v",
  "model/vrm": "vrm",
};

/**
 * List of supported MIME types for upload
 */
export const supportedMimes = [
  "image/jpg",
  "image/jpeg",
  "image/png",
  "image/svg",
  "image/svg+xml",
  "image/gif",
  "image/webp",
  "video/quicktime",
  "video/mp4",
  "video/avi",
  "text/html",
  "model/gltf-binary",
  "model/gltf+json",
  "audio/mpeg",
  "audio/wav",
  "video/x-m4v",
];

/**
 * Check if a MIME type is uploadable
 * 
 * @param mime - MIME type to check
 * @returns True if the MIME type is uploadable
 * 
 * @example
 * ```typescript
 * isUploadable('image/jpeg'); // true
 * isUploadable('text/plain'); // false
 * ```
 */
export function isUploadable(mime: string): boolean {
  if (!mime) return false;

  return (
    mime.includes("image") ||
    mime.includes("video") ||
    mime.includes("audio") ||
    mime.includes("model/gltf-binary") ||
    mime.includes("model/gltf+json")
  );
}

/**
 * Check if a MIME type should have a cover image
 * 
 * @param mime - MIME type to check
 * @returns True if the MIME type should have a cover
 * 
 * @example
 * ```typescript
 * withCover('audio/mpeg'); // true
 * withCover('image/jpeg'); // false
 * ```
 */
export function withCover(mime: string): boolean {
  return mime.startsWith("audio") || mime === "text/html";
}
