import { EXTMeshoptCompression } from '../../extensions/index.js';
import { reorder } from './reorder.js';
import { quantize } from './quantize.js';
import { createTransform } from './utils.js';
export const MESHOPT_DEFAULTS = {
    level: 'high'
};
const NAME = 'meshopt';
export const meshopt = (_options)=>{
    const options = {
        ...MESHOPT_DEFAULTS,
        ..._options
    };
    const encoder = options.encoder;
    if (!encoder) {
        throw new Error(`${NAME}: encoder dependency required — install "meshoptimizer".`);
    }
    return createTransform(NAME, async (document)=>{
        await document.transform(reorder({
            encoder: encoder,
            target: 'size'
        }), quantize({
            pattern: options.level === 'medium' ? /.*/ : /^(POSITION|TEXCOORD|JOINTS|WEIGHTS)(_\d+)?$/,
            quantizePosition: 14,
            quantizeTexcoord: 12,
            quantizeColor: 8,
            quantizeNormal: 8
        }));
        document.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({
            method: options.level === 'medium' ? EXTMeshoptCompression.EncoderMethod.QUANTIZE : EXTMeshoptCompression.EncoderMethod.FILTER
        });
    });
};
