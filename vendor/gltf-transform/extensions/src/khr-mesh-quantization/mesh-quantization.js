import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MESH_QUANTIZATION } from '../constants.js';
const NAME = KHR_MESH_QUANTIZATION;
export class KHRMeshQuantization extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    read(_) {
        return this;
    }
    write(_) {
        return this;
    }
}
