export class ReaderContext {
    jsonDoc;
    buffers = [];
    bufferViews = [];
    bufferViewBuffers = [];
    accessors = [];
    textures = [];
    textureInfos = new Map();
    materials = [];
    meshes = [];
    cameras = [];
    nodes = [];
    skins = [];
    animations = [];
    scenes = [];
    constructor(jsonDoc){
        this.jsonDoc = jsonDoc;
    }
    setTextureInfo(textureInfo, textureInfoDef) {
        this.textureInfos.set(textureInfo, textureInfoDef);
        if (textureInfoDef.texCoord !== undefined) {
            textureInfo.setTexCoord(textureInfoDef.texCoord);
        }
        if (textureInfoDef.extras !== undefined) {
            textureInfo.setExtras(textureInfoDef.extras);
        }
        const textureDef = this.jsonDoc.json.textures[textureInfoDef.index];
        if (textureDef.sampler === undefined) return;
        const samplerDef = this.jsonDoc.json.samplers[textureDef.sampler];
        if (samplerDef.magFilter !== undefined) {
            textureInfo.setMagFilter(samplerDef.magFilter);
        }
        if (samplerDef.minFilter !== undefined) {
            textureInfo.setMinFilter(samplerDef.minFilter);
        }
        if (samplerDef.wrapS !== undefined) {
            textureInfo.setWrapS(samplerDef.wrapS);
        }
        if (samplerDef.wrapT !== undefined) {
            textureInfo.setWrapT(samplerDef.wrapT);
        }
    }
}
