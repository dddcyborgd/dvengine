import { Extension, ReaderContext, WriterContext, MathUtils } from '../../../core/index.js';
import { KHR_MATERIALS_SPECULAR } from '../constants.js';
import { Specular } from './specular.js';
const NAME = KHR_MATERIALS_SPECULAR;
export class KHRMaterialsSpecular extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createSpecular() {
        return new Specular(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const specular = this.createSpecular();
                context.materials[materialIndex].setExtension(NAME, specular);
                const specularDef = materialDef.extensions[NAME];
                if (specularDef.specularFactor !== undefined) {
                    specular.setSpecularFactor(specularDef.specularFactor);
                }
                if (specularDef.specularColorFactor !== undefined) {
                    specular.setSpecularColorFactor(specularDef.specularColorFactor);
                }
                if (specularDef.specularTexture !== undefined) {
                    const textureInfoDef = specularDef.specularTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    specular.setSpecularTexture(texture);
                    context.setTextureInfo(specular.getSpecularTextureInfo(), textureInfoDef);
                }
                if (specularDef.specularColorTexture !== undefined) {
                    const textureInfoDef = specularDef.specularColorTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    specular.setSpecularColorTexture(texture);
                    context.setTextureInfo(specular.getSpecularColorTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const specular = material.getExtension(NAME);
            if (specular) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const specularDef = materialDef.extensions[NAME] = {};
                if (specular.getSpecularFactor() !== 1) {
                    specularDef.specularFactor = specular.getSpecularFactor();
                }
                if (!MathUtils.eq(specular.getSpecularColorFactor(), [
                    1,
                    1,
                    1
                ])) {
                    specularDef.specularColorFactor = specular.getSpecularColorFactor();
                }
                if (specular.getSpecularTexture()) {
                    const texture = specular.getSpecularTexture();
                    const textureInfo = specular.getSpecularTextureInfo();
                    specularDef.specularTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (specular.getSpecularColorTexture()) {
                    const texture = specular.getSpecularColorTexture();
                    const textureInfo = specular.getSpecularColorTextureInfo();
                    specularDef.specularColorTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
}
