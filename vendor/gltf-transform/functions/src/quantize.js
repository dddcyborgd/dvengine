import { Accessor, AnimationChannel, Document, MathUtils, Mesh, Node, Primitive, PrimitiveTarget, PropertyType, Skin } from '../../core/index.js';
import { dedup } from './dedup.js';
import { fromRotationTranslationScale, fromScaling, invert, multiply as multiplyMat4 } from '../../gl-matrix/mat4.js';
import { max, min, scale, transformMat4 } from '../../gl-matrix/vec3.js';
import { InstancedMesh, KHRMeshQuantization } from '../../extensions/index.js';
import { prune } from './prune.js';
import { createTransform } from './utils.js';
import { sortPrimitiveWeights } from './sort-primitive-weights.js';
const NAME = 'quantize';
const SIGNED_INT = [
    Int8Array,
    Int16Array,
    Int32Array
];
const { TRANSLATION, ROTATION, SCALE, WEIGHTS } = AnimationChannel.TargetPath;
const TRS_CHANNELS = [
    TRANSLATION,
    ROTATION,
    SCALE
];
export const QUANTIZE_DEFAULTS = {
    pattern: /.*/,
    quantizationVolume: 'mesh',
    quantizePosition: 14,
    quantizeNormal: 10,
    quantizeTexcoord: 12,
    quantizeColor: 8,
    quantizeWeight: 8,
    quantizeGeneric: 12,
    normalizeWeights: true
};
const quantize = (_options = QUANTIZE_DEFAULTS)=>{
    const options = {
        ...QUANTIZE_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, async (doc)=>{
        const logger = doc.getLogger();
        const root = doc.getRoot();
        doc.createExtension(KHRMeshQuantization).setRequired(true);
        let nodeTransform = undefined;
        if (options.quantizationVolume === 'scene') {
            nodeTransform = getNodeTransform(expandBounds(root.listMeshes().map(getPositionQuantizationVolume)));
        }
        for (const mesh of doc.getRoot().listMeshes()){
            if (options.quantizationVolume === 'mesh') {
                nodeTransform = getNodeTransform(getPositionQuantizationVolume(mesh));
            }
            if (nodeTransform && options.pattern.test('POSITION')) {
                transformMeshParents(doc, mesh, nodeTransform);
                transformMeshMaterials(mesh, 1 / nodeTransform.scale);
            }
            for (const prim of mesh.listPrimitives()){
                quantizePrimitive(doc, prim, nodeTransform, options);
                for (const target of prim.listTargets()){
                    quantizePrimitive(doc, target, nodeTransform, options);
                }
            }
        }
        await doc.transform(prune({
            propertyTypes: [
                PropertyType.ACCESSOR,
                PropertyType.SKIN,
                PropertyType.MATERIAL
            ]
        }), dedup({
            propertyTypes: [
                PropertyType.ACCESSOR,
                PropertyType.MATERIAL,
                PropertyType.SKIN
            ]
        }));
        logger.debug(`${NAME}: Complete.`);
    });
};
function quantizePrimitive(doc, prim, nodeTransform, options) {
    const logger = doc.getLogger();
    for (const semantic of prim.listSemantics()){
        if (!options.pattern.test(semantic)) continue;
        const srcAttribute = prim.getAttribute(semantic);
        const { bits, ctor } = getQuantizationSettings(semantic, srcAttribute, logger, options);
        if (!ctor) continue;
        if (bits < 8 || bits > 16) throw new Error(`${NAME}: Requires bits = 8–16.`);
        if (srcAttribute.getComponentSize() <= bits / 8) continue;
        const dstAttribute = srcAttribute.clone();
        if (semantic === 'POSITION') {
            const scale = nodeTransform.scale;
            const transform = [];
            prim instanceof Primitive ? invert(transform, fromTransform(nodeTransform)) : fromScaling(transform, [
                1 / scale,
                1 / scale,
                1 / scale
            ]);
            for(let i = 0, el = [
                0,
                0,
                0
            ], il = dstAttribute.getCount(); i < il; i++){
                dstAttribute.getElement(i, el);
                dstAttribute.setElement(i, transformMat4(el, el, transform));
            }
        }
        quantizeAttribute(dstAttribute, ctor, bits);
        prim.swap(srcAttribute, dstAttribute);
    }
    if (options.normalizeWeights && prim.getAttribute('WEIGHTS_0')) {
        sortPrimitiveWeights(prim, Infinity);
    }
    if (prim instanceof Primitive && prim.getIndices() && prim.listAttributes().length && prim.listAttributes()[0].getCount() < 65535) {
        const indices = prim.getIndices();
        indices.setArray(new Uint16Array(indices.getArray()));
    }
}
function getNodeTransform(volume) {
    const { min, max } = volume;
    const scale = Math.max((max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2);
    const offset = [
        min[0] + (max[0] - min[0]) / 2,
        min[1] + (max[1] - min[1]) / 2,
        min[2] + (max[2] - min[2]) / 2
    ];
    return {
        offset,
        scale
    };
}
function transformMeshParents(doc, mesh, nodeTransform) {
    const transformMatrix = fromTransform(nodeTransform);
    for (const parent of mesh.listParents()){
        if (!(parent instanceof Node)) continue;
        const animChannels = parent.listParents().filter((p)=>p instanceof AnimationChannel);
        const isAnimated = animChannels.some((channel)=>TRS_CHANNELS.includes(channel.getTargetPath()));
        const isParentNode = parent.listChildren().length > 0;
        const skin = parent.getSkin();
        if (skin) {
            parent.setSkin(transformSkin(skin, nodeTransform));
            continue;
        }
        const batch = parent.getExtension('EXT_mesh_gpu_instancing');
        if (batch) {
            parent.setExtension('EXT_mesh_gpu_instancing', transformBatch(batch, nodeTransform));
            continue;
        }
        let targetNode;
        if (isParentNode || isAnimated) {
            targetNode = doc.createNode('').setMesh(mesh);
            parent.addChild(targetNode).setMesh(null);
            animChannels.filter((channel)=>channel.getTargetPath() === WEIGHTS).forEach((channel)=>channel.setTargetNode(targetNode));
        } else {
            targetNode = parent;
        }
        const nodeMatrix = targetNode.getMatrix();
        multiplyMat4(nodeMatrix, nodeMatrix, transformMatrix);
        targetNode.setMatrix(nodeMatrix);
    }
}
function transformSkin(skin, nodeTransform) {
    skin = skin.clone();
    const transformMatrix = fromTransform(nodeTransform);
    const inverseBindMatrices = skin.getInverseBindMatrices().clone();
    const ibm = [];
    for(let i = 0, count = inverseBindMatrices.getCount(); i < count; i++){
        inverseBindMatrices.getElement(i, ibm);
        multiplyMat4(ibm, ibm, transformMatrix);
        inverseBindMatrices.setElement(i, ibm);
    }
    return skin.setInverseBindMatrices(inverseBindMatrices);
}
function transformBatch(batch, nodeTransform) {
    if (!batch.getAttribute('TRANSLATION') && !batch.getAttribute('ROTATION') && !batch.getAttribute('SCALE')) {
        return batch;
    }
    batch = batch.clone();
    const instanceTranslation = batch.getAttribute('TRANSLATION')?.clone();
    const instanceRotation = batch.getAttribute('ROTATION')?.clone();
    const instanceScale = batch.getAttribute('SCALE')?.clone();
    const tpl = instanceTranslation || instanceRotation || instanceScale;
    const T_IDENTITY = [
        0,
        0,
        0
    ];
    const R_IDENTITY = [
        0,
        0,
        0,
        1
    ];
    const S_IDENTITY = [
        1,
        1,
        1
    ];
    const t = [
        0,
        0,
        0
    ];
    const r = [
        0,
        0,
        0,
        1
    ];
    const s = [
        1,
        1,
        1
    ];
    const instanceMatrix = [
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
    ];
    const transformMatrix = fromTransform(nodeTransform);
    for(let i = 0, count = tpl.getCount(); i < count; i++){
        MathUtils.compose(instanceTranslation ? instanceTranslation.getElement(i, t) : T_IDENTITY, instanceRotation ? instanceRotation.getElement(i, r) : R_IDENTITY, instanceScale ? instanceScale.getElement(i, s) : S_IDENTITY, instanceMatrix);
        multiplyMat4(instanceMatrix, instanceMatrix, transformMatrix);
        MathUtils.decompose(instanceMatrix, t, r, s);
        if (instanceTranslation) instanceTranslation.setElement(i, t);
        if (instanceRotation) instanceRotation.setElement(i, r);
        if (instanceScale) instanceScale.setElement(i, s);
    }
    if (instanceTranslation) batch.setAttribute('TRANSLATION', instanceTranslation);
    if (instanceRotation) batch.setAttribute('ROTATION', instanceRotation);
    if (instanceScale) batch.setAttribute('SCALE', instanceScale);
    return batch;
}
function transformMeshMaterials(mesh, scale) {
    for (const prim of mesh.listPrimitives()){
        let material = prim.getMaterial();
        if (!material) continue;
        let volume = material.getExtension('KHR_materials_volume');
        if (!volume || volume.getThicknessFactor() <= 0) continue;
        volume = volume.clone().setThicknessFactor(volume.getThicknessFactor() * scale);
        material = material.clone().setExtension('KHR_materials_volume', volume);
        prim.setMaterial(material);
    }
}
function quantizeAttribute(attribute, ctor, bits) {
    const dstArray = new ctor(attribute.getArray().length);
    const signBits = SIGNED_INT.includes(ctor) ? 1 : 0;
    const quantBits = bits - signBits;
    const storageBits = ctor.BYTES_PER_ELEMENT * 8 - signBits;
    const scale = Math.pow(2, quantBits) - 1;
    const lo = storageBits - quantBits;
    const hi = 2 * quantBits - storageBits;
    for(let i = 0, di = 0, el = []; i < attribute.getCount(); i++){
        attribute.getElement(i, el);
        for(let j = 0; j < el.length; j++){
            let value = Math.round(Math.abs(el[j]) * scale);
            value = value << lo | value >> hi;
            dstArray[di++] = value * Math.sign(el[j]);
        }
    }
    attribute.setArray(dstArray).setNormalized(true).setSparse(false);
}
function getQuantizationSettings(semantic, attribute, logger, options) {
    const min = attribute.getMinNormalized([]);
    const max = attribute.getMaxNormalized([]);
    let bits;
    let ctor;
    if (semantic === 'POSITION') {
        bits = options.quantizePosition;
        ctor = bits <= 8 ? Int8Array : Int16Array;
    } else if (semantic === 'NORMAL' || semantic === 'TANGENT') {
        bits = options.quantizeNormal;
        ctor = bits <= 8 ? Int8Array : Int16Array;
    } else if (semantic.startsWith('COLOR_')) {
        bits = options.quantizeColor;
        ctor = bits <= 8 ? Uint8Array : Uint16Array;
    } else if (semantic.startsWith('TEXCOORD_')) {
        if (min.some((v)=>v < 0) || max.some((v)=>v > 1)) {
            logger.warn(`${NAME}: Skipping ${semantic}; out of [0,1] range.`);
            return {
                bits: -1
            };
        }
        bits = options.quantizeTexcoord;
        ctor = bits <= 8 ? Uint8Array : Uint16Array;
    } else if (semantic.startsWith('JOINTS_')) {
        bits = Math.max(...attribute.getMax([])) <= 255 ? 8 : 16;
        ctor = bits <= 8 ? Uint8Array : Uint16Array;
        if (attribute.getComponentSize() > bits / 8) {
            attribute.setArray(new ctor(attribute.getArray()));
        }
        return {
            bits: -1
        };
    } else if (semantic.startsWith('WEIGHTS_')) {
        if (min.some((v)=>v < 0) || max.some((v)=>v > 1)) {
            logger.warn(`${NAME}: Skipping ${semantic}; out of [0,1] range.`);
            return {
                bits: -1
            };
        }
        bits = options.quantizeWeight;
        ctor = bits <= 8 ? Uint8Array : Uint16Array;
    } else if (semantic.startsWith('_')) {
        if (min.some((v)=>v < -1) || max.some((v)=>v > 1)) {
            logger.warn(`${NAME}: Skipping ${semantic}; out of [-1,1] range.`);
            return {
                bits: -1
            };
        }
        bits = options.quantizeGeneric;
        ctor = min.some((v)=>v < 0) ? ctor = bits <= 8 ? Int8Array : Int16Array : ctor = bits <= 8 ? Uint8Array : Uint16Array;
    } else {
        throw new Error(`${NAME}: Unexpected semantic, "${semantic}".`);
    }
    return {
        bits,
        ctor
    };
}
function getPositionQuantizationVolume(mesh) {
    const positions = [];
    const relativePositions = [];
    for (const prim of mesh.listPrimitives()){
        const attribute = prim.getAttribute('POSITION');
        if (attribute) positions.push(attribute);
        for (const target of prim.listTargets()){
            const attribute = target.getAttribute('POSITION');
            if (attribute) relativePositions.push(attribute);
        }
    }
    if (positions.length === 0) {
        throw new Error(`${NAME}: Missing "POSITION" attribute.`);
    }
    const bbox = flatBounds(positions, 3);
    if (relativePositions.length > 0) {
        const { min: relMin, max: relMax } = flatBounds(relativePositions, 3);
        min(bbox.min, bbox.min, min(relMin, scale(relMin, relMin, 2), [
            0,
            0,
            0
        ]));
        max(bbox.max, bbox.max, max(relMax, scale(relMax, relMax, 2), [
            0,
            0,
            0
        ]));
    }
    return bbox;
}
function flatBounds(accessors, elementSize) {
    const min = new Array(elementSize).fill(Infinity);
    const max = new Array(elementSize).fill(-Infinity);
    const tmpMin = [];
    const tmpMax = [];
    for (const accessor of accessors){
        accessor.getMinNormalized(tmpMin);
        accessor.getMaxNormalized(tmpMax);
        for(let i = 0; i < elementSize; i++){
            min[i] = Math.min(min[i], tmpMin[i]);
            max[i] = Math.max(max[i], tmpMax[i]);
        }
    }
    return {
        min,
        max
    };
}
function expandBounds(bboxes) {
    const result = bboxes[0];
    for (const bbox of bboxes){
        min(result.min, result.min, bbox.min);
        max(result.max, result.max, bbox.max);
    }
    return result;
}
function fromTransform(transform) {
    return fromRotationTranslationScale([], [
        0,
        0,
        0,
        1
    ], transform.offset, [
        transform.scale,
        transform.scale,
        transform.scale
    ]);
}
export { quantize };
