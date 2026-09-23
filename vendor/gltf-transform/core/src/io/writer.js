import { ComponentTypeToTypedArray, Format, GLB_BUFFER, PropertyType, VERSION, VertexLayout } from '../constants.js';
import { Accessor, AnimationSampler, Camera, Material, Property } from '../properties/index.js';
import { BufferUtils, Logger, MathUtils } from '../utils/index.js';
import { WriterContext } from './writer-context.js';
const { BufferViewUsage } = WriterContext;
const { UNSIGNED_INT, UNSIGNED_SHORT, UNSIGNED_BYTE } = Accessor.ComponentType;
export class GLTFWriter {
    static write(doc, options) {
        const root = doc.getRoot();
        const json = {
            asset: {
                generator: `glTF-Transform ${VERSION}`,
                ...root.getAsset()
            },
            extras: {
                ...root.getExtras()
            }
        };
        const jsonDoc = {
            json,
            resources: {}
        };
        const context = new WriterContext(doc, jsonDoc, options);
        const logger = options.logger || Logger.DEFAULT_INSTANCE;
        const extensionsRegistered = new Set(options.extensions.map((ext)=>ext.EXTENSION_NAME));
        const extensionsUsed = doc.getRoot().listExtensionsUsed().filter((ext)=>extensionsRegistered.has(ext.extensionName));
        const extensionsRequired = doc.getRoot().listExtensionsRequired().filter((ext)=>extensionsRegistered.has(ext.extensionName));
        if (extensionsUsed.length < doc.getRoot().listExtensionsUsed().length) {
            logger.warn('Some extensions were not registered for I/O, and will not be written.');
        }
        for (const extension of extensionsUsed){
            for (const key of extension.writeDependencies){
                extension.install(key, options.dependencies[key]);
            }
        }
        function concatAccessors(accessors, bufferIndex, bufferByteOffset, bufferViewTarget) {
            const buffers = [];
            let byteLength = 0;
            for (const accessor of accessors){
                const accessorDef = context.createAccessorDef(accessor);
                accessorDef.bufferView = json.bufferViews.length;
                const accessorArray = accessor.getArray();
                const data = BufferUtils.pad(BufferUtils.toView(accessorArray));
                accessorDef.byteOffset = byteLength;
                byteLength += data.byteLength;
                buffers.push(data);
                context.accessorIndexMap.set(accessor, json.accessors.length);
                json.accessors.push(accessorDef);
            }
            const bufferViewData = BufferUtils.concat(buffers);
            const bufferViewDef = {
                buffer: bufferIndex,
                byteOffset: bufferByteOffset,
                byteLength: bufferViewData.byteLength
            };
            if (bufferViewTarget) bufferViewDef.target = bufferViewTarget;
            json.bufferViews.push(bufferViewDef);
            return {
                buffers,
                byteLength
            };
        }
        function interleaveAccessors(accessors, bufferIndex, bufferByteOffset) {
            const vertexCount = accessors[0].getCount();
            let byteStride = 0;
            for (const accessor of accessors){
                const accessorDef = context.createAccessorDef(accessor);
                accessorDef.bufferView = json.bufferViews.length;
                accessorDef.byteOffset = byteStride;
                const elementSize = accessor.getElementSize();
                const componentSize = accessor.getComponentSize();
                byteStride += BufferUtils.padNumber(elementSize * componentSize);
                context.accessorIndexMap.set(accessor, json.accessors.length);
                json.accessors.push(accessorDef);
            }
            const byteLength = vertexCount * byteStride;
            const buffer = new ArrayBuffer(byteLength);
            const view = new DataView(buffer);
            for(let i = 0; i < vertexCount; i++){
                let vertexByteOffset = 0;
                for (const accessor of accessors){
                    const elementSize = accessor.getElementSize();
                    const componentSize = accessor.getComponentSize();
                    const componentType = accessor.getComponentType();
                    const array = accessor.getArray();
                    for(let j = 0; j < elementSize; j++){
                        const viewByteOffset = i * byteStride + vertexByteOffset + j * componentSize;
                        const value = array[i * elementSize + j];
                        switch(componentType){
                            case Accessor.ComponentType.FLOAT:
                                view.setFloat32(viewByteOffset, value, true);
                                break;
                            case Accessor.ComponentType.BYTE:
                                view.setInt8(viewByteOffset, value);
                                break;
                            case Accessor.ComponentType.SHORT:
                                view.setInt16(viewByteOffset, value, true);
                                break;
                            case Accessor.ComponentType.UNSIGNED_BYTE:
                                view.setUint8(viewByteOffset, value);
                                break;
                            case Accessor.ComponentType.UNSIGNED_SHORT:
                                view.setUint16(viewByteOffset, value, true);
                                break;
                            case Accessor.ComponentType.UNSIGNED_INT:
                                view.setUint32(viewByteOffset, value, true);
                                break;
                            default:
                                throw new Error('Unexpected component type: ' + componentType);
                        }
                    }
                    vertexByteOffset += BufferUtils.padNumber(elementSize * componentSize);
                }
            }
            const bufferViewDef = {
                buffer: bufferIndex,
                byteOffset: bufferByteOffset,
                byteLength: byteLength,
                byteStride: byteStride,
                target: WriterContext.BufferViewTarget.ARRAY_BUFFER
            };
            json.bufferViews.push(bufferViewDef);
            return {
                byteLength,
                buffers: [
                    new Uint8Array(buffer)
                ]
            };
        }
        function concatSparseAccessors(accessors, bufferIndex, bufferByteOffset) {
            const buffers = [];
            let byteLength = 0;
            const sparseData = new Map();
            let maxIndex = -Infinity;
            for (const accessor of accessors){
                const accessorDef = context.createAccessorDef(accessor);
                json.accessors.push(accessorDef);
                context.accessorIndexMap.set(accessor, json.accessors.length - 1);
                const indices = [];
                const values = [];
                const el = [];
                const base = new Array(accessor.getElementSize()).fill(0);
                for(let i = 0, il = accessor.getCount(); i < il; i++){
                    accessor.getElement(i, el);
                    if (MathUtils.eq(el, base, 0)) continue;
                    maxIndex = Math.max(i, maxIndex);
                    indices.push(i);
                    for(let j = 0; j < el.length; j++)values.push(el[j]);
                }
                const count = indices.length;
                const data = {
                    accessorDef,
                    count
                };
                sparseData.set(accessor, data);
                if (count === 0) continue;
                if (count > accessor.getCount() / 3) {
                    const pct = (100 * indices.length / accessor.getCount()).toFixed(1);
                    logger.warn(`Sparse accessor with many non-zero elements (${pct}%) may increase file size.`);
                }
                const ValueArray = ComponentTypeToTypedArray[accessor.getComponentType()];
                data.indices = indices;
                data.values = new ValueArray(values);
            }
            if (!Number.isFinite(maxIndex)) {
                return {
                    buffers,
                    byteLength
                };
            }
            const IndexArray = maxIndex < 255 ? Uint8Array : maxIndex < 65535 ? Uint16Array : Uint32Array;
            const IndexComponentType = maxIndex < 255 ? UNSIGNED_BYTE : maxIndex < 65535 ? UNSIGNED_SHORT : UNSIGNED_INT;
            const indicesBufferViewDef = {
                buffer: bufferIndex,
                byteOffset: bufferByteOffset + byteLength,
                byteLength: 0
            };
            for (const accessor of accessors){
                const data = sparseData.get(accessor);
                if (data.count === 0) continue;
                data.indicesByteOffset = indicesBufferViewDef.byteLength;
                const buffer = BufferUtils.pad(BufferUtils.toView(new IndexArray(data.indices)));
                buffers.push(buffer);
                byteLength += buffer.byteLength;
                indicesBufferViewDef.byteLength += buffer.byteLength;
            }
            json.bufferViews.push(indicesBufferViewDef);
            const indicesBufferViewIndex = json.bufferViews.length - 1;
            const valuesBufferViewDef = {
                buffer: bufferIndex,
                byteOffset: bufferByteOffset + byteLength,
                byteLength: 0
            };
            for (const accessor of accessors){
                const data = sparseData.get(accessor);
                if (data.count === 0) continue;
                data.valuesByteOffset = valuesBufferViewDef.byteLength;
                const buffer = BufferUtils.pad(BufferUtils.toView(data.values));
                buffers.push(buffer);
                byteLength += buffer.byteLength;
                valuesBufferViewDef.byteLength += buffer.byteLength;
            }
            json.bufferViews.push(valuesBufferViewDef);
            const valuesBufferViewIndex = json.bufferViews.length - 1;
            for (const accessor of accessors){
                const data = sparseData.get(accessor);
                if (data.count === 0) continue;
                data.accessorDef.sparse = {
                    count: data.count,
                    indices: {
                        bufferView: indicesBufferViewIndex,
                        byteOffset: data.indicesByteOffset,
                        componentType: IndexComponentType
                    },
                    values: {
                        bufferView: valuesBufferViewIndex,
                        byteOffset: data.valuesByteOffset
                    }
                };
            }
            return {
                buffers,
                byteLength
            };
        }
        const accessorRefs = new Map();
        for (const ref of doc.getGraph().listEdges()){
            if (ref.getParent() === root) continue;
            const child = ref.getChild();
            if (child instanceof Accessor) {
                const uses = accessorRefs.get(child) || [];
                uses.push(ref);
                accessorRefs.set(child, uses);
            }
        }
        json.accessors = [];
        json.bufferViews = [];
        json.samplers = [];
        json.textures = [];
        json.images = root.listTextures().map((texture, textureIndex)=>{
            const imageDef = context.createPropertyDef(texture);
            if (texture.getMimeType()) {
                imageDef.mimeType = texture.getMimeType();
            }
            const image = texture.getImage();
            if (image) {
                context.createImageData(imageDef, image, texture);
            }
            context.imageIndexMap.set(texture, textureIndex);
            return imageDef;
        });
        extensionsUsed.filter((extension)=>extension.prewriteTypes.includes(PropertyType.ACCESSOR)).forEach((extension)=>extension.prewrite(context, PropertyType.ACCESSOR));
        root.listAccessors().forEach((accessor)=>{
            const groupByParent = context.accessorUsageGroupedByParent;
            const accessorParents = context.accessorParents;
            if (context.accessorIndexMap.has(accessor)) return;
            const accessorEdges = accessorRefs.get(accessor) || [];
            const usage = context.getAccessorUsage(accessor);
            context.addAccessorToUsageGroup(accessor, usage);
            if (groupByParent.has(usage)) {
                const parent = accessorEdges[0].getParent();
                const parentAccessors = accessorParents.get(parent) || new Set();
                parentAccessors.add(accessor);
                accessorParents.set(parent, parentAccessors);
            }
        });
        extensionsUsed.filter((extension)=>extension.prewriteTypes.includes(PropertyType.BUFFER)).forEach((extension)=>extension.prewrite(context, PropertyType.BUFFER));
        const hasBinaryResources = root.listAccessors().length > 0 || root.listTextures().length > 0 || context.otherBufferViews.size > 0;
        if (hasBinaryResources && root.listBuffers().length === 0) {
            throw new Error('Buffer required for Document resources, but none was found.');
        }
        json.buffers = [];
        root.listBuffers().forEach((buffer, index)=>{
            const bufferDef = context.createPropertyDef(buffer);
            const groupByParent = context.accessorUsageGroupedByParent;
            const accessorParents = context.accessorParents;
            const bufferAccessors = buffer.listParents().filter((property)=>property instanceof Accessor);
            const bufferAccessorsSet = new Set(bufferAccessors);
            const buffers = [];
            const bufferIndex = json.buffers.length;
            let bufferByteLength = 0;
            const usageGroups = context.listAccessorUsageGroups();
            for(const usage in usageGroups){
                if (groupByParent.has(usage)) {
                    for (const parentAccessors of Array.from(accessorParents.values())){
                        const accessors = Array.from(parentAccessors).filter((a)=>bufferAccessorsSet.has(a)).filter((a)=>context.getAccessorUsage(a) === usage);
                        if (!accessors.length) continue;
                        if (usage !== BufferViewUsage.ARRAY_BUFFER || options.vertexLayout === VertexLayout.INTERLEAVED) {
                            const result = usage === BufferViewUsage.ARRAY_BUFFER ? interleaveAccessors(accessors, bufferIndex, bufferByteLength) : concatAccessors(accessors, bufferIndex, bufferByteLength);
                            bufferByteLength += result.byteLength;
                            buffers.push(...result.buffers);
                        } else {
                            for (const accessor of accessors){
                                const result = interleaveAccessors([
                                    accessor
                                ], bufferIndex, bufferByteLength);
                                bufferByteLength += result.byteLength;
                                buffers.push(...result.buffers);
                            }
                        }
                    }
                } else {
                    const accessors = usageGroups[usage].filter((a)=>bufferAccessorsSet.has(a));
                    if (!accessors.length) continue;
                    const target = usage === BufferViewUsage.ELEMENT_ARRAY_BUFFER ? WriterContext.BufferViewTarget.ELEMENT_ARRAY_BUFFER : undefined;
                    const result = usage === BufferViewUsage.SPARSE ? concatSparseAccessors(accessors, bufferIndex, bufferByteLength) : concatAccessors(accessors, bufferIndex, bufferByteLength, target);
                    bufferByteLength += result.byteLength;
                    buffers.push(...result.buffers);
                }
            }
            if (context.imageBufferViews.length && index === 0) {
                for(let i = 0; i < context.imageBufferViews.length; i++){
                    json.bufferViews[json.images[i].bufferView].byteOffset = bufferByteLength;
                    bufferByteLength += context.imageBufferViews[i].byteLength;
                    buffers.push(context.imageBufferViews[i]);
                    if (bufferByteLength % 8) {
                        const imagePadding = 8 - bufferByteLength % 8;
                        bufferByteLength += imagePadding;
                        buffers.push(new Uint8Array(imagePadding));
                    }
                }
            }
            if (context.otherBufferViews.has(buffer)) {
                for (const data of context.otherBufferViews.get(buffer)){
                    json.bufferViews.push({
                        buffer: bufferIndex,
                        byteOffset: bufferByteLength,
                        byteLength: data.byteLength
                    });
                    context.otherBufferViewsIndexMap.set(data, json.bufferViews.length - 1);
                    bufferByteLength += data.byteLength;
                    buffers.push(data);
                }
            }
            if (bufferByteLength) {
                let uri;
                if (options.format === Format.GLB) {
                    uri = GLB_BUFFER;
                } else {
                    uri = context.bufferURIGenerator.createURI(buffer, 'bin');
                    bufferDef.uri = uri;
                }
                bufferDef.byteLength = bufferByteLength;
                jsonDoc.resources[uri] = BufferUtils.concat(buffers);
            }
            json.buffers.push(bufferDef);
            context.bufferIndexMap.set(buffer, index);
        });
        if (root.listAccessors().find((a)=>!a.getBuffer())) {
            logger.warn('Skipped writing one or more Accessors: no Buffer assigned.');
        }
        json.materials = root.listMaterials().map((material, index)=>{
            const materialDef = context.createPropertyDef(material);
            if (material.getAlphaMode() !== Material.AlphaMode.OPAQUE) {
                materialDef.alphaMode = material.getAlphaMode();
            }
            if (material.getAlphaMode() === Material.AlphaMode.MASK) {
                materialDef.alphaCutoff = material.getAlphaCutoff();
            }
            if (material.getDoubleSided()) materialDef.doubleSided = true;
            materialDef.pbrMetallicRoughness = {};
            if (!MathUtils.eq(material.getBaseColorFactor(), [
                1,
                1,
                1,
                1
            ])) {
                materialDef.pbrMetallicRoughness.baseColorFactor = material.getBaseColorFactor();
            }
            if (!MathUtils.eq(material.getEmissiveFactor(), [
                0,
                0,
                0
            ])) {
                materialDef.emissiveFactor = material.getEmissiveFactor();
            }
            if (material.getRoughnessFactor() !== 1) {
                materialDef.pbrMetallicRoughness.roughnessFactor = material.getRoughnessFactor();
            }
            if (material.getMetallicFactor() !== 1) {
                materialDef.pbrMetallicRoughness.metallicFactor = material.getMetallicFactor();
            }
            if (material.getBaseColorTexture()) {
                const texture = material.getBaseColorTexture();
                const textureInfo = material.getBaseColorTextureInfo();
                materialDef.pbrMetallicRoughness.baseColorTexture = context.createTextureInfoDef(texture, textureInfo);
            }
            if (material.getEmissiveTexture()) {
                const texture = material.getEmissiveTexture();
                const textureInfo = material.getEmissiveTextureInfo();
                materialDef.emissiveTexture = context.createTextureInfoDef(texture, textureInfo);
            }
            if (material.getNormalTexture()) {
                const texture = material.getNormalTexture();
                const textureInfo = material.getNormalTextureInfo();
                const textureInfoDef = context.createTextureInfoDef(texture, textureInfo);
                if (material.getNormalScale() !== 1) {
                    textureInfoDef.scale = material.getNormalScale();
                }
                materialDef.normalTexture = textureInfoDef;
            }
            if (material.getOcclusionTexture()) {
                const texture = material.getOcclusionTexture();
                const textureInfo = material.getOcclusionTextureInfo();
                const textureInfoDef = context.createTextureInfoDef(texture, textureInfo);
                if (material.getOcclusionStrength() !== 1) {
                    textureInfoDef.strength = material.getOcclusionStrength();
                }
                materialDef.occlusionTexture = textureInfoDef;
            }
            if (material.getMetallicRoughnessTexture()) {
                const texture = material.getMetallicRoughnessTexture();
                const textureInfo = material.getMetallicRoughnessTextureInfo();
                materialDef.pbrMetallicRoughness.metallicRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
            }
            context.materialIndexMap.set(material, index);
            return materialDef;
        });
        json.meshes = root.listMeshes().map((mesh, index)=>{
            const meshDef = context.createPropertyDef(mesh);
            let targetNames = null;
            meshDef.primitives = mesh.listPrimitives().map((primitive)=>{
                const primitiveDef = {
                    attributes: {}
                };
                primitiveDef.mode = primitive.getMode();
                const material = primitive.getMaterial();
                if (material) {
                    primitiveDef.material = context.materialIndexMap.get(material);
                }
                if (Object.keys(primitive.getExtras()).length) {
                    primitiveDef.extras = primitive.getExtras();
                }
                const indices = primitive.getIndices();
                if (indices) {
                    primitiveDef.indices = context.accessorIndexMap.get(indices);
                }
                for (const semantic of primitive.listSemantics()){
                    primitiveDef.attributes[semantic] = context.accessorIndexMap.get(primitive.getAttribute(semantic));
                }
                for (const target of primitive.listTargets()){
                    const targetDef = {};
                    for (const semantic of target.listSemantics()){
                        targetDef[semantic] = context.accessorIndexMap.get(target.getAttribute(semantic));
                    }
                    primitiveDef.targets = primitiveDef.targets || [];
                    primitiveDef.targets.push(targetDef);
                }
                if (primitive.listTargets().length && !targetNames) {
                    targetNames = primitive.listTargets().map((target)=>target.getName());
                }
                return primitiveDef;
            });
            if (mesh.getWeights().length) {
                meshDef.weights = mesh.getWeights();
            }
            if (targetNames) {
                meshDef.extras = meshDef.extras || {};
                meshDef.extras['targetNames'] = targetNames;
            }
            context.meshIndexMap.set(mesh, index);
            return meshDef;
        });
        json.cameras = root.listCameras().map((camera, index)=>{
            const cameraDef = context.createPropertyDef(camera);
            cameraDef.type = camera.getType();
            if (cameraDef.type === Camera.Type.PERSPECTIVE) {
                cameraDef.perspective = {
                    znear: camera.getZNear(),
                    zfar: camera.getZFar(),
                    yfov: camera.getYFov()
                };
                const aspectRatio = camera.getAspectRatio();
                if (aspectRatio !== null) {
                    cameraDef.perspective.aspectRatio = aspectRatio;
                }
            } else {
                cameraDef.orthographic = {
                    znear: camera.getZNear(),
                    zfar: camera.getZFar(),
                    xmag: camera.getXMag(),
                    ymag: camera.getYMag()
                };
            }
            context.cameraIndexMap.set(camera, index);
            return cameraDef;
        });
        json.nodes = root.listNodes().map((node, index)=>{
            const nodeDef = context.createPropertyDef(node);
            if (!MathUtils.eq(node.getTranslation(), [
                0,
                0,
                0
            ])) {
                nodeDef.translation = node.getTranslation();
            }
            if (!MathUtils.eq(node.getRotation(), [
                0,
                0,
                0,
                1
            ])) {
                nodeDef.rotation = node.getRotation();
            }
            if (!MathUtils.eq(node.getScale(), [
                1,
                1,
                1
            ])) {
                nodeDef.scale = node.getScale();
            }
            if (node.getWeights().length) {
                nodeDef.weights = node.getWeights();
            }
            context.nodeIndexMap.set(node, index);
            return nodeDef;
        });
        json.skins = root.listSkins().map((skin, index)=>{
            const skinDef = context.createPropertyDef(skin);
            const inverseBindMatrices = skin.getInverseBindMatrices();
            if (inverseBindMatrices) {
                skinDef.inverseBindMatrices = context.accessorIndexMap.get(inverseBindMatrices);
            }
            const skeleton = skin.getSkeleton();
            if (skeleton) {
                skinDef.skeleton = context.nodeIndexMap.get(skeleton);
            }
            skinDef.joints = skin.listJoints().map((joint)=>context.nodeIndexMap.get(joint));
            context.skinIndexMap.set(skin, index);
            return skinDef;
        });
        root.listNodes().forEach((node, index)=>{
            const nodeDef = json.nodes[index];
            const mesh = node.getMesh();
            if (mesh) {
                nodeDef.mesh = context.meshIndexMap.get(mesh);
            }
            const camera = node.getCamera();
            if (camera) {
                nodeDef.camera = context.cameraIndexMap.get(camera);
            }
            const skin = node.getSkin();
            if (skin) {
                nodeDef.skin = context.skinIndexMap.get(skin);
            }
            if (node.listChildren().length > 0) {
                nodeDef.children = node.listChildren().map((node)=>context.nodeIndexMap.get(node));
            }
        });
        json.animations = root.listAnimations().map((animation, index)=>{
            const animationDef = context.createPropertyDef(animation);
            const samplerIndexMap = new Map();
            animationDef.samplers = animation.listSamplers().map((sampler, samplerIndex)=>{
                const samplerDef = context.createPropertyDef(sampler);
                samplerDef.input = context.accessorIndexMap.get(sampler.getInput());
                samplerDef.output = context.accessorIndexMap.get(sampler.getOutput());
                samplerDef.interpolation = sampler.getInterpolation();
                samplerIndexMap.set(sampler, samplerIndex);
                return samplerDef;
            });
            animationDef.channels = animation.listChannels().map((channel)=>{
                const channelDef = context.createPropertyDef(channel);
                channelDef.sampler = samplerIndexMap.get(channel.getSampler());
                channelDef.target = {
                    node: context.nodeIndexMap.get(channel.getTargetNode()),
                    path: channel.getTargetPath()
                };
                return channelDef;
            });
            context.animationIndexMap.set(animation, index);
            return animationDef;
        });
        json.scenes = root.listScenes().map((scene, index)=>{
            const sceneDef = context.createPropertyDef(scene);
            sceneDef.nodes = scene.listChildren().map((node)=>context.nodeIndexMap.get(node));
            context.sceneIndexMap.set(scene, index);
            return sceneDef;
        });
        const defaultScene = root.getDefaultScene();
        if (defaultScene) {
            json.scene = root.listScenes().indexOf(defaultScene);
        }
        json.extensionsUsed = extensionsUsed.map((ext)=>ext.extensionName);
        json.extensionsRequired = extensionsRequired.map((ext)=>ext.extensionName);
        extensionsUsed.forEach((extension)=>extension.write(context));
        clean(json);
        return jsonDoc;
    }
}
function clean(object) {
    const unused = [];
    for(const key in object){
        const value = object[key];
        if (Array.isArray(value) && value.length === 0) {
            unused.push(key);
        } else if (value === null || value === '') {
            unused.push(key);
        } else if (value && typeof value === 'object' && Object.keys(value).length === 0) {
            unused.push(key);
        }
    }
    for (const key of unused){
        delete object[key];
    }
}
