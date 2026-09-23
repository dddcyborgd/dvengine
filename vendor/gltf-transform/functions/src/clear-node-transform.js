import { MathUtils, Node } from '../../core/index.js';
import { multiply as multiplyMat4 } from '../../gl-matrix/mat4.js';
import { transformMesh } from './transform-mesh.js';
const IDENTITY = [
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
];
export function clearNodeTransform(node) {
    const mesh = node.getMesh();
    const localMatrix = node.getMatrix();
    if (mesh && !MathUtils.eq(localMatrix, IDENTITY)) {
        transformMesh(mesh, localMatrix);
    }
    for (const child of node.listChildren()){
        const matrix = child.getMatrix();
        multiplyMat4(matrix, matrix, localMatrix);
        child.setMatrix(matrix);
    }
    return node.setMatrix(IDENTITY);
}
