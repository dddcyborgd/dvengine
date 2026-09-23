import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_IRIDESCENCE } from '../constants.js';
import { Iridescence } from './iridescence.js';
const NAME = KHR_MATERIALS_IRIDESCENCE;
export class KHRMaterialsIridescence extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createIridescence() {
        return new Iridescence(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const iridescence = this.createIridescence();
                context.materials[materialIndex].setExtension(NAME, iridescence);
                const iridescenceDef = materialDef.extensions[NAME];
                if (iridescenceDef.iridescenceFactor !== undefined) {
                    iridescence.setIridescenceFactor(iridescenceDef.iridescenceFactor);
                }
                if (iridescenceDef.iridescenceIor !== undefined) {
                    iridescence.setIridescenceIOR(iridescenceDef.iridescenceIor);
                }
                if (iridescenceDef.iridescenceThicknessMinimum !== undefined) {
                    iridescence.setIridescenceThicknessMinimum(iridescenceDef.iridescenceThicknessMinimum);
                }
                if (iridescenceDef.iridescenceThicknessMaximum !== undefined) {
                    iridescence.setIridescenceThicknessMaximum(iridescenceDef.iridescenceThicknessMaximum);
                }
                if (iridescenceDef.iridescenceTexture !== undefined) {
                    const textureInfoDef = iridescenceDef.iridescenceTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    iridescence.setIridescenceTexture(texture);
                    context.setTextureInfo(iridescence.getIridescenceTextureInfo(), textureInfoDef);
                }
                if (iridescenceDef.iridescenceThicknessTexture !== undefined) {
                    const textureInfoDef = iridescenceDef.iridescenceThicknessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    iridescence.setIridescenceThicknessTexture(texture);
                    context.setTextureInfo(iridescence.getIridescenceThicknessTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const iridescence = material.getExtension(NAME);
            if (iridescence) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const iridescenceDef = materialDef.extensions[NAME] = {};
                if (iridescence.getIridescenceFactor() > 0) {
                    iridescenceDef.iridescenceFactor = iridescence.getIridescenceFactor();
                }
                if (iridescence.getIridescenceIOR() !== 1.3) {
                    iridescenceDef.iridescenceIor = iridescence.getIridescenceIOR();
                }
                if (iridescence.getIridescenceThicknessMinimum() !== 100) {
                    iridescenceDef.iridescenceThicknessMinimum = iridescence.getIridescenceThicknessMinimum();
                }
                if (iridescence.getIridescenceThicknessMaximum() !== 400) {
                    iridescenceDef.iridescenceThicknessMaximum = iridescence.getIridescenceThicknessMaximum();
                }
                if (iridescence.getIridescenceTexture()) {
                    const texture = iridescence.getIridescenceTexture();
                    const textureInfo = iridescence.getIridescenceTextureInfo();
                    iridescenceDef.iridescenceTexture = context.createTextureInfoDef(texture, textureInfo);
                }
                if (iridescence.getIridescenceThicknessTexture()) {
                    const texture = iridescence.getIridescenceThicknessTexture();
                    const textureInfo = iridescence.getIridescenceThicknessTextureInfo();
                    iridescenceDef.iridescenceThicknessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
}
