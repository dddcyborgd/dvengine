import { transformMat4 } from '../../../gl-matrix/vec3.js';
import { PropertyType } from '../constants.js';
export function getBounds(node) {
    const resultBounds = createBounds();
    const parents = node.propertyType === PropertyType.NODE ? [
        node
    ] : node.listChildren();
    for (const parent of parents){
        parent.traverse((node)=>{
            const mesh = node.getMesh();
            if (!mesh) return;
            const meshBounds = getMeshBounds(mesh, node.getWorldMatrix());
            expandBounds(meshBounds.min, resultBounds);
            expandBounds(meshBounds.max, resultBounds);
        });
    }
    return resultBounds;
}
export const bounds = getBounds;
function getMeshBounds(mesh, worldMatrix) {
    const meshBounds = createBounds();
    for (const prim of mesh.listPrimitives()){
        const position = prim.getAttribute('POSITION');
        if (!position) continue;
        let localPos = [
            0,
            0,
            0
        ];
        let worldPos = [
            0,
            0,
            0
        ];
        for(let i = 0; i < position.getCount(); i++){
            localPos = position.getElement(i, localPos);
            worldPos = transformMat4(worldPos, localPos, worldMatrix);
            expandBounds(worldPos, meshBounds);
        }
    }
    return meshBounds;
}
function expandBounds(point, target) {
    for(let i = 0; i < 3; i++){
        target.min[i] = Math.min(point[i], target.min[i]);
        target.max[i] = Math.max(point[i], target.max[i]);
    }
}
function createBounds() {
    return {
        min: [
            Infinity,
            Infinity,
            Infinity
        ],
        max: [
            -Infinity,
            -Infinity,
            -Infinity
        ]
    };
}
