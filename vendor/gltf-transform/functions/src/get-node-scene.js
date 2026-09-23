import { listNodeScenes } from './list-node-scenes.js';
export function getNodeScene(node) {
    return listNodeScenes(node)[0] || null;
}
