import { listNodeScenes } from './list-node-scenes.js';
export function clearNodeParent(node) {
    const scenes = listNodeScenes(node);
    const parent = node.getParentNode();
    if (!parent) return node;
    node.setMatrix(node.getWorldMatrix());
    parent.removeChild(node);
    for (const scene of scenes)scene.addChild(node);
    return node;
}
