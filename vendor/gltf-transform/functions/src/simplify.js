import { Accessor, Document, Primitive, PropertyType } from '../../core/index.js';
import { createTransform, formatDeltaOp, deepListAttributes, remapAttribute, deepSwapAttribute, isTransformPending } from './utils.js';
import { weld } from './weld.js';
import { dedup } from './dedup.js';
const NAME = 'simplify';
export const SIMPLIFY_DEFAULTS = {
    ratio: 0.0,
    error: 0.0001,
    lockBorder: false
};
export const simplify = (_options)=>{
    const options = {
        ...SIMPLIFY_DEFAULTS,
        ..._options
    };
    const simplifier = options.simplifier;
    if (!simplifier) {
        throw new Error(`${NAME}: simplifier dependency required — install "meshoptimizer".`);
    }
    return createTransform(NAME, async (document, context)=>{
        const logger = document.getLogger();
        await simplifier.ready;
        await document.transform(weld({
            overwrite: false
        }));
        for (const mesh of document.getRoot().listMeshes()){
            for (const prim of mesh.listPrimitives()){
                if (prim.getMode() !== Primitive.Mode.TRIANGLES) {
                    logger.warn(`${NAME}: Skipping primitive of mesh "${mesh.getName()}": Requires TRIANGLES draw mode.`);
                    continue;
                }
                simplifyPrimitive(document, prim, options);
            }
        }
        if (!isTransformPending(context, NAME, 'dedup')) {
            await document.transform(dedup({
                propertyTypes: [
                    PropertyType.ACCESSOR
                ]
            }));
        }
        logger.debug(`${NAME}: Complete.`);
    });
};
export function simplifyPrimitive(document, prim, _options) {
    const options = {
        ...SIMPLIFY_DEFAULTS,
        ..._options
    };
    const simplifier = options.simplifier;
    const logger = document.getLogger();
    const position = prim.getAttribute('POSITION');
    const srcIndices = prim.getIndices();
    const srcVertexCount = position.getCount();
    let positionArray = position.getArray();
    let indicesArray = srcIndices.getArray();
    if (position.getComponentType() !== Accessor.ComponentType.FLOAT) {
        if (position.getNormalized()) {
            const src = positionArray;
            const dst = new Float32Array(src.length);
            for(let i = 0, il = position.getCount(), el = []; i < il; i++){
                el = position.getElement(i, el);
                position.setArray(dst).setElement(i, el).setArray(src);
            }
            positionArray = dst;
        } else {
            positionArray = new Float32Array(positionArray);
        }
    }
    if (srcIndices.getComponentType() !== Accessor.ComponentType.UNSIGNED_INT) {
        indicesArray = new Uint32Array(indicesArray);
    }
    const targetCount = Math.floor(options.ratio * srcVertexCount / 3) * 3;
    const [dstIndicesArray, error] = simplifier.simplify(indicesArray, positionArray, 3, targetCount, options.error, options.lockBorder ? [
        'LockBorder'
    ] : []);
    const [remap, unique] = simplifier.compactMesh(dstIndicesArray);
    logger.debug(`${NAME}: ${formatDeltaOp(position.getCount(), unique)} vertices, error: ${error.toFixed(4)}.`);
    for (const srcAttribute of deepListAttributes(prim)){
        const dstAttribute = srcAttribute.clone();
        remapAttribute(dstAttribute, remap, unique);
        deepSwapAttribute(prim, srcAttribute, dstAttribute);
        if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
    }
    const dstIndices = srcIndices.clone();
    dstIndices.setArray(srcVertexCount <= 65534 ? new Uint16Array(dstIndicesArray) : dstIndicesArray);
    prim.setIndices(dstIndices);
    if (srcIndices.listParents().length === 1) srcIndices.dispose();
    return prim;
}
