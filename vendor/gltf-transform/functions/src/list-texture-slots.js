import { Document, Texture } from '../../core/index.js';
export function listTextureSlots(texture) {
    const document = Document.fromGraph(texture.getGraph());
    const root = document.getRoot();
    const slots = texture.getGraph().listParentEdges(texture).filter((edge)=>edge.getParent() !== root).map((edge)=>edge.getName());
    return Array.from(new Set(slots));
}
