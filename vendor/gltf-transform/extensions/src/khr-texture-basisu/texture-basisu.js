import { read as readKTX, KHR_DF_MODEL_ETC1S, KHR_DF_MODEL_UASTC } from '../../../shims/ktx-parse.js';
import { Extension, ImageUtils, PropertyType, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_TEXTURE_BASISU } from '../constants.js';
const NAME = KHR_TEXTURE_BASISU;
class KTX2ImageUtils {
    match(array) {
        return array[0] === 0xab && array[1] === 0x4b && array[2] === 0x54 && array[3] === 0x58 && array[4] === 0x20 && array[5] === 0x32 && array[6] === 0x30 && array[7] === 0xbb && array[8] === 0x0d && array[9] === 0x0a && array[10] === 0x1a && array[11] === 0x0a;
    }
    getSize(array) {
        const container = readKTX(array);
        return [
            container.pixelWidth,
            container.pixelHeight
        ];
    }
    getChannels(array) {
        const container = readKTX(array);
        const dfd = container.dataFormatDescriptor[0];
        if (dfd.colorModel === KHR_DF_MODEL_ETC1S) {
            return dfd.samples.length === 2 && (dfd.samples[1].channelType & 0xf) === 15 ? 4 : 3;
        } else if (dfd.colorModel === KHR_DF_MODEL_UASTC) {
            return (dfd.samples[0].channelType & 0xf) === 3 ? 4 : 3;
        }
        throw new Error(`Unexpected KTX2 colorModel, "${dfd.colorModel}".`);
    }
    getVRAMByteLength(array) {
        const container = readKTX(array);
        const hasAlpha = this.getChannels(array) > 3;
        let uncompressedBytes = 0;
        for(let i = 0; i < container.levels.length; i++){
            const level = container.levels[i];
            if (level.uncompressedByteLength) {
                uncompressedBytes += level.uncompressedByteLength;
            } else {
                const levelWidth = Math.max(1, Math.floor(container.pixelWidth / Math.pow(2, i)));
                const levelHeight = Math.max(1, Math.floor(container.pixelHeight / Math.pow(2, i)));
                const blockSize = hasAlpha ? 16 : 8;
                uncompressedBytes += levelWidth / 4 * (levelHeight / 4) * blockSize;
            }
        }
        return uncompressedBytes;
    }
}
export class KHRTextureBasisu extends Extension {
    extensionName = NAME;
    prereadTypes = [
        PropertyType.TEXTURE
    ];
    static EXTENSION_NAME = NAME;
    static register() {
        ImageUtils.registerFormat('image/ktx2', new KTX2ImageUtils());
    }
    preread(context) {
        context.jsonDoc.json.textures.forEach((textureDef)=>{
            if (textureDef.extensions && textureDef.extensions[NAME]) {
                const basisuDef = textureDef.extensions[NAME];
                textureDef.source = basisuDef.source;
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
            if (texture.getMimeType() === 'image/ktx2') {
                const imageIndex = context.imageIndexMap.get(texture);
                jsonDoc.json.textures.forEach((textureDef)=>{
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
