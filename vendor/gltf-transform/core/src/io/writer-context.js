import { BufferViewUsage, Format, PropertyType } from '../constants.js';
import { ImageUtils } from '../utils/index.js';
var BufferViewTarget = /*#__PURE__*/ function(BufferViewTarget) {
    BufferViewTarget[BufferViewTarget["ARRAY_BUFFER"] = 34962] = "ARRAY_BUFFER";
    BufferViewTarget[BufferViewTarget["ELEMENT_ARRAY_BUFFER"] = 34963] = "ELEMENT_ARRAY_BUFFER";
    return BufferViewTarget;
}(BufferViewTarget || {});
export class WriterContext {
    _doc;
    jsonDoc;
    options;
    static BufferViewTarget = BufferViewTarget;
    static BufferViewUsage = BufferViewUsage;
    static USAGE_TO_TARGET = {
        [BufferViewUsage.ARRAY_BUFFER]: 34962,
        [BufferViewUsage.ELEMENT_ARRAY_BUFFER]: 34963
    };
    accessorIndexMap = new Map();
    animationIndexMap = new Map();
    bufferIndexMap = new Map();
    cameraIndexMap = new Map();
    skinIndexMap = new Map();
    materialIndexMap = new Map();
    meshIndexMap = new Map();
    nodeIndexMap = new Map();
    imageIndexMap = new Map();
    textureDefIndexMap = new Map();
    textureInfoDefMap = new Map();
    samplerDefIndexMap = new Map();
    sceneIndexMap = new Map();
    imageBufferViews = [];
    otherBufferViews = new Map();
    otherBufferViewsIndexMap = new Map();
    extensionData = {};
    bufferURIGenerator;
    imageURIGenerator;
    logger;
    _accessorUsageMap = new Map();
    accessorUsageGroupedByParent = new Set([
        'ARRAY_BUFFER'
    ]);
    accessorParents = new Map();
    constructor(_doc, jsonDoc, options){
        this._doc = _doc;
        this.jsonDoc = jsonDoc;
        this.options = options;
        const root = _doc.getRoot();
        const numBuffers = root.listBuffers().length;
        const numImages = root.listTextures().length;
        this.bufferURIGenerator = new UniqueURIGenerator(numBuffers > 1, ()=>options.basename || 'buffer');
        this.imageURIGenerator = new UniqueURIGenerator(numImages > 1, (texture)=>getSlot(_doc, texture) || options.basename || 'texture');
        this.logger = _doc.getLogger();
    }
    createTextureInfoDef(texture, textureInfo) {
        const samplerDef = {
            magFilter: textureInfo.getMagFilter() || undefined,
            minFilter: textureInfo.getMinFilter() || undefined,
            wrapS: textureInfo.getWrapS(),
            wrapT: textureInfo.getWrapT()
        };
        const samplerKey = JSON.stringify(samplerDef);
        if (!this.samplerDefIndexMap.has(samplerKey)) {
            this.samplerDefIndexMap.set(samplerKey, this.jsonDoc.json.samplers.length);
            this.jsonDoc.json.samplers.push(samplerDef);
        }
        const textureDef = {
            source: this.imageIndexMap.get(texture),
            sampler: this.samplerDefIndexMap.get(samplerKey)
        };
        const textureKey = JSON.stringify(textureDef);
        if (!this.textureDefIndexMap.has(textureKey)) {
            this.textureDefIndexMap.set(textureKey, this.jsonDoc.json.textures.length);
            this.jsonDoc.json.textures.push(textureDef);
        }
        const textureInfoDef = {
            index: this.textureDefIndexMap.get(textureKey)
        };
        if (textureInfo.getTexCoord() !== 0) {
            textureInfoDef.texCoord = textureInfo.getTexCoord();
        }
        if (Object.keys(textureInfo.getExtras()).length > 0) {
            textureInfoDef.extras = textureInfo.getExtras();
        }
        this.textureInfoDefMap.set(textureInfo, textureInfoDef);
        return textureInfoDef;
    }
    createPropertyDef(property) {
        const def = {};
        if (property.getName()) {
            def.name = property.getName();
        }
        if (Object.keys(property.getExtras()).length > 0) {
            def.extras = property.getExtras();
        }
        return def;
    }
    createAccessorDef(accessor) {
        const accessorDef = this.createPropertyDef(accessor);
        accessorDef.type = accessor.getType();
        accessorDef.componentType = accessor.getComponentType();
        accessorDef.count = accessor.getCount();
        const needsBounds = this._doc.getGraph().listParentEdges(accessor).some((edge)=>edge.getName() === 'attributes' && edge.getAttributes().key === 'POSITION' || edge.getName() === 'input');
        if (needsBounds) {
            accessorDef.max = accessor.getMax([]).map(Math.fround);
            accessorDef.min = accessor.getMin([]).map(Math.fround);
        }
        if (accessor.getNormalized()) {
            accessorDef.normalized = accessor.getNormalized();
        }
        return accessorDef;
    }
    createImageData(imageDef, data, texture) {
        if (this.options.format === Format.GLB) {
            this.imageBufferViews.push(data);
            imageDef.bufferView = this.jsonDoc.json.bufferViews.length;
            this.jsonDoc.json.bufferViews.push({
                buffer: 0,
                byteOffset: -1,
                byteLength: data.byteLength
            });
        } else {
            const extension = ImageUtils.mimeTypeToExtension(texture.getMimeType());
            imageDef.uri = this.imageURIGenerator.createURI(texture, extension);
            this.jsonDoc.resources[imageDef.uri] = data;
        }
    }
    getAccessorUsage(accessor) {
        const cachedUsage = this._accessorUsageMap.get(accessor);
        if (cachedUsage) return cachedUsage;
        if (accessor.getSparse()) return BufferViewUsage.SPARSE;
        for (const edge of this._doc.getGraph().listParentEdges(accessor)){
            const { usage } = edge.getAttributes();
            if (usage) return usage;
            if (edge.getParent().propertyType !== PropertyType.ROOT) {
                this.logger.warn(`Missing attribute ".usage" on edge, "${edge.getName()}".`);
            }
        }
        return BufferViewUsage.OTHER;
    }
    addAccessorToUsageGroup(accessor, usage) {
        const prevUsage = this._accessorUsageMap.get(accessor);
        if (prevUsage && prevUsage !== usage) {
            throw new Error(`Accessor with usage "${prevUsage}" cannot be reused as "${usage}".`);
        }
        this._accessorUsageMap.set(accessor, usage);
        return this;
    }
    listAccessorUsageGroups() {
        const result = {};
        for (const [accessor, usage] of Array.from(this._accessorUsageMap.entries())){
            result[usage] = result[usage] || [];
            result[usage].push(accessor);
        }
        return result;
    }
}
export class UniqueURIGenerator {
    multiple;
    basename;
    counter = {};
    constructor(multiple, basename){
        this.multiple = multiple;
        this.basename = basename;
    }
    createURI(object, extension) {
        if (object.getURI()) {
            return object.getURI();
        } else if (!this.multiple) {
            return `${this.basename(object)}.${extension}`;
        } else {
            const basename = this.basename(object);
            this.counter[basename] = this.counter[basename] || 1;
            return `${basename}_${this.counter[basename]++}.${extension}`;
        }
    }
}
function getSlot(document, texture) {
    const edge = document.getGraph().listParentEdges(texture).find((edge)=>edge.getParent() !== document.getRoot());
    return edge ? edge.getName().replace(/texture$/i, '') : '';
}
