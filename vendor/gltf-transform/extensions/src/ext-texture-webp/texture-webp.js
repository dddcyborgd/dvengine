import { BufferUtils, Extension, ImageUtils, PropertyType, ReaderContext, WriterContext } from '../../../core/index.js';
import { EXT_TEXTURE_WEBP } from '../constants.js';
const NAME = EXT_TEXTURE_WEBP;
class WEBPImageUtils {
    match(array) {
        return array.length >= 12 && array[8] === 87 && array[9] === 69 && array[10] === 66 && array[11] === 80;
    }
    getSize(array) {
        const RIFF = BufferUtils.decodeText(array.slice(0, 4));
        const WEBP = BufferUtils.decodeText(array.slice(8, 12));
        if (RIFF !== 'RIFF' || WEBP !== 'WEBP') return null;
        const view = new DataView(array.buffer, array.byteOffset);
        let offset = 12;
        while(offset < view.byteLength){
            const chunkId = BufferUtils.decodeText(new Uint8Array([
                view.getUint8(offset),
                view.getUint8(offset + 1),
                view.getUint8(offset + 2),
                view.getUint8(offset + 3)
            ]));
            const chunkByteLength = view.getUint32(offset + 4, true);
            if (chunkId === 'VP8 ') {
                const width = view.getInt16(offset + 14, true) & 0x3fff;
                const height = view.getInt16(offset + 16, true) & 0x3fff;
                return [
                    width,
                    height
                ];
            } else if (chunkId === 'VP8L') {
                const b0 = view.getUint8(offset + 9);
                const b1 = view.getUint8(offset + 10);
                const b2 = view.getUint8(offset + 11);
                const b3 = view.getUint8(offset + 12);
                const width = 1 + ((b1 & 0x3f) << 8 | b0);
                const height = 1 + ((b3 & 0xf) << 10 | b2 << 2 | (b1 & 0xc0) >> 6);
                return [
                    width,
                    height
                ];
            }
            offset += 8 + chunkByteLength + chunkByteLength % 2;
        }
        return null;
    }
    getChannels(_buffer) {
        return 4;
    }
}
export class EXTTextureWebP extends Extension {
    extensionName = NAME;
    prereadTypes = [
        PropertyType.TEXTURE
    ];
    static EXTENSION_NAME = NAME;
    static register() {
        ImageUtils.registerFormat('image/webp', new WEBPImageUtils());
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
            if (texture.getMimeType() === 'image/webp') {
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
