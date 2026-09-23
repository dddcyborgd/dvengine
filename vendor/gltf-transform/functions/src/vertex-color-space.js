import { createTransform } from './utils.js';
const NAME = 'vertexColorSpace';
export const colorspace = vertexColorSpace;
export function vertexColorSpace(options) {
    return createTransform(NAME, (doc)=>{
        const logger = doc.getLogger();
        const inputColorSpace = (options.inputColorSpace || options.inputEncoding || '').toLowerCase();
        if (inputColorSpace === 'srgb-linear') {
            logger.info(`${NAME}: Vertex colors already linear. Skipping conversion.`);
            return;
        }
        if (inputColorSpace !== 'srgb') {
            logger.error(`${NAME}: Unknown input color space "${inputColorSpace}" – should be "srgb" or ` + '"srgb-linear". Skipping conversion.');
            return;
        }
        const converted = new Set();
        function sRGBToLinear(c) {
            return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
        }
        function updatePrimitive(primitive) {
            const color = [
                0,
                0,
                0
            ];
            let attribute;
            for(let i = 0; attribute = primitive.getAttribute(`COLOR_${i}`); i++){
                if (converted.has(attribute)) continue;
                for(let j = 0; j < attribute.getCount(); j++){
                    attribute.getElement(j, color);
                    color[0] = sRGBToLinear(color[0]);
                    color[1] = sRGBToLinear(color[1]);
                    color[2] = sRGBToLinear(color[2]);
                    attribute.setElement(j, color);
                }
                converted.add(attribute);
            }
        }
        doc.getRoot().listMeshes().forEach((mesh)=>mesh.listPrimitives().forEach(updatePrimitive));
        logger.debug(`${NAME}: Complete.`);
    });
}
