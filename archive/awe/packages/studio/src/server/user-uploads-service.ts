import fs from "fs";
import path from "path";
import { UserAssetUpload } from "../types/user-upload";
import { OptimizedFiles } from "../types/optimized-files";
import { getMimeType } from "../utils/mime-utils";
import { resolveWorkingFolder } from "./working-folder-service";

function getDataFilePath(workingFolder: string): string {
  return path.join(workingFolder, "data/uploaded_assets.json");
}

export interface SetUploadOpts {
  hash: string;
  url: string;
  name: string;
  mimeType: string;
  d_optimized_files?: OptimizedFiles | null;
  createdAt?: number;
  lastModified?: number;
}

export interface CheckResult {
  url: string;
  mimeType: string | null;
  d_optimized_files: OptimizedFiles | null;
  exists: boolean;
}

export class UserUploadsService {
  private static readAssetsSync(dataFile: string): UserAssetUpload[] {
    try {
      if (!fs.existsSync(dataFile)) {
        // Ensure directory exists
        const dir = path.dirname(dataFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(dataFile, "[]", "utf-8");
        return [];
      }
      const data = fs.readFileSync(dataFile, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private static writeAssetsSync(dataFile: string, assets: UserAssetUpload[]): void {
    const dir = path.dirname(dataFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataFile, JSON.stringify(assets, null, 2), "utf-8");
  }

  /**
   * Get all uploaded assets
   */
  static async getUploadedAssets(): Promise<UserAssetUpload[]> {
    const workingFolder = await resolveWorkingFolder();
    const dataFile = getDataFilePath(workingFolder);
    const assets = this.readAssetsSync(dataFile);

    return assets
      .map((asset) => {
        // Ensure required fields have defaults
        if (!asset.createdAt) {
          asset.createdAt = 0;
        }
        if (!asset.lastModified) {
          asset.lastModified = 0;
        }
        if (!asset.mimeType) {
          asset.mimeType = getMimeType(asset.url);
        }
        return asset;
      })
      .filter((asset) => asset.mimeType);
  }

  /**
   * Get a single asset by its hash
   */
  static async getAssetByHash(hash: string): Promise<UserAssetUpload | null> {
    const workingFolder = await resolveWorkingFolder();
    const dataFile = getDataFilePath(workingFolder);
    const assets = this.readAssetsSync(dataFile);
    return assets.find((a) => a.hash === hash) || null;
  }

  /**
   * Add or update an uploaded asset
   */
  static async setUploadedAsset(opts: SetUploadOpts): Promise<{ success: boolean }> {
    try {
      const workingFolder = await resolveWorkingFolder();
      const dataFile = getDataFilePath(workingFolder);
      const assets = this.readAssetsSync(dataFile);
      const serverTime = Date.now();

      const existingIndex = assets.findIndex((a) => a.hash === opts.hash);

      const newAsset: UserAssetUpload = {
        hash: opts.hash,
        url: opts.url,
        name: opts.name,
        mimeType: opts.mimeType,
        d_optimized_files: opts.d_optimized_files || undefined,
        createdAt: opts.createdAt ?? serverTime,
        lastModified: opts.lastModified ?? serverTime,
      };

      if (existingIndex >= 0) {
        // Update existing asset, preserve createdAt
        newAsset.createdAt = assets[existingIndex].createdAt;
        assets[existingIndex] = newAsset;
      } else {
        assets.push(newAsset);
      }

      this.writeAssetsSync(dataFile, assets);
      return { success: true };
    } catch (err) {
      console.error("Error saving upload:", err);
      return { success: false };
    }
  }

  /**
   * Check if an asset with the given hash exists
   * Returns url and optimized files if found
   */
  static async checkUploadedAsset(hash: string): Promise<CheckResult | null> {
    const workingFolder = await resolveWorkingFolder();
    const dataFile = getDataFilePath(workingFolder);
    const assets = this.readAssetsSync(dataFile);
    const asset = assets.find((a) => a.hash === hash);

    if (!asset) {
      return null;
    }

    const mimeType = asset.mimeType ?? getMimeType(asset.url);

    return {
      url: asset.url,
      mimeType,
      d_optimized_files: asset.d_optimized_files ?? null,
      exists: true,
    };
  }

  /**
   * Update an existing upload's metadata
   */
  static async updateUpload(
    hash: string,
    data: Partial<Omit<UserAssetUpload, "hash">>
  ): Promise<boolean> {
    const workingFolder = await resolveWorkingFolder();
    const dataFile = getDataFilePath(workingFolder);
    const assets = this.readAssetsSync(dataFile);
    const index = assets.findIndex((a) => a.hash === hash);

    if (index === -1) {
      throw new Error("Unknown upload: " + hash);
    }

    const serverTime = Date.now();

    assets[index] = {
      ...assets[index],
      ...data,
      lastModified: serverTime,
    };

    this.writeAssetsSync(dataFile, assets);
    return true;
  }

  /**
   * Delete multiple uploads by their hashes
   * Also removes the physical asset files from disk
   */
  static async deleteUploads(hashes: string[]): Promise<void> {
    const workingFolder = await resolveWorkingFolder();
    const dataFile = getDataFilePath(workingFolder);
    const assets = this.readAssetsSync(dataFile);

    // Find assets to delete and remove their physical files
    const assetsToDelete = assets.filter((a) => hashes.includes(a.hash));
    for (const asset of assetsToDelete) {
      this.deleteAssetFiles(workingFolder, asset);
    }

    // Update the JSON file
    const filtered = assets.filter((a) => !hashes.includes(a.hash));
    this.writeAssetsSync(dataFile, filtered);
  }

  /**
   * Delete physical files for an asset (main file + optimized variants)
   */
  private static deleteAssetFiles(workingFolder: string, asset: UserAssetUpload): void {
    // Delete main asset file
    if (asset.url) {
      const mainFilePath = path.join(workingFolder, asset.url);
      this.safeDeleteFile(mainFilePath);
    }

    // Delete optimized files if they exist
    if (asset.d_optimized_files) {
      const optimized = asset.d_optimized_files;
      for (const key of Object.keys(optimized) as (keyof OptimizedFiles)[]) {
        const url = optimized[key];
        if (url) {
          const filePath = path.join(workingFolder, url);
          this.safeDeleteFile(filePath);
        }
      }
    }
  }

  /**
   * Safely delete a file, ignoring errors if file doesn't exist
   */
  private static safeDeleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[UserUploadsService] Deleted: ${filePath}`);
      }
    } catch (err) {
      console.warn(`[UserUploadsService] Failed to delete ${filePath}:`, err);
    }
  }

  /**
   * Update optimized file URLs for an asset
   */
  static async setOptimizedFiles(hash: string, files: OptimizedFiles): Promise<boolean> {
    const workingFolder = await resolveWorkingFolder();
    const dataFile = getDataFilePath(workingFolder);
    const assets = this.readAssetsSync(dataFile);
    const index = assets.findIndex((a) => a.hash === hash);

    if (index === -1) {
      return false;
    }

    assets[index].d_optimized_files = files;
    this.writeAssetsSync(dataFile, assets);
    return true;
  }
}
