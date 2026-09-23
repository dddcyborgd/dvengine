import { KHRMeshQuantization } from '../../extensions/index.js';
import { createTransform } from './utils.js';
const NAME = 'dequantize';
const DEQUANTIZE_DEFAULTS = {
    pattern: /^((?!JOINTS_).)*$/
};
export function dequantize(_options = DEQUANTIZE_DEFAULTS) {
    const options = {
        ...DEQUANTIZE_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, (doc)=>{
        const logger = doc.getLogger();
        for (const mesh of doc.getRoot().listMeshes()){
            for (const prim of mesh.listPrimitives()){
                dequantizePrimitive(prim, options);
            }
        }
        doc.createExtension(KHRMeshQuantization).dispose();
        logger.debug(`${NAME}: Complete.`);
    });
}
function dequantizePrimitive(prim, options) {
    for (const semantic of prim.listSemantics()){
        dequantizeAttribute(semantic, prim.getAttribute(semantic), options);
    }
    for (const target of prim.listTargets()){
        for (const semantic of target.listSemantics()){
            dequantizeAttribute(semantic, target.getAttribute(semantic), options);
        }
    }
}
function dequantizeAttribute(semantic, attribute, options) {
    if (!attribute.getArray()) return;
    if (!options.pattern.test(semantic)) return;
    if (attribute.getComponentSize() >= 4) return;
    const srcArray = attribute.getArray();
    const dstArray = new Float32Array(srcArray.length);
    for(let i = 0, il = attribute.getCount(), el = []; i < il; i++){
        el = attribute.getElement(i, el);
        attribute.setArray(dstArray).setElement(i, el).setArray(srcArray);
    }
    attribute.setArray(dstArray).setNormalized(false);
}
