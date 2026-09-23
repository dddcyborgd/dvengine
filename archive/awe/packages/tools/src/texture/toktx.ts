import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import micromatch from "micromatch";
import os from "os";
import tmp from "tmp";
import pLimit from "p-limit";
import {
  FileUtils,
  ImageUtils,
  uuid,
} from "@gltf-transform/core";
import { KHRTextureBasisu } from "@gltf-transform/extensions";
import {
  createTransform,
  getTextureChannelMask,
  listTextureSlots,
} from "@gltf-transform/functions";
import { spawn as _spawn } from "child_process";

tmp.setGracefulCleanup();

// Lazily loaded to avoid SSR issues with native modules
let _basisu: typeof import("basisu") | null = null;

async function getBasisu() {
  if (!_basisu) {
    _basisu = await import("basisu").then((mod) => mod.default);
  }
  return _basisu;
}

const NUM_CPUS = os.cpus().length || 1;

export const Mode = {
  ETC1S: "etc1s",
  UASTC: "uastc",
};

export const Filter = {
  BOX: "box",
  TENT: "tent",
  BELL: "bell",
  BSPLINE: "b-spline",
  MITCHELL: "mitchell",
  LANCZOS3: "lanczos3",
  LANCZOS4: "lanczos4",
  LANCZOS6: "lanczos6",
  LANCZOS12: "lanczos12",
  BLACKMAN: "blackman",
  KAISER: "kaiser",
  GAUSSIAN: "gaussian",
  CATMULLROM: "catmullrom",
  QUADRATIC_INTERP: "quadratic_interp",
  QUADRATIC_APPROX: "quadratic_approx",
  QUADRATIC_MIX: "quadratic_mix",
};

const MICROMATCH_OPTIONS = { nocase: true, contains: true };

const GLOBAL_DEFAULTS = {
  filter: Filter.LANCZOS4,
  filterScale: 1,
  powerOfTwo: false,
  slots: "*",
  jobs: 2 * NUM_CPUS,
};

export const ETC1S_DEFAULTS = Object.assign(
  { quality: 128, compression: 1 },
  GLOBAL_DEFAULTS
);

export const UASTC_DEFAULTS = Object.assign(
  {
    level: 2,
    rdo: 0,
    rdoDictionarySize: 32768,
    rdoBlockScale: 10.0,
    rdoStdDev: 18.0,
    rdoMultithreading: true,
    zstd: 18,
  },
  GLOBAL_DEFAULTS
);

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

async function waitExit(process: any): Promise<[number, string, string]> {
  let stdout = "";
  if (process.stdout) {
    for await (const chunk of process.stdout) {
      stdout += chunk;
    }
  }

  let stderr = "";
  if (process.stderr) {
    for await (const chunk of process.stderr) {
      stderr += chunk;
    }
  }

  const status = await new Promise<number>((resolve) => {
    process.on("close", resolve);
  });

  return [status, stdout, stderr];
}

function spawn(command: string, args: string[]): any {
  return _spawn(command, args);
}

export const toktx = function (options: any) {
  options = Object.assign(
    {},
    options.mode === Mode.ETC1S ? ETC1S_DEFAULTS : UASTC_DEFAULTS,
    options
  );

  return createTransform(options.mode, async (doc: any) => {
    const logger = doc.getLogger();

    const batchPrefix = uuid();

    const batchDir = join(tmp.tmpdir, "gltf-transform");

    if (!existsSync(batchDir)) mkdirSync(batchDir);

    const basisuExtension = doc
      .createExtension(KHRTextureBasisu)
      .setRequired(true);

    let numCompressed = 0;

    const limit = pLimit(options.jobs);

    const textures = doc.getRoot().listTextures();

    const promises = textures.map((texture: any, textureIndex: number) =>
      limit(async () => {
        const slots = listTextureSlots(texture);

        const channels = getTextureChannelMask(texture);

        const textureLabel =
          texture.getURI() ||
          texture.getName() ||
          `${textureIndex + 1}/${doc.getRoot().listTextures().length}`;

        const prefix = `toktx:texture(${textureLabel})`;

        logger.debug(`${prefix}: Slots → [${slots.join(", ")}]`);

        // FILTER: Exclude textures
        if (texture.getMimeType() === "image/ktx2") {
          logger.debug(`${prefix}: Skipping, already KTX.`);
          return;
        } else if (
          texture.getMimeType() !== "image/png" &&
          texture.getMimeType() !== "image/jpeg"
        ) {
          logger.warn(
            `${prefix}: Skipping, unsupported texture type "${texture.getMimeType()}".`
          );
          return;
        } else if (
          options.slots !== "*" &&
          !slots.find((slot: string) =>
            micromatch.isMatch(slot, options.slots, MICROMATCH_OPTIONS)
          )
        ) {
          logger.debug(
            `${prefix}: Skipping, excluded by pattern "${options.slots}".`
          );
          return;
        }

        const image = texture.getImage();
        const size = texture.getSize();

        if (!image || !size) {
          logger.warn(`${prefix}: Skipping, unreadable texture.`);
          return;
        }

        const extension = texture.getURI()
          ? FileUtils.extension(texture.getURI())
          : ImageUtils.mimeTypeToExtension(texture.getMimeType());

        const inPath = join(
          batchDir,
          `${batchPrefix}_${textureIndex}.${extension}`
        );

        const outPath = join(batchDir, `${batchPrefix}_${textureIndex}.ktx2`);

        const inBytes = image.byteLength;

        await fs.writeFile(inPath, Buffer.from(image));

        const params = [
          "-ktx2",
          "-mipmap",
          "-file",
          inPath,
          "-output_path",
          batchDir + "/",
        ];

        logger.debug(`${prefix}: Spawning → basisu ${params.join(" ")}`);

        const basisu = await getBasisu();
        const [status, stdout, stderr] = await waitExit(
          spawn(basisu.path, params)
        );

        if (status !== 0) {
          logger.error(`${prefix}: Failed → \n\n${stderr.toString()}`);
        } else {
          texture
            .setImage(await fs.readFile(outPath))
            .setMimeType("image/ktx2");
          if (texture.getURI()) {
            texture.setURI(FileUtils.basename(texture.getURI()) + ".ktx2");
          }
          numCompressed++;
        }

        const outBytes = texture.getImage().byteLength;

        logger.debug(
          `${prefix}: ${formatBytes(inBytes)} → ${formatBytes(outBytes)} bytes`
        );
      })
    );

    await Promise.all(promises);

    if (numCompressed === 0) {
      logger.warn(
        "toktx: No textures were found, or none were selected for compression."
      );
    }

    const usesKTX2 = doc
      .getRoot()
      .listTextures()
      .some((t: any) => t.getMimeType() === "image/ktx2");

    if (!usesKTX2) {
      basisuExtension.dispose();
    }
  });
};
