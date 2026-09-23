import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_ANISOTROPY } from '../constants.js';
import { Anisotropy } from './anisotropy.js';
const NAME = KHR_MATERIALS_ANISOTROPY;
export class KHRMaterialsAnisotropy extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createAnisotropy() {
        return new Anisotropy(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const anisotropy = this.createAnisotropy();
                context.materials[materialIndex].setExtension(NAME, anisotropy);
                const anisotropyDef = materialDef.extensions[NAME];
                if (anisotropyDef.anisotropyStrength !== undefined) {
                    anisotropy.setAnisotropyStrength(anisotropyDef.anisotropyStrength);
                }
                if (anisotropyDef.anisotropyRotation !== undefined) {
                    anisotropy.setAnisotropyRotation(anisotropyDef.anisotropyRotation);
                }
                if (anisotropyDef.anisotropyTexture !== undefined) {
                    const textureInfoDef = anisotropyDef.anisotropyTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    anisotropy.setAnisotropyTexture(texture);
                    context.setTextureInfo(anisotropy.getAnisotropyTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const anisotropy = material.getExtension(NAME);
            if (anisotropy) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const anisotropyDef = materialDef.extensions[NAME] = {};
                if (anisotropy.getAnisotropyStrength() > 0) {
                    anisotropyDef.anisotropyStrength = anisotropy.getAnisotropyStrength();
                }
                if (anisotropy.getAnisotropyRotation() !== 0) {
                    anisotropyDef.anisotropyRotation = anisotropy.getAnisotropyRotation();
                }
                if (anisotropy.getAnisotropyTexture()) {
                    const texture = anisotropy.getAnisotropyTexture();
                    const textureInfo = anisotropy.getAnisotropyTextureInfo();
                    anisotropyDef.anisotropyTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
}
