import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_CLEARCOAT } from '../constants.js';
import { Clearcoat } from './clearcoat.js';
const NAME = KHR_MATERIALS_CLEARCOAT;
export class KHRMaterialsClearcoat extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createClearcoat() {
        return new Clearcoat(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const clearcoat = this.createClearcoat();
                context.materials[materialIndex].setExtension(NAME, clearcoat);
                const clearcoatDef = materialDef.extensions[NAME];
                if (clearcoatDef.clearcoatFactor !== undefined) {
                    clearcoat.setClearcoatFactor(clearcoatDef.clearcoatFactor);
                }
                if (clearcoatDef.clearcoatRoughnessFactor !== undefined) {
                    clearcoat.setClearcoatRoughnessFactor(clearcoatDef.clearcoatRoughnessFactor);
                }
                if (clearcoatDef.clearcoatTexture !== undefined) {
                    const textureInfoDef = clearcoatDef.clearcoatTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    clearcoat.setClearcoatTexture(texture);
                    context.setTextureInfo(clearcoat.getClearcoatTextureInfo(), textureInfoDef);
                }
                if (clearcoatDef.clearcoatRoughnessTexture !== undefined) {
                    const textureInfoDef = clearcoatDef.clearcoatRoughnessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    clearcoat.setClearcoatRoughnessTexture(texture);
                    context.setTextureInfo(clearcoat.getClearcoatRoughnessTextureInfo(), textureInfoDef);
                }
                if (clearcoatDef.clearcoatNormalTexture !== undefined) {
                    const textureInfoDef = clearcoatDef.clearcoatNormalTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    clearcoat.setClearcoatNormalTexture(texture);
                    context.setTextureInfo(clearcoat.getClearcoatNormalTextureInfo(), textureInfoDef);
                    if (textureInfoDef.scale !== undefined) {
                        clearcoat.setClearcoatNormalScale(textureInfoDef.scale);
                    }
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const clearcoat = material.getExtension(NAME);
            if (clearcoat) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const clearcoatDef = materialDef.extensions[NAME] = {
                    clearcoatFactor: clearcoat.getClearcoatFactor(),
                    clearcoatRoughnessFactor: clearcoat.getClearcoatRoughnessFactor()
                };
                if (clearcoat.getClearcoatTexture()) {
                    const texture = clearcoat.getClearcoatTexture();
                    const textureInfo = clearcoat.getClearcoatTextureInfo();
                    clearcoatDef.clearcoatTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (clearcoat.getClearcoatRoughnessTexture()) {
                    const texture = clearcoat.getClearcoatRoughnessTexture();
                    const textureInfo = clearcoat.getClearcoatRoughnessTextureInfo();
                    clearcoatDef.clearcoatRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (clearcoat.getClearcoatNormalTexture()) {
                    const texture = clearcoat.getClearcoatNormalTexture();
                    const textureInfo = clearcoat.getClearcoatNormalTextureInfo();
                    clearcoatDef.clearcoatNormalTexture = context.createTextureInfoDef(texture, textureInfo);
                    if (clearcoat.getClearcoatNormalScale() !== 1) {
                        clearcoatDef.clearcoatNormalTexture.scale = clearcoat.getClearcoatNormalScale();
                    }
                }
            }
        });
        return this;
    }
}
