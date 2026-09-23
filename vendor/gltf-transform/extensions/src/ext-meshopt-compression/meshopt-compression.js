import { Accessor, Buffer, BufferUtils, Extension, GLB_BUFFER, PropertyType, ReaderContext, WriterContext } from '../../../core/index.js';
import { EncoderMethod, MeshoptFilter } from './constants.js';
import { EXT_MESHOPT_COMPRESSION } from '../constants.js';
import { getMeshoptFilter, getMeshoptMode, getTargetPath, prepareAccessor } from './encoder.js';
import { isFallbackBuffer } from './decoder.js';
const NAME = EXT_MESHOPT_COMPRESSION;
const DEFAULT_ENCODER_OPTIONS = {
    method: EncoderMethod.QUANTIZE
};
export class EXTMeshoptCompression extends Extension {
    extensionName = NAME;
    prereadTypes = [
        PropertyType.BUFFER,
        PropertyType.PRIMITIVE
    ];
    prewriteTypes = [
        PropertyType.BUFFER,
        PropertyType.ACCESSOR
    ];
    readDependencies = [
        'meshopt.decoder'
    ];
    writeDependencies = [
        'meshopt.encoder'
    ];
    static EXTENSION_NAME = NAME;
    static EncoderMethod = EncoderMethod;
    _decoder = null;
    _decoderFallbackBufferMap = new Map();
    _encoder = null;
    _encoderOptions = DEFAULT_ENCODER_OPTIONS;
    _encoderFallbackBuffer = null;
    _encoderBufferViews = {};
    _encoderBufferViewData = {};
    _encoderBufferViewAccessors = {};
    install(key, dependency) {
        if (key === 'meshopt.decoder') {
            this._decoder = dependency;
        }
        if (key === 'meshopt.encoder') {
            this._encoder = dependency;
        }
        return this;
    }
    setEncoderOptions(options) {
        this._encoderOptions = {
            ...DEFAULT_ENCODER_OPTIONS,
            ...options
        };
        return this;
    }
    preread(context, propertyType) {
        if (!this._decoder) {
            if (!this.isRequired()) return this;
            throw new Error(`[${NAME}] Please install extension dependency, "meshopt.decoder".`);
        }
        if (!this._decoder.supported) {
            if (!this.isRequired()) return this;
            throw new Error(`[${NAME}]: Missing WASM support.`);
        }
        if (propertyType === PropertyType.BUFFER) {
            this._prereadBuffers(context);
        } else if (propertyType === PropertyType.PRIMITIVE) {
            this._prereadPrimitives(context);
        }
        return this;
    }
    _prereadBuffers(context) {
        const jsonDoc = context.jsonDoc;
        const viewDefs = jsonDoc.json.bufferViews || [];
        viewDefs.forEach((viewDef, index)=>{
            if (!viewDef.extensions || !viewDef.extensions[NAME]) return;
            const meshoptDef = viewDef.extensions[NAME];
            const byteOffset = meshoptDef.byteOffset || 0;
            const byteLength = meshoptDef.byteLength || 0;
            const count = meshoptDef.count;
            const stride = meshoptDef.byteStride;
            const result = new Uint8Array(count * stride);
            const bufferDef = jsonDoc.json.buffers[meshoptDef.buffer];
            const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[GLB_BUFFER];
            const source = BufferUtils.toView(resource, byteOffset, byteLength);
            this._decoder.decodeGltfBuffer(result, count, stride, source, meshoptDef.mode, meshoptDef.filter);
            context.bufferViews[index] = result;
        });
    }
    _prereadPrimitives(context) {
        const jsonDoc = context.jsonDoc;
        const viewDefs = jsonDoc.json.bufferViews || [];
        viewDefs.forEach((viewDef)=>{
            if (!viewDef.extensions || !viewDef.extensions[NAME]) return;
            const meshoptDef = viewDef.extensions[NAME];
            const buffer = context.buffers[meshoptDef.buffer];
            const fallbackBuffer = context.buffers[viewDef.buffer];
            const fallbackBufferDef = jsonDoc.json.buffers[viewDef.buffer];
            if (isFallbackBuffer(fallbackBufferDef)) {
                this._decoderFallbackBufferMap.set(fallbackBuffer, buffer);
            }
        });
    }
    read(_context) {
        if (!this.isRequired()) return this;
        for (const [fallbackBuffer, buffer] of this._decoderFallbackBufferMap){
            for (const parent of fallbackBuffer.listParents()){
                if (parent instanceof Accessor) {
                    parent.swap(fallbackBuffer, buffer);
                }
            }
            fallbackBuffer.dispose();
        }
        return this;
    }
    prewrite(context, propertyType) {
        if (propertyType === PropertyType.ACCESSOR) {
            this._prewriteAccessors(context);
        } else if (propertyType === PropertyType.BUFFER) {
            this._prewriteBuffers(context);
        }
        return this;
    }
    _prewriteAccessors(context) {
        const json = context.jsonDoc.json;
        const encoder = this._encoder;
        const options = this._encoderOptions;
        const fallbackBuffer = this.document.createBuffer();
        const fallbackBufferIndex = this.document.getRoot().listBuffers().indexOf(fallbackBuffer);
        this._encoderFallbackBuffer = fallbackBuffer;
        this._encoderBufferViews = {};
        this._encoderBufferViewData = {};
        this._encoderBufferViewAccessors = {};
        for (const accessor of this.document.getRoot().listAccessors()){
            if (getTargetPath(accessor) === 'weights') continue;
            if (accessor.getSparse()) continue;
            const usage = context.getAccessorUsage(accessor);
            const mode = getMeshoptMode(accessor, usage);
            const filter = options.method === EncoderMethod.FILTER ? getMeshoptFilter(accessor, this.document) : {
                filter: MeshoptFilter.NONE
            };
            const preparedAccessor = prepareAccessor(accessor, encoder, mode, filter);
            const { array, byteStride } = preparedAccessor;
            const buffer = accessor.getBuffer();
            if (!buffer) throw new Error(`${NAME}: Missing buffer for accessor.`);
            const bufferIndex = this.document.getRoot().listBuffers().indexOf(buffer);
            const key = [
                usage,
                mode,
                filter.filter,
                byteStride,
                bufferIndex
            ].join(':');
            let bufferView = this._encoderBufferViews[key];
            let bufferViewData = this._encoderBufferViewData[key];
            let bufferViewAccessors = this._encoderBufferViewAccessors[key];
            if (!bufferView || !bufferViewData) {
                bufferViewAccessors = this._encoderBufferViewAccessors[key] = [];
                bufferViewData = this._encoderBufferViewData[key] = [];
                bufferView = this._encoderBufferViews[key] = {
                    buffer: fallbackBufferIndex,
                    target: WriterContext.USAGE_TO_TARGET[usage],
                    byteOffset: 0,
                    byteLength: 0,
                    byteStride: usage === WriterContext.BufferViewUsage.ARRAY_BUFFER ? byteStride : undefined,
                    extensions: {
                        [NAME]: {
                            buffer: bufferIndex,
                            byteOffset: 0,
                            byteLength: 0,
                            mode: mode,
                            filter: filter.filter !== MeshoptFilter.NONE ? filter.filter : undefined,
                            byteStride: byteStride,
                            count: 0
                        }
                    }
                };
            }
            const accessorDef = context.createAccessorDef(accessor);
            accessorDef.componentType = preparedAccessor.componentType;
            accessorDef.normalized = preparedAccessor.normalized;
            accessorDef.byteOffset = bufferView.byteLength;
            if (accessorDef.min && preparedAccessor.min) accessorDef.min = preparedAccessor.min;
            if (accessorDef.max && preparedAccessor.max) accessorDef.max = preparedAccessor.max;
            context.accessorIndexMap.set(accessor, json.accessors.length);
            json.accessors.push(accessorDef);
            bufferViewAccessors.push(accessorDef);
            bufferViewData.push(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
            bufferView.byteLength += array.byteLength;
            bufferView.extensions.EXT_meshopt_compression.count += accessor.getCount();
        }
    }
    _prewriteBuffers(context) {
        const encoder = this._encoder;
        for(const key in this._encoderBufferViews){
            const bufferView = this._encoderBufferViews[key];
            const bufferViewData = this._encoderBufferViewData[key];
            const buffer = this.document.getRoot().listBuffers()[bufferView.extensions[NAME].buffer];
            const otherBufferViews = context.otherBufferViews.get(buffer) || [];
            const { count, byteStride, mode } = bufferView.extensions[NAME];
            const srcArray = BufferUtils.concat(bufferViewData);
            const dstArray = encoder.encodeGltfBuffer(srcArray, count, byteStride, mode);
            const compressedData = BufferUtils.pad(dstArray);
            bufferView.extensions[NAME].byteLength = dstArray.byteLength;
            bufferViewData.length = 0;
            bufferViewData.push(compressedData);
            otherBufferViews.push(compressedData);
            context.otherBufferViews.set(buffer, otherBufferViews);
        }
    }
    write(context) {
        let fallbackBufferByteOffset = 0;
        for(const key in this._encoderBufferViews){
            const bufferView = this._encoderBufferViews[key];
            const bufferViewData = this._encoderBufferViewData[key][0];
            const bufferViewIndex = context.otherBufferViewsIndexMap.get(bufferViewData);
            const bufferViewAccessors = this._encoderBufferViewAccessors[key];
            for (const accessorDef of bufferViewAccessors){
                accessorDef.bufferView = bufferViewIndex;
            }
            const finalBufferViewDef = context.jsonDoc.json.bufferViews[bufferViewIndex];
            const compressedByteOffset = finalBufferViewDef.byteOffset || 0;
            Object.assign(finalBufferViewDef, bufferView);
            finalBufferViewDef.byteOffset = fallbackBufferByteOffset;
            const bufferViewExtensionDef = finalBufferViewDef.extensions[NAME];
            bufferViewExtensionDef.byteOffset = compressedByteOffset;
            fallbackBufferByteOffset += BufferUtils.padNumber(bufferView.byteLength);
        }
        const fallbackBuffer = this._encoderFallbackBuffer;
        const fallbackBufferIndex = context.bufferIndexMap.get(fallbackBuffer);
        const fallbackBufferDef = context.jsonDoc.json.buffers[fallbackBufferIndex];
        fallbackBufferDef.byteLength = fallbackBufferByteOffset;
        fallbackBufferDef.extensions = {
            [NAME]: {
                fallback: true
            }
        };
        fallbackBuffer.dispose();
        return this;
    }
}
