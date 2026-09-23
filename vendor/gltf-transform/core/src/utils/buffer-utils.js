export class BufferUtils {
    static createBufferFromDataURI(dataURI) {
        if (typeof Buffer === 'undefined') {
            const byteString = atob(dataURI.split(',')[1]);
            const ia = new Uint8Array(byteString.length);
            for(let i = 0; i < byteString.length; i++){
                ia[i] = byteString.charCodeAt(i);
            }
            return ia;
        } else {
            const data = dataURI.split(',')[1];
            const isBase64 = dataURI.indexOf('base64') >= 0;
            return Buffer.from(data, isBase64 ? 'base64' : 'utf8');
        }
    }
    static encodeText(text) {
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(text);
        }
        return Buffer.from(text);
    }
    static decodeText(array) {
        if (typeof TextDecoder !== 'undefined') {
            return new TextDecoder().decode(array);
        }
        return Buffer.from(array).toString('utf8');
    }
    static concat(arrays) {
        let totalByteLength = 0;
        for (const array of arrays){
            totalByteLength += array.byteLength;
        }
        const result = new Uint8Array(totalByteLength);
        let byteOffset = 0;
        for (const array of arrays){
            result.set(array, byteOffset);
            byteOffset += array.byteLength;
        }
        return result;
    }
    static pad(srcArray, paddingByte = 0) {
        const paddedLength = this.padNumber(srcArray.byteLength);
        if (paddedLength === srcArray.byteLength) return srcArray;
        const dstArray = new Uint8Array(paddedLength);
        dstArray.set(srcArray);
        if (paddingByte !== 0) {
            for(let i = srcArray.byteLength; i < paddedLength; i++){
                dstArray[i] = paddingByte;
            }
        }
        return dstArray;
    }
    static padNumber(v) {
        return Math.ceil(v / 4) * 4;
    }
    static equals(a, b) {
        if (a === b) return true;
        if (a.byteLength !== b.byteLength) return false;
        let i = a.byteLength;
        while(i--){
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
    static toView(a, byteOffset = 0, byteLength = Infinity) {
        return new Uint8Array(a.buffer, a.byteOffset + byteOffset, Math.min(a.byteLength, byteLength));
    }
    static assertView(view) {
        if (view && !ArrayBuffer.isView(view)) {
            throw new Error(`Method requires Uint8Array parameter; received "${typeof view}".`);
        }
        return view;
    }
}
