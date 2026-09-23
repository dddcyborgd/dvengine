import { Accessor, MathUtils, Primitive, PrimitiveTarget } from '../../core/index.js';
export function sortPrimitiveWeights(prim, limit = Infinity) {
    if (Number.isFinite(limit) && limit % 4 || limit <= 0) {
        throw new Error(`Limit must be positive multiple of four.`);
    }
    const vertexCount = prim.getAttribute('POSITION').getCount();
    const setCount = prim.listSemantics().filter((name)=>name.startsWith('WEIGHTS_')).length;
    const indices = new Uint16Array(setCount * 4);
    const srcWeights = new Float32Array(setCount * 4);
    const dstWeights = new Float32Array(setCount * 4);
    const srcJoints = new Uint32Array(setCount * 4);
    const dstJoints = new Uint32Array(setCount * 4);
    for(let i = 0; i < vertexCount; i++){
        getVertexArray(prim, i, 'WEIGHTS', srcWeights);
        getVertexArray(prim, i, 'JOINTS', srcJoints);
        for(let j = 0; j < setCount * 4; j++)indices[j] = j;
        indices.sort((a, b)=>srcWeights[a] > srcWeights[b] ? -1 : 1);
        for(let j = 0; j < indices.length; j++){
            dstWeights[j] = srcWeights[indices[j]];
            dstJoints[j] = srcJoints[indices[j]];
        }
        setVertexArray(prim, i, 'WEIGHTS', dstWeights);
        setVertexArray(prim, i, 'JOINTS', dstJoints);
    }
    for(let i = setCount; i * 4 > limit; i--){
        const weights = prim.getAttribute(`WEIGHTS_${i - 1}`);
        const joints = prim.getAttribute(`JOINTS_${i - 1}`);
        prim.setAttribute(`WEIGHTS_${i - 1}`, null);
        prim.setAttribute(`JOINTS_${i - 1}`, null);
        if (weights.listParents().length === 1) weights.dispose();
        if (joints.listParents().length === 1) joints.dispose();
    }
    normalizePrimitiveWeights(prim);
}
function normalizePrimitiveWeights(prim) {
    if (!isNormalizeSafe(prim)) return;
    const vertexCount = prim.getAttribute('POSITION').getCount();
    const setCount = prim.listSemantics().filter((name)=>name.startsWith('WEIGHTS_')).length;
    const templateAttribute = prim.getAttribute('WEIGHTS_0');
    const templateArray = templateAttribute.getArray();
    const componentType = templateAttribute.getComponentType();
    const normalized = templateAttribute.getNormalized();
    const normalizedComponentType = normalized ? componentType : undefined;
    const delta = normalized ? MathUtils.decodeNormalizedInt(1, componentType) : Number.EPSILON;
    const joints = new Uint32Array(setCount * 4).fill(0);
    const weights = templateArray.slice(0, setCount * 4).fill(0);
    for(let i = 0; i < vertexCount; i++){
        getVertexArray(prim, i, 'JOINTS', joints);
        getVertexArray(prim, i, 'WEIGHTS', weights, normalizedComponentType);
        let weightsSum = sum(weights, normalizedComponentType);
        if (weightsSum === 0) continue;
        if (Math.abs(1 - weightsSum) > delta) {
            for(let j = 0; j < weights.length; j++){
                if (normalized) {
                    const intValue = MathUtils.encodeNormalizedInt(weights[j] / weightsSum, componentType);
                    weights[j] = MathUtils.decodeNormalizedInt(intValue, componentType);
                } else {
                    weights[j] /= weightsSum;
                }
            }
        }
        weightsSum = sum(weights, normalizedComponentType);
        if (normalized && weightsSum !== 1) {
            for(let j = weights.length - 1; j >= 0; j--){
                if (weights[j] > 0) {
                    weights[j] += MathUtils.encodeNormalizedInt(1 - weightsSum, componentType);
                    break;
                }
            }
        }
        for(let j = weights.length - 1; j >= 0; j--){
            if (weights[j] === 0) {
                joints[j] = 0;
            }
        }
        setVertexArray(prim, i, 'JOINTS', joints);
        setVertexArray(prim, i, 'WEIGHTS', weights, normalizedComponentType);
    }
}
function getVertexArray(prim, vertexIndex, prefix, target, normalizedComponentType) {
    let weights;
    const el = [
        0,
        0,
        0,
        0
    ];
    for(let i = 0; weights = prim.getAttribute(`${prefix}_${i}`); i++){
        weights.getElement(vertexIndex, el);
        for(let j = 0; j < 4; j++){
            if (normalizedComponentType) {
                target[i * 4 + j] = MathUtils.encodeNormalizedInt(el[j], normalizedComponentType);
            } else {
                target[i * 4 + j] = el[j];
            }
        }
    }
    return target;
}
function setVertexArray(prim, vertexIndex, prefix, values, normalizedComponentType) {
    let weights;
    const el = [
        0,
        0,
        0,
        0
    ];
    for(let i = 0; weights = prim.getAttribute(`${prefix}_${i}`); i++){
        for(let j = 0; j < 4; j++){
            if (normalizedComponentType) {
                el[j] = MathUtils.decodeNormalizedInt(values[i * 4 + j], normalizedComponentType);
            } else {
                el[j] = values[i * 4 + j];
            }
        }
        weights.setElement(vertexIndex, el);
    }
}
function sum(values, normalizedComponentType) {
    let sum = 0;
    for(let i = 0; i < values.length; i++){
        if (normalizedComponentType) {
            sum += MathUtils.decodeNormalizedInt(values[i], normalizedComponentType);
        } else {
            sum += values[i];
        }
    }
    return sum;
}
function isNormalizeSafe(prim) {
    const attributes = prim.listSemantics().filter((name)=>name.startsWith('WEIGHTS_')).map((name)=>prim.getAttribute(name));
    const normList = attributes.map((a)=>a.getNormalized());
    const typeList = attributes.map((a)=>a.getComponentType());
    return new Set(normList).size === 1 && new Set(typeList).size === 1;
}
