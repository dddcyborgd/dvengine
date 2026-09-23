import { Document, Primitive, ComponentTypeToTypedArray } from '../../core/index.js';
import { createIndices, createPrimGroupKey } from './utils.js';
const JOIN_PRIMITIVE_DEFAULTS = {
    skipValidation: false
};
export function joinPrimitives(prims, options = {}) {
    options = {
        ...JOIN_PRIMITIVE_DEFAULTS,
        ...options
    };
    const templatePrim = prims[0];
    const document = Document.fromGraph(templatePrim.getGraph());
    if (!options.skipValidation && new Set(prims.map(createPrimGroupKey)).size > 1) {
        throw new Error('' + 'Requires ≥2 Primitives, sharing the same Material ' + 'and Mode, with compatible vertex attributes and indices.');
    }
    const remapList = [];
    const countList = [];
    const indicesList = [];
    let dstVertexCount = 0;
    let dstIndicesCount = 0;
    for (const srcPrim of prims){
        const indices = _getOrCreateIndices(srcPrim);
        const remap = [];
        let count = 0;
        for(let i = 0; i < indices.length; i++){
            const index = indices[i];
            if (remap[index] === undefined) {
                remap[index] = dstVertexCount++;
                count++;
            }
            dstIndicesCount++;
        }
        remapList.push(new Uint32Array(remap));
        countList.push(count);
        indicesList.push(indices);
    }
    const dstPrim = document.createPrimitive().setMode(templatePrim.getMode()).setMaterial(templatePrim.getMaterial());
    for (const semantic of templatePrim.listSemantics()){
        const tplAttribute = templatePrim.getAttribute(semantic);
        const AttributeArray = ComponentTypeToTypedArray[tplAttribute.getComponentType()];
        const dstAttribute = document.createAccessor().setType(tplAttribute.getType()).setBuffer(tplAttribute.getBuffer()).setNormalized(tplAttribute.getNormalized()).setArray(new AttributeArray(dstVertexCount * tplAttribute.getElementSize()));
        dstPrim.setAttribute(semantic, dstAttribute);
    }
    const dstIndicesArray = templatePrim.getIndices() ? createIndices(dstVertexCount) : null;
    const dstIndices = dstIndicesArray && document.createAccessor().setBuffer(templatePrim.getIndices().getBuffer()).setArray(createIndices(dstIndicesCount, dstVertexCount));
    dstPrim.setIndices(dstIndices);
    let dstNextIndex = 0;
    for(let primIndex = 0; primIndex < remapList.length; primIndex++){
        const srcPrim = prims[primIndex];
        const remap = remapList[primIndex];
        const indicesArray = indicesList[primIndex];
        const primStartIndex = dstNextIndex;
        let primNextIndex = primStartIndex;
        for (const semantic of dstPrim.listSemantics()){
            const srcAttribute = srcPrim.getAttribute(semantic);
            const dstAttribute = dstPrim.getAttribute(semantic);
            const el = [];
            primNextIndex = primStartIndex;
            for(let i = 0; i < indicesArray.length; i++){
                const index = indicesArray[i];
                srcAttribute.getElement(index, el);
                dstAttribute.setElement(remap[index], el);
                if (dstIndices) {
                    dstIndices.setScalar(primNextIndex++, remap[index]);
                }
            }
        }
        dstNextIndex = primNextIndex;
    }
    return dstPrim;
}
function _getOrCreateIndices(prim) {
    const indices = prim.getIndices();
    if (indices) return indices.getArray();
    const position = prim.getAttribute('POSITION');
    return createIndices(position.getCount());
}
