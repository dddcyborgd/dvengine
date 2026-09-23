import { PlatformIO } from './platform-io.js';
import { HTTPUtils } from '../utils/index.js';
import { Format } from '../constants.js';
export class WebIO extends PlatformIO {
    _fetchConfig;
    constructor(fetchConfig = HTTPUtils.DEFAULT_INIT){
        super();
        this._fetchConfig = fetchConfig;
    }
    async readURI(uri, type) {
        const response = await fetch(uri, this._fetchConfig);
        switch(type){
            case 'view':
                return new Uint8Array(await response.arrayBuffer());
            case 'text':
                return response.text();
        }
    }
    resolve(base, path) {
        return HTTPUtils.resolve(base, path);
    }
    dirname(uri) {
        return HTTPUtils.dirname(uri);
    }
    detectFormat(uri) {
        return HTTPUtils.extension(uri) === 'glb' ? Format.GLB : Format.GLTF;
    }
}
