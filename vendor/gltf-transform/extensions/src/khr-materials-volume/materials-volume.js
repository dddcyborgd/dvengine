import { Extension, ReaderContext, WriterContext, MathUtils } from '../../../core/index.js';
import { KHR_MATERIALS_VOLUME } from '../constants.js';
import { Volume } from './volume.js';
const NAME = KHR_MATERIALS_VOLUME;
export class KHRMaterialsVolume extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createVolume() {
        return new Volume(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const volume = this.createVolume();
                context.materials[materialIndex].setExtension(NAME, volume);
                const volumeDef = materialDef.extensions[NAME];
                if (volumeDef.thicknessFactor !== undefined) {
                    volume.setThicknessFactor(volumeDef.thicknessFactor);
                }
                if (volumeDef.attenuationDistance !== undefined) {
                    volume.setAttenuationDistance(volumeDef.attenuationDistance);
                }
                if (volumeDef.attenuationColor !== undefined) {
                    volume.setAttenuationColor(volumeDef.attenuationColor);
                }
                if (volumeDef.thicknessTexture !== undefined) {
                    const textureInfoDef = volumeDef.thicknessTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    volume.setThicknessTexture(texture);
                    context.setTextureInfo(volume.getThicknessTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const volume = material.getExtension(NAME);
            if (volume) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const volumeDef = materialDef.extensions[NAME] = {};
                if (volume.getThicknessFactor() > 0) {
                    volumeDef.thicknessFactor = volume.getThicknessFactor();
                }
                if (Number.isFinite(volume.getAttenuationDistance())) {
                    volumeDef.attenuationDistance = volume.getAttenuationDistance();
                }
                if (!MathUtils.eq(volume.getAttenuationColor(), [
                    1,
                    1,
                    1
                ])) {
                    volumeDef.attenuationColor = volume.getAttenuationColor();
                }
                if (volume.getThicknessTexture()) {
                    const texture = volume.getThicknessTexture();
                    const textureInfo = volume.getThicknessTextureInfo();
                    volumeDef.thicknessTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
}
