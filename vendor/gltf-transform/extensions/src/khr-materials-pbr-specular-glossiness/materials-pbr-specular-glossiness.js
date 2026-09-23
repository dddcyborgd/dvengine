import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from '../constants.js';
import { PBRSpecularGlossiness } from './pbr-specular-glossiness.js';
const NAME = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
export class KHRMaterialsPBRSpecularGlossiness extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createPBRSpecularGlossiness() {
        return new PBRSpecularGlossiness(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const specGloss = this.createPBRSpecularGlossiness();
                context.materials[materialIndex].setExtension(NAME, specGloss);
                const specGlossDef = materialDef.extensions[NAME];
                if (specGlossDef.diffuseFactor !== undefined) {
                    specGloss.setDiffuseFactor(specGlossDef.diffuseFactor);
                }
                if (specGlossDef.specularFactor !== undefined) {
                    specGloss.setSpecularFactor(specGlossDef.specularFactor);
                }
                if (specGlossDef.glossinessFactor !== undefined) {
                    specGloss.setGlossinessFactor(specGlossDef.glossinessFactor);
                }
                if (specGlossDef.diffuseTexture !== undefined) {
                    const textureInfoDef = specGlossDef.diffuseTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    specGloss.setDiffuseTexture(texture);
                    context.setTextureInfo(specGloss.getDiffuseTextureInfo(), textureInfoDef);
                }
                if (specGlossDef.specularGlossinessTexture !== undefined) {
                    const textureInfoDef = specGlossDef.specularGlossinessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    specGloss.setSpecularGlossinessTexture(texture);
                    context.setTextureInfo(specGloss.getSpecularGlossinessTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const specGloss = material.getExtension(NAME);
            if (specGloss) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const specGlossDef = materialDef.extensions[NAME] = {
                    diffuseFactor: specGloss.getDiffuseFactor(),
                    specularFactor: specGloss.getSpecularFactor(),
                    glossinessFactor: specGloss.getGlossinessFactor()
                };
                if (specGloss.getDiffuseTexture()) {
                    const texture = specGloss.getDiffuseTexture();
                    const textureInfo = specGloss.getDiffuseTextureInfo();
                    specGlossDef.diffuseTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (specGloss.getSpecularGlossinessTexture()) {
                    const texture = specGloss.getSpecularGlossinessTexture();
                    const textureInfo = specGloss.getSpecularGlossinessTextureInfo();
                    specGlossDef.specularGlossinessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
}
