import { PlatformIO } from './platform-io.js';
export class DenoIO extends PlatformIO {
    _path;
    constructor(path){
        super();
        this._path = path;
    }
    async readURI(uri, type) {
        switch(type){
            case 'view':
                return Deno.readFile(uri);
            case 'text':
                return Deno.readTextFile(uri);
        }
    }
    resolve(base, path) {
        return this._path.resolve(base, path);
    }
    dirname(uri) {
        return this._path.dirname(uri);
    }
}
