import fs from "fs";
import path from "path";
import { applyPatches, enablePatches, Patch } from "immer";
import { GameData } from "../types/game-data";
import { DEFAULT_SCENE } from "../lib/default-game-data";
import { resolveWorkingFolder } from "./working-folder-service";

enablePatches();

function getDataFilePath(workingFolder: string): string {
  return path.join(workingFolder, "data/static-scene.json");
}

export interface GameRevision {
  mtimeMs: number;
}

export class GameService {
  private static ensureGameDataFileSync(dataFile: string): void {
    if (fs.existsSync(dataFile)) {
      return;
    }

    const dir = path.dirname(dataFile);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const defaultData = {
      ...DEFAULT_SCENE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as GameData;

    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), "utf-8");
  }

  private static readGameDataSync(dataFile: string): GameData {
    const data = fs.readFileSync(dataFile, "utf-8");

    return JSON.parse(data);
  }

  private static getDataFile(): Promise<string> {
    return resolveWorkingFolder().then((workingFolder) => {
      const dataFile = getDataFilePath(workingFolder);

      this.ensureGameDataFileSync(dataFile);

      return dataFile;
    });
  }

  private static writeGameDataSync(dataFile: string, gameData: GameData): void {
    const dir = path.dirname(dataFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataFile, JSON.stringify(gameData, null, 2), "utf-8");
  }

  static async getGameData(): Promise<GameData> {
    const dataFile = await this.getDataFile();

    return this.readGameDataSync(dataFile);
  }

  static async getGameRevision(): Promise<GameRevision> {
    const dataFile = await this.getDataFile();
    const stat = fs.statSync(dataFile);

    return {
      mtimeMs: stat.mtimeMs,
    };
  }

  static async updateGame(opts: { id: string; patches: Patch[] }): Promise<{ success: boolean }> {
    const dataFile = await this.getDataFile();
    const gameData = this.readGameDataSync(dataFile);

    // Apply patches using Immer
    const patchedData = applyPatches(gameData, opts.patches);

    // Create new object with updated timestamp (applyPatches returns frozen object)
    const updatedGameData = {
      ...patchedData,
      updatedAt: Date.now(),
    };

    this.writeGameDataSync(dataFile, updatedGameData);

    return { success: true };
  }
}
