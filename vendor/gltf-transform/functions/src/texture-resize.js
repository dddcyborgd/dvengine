import ndarray from 'ndarray';
import { lanczos2, lanczos3 } from 'ndarray-lanczos';
import { getPixels, savePixels } from '../../shims/ndarray-pixels.js';
import { listTextureSlots } from './list-texture-slots.js';
import { createTransform } from './utils.js';
const NAME = 'textureResize';
export var TextureResizeFilter = /*#__PURE__*/ function(TextureResizeFilter) {
    TextureResizeFilter["LANCZOS3"] = "lanczos3";
    TextureResizeFilter["LANCZOS2"] = "lanczos2";
    return TextureResizeFilter;
}({});
export const TEXTURE_RESIZE_DEFAULTS = {
    size: [
        2048,
        2048
    ],
    filter: "lanczos3",
    pattern: null,
    slots: null
};
export function textureResize(_options = TEXTURE_RESIZE_DEFAULTS) {
    const options = {
        ...TEXTURE_RESIZE_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, async (doc)=>{
        const logger = doc.getLogger();
        for (const texture of doc.getRoot().listTextures()){
            const name = texture.getName();
            const uri = texture.getURI();
            const match = !options.pattern || options.pattern.test(name) || options.pattern.test(uri);
            if (!match) {
                logger.debug(`${NAME}: Skipping, excluded by "pattern" parameter.`);
                continue;
            }
            if (texture.getMimeType() !== 'image/png' && texture.getMimeType() !== 'image/jpeg') {
                logger.warn(`${NAME}: Skipping, unsupported texture type "${texture.getMimeType()}".`);
                continue;
            }
            const slots = listTextureSlots(texture);
            if (options.slots && !slots.some((slot)=>options.slots?.test(slot))) {
                logger.debug(`${NAME}: Skipping, [${slots.join(', ')}] excluded by "slots" parameter.`);
                continue;
            }
            const [maxWidth, maxHeight] = options.size;
            const [srcWidth, srcHeight] = texture.getSize();
            if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
                logger.debug(`${NAME}: Skipping, not within size range.`);
                continue;
            }
            let dstWidth = srcWidth;
            let dstHeight = srcHeight;
            if (dstWidth > maxWidth) {
                dstHeight = Math.floor(dstHeight * (maxWidth / dstWidth));
                dstWidth = maxWidth;
            }
            if (dstHeight > maxHeight) {
                dstWidth = Math.floor(dstWidth * (maxHeight / dstHeight));
                dstHeight = maxHeight;
            }
            const srcImage = texture.getImage();
            const srcPixels = await getPixels(srcImage, texture.getMimeType());
            const dstPixels = ndarray(new Uint8Array(dstWidth * dstHeight * 4), [
                dstWidth,
                dstHeight,
                4
            ]);
            logger.debug(`${NAME}: Resizing "${uri || name}", ${srcPixels.shape} → ${dstPixels.shape}...`);
            logger.debug(`${NAME}: Slots → [${slots.join(', ')}]`);
            try {
                options.filter === "lanczos3" ? lanczos3(srcPixels, dstPixels) : lanczos2(srcPixels, dstPixels);
            } catch (e) {
                if (e instanceof Error) {
                    logger.warn(`${NAME}: Failed to resize "${uri || name}": "${e.message}".`);
                    continue;
                }
                throw e;
            }
            texture.setImage(await savePixels(dstPixels, texture.getMimeType()));
        }
        logger.debug(`${NAME}: Complete.`);
    });
}
