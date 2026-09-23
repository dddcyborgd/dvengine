import { KHRDracoMeshCompression } from '../../extensions/index.js';
import { createTransform } from './utils.js';
const NAME = 'draco';
export const DRACO_DEFAULTS = {
    method: 'edgebreaker',
    encodeSpeed: 5,
    decodeSpeed: 5,
    quantizePosition: 14,
    quantizeNormal: 10,
    quantizeColor: 8,
    quantizeTexcoord: 12,
    quantizeGeneric: 12,
    quantizationVolume: 'mesh'
};
export const draco = (_options = DRACO_DEFAULTS)=>{
    const options = {
        ...DRACO_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, (doc)=>{
        doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({
            method: options.method === 'edgebreaker' ? KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER : KHRDracoMeshCompression.EncoderMethod.SEQUENTIAL,
            encodeSpeed: options.encodeSpeed,
            decodeSpeed: options.decodeSpeed,
            quantizationBits: {
                POSITION: options.quantizePosition,
                NORMAL: options.quantizeNormal,
                COLOR: options.quantizeColor,
                TEX_COORD: options.quantizeTexcoord,
                GENERIC: options.quantizeGeneric
            },
            quantizationVolume: options.quantizationVolume
        });
    });
};
