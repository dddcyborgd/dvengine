import { createTransform, formatDeltaOp } from './utils.js';
const NAME = 'unweld';
const UNWELD_DEFAULTS = {};
export function unweld(_options = UNWELD_DEFAULTS) {
    const options = {
        ...UNWELD_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, (doc)=>{
        const logger = doc.getLogger();
        const visited = new Map();
        for (const mesh of doc.getRoot().listMeshes()){
            for (const prim of mesh.listPrimitives()){
                const indices = prim.getIndices();
                if (!indices) continue;
                const srcVertexCount = prim.getAttribute('POSITION').getCount();
                for (const srcAttribute of prim.listAttributes()){
                    prim.swap(srcAttribute, unweldAttribute(srcAttribute, indices, logger, visited));
                    if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
                }
                for (const target of prim.listTargets()){
                    for (const srcAttribute of target.listAttributes()){
                        target.swap(srcAttribute, unweldAttribute(srcAttribute, indices, logger, visited));
                        if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
                    }
                }
                const dstVertexCount = prim.getAttribute('POSITION').getCount();
                logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);
                prim.setIndices(null);
                if (indices.listParents().length === 1) indices.dispose();
            }
        }
        logger.debug(`${NAME}: Complete.`);
    });
}
function unweldAttribute(srcAttribute, indices, logger, visited) {
    if (visited.has(srcAttribute) && visited.get(srcAttribute).has(indices)) {
        logger.debug(`${NAME}: Cache hit for reused attribute, "${srcAttribute.getName()}".`);
        return visited.get(srcAttribute).get(indices);
    }
    const dstAttribute = srcAttribute.clone();
    const ArrayCtor = srcAttribute.getArray().constructor;
    dstAttribute.setArray(new ArrayCtor(indices.getCount() * srcAttribute.getElementSize()));
    const el = [];
    for(let i = 0; i < indices.getCount(); i++){
        dstAttribute.setElement(i, srcAttribute.getElement(indices.getScalar(i), el));
    }
    if (!visited.has(srcAttribute)) visited.set(srcAttribute, new Map());
    visited.get(srcAttribute).set(indices, dstAttribute);
    return dstAttribute;
}
