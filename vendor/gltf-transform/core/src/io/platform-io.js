import { Format, GLB_BUFFER, VertexLayout } from '../constants.js';
import { BufferUtils, FileUtils, HTTPUtils, Logger, uuid } from '../utils/index.js';
import { GLTFReader } from './reader.js';
import { GLTFWriter } from './writer.js';
var ChunkType = /*#__PURE__*/ function(ChunkType) {
    ChunkType[ChunkType["JSON"] = 1313821514] = "JSON";
    ChunkType[ChunkType["BIN"] = 5130562] = "BIN";
    return ChunkType;
}(ChunkType || {});
export class PlatformIO {
    _logger = Logger.DEFAULT_INSTANCE;
    _extensions = new Set();
    _dependencies = {};
    _vertexLayout = VertexLayout.INTERLEAVED;
    lastReadBytes = 0;
    lastWriteBytes = 0;
    setLogger(logger) {
        this._logger = logger;
        return this;
    }
    registerExtensions(extensions) {
        for (const extension of extensions){
            this._extensions.add(extension);
            extension.register();
        }
        return this;
    }
    registerDependencies(dependencies) {
        Object.assign(this._dependencies, dependencies);
        return this;
    }
    setVertexLayout(layout) {
        this._vertexLayout = layout;
        return this;
    }
    async read(uri) {
        return await this.readJSON(await this.readAsJSON(uri));
    }
    async readAsJSON(uri) {
        const isGLB = uri.match(/^data:application\/octet-stream;/) || this.detectFormat(uri) === Format.GLB;
        return isGLB ? this._readGLB(uri) : this._readGLTF(uri);
    }
    async readJSON(jsonDoc) {
        jsonDoc = this._copyJSON(jsonDoc);
        this._readResourcesInternal(jsonDoc);
        return GLTFReader.read(jsonDoc, {
            extensions: Array.from(this._extensions),
            dependencies: this._dependencies,
            logger: this._logger
        });
    }
    async binaryToJSON(glb) {
        const jsonDoc = this._binaryToJSON(BufferUtils.assertView(glb));
        this._readResourcesInternal(jsonDoc);
        const json = jsonDoc.json;
        if (json.buffers && json.buffers.some((bufferDef)=>isExternalBuffer(jsonDoc, bufferDef))) {
            throw new Error('Cannot resolve external buffers with binaryToJSON().');
        } else if (json.images && json.images.some((imageDef)=>isExternalImage(jsonDoc, imageDef))) {
            throw new Error('Cannot resolve external images with binaryToJSON().');
        }
        return jsonDoc;
    }
    async readBinary(glb) {
        return this.readJSON(await this.binaryToJSON(BufferUtils.assertView(glb)));
    }
    async writeJSON(doc, _options = {}) {
        if (_options.format === Format.GLB && doc.getRoot().listBuffers().length > 1) {
            throw new Error('GLB must have 0–1 buffers.');
        }
        return GLTFWriter.write(doc, {
            format: _options.format || Format.GLTF,
            basename: _options.basename || '',
            logger: this._logger,
            vertexLayout: this._vertexLayout,
            dependencies: {
                ...this._dependencies
            },
            extensions: Array.from(this._extensions)
        });
    }
    async writeBinary(doc) {
        const { json, resources } = await this.writeJSON(doc, {
            format: Format.GLB
        });
        const header = new Uint32Array([
            0x46546c67,
            2,
            12
        ]);
        const jsonText = JSON.stringify(json);
        const jsonChunkData = BufferUtils.pad(BufferUtils.encodeText(jsonText), 0x20);
        const jsonChunkHeader = BufferUtils.toView(new Uint32Array([
            jsonChunkData.byteLength,
            0x4e4f534a
        ]));
        const jsonChunk = BufferUtils.concat([
            jsonChunkHeader,
            jsonChunkData
        ]);
        header[header.length - 1] += jsonChunk.byteLength;
        const binBuffer = Object.values(resources)[0];
        if (!binBuffer || !binBuffer.byteLength) {
            return BufferUtils.concat([
                BufferUtils.toView(header),
                jsonChunk
            ]);
        }
        const binChunkData = BufferUtils.pad(binBuffer, 0x00);
        const binChunkHeader = BufferUtils.toView(new Uint32Array([
            binChunkData.byteLength,
            0x004e4942
        ]));
        const binChunk = BufferUtils.concat([
            binChunkHeader,
            binChunkData
        ]);
        header[header.length - 1] += binChunk.byteLength;
        return BufferUtils.concat([
            BufferUtils.toView(header),
            jsonChunk,
            binChunk
        ]);
    }
    detectFormat(uri) {
        const extension = HTTPUtils.isAbsoluteURL(uri) ? HTTPUtils.extension(uri) : FileUtils.extension(uri);
        return extension === 'glb' ? Format.GLB : Format.GLTF;
    }
    async _readGLTF(uri) {
        this.lastReadBytes = 0;
        const jsonContent = await this.readURI(uri, 'text');
        this.lastReadBytes += jsonContent.length;
        const jsonDoc = {
            json: JSON.parse(jsonContent),
            resources: {}
        };
        await this._readResourcesExternal(jsonDoc, this.dirname(uri));
        this._readResourcesInternal(jsonDoc);
        return jsonDoc;
    }
    async _readGLB(uri) {
        const view = await this.readURI(uri, 'view');
        this.lastReadBytes = view.byteLength;
        const jsonDoc = this._binaryToJSON(view);
        await this._readResourcesExternal(jsonDoc, this.dirname(uri));
        this._readResourcesInternal(jsonDoc);
        return jsonDoc;
    }
    async _readResourcesExternal(jsonDoc, base) {
        const images = jsonDoc.json.images || [];
        const buffers = jsonDoc.json.buffers || [];
        const pendingResources = [
            ...images,
            ...buffers
        ].map(async (resource)=>{
            const uri = resource.uri;
            if (!uri || uri.match(/data:/)) return Promise.resolve();
            jsonDoc.resources[uri] = await this.readURI(this.resolve(base, uri), 'view');
            this.lastReadBytes += jsonDoc.resources[uri].byteLength;
        });
        await Promise.all(pendingResources);
    }
    _readResourcesInternal(jsonDoc) {
        function resolveResource(resource) {
            if (!resource.uri) return;
            if (resource.uri in jsonDoc.resources) {
                BufferUtils.assertView(jsonDoc.resources[resource.uri]);
                return;
            }
            if (resource.uri.match(/data:/)) {
                const resourceUUID = `__${uuid()}.${FileUtils.extension(resource.uri)}`;
                jsonDoc.resources[resourceUUID] = BufferUtils.createBufferFromDataURI(resource.uri);
                resource.uri = resourceUUID;
            }
        }
        const images = jsonDoc.json.images || [];
        images.forEach((image)=>{
            if (image.bufferView === undefined && image.uri === undefined) {
                throw new Error('Missing resource URI or buffer view.');
            }
            resolveResource(image);
        });
        const buffers = jsonDoc.json.buffers || [];
        buffers.forEach(resolveResource);
    }
    _copyJSON(jsonDoc) {
        const { images, buffers } = jsonDoc.json;
        jsonDoc = {
            json: {
                ...jsonDoc.json
            },
            resources: {
                ...jsonDoc.resources
            }
        };
        if (images) {
            jsonDoc.json.images = images.map((image)=>({
                    ...image
                }));
        }
        if (buffers) {
            jsonDoc.json.buffers = buffers.map((buffer)=>({
                    ...buffer
                }));
        }
        return jsonDoc;
    }
    _binaryToJSON(glb) {
        const header = new Uint32Array(glb.buffer, glb.byteOffset, 3);
        if (header[0] !== 0x46546c67) {
            throw new Error('Invalid glTF asset.');
        } else if (header[1] !== 2) {
            throw new Error(`Unsupported glTF binary version, "${header[1]}".`);
        }
        const jsonChunkHeader = new Uint32Array(glb.buffer, glb.byteOffset + 12, 2);
        if (jsonChunkHeader[1] !== 1313821514) {
            throw new Error('Missing required GLB JSON chunk.');
        }
        const jsonByteOffset = 20;
        const jsonByteLength = jsonChunkHeader[0];
        const jsonText = BufferUtils.decodeText(BufferUtils.toView(glb, jsonByteOffset, jsonByteLength));
        const json = JSON.parse(jsonText);
        const binByteOffset = jsonByteOffset + jsonByteLength;
        if (glb.byteLength <= binByteOffset) {
            return {
                json,
                resources: {}
            };
        }
        const binChunkHeader = new Uint32Array(glb.buffer, glb.byteOffset + binByteOffset, 2);
        if (binChunkHeader[1] !== 5130562) {
            throw new Error('Expected GLB BIN in second chunk.');
        }
        const binByteLength = binChunkHeader[0];
        const binBuffer = BufferUtils.toView(glb, binByteOffset + 8, binByteLength);
        return {
            json,
            resources: {
                [GLB_BUFFER]: binBuffer
            }
        };
    }
}
function isExternalBuffer(jsonDocument, bufferDef) {
    return bufferDef.uri !== undefined && !(bufferDef.uri in jsonDocument.resources);
}
function isExternalImage(jsonDocument, imageDef) {
    return imageDef.uri !== undefined && !(imageDef.uri in jsonDocument.resources) && imageDef.bufferView === undefined;
}
