export const VERSION = "v3.2.0";
export const NAME = '@gltf-transform/core';
export const GLB_BUFFER = '@glb.bin';
export var PropertyType = /*#__PURE__*/ function(PropertyType) {
    PropertyType["ACCESSOR"] = "Accessor";
    PropertyType["ANIMATION"] = "Animation";
    PropertyType["ANIMATION_CHANNEL"] = "AnimationChannel";
    PropertyType["ANIMATION_SAMPLER"] = "AnimationSampler";
    PropertyType["BUFFER"] = "Buffer";
    PropertyType["CAMERA"] = "Camera";
    PropertyType["MATERIAL"] = "Material";
    PropertyType["MESH"] = "Mesh";
    PropertyType["PRIMITIVE"] = "Primitive";
    PropertyType["PRIMITIVE_TARGET"] = "PrimitiveTarget";
    PropertyType["NODE"] = "Node";
    PropertyType["ROOT"] = "Root";
    PropertyType["SCENE"] = "Scene";
    PropertyType["SKIN"] = "Skin";
    PropertyType["TEXTURE"] = "Texture";
    PropertyType["TEXTURE_INFO"] = "TextureInfo";
    return PropertyType;
}({});
export var VertexLayout = /*#__PURE__*/ function(VertexLayout) {
    VertexLayout["INTERLEAVED"] = "interleaved";
    VertexLayout["SEPARATE"] = "separate";
    return VertexLayout;
}({});
export var BufferViewUsage = /*#__PURE__*/ function(BufferViewUsage) {
    BufferViewUsage["ARRAY_BUFFER"] = "ARRAY_BUFFER";
    BufferViewUsage["ELEMENT_ARRAY_BUFFER"] = "ELEMENT_ARRAY_BUFFER";
    BufferViewUsage["INVERSE_BIND_MATRICES"] = "INVERSE_BIND_MATRICES";
    BufferViewUsage["OTHER"] = "OTHER";
    BufferViewUsage["SPARSE"] = "SPARSE";
    return BufferViewUsage;
}({});
export var TextureChannel = /*#__PURE__*/ function(TextureChannel) {
    TextureChannel[TextureChannel["R"] = 4096] = "R";
    TextureChannel[TextureChannel["G"] = 256] = "G";
    TextureChannel[TextureChannel["B"] = 16] = "B";
    TextureChannel[TextureChannel["A"] = 1] = "A";
    return TextureChannel;
}({});
export var Format = /*#__PURE__*/ function(Format) {
    Format["GLTF"] = "GLTF";
    Format["GLB"] = "GLB";
    return Format;
}({});
export const ComponentTypeToTypedArray = {
    '5120': Int8Array,
    '5121': Uint8Array,
    '5122': Int16Array,
    '5123': Uint16Array,
    '5125': Uint32Array,
    '5126': Float32Array
};
