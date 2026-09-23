import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_SHEEN } from '../constants.js';
import { Sheen } from './sheen.js';
const NAME = KHR_MATERIALS_SHEEN;
export class KHRMaterialsSheen extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createSheen() {
        return new Sheen(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const sheen = this.createSheen();
                context.materials[materialIndex].setExtension(NAME, sheen);
                const sheenDef = materialDef.extensions[NAME];
                if (sheenDef.sheenColorFactor !== undefined) {
                    sheen.setSheenColorFactor(sheenDef.sheenColorFactor);
                }
                if (sheenDef.sheenRoughnessFactor !== undefined) {
                    sheen.setSheenRoughnessFactor(sheenDef.sheenRoughnessFactor);
                }
                if (sheenDef.sheenColorTexture !== undefined) {
                    const textureInfoDef = sheenDef.sheenColorTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    sheen.setSheenColorTexture(texture);
                    context.setTextureInfo(sheen.getSheenColorTextureInfo(), textureInfoDef);
                }
                if (sheenDef.sheenRoughnessTexture !== undefined) {
                    const textureInfoDef = sheenDef.sheenRoughnessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    sheen.setSheenRoughnessTexture(texture);
                    context.setTextureInfo(sheen.getSheenRoughnessTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const sheen = material.getExtension(NAME);
            if (sheen) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const sheenDef = materialDef.extensions[NAME] = {
                    sheenColorFactor: sheen.getSheenColorFactor(),
                    sheenRoughnessFactor: sheen.getSheenRoughnessFactor()
                };
                if (sheen.getSheenColorTexture()) {
                    const texture = sheen.getSheenColorTexture();
                    const textureInfo = sheen.getSheenColorTextureInfo();
                    sheenDef.sheenColorTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (sheen.getSheenRoughnessTexture()) {
                    const texture = sheen.getSheenRoughnessTexture();
                    const textureInfo = sheen.getSheenRoughnessTextureInfo();
                    sheenDef.sheenRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
}
