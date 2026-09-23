import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

interface GLTFJson {
  asset?: {
    version?: string;
    generator?: string;
    copyright?: string;
  };
  extensionsUsed?: string[];
  extensionsRequired?: string[];
}

interface AnimationInfo {
  name: string;
  duration: number;
  trackCount: number;
}

interface MeshInfo {
  name: string;
  type: "Mesh" | "SkinnedMesh";
  vertices: number;
  faces: number;
  material: string;
}

interface MaterialInfo {
  name: string;
  type: string;
  color?: string;
  roughness?: number;
  metalness?: number;
}

interface SkeletonInfo {
  boneCount: number;
  bones: string[];
}

export interface InspectionResult {
  file: { path: string; size: number; sizeFormatted: string };
  asset: { version: string; generator: string; copyright?: string };
  extensions: { used: string[]; required: string[] };
  animations: AnimationInfo[];
  meshes: MeshInfo[];
  materials: MaterialInfo[];
  skeleton: SkeletonInfo | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function colorToHex(color: { r: number; g: number; b: number }): string {
  const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
  const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
  const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

async function loadGLTF(filePath: string): Promise<any> {
  const { GLTFLoader } = require("@oncyberio/engine/internal/resources/loaders/gltf-loader");
  const { NodeDracoLoader } = require("@oncyberio/engine/internal/resources/loaders/node-draco-loader");

  const loader = new GLTFLoader();
  const dracoLoader = new NodeDracoLoader();
  loader.setDRACOLoader(dracoLoader);

  const buffer = fs.readFileSync(filePath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  return loader.parseAsync(arrayBuffer, "");
}

function extractAnimations(gltf: any): AnimationInfo[] {
  return gltf.animations.map((clip: any) => ({
    name: clip.name || "(unnamed)",
    duration: clip.duration,
    trackCount: clip.tracks.length,
  }));
}

function extractMeshes(scene: any): MeshInfo[] {
  const meshes: MeshInfo[] = [];
  scene.traverse((obj: any) => {
    if (obj.isMesh || obj.isSkinnedMesh) {
      const geometry = obj.geometry;
      const positionAttr = geometry.attributes.position;
      const vertices = positionAttr ? positionAttr.count : 0;
      const index = geometry.index;
      const faces = index ? index.count / 3 : vertices / 3;

      let materialName = "(none)";
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          materialName = obj.material.map((m: any) => m.name || "(unnamed)").join(", ");
        } else {
          materialName = obj.material.name || "(unnamed)";
        }
      }

      meshes.push({
        name: obj.name || "(unnamed)",
        type: obj.isSkinnedMesh ? "SkinnedMesh" : "Mesh",
        vertices,
        faces: Math.floor(faces),
        material: materialName,
      });
    }
  });
  return meshes;
}

function extractMaterials(scene: any): MaterialInfo[] {
  const materialsMap = new Map<string, MaterialInfo>();
  scene.traverse((obj: any) => {
    if (obj.isMesh && obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if (!materialsMap.has(mat.uuid)) {
          const info: MaterialInfo = { name: mat.name || "(unnamed)", type: mat.type };
          if (mat.color) info.color = colorToHex(mat.color);
          if (typeof mat.roughness === "number") info.roughness = mat.roughness;
          if (typeof mat.metalness === "number") info.metalness = mat.metalness;
          materialsMap.set(mat.uuid, info);
        }
      }
    }
  });
  return Array.from(materialsMap.values());
}

function extractSkeleton(scene: any): SkeletonInfo | null {
  const bones: string[] = [];
  scene.traverse((obj: any) => {
    if (obj.isBone) bones.push(obj.name || "(unnamed)");
  });
  if (bones.length === 0) return null;
  return { boneCount: bones.length, bones };
}

export async function inspectGltf(filePath: string): Promise<InspectionResult> {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  if (ext !== ".gltf" && ext !== ".glb") {
    throw new Error(`File must be .gltf or .glb (got ${ext})`);
  }

  const stats = fs.statSync(resolvedPath);
  const gltf = await loadGLTF(resolvedPath);
  const json: GLTFJson = gltf.parser.json;

  return {
    file: { path: filePath, size: stats.size, sizeFormatted: formatBytes(stats.size) },
    asset: {
      version: json.asset?.version || "2.0",
      generator: json.asset?.generator || "",
      copyright: json.asset?.copyright,
    },
    extensions: {
      used: json.extensionsUsed || [],
      required: json.extensionsRequired || [],
    },
    animations: extractAnimations(gltf),
    meshes: extractMeshes(gltf.scene),
    materials: extractMaterials(gltf.scene),
    skeleton: extractSkeleton(gltf.scene),
  };
}
