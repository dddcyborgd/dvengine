import { Accessor, getBounds, BufferUtils, Document, Extension, GLB_BUFFER, Primitive, PropertyType, ReaderContext, WriterContext } from '../../../core/index.js';
import { decodeAttribute, decodeGeometry, decodeIndex, initDecoderModule } from './decoder.js';
import { encodeGeometry, EncoderMethod, EncodingError, initEncoderModule } from './encoder.js';
import { KHR_DRACO_MESH_COMPRESSION } from '../constants.js';
const NAME = KHR_DRACO_MESH_COMPRESSION;
export class KHRDracoMeshCompression extends Extension {
    extensionName = NAME;
    prereadTypes = [
        PropertyType.PRIMITIVE
    ];
    prewriteTypes = [
        PropertyType.ACCESSOR
    ];
    readDependencies = [
        'draco3d.decoder'
    ];
    writeDependencies = [
        'draco3d.encoder'
    ];
    static EXTENSION_NAME = NAME;
    static EncoderMethod = EncoderMethod;
    _decoderModule = null;
    _encoderModule = null;
    _encoderOptions = {};
    install(key, dependency) {
        if (key === 'draco3d.decoder') {
            this._decoderModule = dependency;
            initDecoderModule(this._decoderModule);
        }
        if (key === 'draco3d.encoder') {
            this._encoderModule = dependency;
            initEncoderModule(this._encoderModule);
        }
        return this;
    }
    setEncoderOptions(options) {
        this._encoderOptions = options;
        return this;
    }
    preread(context) {
        if (!this._decoderModule) {
            throw new Error(`[${NAME}] Please install extension dependency, "draco3d.decoder".`);
        }
        const logger = this.document.getLogger();
        const jsonDoc = context.jsonDoc;
        const dracoMeshes = new Map();
        try {
            const meshDefs = jsonDoc.json.meshes || [];
            for (const meshDef of meshDefs){
                for (const primDef of meshDef.primitives){
                    if (!primDef.extensions || !primDef.extensions[NAME]) continue;
                    const dracoDef = primDef.extensions[NAME];
                    let [decoder, dracoMesh] = dracoMeshes.get(dracoDef.bufferView) || [];
                    if (!dracoMesh || !decoder) {
                        const bufferViewDef = jsonDoc.json.bufferViews[dracoDef.bufferView];
                        const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
                        const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
                        const byteOffset = bufferViewDef.byteOffset || 0;
                        const byteLength = bufferViewDef.byteLength;
                        const compressedData = BufferUtils.toView(resource, byteOffset, byteLength);
                        decoder = new this._decoderModule.Decoder();
                        dracoMesh = decodeGeometry(decoder, compressedData);
                        dracoMeshes.set(dracoDef.bufferView, [
                            decoder,
                            dracoMesh
                        ]);
                        logger.debug(`[${NAME}] Decompressed ${compressedData.byteLength} bytes.`);
                    }
                    for(const semantic in primDef.attributes){
                        const accessorDef = context.jsonDoc.json.accessors[primDef.attributes[semantic]];
                        const dracoAttribute = decoder.GetAttributeByUniqueId(dracoMesh, dracoDef.attributes[semantic]);
                        const attributeArray = decodeAttribute(decoder, dracoMesh, dracoAttribute, accessorDef);
                        context.accessors[primDef.attributes[semantic]].setArray(attributeArray);
                    }
                    if (primDef.indices !== undefined) {
                        context.accessors[primDef.indices].setArray(decodeIndex(decoder, dracoMesh));
                    }
                }
            }
        } finally{
            for (const [decoder, dracoMesh] of Array.from(dracoMeshes.values())){
                this._decoderModule.destroy(decoder);
                this._decoderModule.destroy(dracoMesh);
            }
        }
        return this;
    }
    read(_context) {
        return this;
    }
    prewrite(context, _propertyType) {
        if (!this._encoderModule) {
            throw new Error(`[${NAME}] Please install extension dependency, "draco3d.encoder".`);
        }
        const logger = this.document.getLogger();
        logger.debug(`[${NAME}] Compression options: ${JSON.stringify(this._encoderOptions)}`);
        const primitiveHashMap = listDracoPrimitives(this.document);
        const primitiveEncodingMap = new Map();
        let quantizationVolume = 'mesh';
        if (this._encoderOptions.quantizationVolume === 'scene') {
            if (this.document.getRoot().listScenes().length !== 1) {
                logger.warn(`[${NAME}]: quantizationVolume=scene requires exactly 1 scene.`);
            } else {
                quantizationVolume = getBounds(this.document.getRoot().listScenes().pop());
            }
        }
        for (const prim of Array.from(primitiveHashMap.keys())){
            const primHash = primitiveHashMap.get(prim);
            if (!primHash) throw new Error('Unexpected primitive.');
            if (primitiveEncodingMap.has(primHash)) {
                primitiveEncodingMap.set(primHash, primitiveEncodingMap.get(primHash));
                continue;
            }
            const indices = prim.getIndices();
            const accessorDefs = context.jsonDoc.json.accessors;
            let encodedPrim;
            try {
                encodedPrim = encodeGeometry(prim, {
                    ...this._encoderOptions,
                    quantizationVolume
                });
            } catch (e) {
                if (e instanceof EncodingError) {
                    logger.warn(`[${NAME}]: ${e.message} Skipping primitive compression.`);
                    continue;
                }
                throw e;
            }
            primitiveEncodingMap.set(primHash, encodedPrim);
            const indicesDef = context.createAccessorDef(indices);
            indicesDef.count = encodedPrim.numIndices;
            context.accessorIndexMap.set(indices, accessorDefs.length);
            accessorDefs.push(indicesDef);
            for (const semantic of prim.listSemantics()){
                const attribute = prim.getAttribute(semantic);
                if (encodedPrim.attributeIDs[semantic] === undefined) continue;
                const attributeDef = context.createAccessorDef(attribute);
                attributeDef.count = encodedPrim.numVertices;
                context.accessorIndexMap.set(attribute, accessorDefs.length);
                accessorDefs.push(attributeDef);
            }
            const buffer = prim.getAttribute('POSITION').getBuffer() || this.document.getRoot().listBuffers()[0];
            if (!context.otherBufferViews.has(buffer)) context.otherBufferViews.set(buffer, []);
            context.otherBufferViews.get(buffer).push(encodedPrim.data);
        }
        logger.debug(`[${NAME}] Compressed ${primitiveHashMap.size} primitives.`);
        context.extensionData[NAME] = {
            primitiveHashMap,
            primitiveEncodingMap
        };
        return this;
    }
    write(context) {
        const dracoContext = context.extensionData[NAME];
        for (const mesh of this.document.getRoot().listMeshes()){
            const meshDef = context.jsonDoc.json.meshes[context.meshIndexMap.get(mesh)];
            for(let i = 0; i < mesh.listPrimitives().length; i++){
                const prim = mesh.listPrimitives()[i];
                const primDef = meshDef.primitives[i];
                const primHash = dracoContext.primitiveHashMap.get(prim);
                if (!primHash) continue;
                const encodedPrim = dracoContext.primitiveEncodingMap.get(primHash);
                if (!encodedPrim) continue;
                primDef.extensions = primDef.extensions || {};
                primDef.extensions[NAME] = {
                    bufferView: context.otherBufferViewsIndexMap.get(encodedPrim.data),
                    attributes: encodedPrim.attributeIDs
                };
            }
        }
        if (!dracoContext.primitiveHashMap.size) {
            const json = context.jsonDoc.json;
            json.extensionsUsed = (json.extensionsUsed || []).filter((name)=>name !== NAME);
            json.extensionsRequired = (json.extensionsRequired || []).filter((name)=>name !== NAME);
        }
        return this;
    }
}
function listDracoPrimitives(doc) {
    const logger = doc.getLogger();
    const included = new Set();
    const excluded = new Set();
    for (const mesh of doc.getRoot().listMeshes()){
        for (const prim of mesh.listPrimitives()){
            if (!prim.getIndices()) {
                excluded.add(prim);
                logger.warn(`[${NAME}] Skipping Draco compression on non-indexed primitive.`);
            } else if (prim.getMode() !== Primitive.Mode.TRIANGLES) {
                excluded.add(prim);
                logger.warn(`[${NAME}] Skipping Draco compression on non-TRIANGLES primitive.`);
            } else {
                included.add(prim);
            }
        }
    }
    const accessors = doc.getRoot().listAccessors();
    const accessorIndices = new Map();
    for(let i = 0; i < accessors.length; i++)accessorIndices.set(accessors[i], i);
    const includedAccessors = new Map();
    const includedHashKeys = new Set();
    const primToHashKey = new Map();
    for (const prim of Array.from(included)){
        let hashKey = createHashKey(prim, accessorIndices);
        if (includedHashKeys.has(hashKey)) {
            primToHashKey.set(prim, hashKey);
            continue;
        }
        if (includedAccessors.has(prim.getIndices())) {
            const indices = prim.getIndices();
            const dstIndices = indices.clone();
            accessorIndices.set(dstIndices, doc.getRoot().listAccessors().length - 1);
            prim.swap(indices, dstIndices);
        }
        for (const attribute of prim.listAttributes()){
            if (includedAccessors.has(attribute)) {
                const dstAttribute = attribute.clone();
                accessorIndices.set(dstAttribute, doc.getRoot().listAccessors().length - 1);
                prim.swap(attribute, dstAttribute);
            }
        }
        hashKey = createHashKey(prim, accessorIndices);
        includedHashKeys.add(hashKey);
        primToHashKey.set(prim, hashKey);
        includedAccessors.set(prim.getIndices(), hashKey);
        for (const attribute of prim.listAttributes()){
            includedAccessors.set(attribute, hashKey);
        }
    }
    for (const accessor of Array.from(includedAccessors.keys())){
        const parentTypes = new Set(accessor.listParents().map((prop)=>prop.propertyType));
        if (parentTypes.size !== 2 || !parentTypes.has(PropertyType.PRIMITIVE) || !parentTypes.has(PropertyType.ROOT)) {
            throw new Error(`[${NAME}] Compressed accessors must only be used as indices or vertex attributes.`);
        }
    }
    for (const prim of Array.from(included)){
        const hashKey = primToHashKey.get(prim);
        const indices = prim.getIndices();
        if (includedAccessors.get(indices) !== hashKey || prim.listAttributes().some((attr)=>includedAccessors.get(attr) !== hashKey)) {
            throw new Error(`[${NAME}] Draco primitives must share all, or no, accessors.`);
        }
    }
    for (const prim of Array.from(excluded)){
        const indices = prim.getIndices();
        if (includedAccessors.has(indices) || prim.listAttributes().some((attr)=>includedAccessors.has(attr))) {
            throw new Error(`[${NAME}] Accessor cannot be shared by compressed and uncompressed primitives.`);
        }
    }
    return primToHashKey;
}
function createHashKey(prim, indexMap) {
    const hashElements = [];
    const indices = prim.getIndices();
    hashElements.push(indexMap.get(indices));
    for (const attribute of prim.listAttributes()){
        hashElements.push(indexMap.get(attribute));
    }
    return hashElements.sort().join('|');
}
