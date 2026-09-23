import { readFile, writeFile, rename, access, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tmpPath = join(dirname(filePath), `.tmp-${randomUUID()}.json`);
  await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await rename(tmpPath, filePath);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function resolveProjectPath(projectDir: string, ...segments: string[]): string {
  const resolved = resolve(projectDir, ...segments);
  const normalizedProject = resolve(projectDir);
  if (!resolved.startsWith(normalizedProject)) {
    throw new Error(`Path traversal detected: ${segments.join("/")} escapes project directory`);
  }
  return resolved;
}

export function getScenePath(projectDir: string): string {
  return resolveProjectPath(projectDir, "public", "data", "static-scene.json");
}

export function getUploadedAssetsPath(projectDir: string): string {
  return resolveProjectPath(projectDir, "public", "data", "uploaded_assets.json");
}

export function getUploadedAvatarsPath(projectDir: string): string {
  return resolveProjectPath(projectDir, "public", "data", "uploaded_avatars.json");
}
