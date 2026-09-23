import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileExists, resolveProjectPath } from "../file-utils";

const require = createRequire(import.meta.url);

export interface BakeResult {
  success: boolean;
  name: string;
  outputPath: string;
  hash: string;
  url: string;
  trackCount: number;
  loop: boolean;
  sync: boolean;
  timeScale: number;
}

export interface BakeAnimationOptions {
  fbxPath: string;
  projectDir: string;
  name?: string;
  loop?: boolean;
  sync?: boolean;
  timeScale?: number;
}

function normalizeMixamoRigName(name: string): string {
  const match = /^mixamorig\d+([A-Z].*)$/.exec(name);
  if (match) {
    return `mixamorig${match[1]}`;
  }
  return name;
}

function normalizeTrackName(trackName: string): string {
  const splitIndex = trackName.indexOf(".");
  if (splitIndex === -1) {
    return normalizeMixamoRigName(trackName);
  }
  const rigName = trackName.slice(0, splitIndex);
  const propertyName = trackName.slice(splitIndex + 1);
  return `${normalizeMixamoRigName(rigName)}.${propertyName}`;
}

function normalizeBakeTrackNames(bake: { tracks?: Array<{ name?: unknown }> }): void {
  if (!Array.isArray(bake.tracks)) return;
  for (const track of bake.tracks) {
    if (typeof track.name === "string") {
      track.name = normalizeTrackName(track.name);
    }
  }
}

function stableStringify(obj: any): string {
  if (typeof obj !== "object" || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

function computeHash(data: object): string {
  const { name, uuid, ...rest } = data as any;
  const str = stableStringify(rest);
  return crypto.createHash("sha256").update(str).digest("hex");
}

export async function bakeAnimation(opts: BakeAnimationOptions): Promise<BakeResult> {
  const { fbxPath, projectDir, loop = true, sync = false, timeScale = 1 } = opts;

  const relativePath = fbxPath.replace(/^\/+/, "");
  const resolvedFbx = resolveProjectPath(projectDir, "public", relativePath);
  if (!(await fileExists(resolvedFbx))) {
    throw new Error(`FBX file not found: ${fbxPath}. Path should be relative to public/ (e.g., assets/anims/zombie_attack.fbx)`);
  }

  // Sanitize animation name to snake_case
  const rawName = opts.name ? String(opts.name) : relativePath
    .replace(/^.*\//, "")
    .replace(/\.fbx$/i, "");
  const name = rawName
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase();

  const outputDir = resolveProjectPath(projectDir, "public", "assets", "anims");
  const outputPath = path.resolve(outputDir, `${name}.json`);

  // Import fbxToJSON from engine
  const { fbxToJSON } = require("@oncyberio/engine/space/components/vrmanims/fbxtojson/index.js");

  // Read FBX and convert
  const buffer = fs.readFileSync(resolvedFbx);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const bake = fbxToJSON(arrayBuffer);
  bake.name = name;
  normalizeBakeTrackNames(bake);

  if (!Array.isArray(bake.tracks) || bake.tracks.length === 0) {
    throw new Error(
      `Baked animation has 0 tracks for "${path.basename(resolvedFbx)}". ` +
      `This usually means the FBX rig names do not map to Mixamo bones ` +
      `(expected names like "mixamorigHips", but variants like "mixamorig7Hips" or other rigs may fail).`,
    );
  }

  const hash = computeHash(bake);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(bake, null, 2));

  return {
    success: true,
    name,
    outputPath,
    hash,
    url: `/assets/anims/${name}.json`,
    trackCount: bake.tracks.length,
    loop,
    sync,
    timeScale,
  };
}
