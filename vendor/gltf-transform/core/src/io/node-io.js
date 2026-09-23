import { Format } from '../constants.js';
import { FileUtils } from '../utils/index.js';
import { PlatformIO } from './platform-io.js';
import { HTTPUtils } from '../utils/index.js';
export class NodeIO extends PlatformIO {
    _fetch;
    _fetchConfig;
    _init;
    _fetchEnabled = false;
    constructor(_fetch = null, _fetchConfig = HTTPUtils.DEFAULT_INIT){
        super();
        this._fetch = _fetch;
        this._fetchConfig = _fetchConfig;
        this._init = this.init();
    }
    async init() {
        if (this._init) return this._init;
        return Promise.all([
            import('fs'),
            import('path')
        ]).then(([fs, path])=>{
            this._fs = fs.promises;
            this._path = path;
        });
    }
    setAllowHTTP(allow) {
        if (allow && !this._fetch) {
            throw new Error('NodeIO requires a Fetch API implementation for HTTP requests.');
        }
        this._fetchEnabled = allow;
        return this;
    }
    async readURI(uri, type) {
        await this.init();
        if (HTTPUtils.isAbsoluteURL(uri)) {
            if (!this._fetchEnabled || !this._fetch) {
                throw new Error('Network request blocked. Allow HTTP requests explicitly, if needed.');
            }
            const response = await this._fetch(uri, this._fetchConfig);
            switch(type){
                case 'view':
                    return new Uint8Array(await response.arrayBuffer());
                case 'text':
                    return response.text();
            }
        } else {
            switch(type){
                case 'view':
                    return this._fs.readFile(uri);
                case 'text':
                    return this._fs.readFile(uri, 'utf8');
            }
        }
    }
    resolve(base, path) {
        if (HTTPUtils.isAbsoluteURL(base) || HTTPUtils.isAbsoluteURL(path)) {
            return HTTPUtils.resolve(base, path);
        }
        return this._path.resolve(base, path);
    }
    dirname(uri) {
        if (HTTPUtils.isAbsoluteURL(uri)) {
            return HTTPUtils.dirname(uri);
        }
        return this._path.dirname(uri);
    }
    async write(uri, doc) {
        await this.init();
        const isGLB = !!uri.match(/\.glb$/);
        await (isGLB ? this._writeGLB(uri, doc) : this._writeGLTF(uri, doc));
    }
    async _writeGLTF(uri, doc) {
        this.lastWriteBytes = 0;
        const { json, resources } = await this.writeJSON(doc, {
            format: Format.GLTF,
            basename: FileUtils.basename(uri)
        });
        const { _fs: fs, _path: path } = this;
        const dir = path.dirname(uri);
        const jsonContent = JSON.stringify(json, null, 2);
        this.lastWriteBytes += jsonContent.length;
        await fs.writeFile(uri, jsonContent);
        const pending = Object.keys(resources).map(async (resourceURI)=>{
            if (HTTPUtils.isAbsoluteURL(resourceURI)) {
                if (HTTPUtils.extension(resourceURI) === 'bin') {
                    throw new Error(`Cannot write buffer to path "${resourceURI}".`);
                }
                return;
            }
            const resource = Buffer.from(resources[resourceURI]);
            const resourcePath = path.join(dir, resourceURI);
            await fs.mkdir(path.dirname(resourcePath), {
                recursive: true
            });
            await fs.writeFile(resourcePath, resource);
            this.lastWriteBytes += resource.byteLength;
        });
        await Promise.all(pending);
    }
    async _writeGLB(uri, doc) {
        const buffer = Buffer.from(await this.writeBinary(doc));
        await this._fs.writeFile(uri, buffer);
        this.lastWriteBytes = buffer.byteLength;
    }
}
