import { BufferUtils, Document, ImageUtils, Texture, TextureChannel } from '../../core/index.js';
import { EXTTextureAVIF, EXTTextureWebP } from '../../extensions/index.js';
import { getTextureChannelMask } from './list-texture-channels.js';
import { listTextureSlots } from './list-texture-slots.js';
import { createTransform, formatBytes } from './utils.js';
import { TextureResizeFilter } from './texture-resize.js';
const NAME = 'textureCompress';
const FORMATS = [
    'jpeg',
    'png',
    'webp',
    'avif'
];
const SUPPORTED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
];
export const TEXTURE_COMPRESS_DEFAULTS = {
    resizeFilter: TextureResizeFilter.LANCZOS3,
    pattern: null,
    formats: null,
    slots: null,
    quality: null,
    effort: null,
    lossless: false,
    nearLossless: false
};
export const textureCompress = function(_options) {
    const options = {
        ...TEXTURE_COMPRESS_DEFAULTS,
        ..._options
    };
    const encoder = options.encoder;
    const targetFormat = options.targetFormat;
    const patternRe = options.pattern;
    const formatsRe = options.formats;
    const slotsRe = options.slots;
    if (!encoder) {
        throw new Error(`${targetFormat}: encoder dependency required — install "sharp".`);
    }
    return createTransform(NAME, async (document)=>{
        const logger = document.getLogger();
        const textures = document.getRoot().listTextures();
        await Promise.all(textures.map(async (texture, textureIndex)=>{
            const slots = listTextureSlots(texture);
            const channels = getTextureChannelMask(texture);
            const textureLabel = texture.getURI() || texture.getName() || `${textureIndex + 1}/${document.getRoot().listTextures().length}`;
            const prefix = `${NAME}(${textureLabel})`;
            if (!SUPPORTED_MIME_TYPES.includes(texture.getMimeType())) {
                logger.debug(`${prefix}: Skipping, unsupported texture type "${texture.getMimeType()}".`);
                return;
            } else if (patternRe && !patternRe.test(texture.getName()) && !patternRe.test(texture.getURI())) {
                logger.debug(`${prefix}: Skipping, excluded by "pattern" parameter.`);
                return;
            } else if (formatsRe && !formatsRe.test(texture.getMimeType())) {
                logger.debug(`${prefix}: Skipping, "${texture.getMimeType()}" excluded by "formats" parameter.`);
                return;
            } else if (slotsRe && slots.length && !slots.some((slot)=>slotsRe.test(slot))) {
                logger.debug(`${prefix}: Skipping, [${slots.join(', ')}] excluded by "slots" parameter.`);
                return;
            } else if (options.targetFormat === 'jpeg' && channels & TextureChannel.A) {
                logger.warn(`${prefix}: Skipping, [${slots.join(', ')}] requires alpha channel.`);
                return;
            }
            const srcFormat = getFormat(texture);
            const dstFormat = targetFormat || srcFormat;
            logger.debug(`${prefix}: Format = ${srcFormat} → ${dstFormat}`);
            logger.debug(`${prefix}: Slots = [${slots.join(', ')}]`);
            const srcImage = texture.getImage();
            const srcByteLength = srcImage.byteLength;
            await compressTexture(texture, options);
            const dstImage = texture.getImage();
            const dstByteLength = dstImage.byteLength;
            const flag = srcImage === dstImage ? ' (SKIPPED' : '';
            logger.debug(`${prefix}: Size = ${formatBytes(srcByteLength)} → ${formatBytes(dstByteLength)}${flag}`);
        }));
        const webpExtension = document.createExtension(EXTTextureWebP);
        if (textures.some((texture)=>texture.getMimeType() === 'image/webp')) {
            webpExtension.setRequired(true);
        } else {
            webpExtension.dispose();
        }
        const avifExtension = document.createExtension(EXTTextureAVIF);
        if (textures.some((texture)=>texture.getMimeType() === 'image/avif')) {
            avifExtension.setRequired(true);
        } else {
            avifExtension.dispose();
        }
        logger.debug(`${NAME}: Complete.`);
    });
};
export async function compressTexture(texture, _options) {
    const options = {
        ...TEXTURE_COMPRESS_DEFAULTS,
        ..._options
    };
    const encoder = options.encoder;
    if (!encoder) {
        throw new Error(`${options.targetFormat}: encoder dependency required — install "sharp".`);
    }
    const srcFormat = getFormat(texture);
    const dstFormat = options.targetFormat || srcFormat;
    const srcMimeType = texture.getMimeType();
    const dstMimeType = `image/${dstFormat}`;
    let encoderOptions = {};
    switch(dstFormat){
        case 'jpeg':
            encoderOptions = {
                quality: options.quality
            };
            break;
        case 'png':
            encoderOptions = {
                quality: options.quality,
                effort: remap(options.effort, 100, 10)
            };
            break;
        case 'webp':
            encoderOptions = {
                quality: options.quality,
                effort: remap(options.effort, 100, 6),
                lossless: options.lossless,
                nearLossless: options.nearLossless
            };
            break;
        case 'avif':
            encoderOptions = {
                quality: options.quality,
                effort: remap(options.effort, 100, 9),
                lossless: options.lossless
            };
            break;
    }
    const srcImage = texture.getImage();
    const instance = encoder(srcImage).toFormat(dstFormat, encoderOptions);
    if (options.resize) {
        instance.resize(options.resize[0], options.resize[1], {
            fit: 'inside',
            kernel: options.resizeFilter,
            withoutEnlargement: true
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
        const dstURI = texture.getURI().replace(new RegExp(`\\.${srcExtension}$`), `.${dstExtension}`);
        texture.setImage(dstImage).setMimeType(dstMimeType).setURI(dstURI);
    }
}
function getFormat(texture) {
    const mimeType = texture.getMimeType();
    const format = mimeType.split('/').pop();
    if (!format || !FORMATS.includes(format)) {
        throw new Error(`Unknown MIME type "${mimeType}".`);
    }
    return format;
}
function remap(value, srcMax, dstMax) {
    if (value == null) return null;
    return Math.round(value / srcMax * dstMax);
}
