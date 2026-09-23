import { Document, Texture } from '../../core/index.js';
import { Material, TextureChannel, PropertyType } from '../../core/index.js';
export function listTextureChannels(texture) {
    const mask = getTextureChannelMask(texture);
    const channels = [];
    if (mask & TextureChannel.R) channels.push(TextureChannel.R);
    if (mask & TextureChannel.G) channels.push(TextureChannel.G);
    if (mask & TextureChannel.B) channels.push(TextureChannel.B);
    if (mask & TextureChannel.A) channels.push(TextureChannel.A);
    return channels;
}
export function getTextureChannelMask(texture) {
    const document = Document.fromGraph(texture.getGraph());
    let mask = 0x0000;
    for (const edge of document.getGraph().listParentEdges(texture)){
        const parent = edge.getParent();
        let { channels } = edge.getAttributes();
        if (channels && edge.getName() === 'baseColorTexture' && parent instanceof Material && parent.getAlphaMode() === Material.AlphaMode.OPAQUE) {
            channels &= ~TextureChannel.A;
        }
        if (channels) {
            mask |= channels;
            continue;
        }
        if (parent.propertyType !== PropertyType.ROOT) {
            document.getLogger().warn(`Missing attribute ".channels" on edge, "${edge.getName()}".`);
        }
    }
    return mask;
}
