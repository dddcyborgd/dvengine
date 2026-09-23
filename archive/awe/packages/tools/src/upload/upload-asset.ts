import { readFile, copyFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, basename, join } from "node:path";
import { readJsonFile, writeJsonFile, fileExists, resolveProjectPath, getUploadedAssetsPath } from "../file-utils";

const SUPPORTED_EXTENSIONS = new Set([
  ".glb", ".gltf", ".png", ".jpg", ".jpeg", ".webp",
  ".mp3", ".wav", ".mp4", ".webm", ".vrm",
]);

const MIME_MAP: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".vrm": "model/vrm",
};

export interface UploadedAsset {
  hash: string;
  url: string;
  name: string;
  mimeType: string;
  createdAt: number;
  [key: string]: unknown;
}

export interface UploadAssetOptions {
  sourcePath: string;
  projectDir: string;
  name?: string;
}

export async function uploadAsset(opts: UploadAssetOptions): Promise<UploadedAsset> {
  const { sourcePath, projectDir, name: customName } = opts;

  const resolvedSource = resolveProjectPath(projectDir, sourcePath);
  if (!(await fileExists(resolvedSource))) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const ext = extname(resolvedSource).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type: ${ext}. Supported: ${[...SUPPORTED_EXTENSIONS].join(", ")}`);
  }

  const content = await readFile(resolvedSource);
  const hash = createHash("sha256").update(content).digest("hex");
  const mimeType = MIME_MAP[ext] ?? "application/octet-stream";
  const name = customName ?? basename(resolvedSource);

  const assetsPath = getUploadedAssetsPath(projectDir);
  let assets: UploadedAsset[] = [];
  if (await fileExists(assetsPath)) {
    assets = await readJsonFile<UploadedAsset[]>(assetsPath);
  }

  const existing = assets.find((a) => a.hash === hash);
  if (existing) {
    return existing;
  }

  const destFileName = `uploaded-assets-${hash.slice(0, 8)}${ext}`;
  const destDir = resolveProjectPath(projectDir, "public", "assets");
  await mkdir(destDir, { recursive: true });
  const destPath = join(destDir, destFileName);
  await copyFile(resolvedSource, destPath);

  const entry: UploadedAsset = {
    hash,
    url: `/assets/${destFileName}`,
    name,
    mimeType,
    createdAt: Date.now(),
  };

  assets.push(entry);
  await writeJsonFile(assetsPath, assets);

  return entry;
}
