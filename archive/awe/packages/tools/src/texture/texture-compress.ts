import { BufferUtils, ImageUtils, TextureChannel } from "@gltf-transform/core";
import { EXTTextureAVIF, EXTTextureWebP } from "@gltf-transform/extensions";

const NAME = "textureCompress";
const FORMATS = ["jpeg", "png", "webp", "avif"];
const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

function createTransform(name, fn) {
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}

function listTextureSlots(texture) {
  const graph = texture.getGraph();
  const edges = graph.listParentEdges(texture);
  const slots = edges
    .filter((edge) => {
      const parent = edge.getParent();
      return parent && parent.propertyType !== "Root";
    })
    .map((edge) => edge.getName());
  return Array.from(new Set(slots));
}

function getTextureChannelMask(texture: any): number {
  let mask = 0;
  const slots = listTextureSlots(texture);
  
  for (const slot of slots) {
    if ((slot as string).includes("baseColor") || (slot as string).includes("diffuse")) {
      mask |= TextureChannel.R | TextureChannel.G | TextureChannel.B;
    }
    if ((slot as string).includes("alpha") || (slot as string).includes("opacity")) {
      mask |= TextureChannel.A;
    }
    if ((slot as string).includes("normal")) {
      mask |= TextureChannel.R | TextureChannel.G;
    }
    if ((slot as string).includes("metallic") || (slot as string).includes("roughness") || (slot as string).includes("occlusion")) {
      mask |= TextureChannel.R;
    }
  }
  
  return mask;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export const TEXTURE_COMPRESS_DEFAULTS = {
  resizeFilter: "lanczos3",
  pattern: null,
  formats: null,
  slots: null,
  quality: null,
  effort: null,
  lossless: false,
  nearLossless: false,
};

export default function textureCompress(_options) {
  const options = Object.assign({}, TEXTURE_COMPRESS_DEFAULTS, _options);
  const encoder = options.encoder;

  if (!encoder) {
    throw new Error(`encoder dependency required — install "sharp".`);
  }

  return createTransform(NAME, async (document) => {
    const logger = document.getLogger();
    const textures = document.getRoot().listTextures();

    await Promise.all(
      textures.map(async (texture, textureIndex) => {
        const options2 = Object.assign({}, TEXTURE_COMPRESS_DEFAULTS, _options);

        const slots = listTextureSlots(texture);
        const channels = getTextureChannelMask(texture);
        const textureLabel =
          texture.getURI() ||
          texture.getName() ||
          `${textureIndex + 1}/${document.getRoot().listTextures().length}`;
        const prefix = `${NAME}(${textureLabel})`;

        // FILTER: Exclude textures
        if (!SUPPORTED_MIME_TYPES.includes(texture.getMimeType())) {
          logger.debug(
            `${prefix}: Skipping, unsupported texture type "${texture.getMimeType()}".`
          );
          return;
        } else if (
          options.pattern &&
          !options.pattern.test(texture.getName()) &&
          !options.pattern.test(texture.getURI())
        ) {
          logger.debug(`${prefix}: Skipping, excluded by "pattern" parameter.`);
          return;
        } else if (
          options.formats &&
          !options.formats.test(texture.getMimeType())
        ) {
          logger.debug(
            `${prefix}: Skipping, "${texture.getMimeType()}" excluded by "formats" parameter.`
          );
          return;
        } else if (
          options.slots &&
          slots.length &&
          !slots.some((slot) => options.slots.test(slot))
        ) {
          options2.quality = 100;
        } else if (
          options2.targetFormat === "jpeg" &&
          channels & TextureChannel.A
        ) {
          logger.warn(
            `${prefix}: Skipping, [${slots.join(", ")}] requires alpha channel.`
          );
          return;
        }

        const srcFormat = getFormat(texture);
        const dstFormat = options.targetFormat || srcFormat;
        logger.debug(`${prefix}: Format = ${srcFormat} → ${dstFormat}`);
        logger.debug(`${prefix}: Slots = [${slots.join(", ")}]`);

        const srcImage = texture.getImage();
        const srcByteLength = srcImage.byteLength;

        await compressTexture(texture, options2);

        const dstImage = texture.getImage();
        const dstByteLength = dstImage.byteLength;
        const flag = srcImage === dstImage ? " (SKIPPED)" : "";

        logger.debug(
          `${prefix}: Size = ${formatBytes(srcByteLength)} → ${formatBytes(
            dstByteLength
          )}${flag}`
        );
      })
    );

    // Attach EXT_texture_webp if needed
    const webpExtension = document.createExtension(EXTTextureWebP);
    if (textures.some((texture) => texture.getMimeType() === "image/webp")) {
      webpExtension.setRequired(true);
    } else {
      webpExtension.dispose();
    }

    // Attach EXT_texture_avif if needed
    const avifExtension = document.createExtension(EXTTextureAVIF);
    if (textures.some((texture) => texture.getMimeType() === "image/avif")) {
      avifExtension.setRequired(true);
    } else {
      avifExtension.dispose();
    }

    logger.debug(`${NAME}: Complete.`);
  });
}

export async function compressTexture(texture, _options) {
  const options = Object.assign({}, TEXTURE_COMPRESS_DEFAULTS, _options);
  const encoder = options.encoder;

  if (!encoder) {
    throw new Error(`encoder dependency required — install "sharp".`);
  }

  const srcFormat = getFormat(texture);
  let dstFormat = options.targetFormat || srcFormat;
  const srcMimeType = texture.getMimeType();

  let encoderOptions = {};

  const srcImage = texture.getImage();
  const instance = encoder(srcImage);

  if (srcMimeType === "image/png" && dstFormat === "png") {
    const hasAlpha = (await instance.metadata()).hasAlpha;

    if (hasAlpha === false) {
      dstFormat = "jpeg";
    }
  }

  const dstMimeType = `image/${dstFormat}`;

  switch (dstFormat) {
    case "jpeg":
      encoderOptions = { quality: options.quality };
      break;
    case "png":
      encoderOptions = {
        quality: options.quality,
        effort: remap(options.effort, 100, 10),
      };
      break;
    case "webp":
      encoderOptions = {
        quality: options.quality,
        effort: remap(options.effort, 100, 6),
        lossless: options.lossless,
        nearLossless: options.nearLossless,
      };
      break;
    case "avif":
      encoderOptions = {
        quality: options.quality,
        effort: remap(options.effort, 100, 9),
        lossless: options.lossless,
      };
      break;
  }

  instance.toFormat(dstFormat, encoderOptions);

  // Resize
  if (options.resize) {
    instance.resize(options.resize[0], options.resize[1], {
      fit: "inside",
      kernel: options.resizeFilter,
      withoutEnlargement: true,
    });
  }

  const dstImage = BufferUtils.toView(await instance.toBuffer());

  const srcByteLength = srcImage.byteLength;
  const dstByteLength = dstImage.byteLength;

  if (srcMimeType === dstMimeType && dstByteLength >= srcByteLength) {
    return;
  } else if (srcMimeType === dstMimeType) {
    texture.setImage(dstImage);
  } else {
    const srcExtension = ImageUtils.mimeTypeToExtension(srcMimeType);
    const dstExtension = ImageUtils.mimeTypeToExtension(dstMimeType);
    const dstURI = texture
      .getURI()
      .replace(new RegExp(`\\.${srcExtension}$`), `.${dstExtension}`);
    texture.setImage(dstImage).setMimeType(dstMimeType).setURI(dstURI);
  }
}

function getFormat(texture) {
  const mimeType = texture.getMimeType();
  const format = mimeType.split("/").pop();
  if (!format || !FORMATS.includes(format)) {
    throw new Error(`Unknown MIME type "${mimeType}".`);
  }
  return format;
}

function remap(value, srcMax, dstMax) {
  if (value == null) return null;
  return Math.round((value / srcMax) * dstMax);
}
