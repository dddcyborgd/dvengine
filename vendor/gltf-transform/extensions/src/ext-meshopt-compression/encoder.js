import { MeshoptFilter, MeshoptMode } from './constants.js';
import { Accessor, AnimationChannel, AnimationSampler, BufferUtils, Document, MathUtils, Primitive, Root, WriterContext } from '../../../core/index.js';
const { BYTE, SHORT, FLOAT } = Accessor.ComponentType;
const { encodeNormalizedInt, decodeNormalizedInt } = MathUtils;
export function prepareAccessor(accessor, encoder, mode, filterOptions) {
    const { filter, bits } = filterOptions;
    const result = {
        array: accessor.getArray(),
        byteStride: accessor.getElementSize() * accessor.getComponentSize(),
        componentType: accessor.getComponentType(),
        normalized: accessor.getNormalized()
    };
    if (mode !== MeshoptMode.ATTRIBUTES) return result;
    if (filter !== MeshoptFilter.NONE) {
        let array = accessor.getNormalized() ? denormalizeArray(accessor) : new Float32Array(result.array);
        switch(filter){
            case MeshoptFilter.EXPONENTIAL:
                result.byteStride = accessor.getElementSize() * 4;
                result.componentType = FLOAT;
                result.normalized = false;
                result.array = encoder.encodeFilterExp(array, accessor.getCount(), result.byteStride, bits);
                break;
            case MeshoptFilter.OCTAHEDRAL:
                result.byteStride = bits > 8 ? 8 : 4;
                result.componentType = bits > 8 ? SHORT : BYTE;
                result.normalized = true;
                array = accessor.getElementSize() === 3 ? padNormals(array) : array;
                result.array = encoder.encodeFilterOct(array, accessor.getCount(), result.byteStride, bits);
                break;
            case MeshoptFilter.QUATERNION:
                result.byteStride = 8;
                result.componentType = SHORT;
                result.normalized = true;
                result.array = encoder.encodeFilterQuat(array, accessor.getCount(), result.byteStride, bits);
                break;
            default:
                throw new Error('Invalid filter.');
        }
        result.min = accessor.getMin([]);
        result.max = accessor.getMax([]);
        if (accessor.getNormalized()) {
            result.min = result.min.map((v)=>decodeNormalizedInt(v, accessor.getComponentType()));
            result.max = result.max.map((v)=>decodeNormalizedInt(v, accessor.getComponentType()));
        }
        if (result.normalized) {
            result.min = result.min.map((v)=>encodeNormalizedInt(v, result.componentType));
            result.max = result.max.map((v)=>encodeNormalizedInt(v, result.componentType));
        }
    } else if (result.byteStride % 4) {
        result.array = padArrayElements(result.array, accessor.getElementSize());
        result.byteStride = result.array.byteLength / accessor.getCount();
    }
    return result;
}
function denormalizeArray(attribute) {
    const componentType = attribute.getComponentType();
    const srcArray = attribute.getArray();
    const dstArray = new Float32Array(srcArray.length);
    for(let i = 0; i < srcArray.length; i++){
        dstArray[i] = decodeNormalizedInt(srcArray[i], componentType);
    }
    return dstArray;
}
export function padArrayElements(srcArray, elementSize) {
    const byteStride = BufferUtils.padNumber(srcArray.BYTES_PER_ELEMENT * elementSize);
    const elementStride = byteStride / srcArray.BYTES_PER_ELEMENT;
    const elementCount = srcArray.length / elementSize;
    const dstArray = new srcArray.constructor(elementCount * elementStride);
    for(let i = 0; i * elementSize < srcArray.length; i++){
        for(let j = 0; j < elementSize; j++){
            dstArray[i * elementStride + j] = srcArray[i * elementSize + j];
        }
    }
    return dstArray;
}
function padNormals(srcArray) {
    const dstArray = new Float32Array(srcArray.length * 4 / 3);
    for(let i = 0, il = srcArray.length / 3; i < il; i++){
        dstArray[i * 4] = srcArray[i * 3];
        dstArray[i * 4 + 1] = srcArray[i * 3 + 1];
        dstArray[i * 4 + 2] = srcArray[i * 3 + 2];
    }
    return dstArray;
}
export function getMeshoptMode(accessor, usage) {
    if (usage === WriterContext.BufferViewUsage.ELEMENT_ARRAY_BUFFER) {
        const isTriangles = accessor.listParents().some((parent)=>{
            return parent instanceof Primitive && parent.getMode() === Primitive.Mode.TRIANGLES;
        });
        return isTriangles ? MeshoptMode.TRIANGLES : MeshoptMode.INDICES;
    }
    return MeshoptMode.ATTRIBUTES;
}
export function getMeshoptFilter(accessor, doc) {
    const refs = doc.getGraph().listParentEdges(accessor).filter((edge)=>!(edge.getParent() instanceof Root));
    for (const ref of refs){
        const refName = ref.getName();
        const refKey = ref.getAttributes().key || '';
        if (refName === 'indices') return {
            filter: MeshoptFilter.NONE
        };
        if (refName === 'attributes') {
            if (refKey === 'POSITION') return {
                filter: MeshoptFilter.NONE
            };
            if (refKey === 'TEXCOORD_0') return {
                filter: MeshoptFilter.NONE
            };
            if (refKey === 'NORMAL') return {
                filter: MeshoptFilter.OCTAHEDRAL,
                bits: 8
            };
            if (refKey === 'TANGENT') return {
                filter: MeshoptFilter.OCTAHEDRAL,
                bits: 8
            };
            if (refKey.startsWith('JOINTS_')) return {
                filter: MeshoptFilter.NONE
            };
            if (refKey.startsWith('WEIGHTS_')) return {
                filter: MeshoptFilter.NONE
            };
        }
        if (refName === 'output') {
            const targetPath = getTargetPath(accessor);
            if (targetPath === 'rotation') return {
                filter: MeshoptFilter.QUATERNION,
                bits: 16
            };
            if (targetPath === 'translation') return {
                filter: MeshoptFilter.EXPONENTIAL,
                bits: 12
            };
            if (targetPath === 'scale') return {
                filter: MeshoptFilter.EXPONENTIAL,
                bits: 12
            };
            return {
                filter: MeshoptFilter.NONE
            };
        }
        if (refName === 'input') return {
            filter: MeshoptFilter.NONE
        };
        if (refName === 'inverseBindMatrices') return {
            filter: MeshoptFilter.NONE
        };
    }
    return {
        filter: MeshoptFilter.NONE
    };
}
export function getTargetPath(accessor) {
    for (const sampler of accessor.listParents()){
        if (!(sampler instanceof AnimationSampler)) continue;
        for (const channel of sampler.listParents()){
            if (!(channel instanceof AnimationChannel)) continue;
            return channel.getTargetPath();
        }
    }
    return null;
}
