import { Node, Scene } from '../../core/index.js';
export function listNodeScenes(node) {
    const visited = new Set();
    let child = node;
    let parent;
    while(parent = child.getParentNode()){
        if (visited.has(parent)) {
            throw new Error('Circular dependency in scene graph.');
        }
        visited.add(parent);
        child = parent;
    }
    return child.listParents().filter((parent)=>parent instanceof Scene);
}
