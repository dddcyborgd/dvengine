import { readJsonFile, fileExists, resolveProjectPath, getScenePath } from "../file-utils";
import type { SceneData, SceneComponent } from "./types";

interface RawScene {
  id?: string;
  creatorId?: string;
  editors?: string[];
  components?: Record<string, SceneComponent>;
  items?: SceneComponent[];
  params?: Record<string, unknown>;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

export async function readScene(projectDir: string): Promise<SceneData> {
  const scenePath = getScenePath(projectDir);
  const raw = await readJsonFile<RawScene>(scenePath);

  let components: Record<string, SceneComponent>;

  if (raw.components && typeof raw.components === "object" && !Array.isArray(raw.components)) {
    components = raw.components;
  } else if (Array.isArray(raw.items)) {
    components = {};
    for (const item of raw.items) {
      if (item.id) {
        components[item.id] = item;
      }
    }
  } else {
    components = {};
  }

  return {
    id: raw.id,
    creatorId: raw.creatorId,
    editors: raw.editors,
    components,
    params: raw.params,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateScene(projectDir: string): Promise<ValidationResult> {
  const scene = await readScene(projectDir);
  const errors: string[] = [];
  const warnings: string[] = [];
  const components = scene.components;
  const ids = Object.keys(components);

  // Check unique IDs
  const idSet = new Set<string>();
  for (const id of ids) {
    if (idSet.has(id)) {
      errors.push(`Duplicate component ID: ${id}`);
    }
    idSet.add(id);
  }

  // Check parent references
  for (const comp of Object.values(components)) {
    if (comp.parentId && !components[comp.parentId]) {
      errors.push(`Component '${comp.name}' (${comp.id}) references non-existent parent '${comp.parentId}'`);
    }
  }

  // Check circular references
  for (const comp of Object.values(components)) {
    const visited = new Set<string>();
    let current: string | undefined = comp.id;
    while (current) {
      if (visited.has(current)) {
        errors.push(`Circular parent reference detected involving component '${comp.name}' (${comp.id})`);
        break;
      }
      visited.add(current);
      current = components[current]?.parentId;
    }
  }

  // Check model/avatar URLs
  for (const comp of Object.values(components)) {
    if (comp.type === "model" || comp.type === "avatar") {
      const url = (comp.data?.url as string) ?? (comp as Record<string, unknown>).url as string;
      if (url) {
        if (url.startsWith("/") || url.startsWith("./")) {
          const filePath = resolveProjectPath(projectDir, "public", url.startsWith("/") ? url.slice(1) : url);
          if (!(await fileExists(filePath))) {
            warnings.push(`Component '${comp.name}' (${comp.id}) references missing local file: ${url}`);
          }
        } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
          warnings.push(`Component '${comp.name}' (${comp.id}) has unusual URL format: ${url}`);
        }
      }
    }
  }

  // Check spawn points
  const spawnPoints = Object.values(components).filter((c) => c.type === "spawn");
  if (spawnPoints.length === 0) {
    warnings.push("No spawn point component found in scene");
  }

  // Check animation references
  const vrmAnims = Object.values(components).find((c) => c.type === "vrm-anims");
  if (vrmAnims) {
    const anims = (vrmAnims.anims ?? vrmAnims.data?.anims ?? {}) as Record<string, Record<string, unknown>>;
    for (const anim of Object.values(anims)) {
      const url = anim.url as string;
      if (url && url.startsWith("/")) {
        const filePath = resolveProjectPath(projectDir, "public", url.slice(1));
        if (!(await fileExists(filePath))) {
          warnings.push(`Animation '${anim.name}' references missing file: ${url}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
