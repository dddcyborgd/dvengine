import { create as createMat3, fromMat4, invert, transpose } from '../../gl-matrix/mat3.js';
import { create as createVec3, normalize as normalizeVec3, transformMat3, transformMat4 } from '../../gl-matrix/vec3.js';
import { create as createVec4 } from '../../gl-matrix/vec4.js';
import { createIndices } from './utils.js';
export function transformPrimitive(prim, matrix, skipIndices = new Set()) {
    const position = prim.getAttribute('POSITION');
    const indices = prim.getIndices()?.getArray() || createIndices(position.getCount());
    if (position) {
        applyMatrix(matrix, position, indices, new Set(skipIndices));
    }
    const normal = prim.getAttribute('NORMAL');
    if (normal) {
        applyNormalMatrix(matrix, normal, indices, new Set(skipIndices));
    }
    const tangent = prim.getAttribute('TANGENT');
    if (tangent) {
        applyTangentMatrix(matrix, tangent, indices, new Set(skipIndices));
    }
    for (const target of prim.listTargets()){
        const position = target.getAttribute('POSITION');
        if (position) {
            applyMatrix(matrix, position, indices, new Set(skipIndices));
        }
        const normal = target.getAttribute('NORMAL');
        if (normal) {
            applyNormalMatrix(matrix, normal, indices, new Set(skipIndices));
        }
        const tangent = target.getAttribute('TANGENT');
        if (tangent) {
            applyTangentMatrix(matrix, tangent, indices, new Set(skipIndices));
        }
    }
    for(let i = 0; i < indices.length; i++)skipIndices.add(indices[i]);
}
function applyMatrix(matrix, attribute, indices, skipIndices) {
    const dstArray = new Float32Array(attribute.getCount() * 3);
    const elementSize = attribute.getElementSize();
    for(let i = 0, el = [], il = attribute.getCount(); i < il; i++){
        dstArray.set(attribute.getElement(i, el), i * elementSize);
    }
    const vector = createVec3();
    for(let i = 0; i < indices.length; i++){
        const index = indices[i];
        if (skipIndices.has(index)) continue;
        attribute.getElement(index, vector);
        transformMat4(vector, vector, matrix);
        dstArray.set(vector, index * 3);
        skipIndices.add(index);
    }
    attribute.setArray(dstArray).setNormalized(false);
}
function applyNormalMatrix(matrix, attribute, indices, skipIndices) {
    const normalMatrix = createMat3();
    fromMat4(normalMatrix, matrix);
    invert(normalMatrix, normalMatrix);
    transpose(normalMatrix, normalMatrix);
    const vector = createVec3();
    for(let i = 0; i < indices.length; i++){
        const index = indices[i];
        if (skipIndices.has(index)) continue;
        attribute.getElement(index, vector);
        transformMat3(vector, vector, normalMatrix);
        normalizeVec3(vector, vector);
        attribute.setElement(index, vector);
        skipIndices.add(index);
    }
}
function applyTangentMatrix(matrix, attribute, indices, skipIndices) {
    const v3 = createVec3();
    const v4 = createVec4();
    for(let i = 0; i < indices.length; i++){
        const index = indices[i];
        if (skipIndices.has(index)) continue;
        attribute.getElement(index, v4);
        const [x, y, z] = v4;
        v3[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
        v3[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
        v3[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
        normalizeVec3(v3, v3);
        v4[0] = v3[0], v4[1] = v3[1], v4[2] = v3[2];
        attribute.setElement(index, v4);
        skipIndices.add(index);
    }
}
