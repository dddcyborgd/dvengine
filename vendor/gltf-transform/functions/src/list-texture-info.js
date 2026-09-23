import { Texture, TextureInfo } from '../../core/index.js';
export function listTextureInfo(texture) {
    const graph = texture.getGraph();
    const results = [];
    for (const textureEdge of graph.listParentEdges(texture)){
        const parent = textureEdge.getParent();
        const name = textureEdge.getName() + 'Info';
        for (const edge of graph.listChildEdges(parent)){
            const child = edge.getChild();
            if (child instanceof TextureInfo && edge.getName() === name) {
                results.push(child);
            }
        }
    }
    return results;
}
