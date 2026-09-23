import { Extension, ImageUtils, PropertyType, ReaderContext, WriterContext, BufferUtils } from '../../../core/index.js';
import { EXT_TEXTURE_AVIF } from '../constants.js';
const NAME = EXT_TEXTURE_AVIF;
class AVIFImageUtils {
    match(array) {
        return array.length >= 12 && BufferUtils.decodeText(array.slice(4, 12)) === 'ftypavif';
    }
    getSize(array) {
        if (!this.match(array)) return null;
        const view = new DataView(array.buffer, array.byteOffset, array.byteLength);
        let box = unbox(view, 0);
        if (!box) return null;
        let offset = box.end;
        while(box = unbox(view, offset)){
            if (box.type === 'meta') {
                offset = box.start + 4;
            } else if (box.type === 'iprp' || box.type === 'ipco') {
                offset = box.start;
            } else if (box.type === 'ispe') {
                return [
                    view.getUint32(box.start + 4),
                    view.getUint32(box.start + 8)
                ];
            } else if (box.type === 'mdat') {
                break;
            } else {
                offset = box.end;
            }
        }
        return null;
    }
    getChannels(_buffer) {
        return 4;
    }
}
export class EXTTextureAVIF extends Extension {
    extensionName = NAME;
    prereadTypes = [
        PropertyType.TEXTURE
    ];
    static EXTENSION_NAME = NAME;
    static register() {
        ImageUtils.registerFormat('image/avif', new AVIFImageUtils());
    }
    preread(context) {
        const textureDefs = context.jsonDoc.json.textures || [];
        textureDefs.forEach((textureDef)=>{
            if (textureDef.extensions && textureDef.extensions[NAME]) {
                textureDef.source = textureDef.extensions[NAME].source;
            }
        });
        return this;
    }
    read(context) {
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listTextures().forEach((texture)=>{
            if (texture.getMimeType() === 'image/avif') {
                const imageIndex = context.imageIndexMap.get(texture);
                const textureDefs = jsonDoc.json.textures || [];
                textureDefs.forEach((textureDef)=>{
                    if (textureDef.source === imageIndex) {
                        textureDef.extensions = textureDef.extensions || {};
                        textureDef.extensions[NAME] = {
                            source: textureDef.source
                        };
                        delete textureDef.source;
                    }
                });
            }
        });
        return this;
    }
}
function unbox(data, offset) {
    if (data.byteLength < 4 + offset) return null;
    const size = data.getUint32(offset);
    if (data.byteLength < size + offset || size < 8) return null;
    return {
        type: BufferUtils.decodeText(new Uint8Array(data.buffer, data.byteOffset + offset + 4, 4)),
        start: offset + 8,
        end: offset + size
    };
}
