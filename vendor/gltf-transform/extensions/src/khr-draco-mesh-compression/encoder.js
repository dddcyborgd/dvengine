import { Accessor, Primitive } from '../../../core/index.js';
export let encoderModule;
export var EncoderMethod = /*#__PURE__*/ function(EncoderMethod) {
    EncoderMethod[EncoderMethod["EDGEBREAKER"] = 1] = "EDGEBREAKER";
    EncoderMethod[EncoderMethod["SEQUENTIAL"] = 0] = "SEQUENTIAL";
    return EncoderMethod;
}({});
var AttributeEnum = /*#__PURE__*/ function(AttributeEnum) {
    AttributeEnum["POSITION"] = "POSITION";
    AttributeEnum["NORMAL"] = "NORMAL";
    AttributeEnum["COLOR"] = "COLOR";
    AttributeEnum["TEX_COORD"] = "TEX_COORD";
    AttributeEnum["GENERIC"] = "GENERIC";
    return AttributeEnum;
}(AttributeEnum || {});
const DEFAULT_QUANTIZATION_BITS = {
    ["POSITION"]: 14,
    ["NORMAL"]: 10,
    ["COLOR"]: 8,
    ["TEX_COORD"]: 12,
    ["GENERIC"]: 12
};
const DEFAULT_ENCODER_OPTIONS = {
    decodeSpeed: 5,
    encodeSpeed: 5,
    method: 1,
    quantizationBits: DEFAULT_QUANTIZATION_BITS,
    quantizationVolume: 'mesh'
};
export function initEncoderModule(_encoderModule) {
    encoderModule = _encoderModule;
}
export function encodeGeometry(prim, _options = DEFAULT_ENCODER_OPTIONS) {
    const options = {
        ...DEFAULT_ENCODER_OPTIONS,
        ..._options
    };
    options.quantizationBits = {
        ...DEFAULT_QUANTIZATION_BITS,
        ..._options.quantizationBits
    };
    const encoder = new encoderModule.Encoder();
    const builder = new encoderModule.MeshBuilder();
    const mesh = new encoderModule.Mesh();
    const attributeIDs = {};
    const dracoBuffer = new encoderModule.DracoInt8Array();
    const hasMorphTargets = prim.listTargets().length > 0;
    let hasSparseAttributes = false;
    for (const semantic of prim.listSemantics()){
        const attribute = prim.getAttribute(semantic);
        if (attribute.getSparse()) {
            hasSparseAttributes = true;
            continue;
        }
        const attributeEnum = getAttributeEnum(semantic);
        const attributeID = addAttribute(builder, attribute.getComponentType(), mesh, encoderModule[attributeEnum], attribute.getCount(), attribute.getElementSize(), attribute.getArray());
        if (attributeID === -1) throw new Error(`Error compressing "${semantic}" attribute.`);
        attributeIDs[semantic] = attributeID;
        if (options.quantizationVolume === 'mesh' || semantic !== 'POSITION') {
            encoder.SetAttributeQuantization(encoderModule[attributeEnum], options.quantizationBits[attributeEnum]);
        } else if (typeof options.quantizationVolume === 'object') {
            const { quantizationVolume } = options;
            const range = Math.max(quantizationVolume.max[0] - quantizationVolume.min[0], quantizationVolume.max[1] - quantizationVolume.min[1], quantizationVolume.max[2] - quantizationVolume.min[2]);
            encoder.SetAttributeExplicitQuantization(encoderModule[attributeEnum], options.quantizationBits[attributeEnum], attribute.getElementSize(), quantizationVolume.min, range);
        } else {
            throw new Error('Invalid quantization volume state.');
        }
    }
    const indices = prim.getIndices();
    if (!indices) throw new EncodingError('Primitive must have indices.');
    builder.AddFacesToMesh(mesh, indices.getCount() / 3, indices.getArray());
    encoder.SetSpeedOptions(options.encodeSpeed, options.decodeSpeed);
    encoder.SetTrackEncodedProperties(true);
    if (options.method === 0 || hasMorphTargets || hasSparseAttributes) {
        encoder.SetEncodingMethod(encoderModule.MESH_SEQUENTIAL_ENCODING);
    } else {
        encoder.SetEncodingMethod(encoderModule.MESH_EDGEBREAKER_ENCODING);
    }
    const byteLength = encoder.EncodeMeshToDracoBuffer(mesh, dracoBuffer);
    if (byteLength <= 0) throw new EncodingError('Error applying Draco compression.');
    const data = new Uint8Array(byteLength);
    for(let i = 0; i < byteLength; ++i){
        data[i] = dracoBuffer.GetValue(i);
    }
    const prevNumVertices = prim.getAttribute('POSITION').getCount();
    const numVertices = encoder.GetNumberOfEncodedPoints();
    const numIndices = encoder.GetNumberOfEncodedFaces() * 3;
    if ((hasMorphTargets || hasSparseAttributes) && numVertices !== prevNumVertices) {
        throw new EncodingError('Compression reduced vertex count unexpectedly, corrupting mesh data.' + ' Applying the "weld" function before compression may resolve the issue.' + ' See: https://github.com/google/draco/issues/929');
    }
    encoderModule.destroy(dracoBuffer);
    encoderModule.destroy(mesh);
    encoderModule.destroy(builder);
    encoderModule.destroy(encoder);
    return {
        numVertices,
        numIndices,
        data,
        attributeIDs
    };
}
function getAttributeEnum(semantic) {
    if (semantic === 'POSITION') {
        return "POSITION";
    } else if (semantic === 'NORMAL') {
        return "NORMAL";
    } else if (semantic.startsWith('COLOR_')) {
        return "COLOR";
    } else if (semantic.startsWith('TEXCOORD_')) {
        return "TEX_COORD";
    }
    return "GENERIC";
}
function addAttribute(builder, componentType, mesh, attribute, count, itemSize, array) {
    switch(componentType){
        case Accessor.ComponentType.UNSIGNED_BYTE:
            return builder.AddUInt8Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.BYTE:
            return builder.AddInt8Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.UNSIGNED_SHORT:
            return builder.AddUInt16Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.SHORT:
            return builder.AddInt16Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.UNSIGNED_INT:
            return builder.AddUInt32Attribute(mesh, attribute, count, itemSize, array);
        case Accessor.ComponentType.FLOAT:
            return builder.AddFloatAttribute(mesh, attribute, count, itemSize, array);
        default:
            throw new Error(`Unexpected component type, "${componentType}".`);
    }
}
export class EncodingError extends Error {
}
