import { Accessor, Document, Primitive, PropertyType } from '../../core/index.js';
import { prune } from './prune.js';
import { createTransform, deepListAttributes, remapAttribute, SetMap } from './utils.js';
const NAME = 'reorder';
const REORDER_DEFAULTS = {
    target: 'size'
};
export function reorder(_options) {
    const options = {
        ...REORDER_DEFAULTS,
        ..._options
    };
    const encoder = options.encoder;
    if (!encoder) {
        throw new Error(`${NAME}: encoder dependency required — install "meshoptimizer".`);
    }
    return createTransform(NAME, async (doc)=>{
        const logger = doc.getLogger();
        await encoder.ready;
        const plan = createLayoutPlan(doc);
        for (const srcIndices of plan.indicesToAttributes.keys()){
            const dstIndices = srcIndices.clone();
            let indicesArray = dstIndices.getArray().slice();
            if (!(indicesArray instanceof Uint32Array)) {
                indicesArray = new Uint32Array(indicesArray);
            }
            const [remap, unique] = encoder.reorderMesh(indicesArray, plan.indicesToMode.get(srcIndices) === Primitive.Mode.TRIANGLES, options.target === 'size');
            dstIndices.setArray(unique <= 65534 ? new Uint16Array(indicesArray) : indicesArray);
            for (const srcAttribute of plan.indicesToAttributes.get(srcIndices)){
                const dstAttribute = srcAttribute.clone();
                remapAttribute(dstAttribute, remap, unique);
                for (const prim of plan.attributesToPrimitives.get(srcAttribute)){
                    if (prim.getIndices() === srcIndices) {
                        prim.swap(srcIndices, dstIndices);
                    }
                    if (prim.getIndices() === dstIndices) {
                        prim.swap(srcAttribute, dstAttribute);
                        for (const target of prim.listTargets()){
                            target.swap(srcAttribute, dstAttribute);
                        }
                    }
                }
            }
        }
        await doc.transform(prune({
            propertyTypes: [
                PropertyType.ACCESSOR
            ]
        }));
        if (!plan.indicesToAttributes.size) {
            logger.warn(`${NAME}: No qualifying primitives found; may need to weld first.`);
        } else {
            logger.debug(`${NAME}: Complete.`);
        }
    });
}
export function createLayoutPlan(document) {
    const indicesToAttributes = new SetMap();
    const indicesToMode = new Map();
    const attributesToPrimitives = new SetMap();
    for (const mesh of document.getRoot().listMeshes()){
        for (const prim of mesh.listPrimitives()){
            const indices = prim.getIndices();
            if (!indices) continue;
            indicesToMode.set(indices, prim.getMode());
            for (const attribute of deepListAttributes(prim)){
                indicesToAttributes.add(indices, attribute);
                attributesToPrimitives.add(attribute, prim);
            }
        }
    }
    return {
        indicesToAttributes,
        indicesToMode,
        attributesToPrimitives
    };
}
