import { BufferUtils } from './buffer-utils.js';
class JPEGImageUtils {
    match(array) {
        return array.length >= 3 && array[0] === 255 && array[1] === 216 && array[2] === 255;
    }
    getSize(array) {
        let view = new DataView(array.buffer, array.byteOffset + 4);
        let i, next;
        while(view.byteLength){
            i = view.getUint16(0, false);
            validateJPEGBuffer(view, i);
            next = view.getUint8(i + 1);
            if (next === 0xc0 || next === 0xc1 || next === 0xc2) {
                return [
                    view.getUint16(i + 7, false),
                    view.getUint16(i + 5, false)
                ];
            }
            view = new DataView(array.buffer, view.byteOffset + i + 2);
        }
        throw new TypeError('Invalid JPG, no size found');
    }
    getChannels(_buffer) {
        return 3;
    }
}
class PNGImageUtils {
    static PNG_FRIED_CHUNK_NAME = 'CgBI';
    match(array) {
        return array.length >= 8 && array[0] === 0x89 && array[1] === 0x50 && array[2] === 0x4e && array[3] === 0x47 && array[4] === 0x0d && array[5] === 0x0a && array[6] === 0x1a && array[7] === 0x0a;
    }
    getSize(array) {
        const view = new DataView(array.buffer, array.byteOffset);
        const magic = BufferUtils.decodeText(array.slice(12, 16));
        if (magic === PNGImageUtils.PNG_FRIED_CHUNK_NAME) {
            return [
                view.getUint32(32, false),
                view.getUint32(36, false)
            ];
        }
        return [
            view.getUint32(16, false),
            view.getUint32(20, false)
        ];
    }
    getChannels(_buffer) {
        return 4;
    }
}
export class ImageUtils {
    static impls = {
        'image/jpeg': new JPEGImageUtils(),
        'image/png': new PNGImageUtils()
    };
    static registerFormat(mimeType, impl) {
        this.impls[mimeType] = impl;
    }
    static getMimeType(buffer) {
        for(const mimeType in this.impls){
            if (this.impls[mimeType].match(buffer)) {
                return mimeType;
            }
        }
        return null;
    }
    static getSize(buffer, mimeType) {
        if (!this.impls[mimeType]) return null;
        return this.impls[mimeType].getSize(buffer);
    }
    static getChannels(buffer, mimeType) {
        if (!this.impls[mimeType]) return null;
        return this.impls[mimeType].getChannels(buffer);
    }
    static getVRAMByteLength(buffer, mimeType) {
        if (!this.impls[mimeType]) return null;
        if (this.impls[mimeType].getVRAMByteLength) {
            return this.impls[mimeType].getVRAMByteLength(buffer);
        }
        let uncompressedBytes = 0;
        const channels = 4;
        const resolution = this.getSize(buffer, mimeType);
        if (!resolution) return null;
        while(resolution[0] > 1 || resolution[1] > 1){
            uncompressedBytes += resolution[0] * resolution[1] * channels;
            resolution[0] = Math.max(Math.floor(resolution[0] / 2), 1);
            resolution[1] = Math.max(Math.floor(resolution[1] / 2), 1);
        }
        uncompressedBytes += 1 * 1 * channels;
        return uncompressedBytes;
    }
    static mimeTypeToExtension(mimeType) {
        if (mimeType === 'image/jpeg') return 'jpg';
        return mimeType.split('/').pop();
    }
    static extensionToMimeType(extension) {
        if (extension === 'jpg') return 'image/jpeg';
        if (!extension) return '';
        return `image/${extension}`;
    }
}
function validateJPEGBuffer(view, i) {
    if (i > view.byteLength) {
        throw new TypeError('Corrupt JPG, exceeded buffer limits');
    }
    if (view.getUint8(i) !== 0xff) {
        throw new TypeError('Invalid JPG, marker table corrupted');
    }
    return view;
}
