import fs, { type FSWatcher } from "fs";
import path from "path";
import { GameService, type GameRevision } from "./game-service";
import { resolveWorkingFolder } from "./working-folder-service";

type SceneChangeListener = (revision: GameRevision) => void;

interface SceneWatchState {
  dataDir: string | null;
  dataFileName: string | null;
  initPromise: Promise<void> | null;
  lastRevision: number | null;
  listeners: Set<SceneChangeListener>;
  notifyTimeout: ReturnType<typeof setTimeout> | null;
  watcher: FSWatcher | null;
}

const sceneWatchStateKey = "__awe_scene_watch_state__";

function getSceneWatchState(): SceneWatchState {
  const globalState = globalThis as typeof globalThis & {
    [sceneWatchStateKey]?: SceneWatchState;
  };

  globalState[sceneWatchStateKey] ??= {
    dataDir: null,
    dataFileName: null,
    initPromise: null,
    lastRevision: null,
    listeners: new Set(),
    notifyTimeout: null,
    watcher: null,
  };

  return globalState[sceneWatchStateKey];
}

async function loadSceneWatchConfig() {
  const workingFolder = await resolveWorkingFolder();
  const dataFile = path.join(workingFolder, "data/static-scene.json");

  return {
    dataDir: path.dirname(dataFile),
    dataFileName: path.basename(dataFile),
  };
}

async function broadcastSceneRevision() {
  const state = getSceneWatchState();
  const revision = await GameService.getGameRevision();

  if (revision.mtimeMs === state.lastRevision) {
    return;
  }

  state.lastRevision = revision.mtimeMs;

  state.listeners.forEach((listener) => {
    listener(revision);
  });
}

function scheduleSceneRevisionBroadcast() {
  const state = getSceneWatchState();

  if (state.notifyTimeout) {
    clearTimeout(state.notifyTimeout);
  }

  state.notifyTimeout = setTimeout(() => {
    state.notifyTimeout = null;

    broadcastSceneRevision().catch((error) => {
      console.error("Failed to broadcast static-scene.json changes", error);
    });
  }, 25);
}

async function ensureSceneWatcher() {
  const state = getSceneWatchState();

  if (state.watcher) {
    return;
  }

  if (state.initPromise) {
    await state.initPromise;
    return;
  }

  state.initPromise = (async () => {
    const { dataDir, dataFileName } = await loadSceneWatchConfig();

    state.dataDir = dataDir;
    state.dataFileName = dataFileName;

    state.watcher = fs.watch(dataDir, (_eventType, filename) => {
      const changedFile = filename?.toString();

      if (changedFile && changedFile !== state.dataFileName) {
        return;
      }

      scheduleSceneRevisionBroadcast();
    });

    state.watcher.on("error", (error) => {
      console.error("static-scene.json watcher failed", error);
    });

    await broadcastSceneRevision();
  })();

  try {
    await state.initPromise;
  } finally {
    state.initPromise = null;
  }
}

export async function getCurrentSceneRevision() {
  await ensureSceneWatcher();
  return GameService.getGameRevision();
}

export async function subscribeToSceneChanges(listener: SceneChangeListener) {
  await ensureSceneWatcher();

  const state = getSceneWatchState();
  state.listeners.add(listener);

  return () => {
    state.listeners.delete(listener);
  };
}
