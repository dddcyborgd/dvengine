import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_TRANSMISSION } from '../constants.js';
import { Transmission } from './transmission.js';
const NAME = KHR_MATERIALS_TRANSMISSION;
export class KHRMaterialsTransmission extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createTransmission() {
        return new Transmission(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        const textureDefs = jsonDoc.json.textures || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const transmission = this.createTransmission();
                context.materials[materialIndex].setExtension(NAME, transmission);
                const transmissionDef = materialDef.extensions[NAME];
                if (transmissionDef.transmissionFactor !== undefined) {
                    transmission.setTransmissionFactor(transmissionDef.transmissionFactor);
                }
                if (transmissionDef.transmissionTexture !== undefined) {
                    const textureInfoDef = transmissionDef.transmissionTexture;
                    const texture = context.textures[textureDefs[textureInfoDef.index].source];
                    transmission.setTransmissionTexture(texture);
                    context.setTextureInfo(transmission.getTransmissionTextureInfo(), textureInfoDef);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const transmission = material.getExtension(NAME);
            if (transmission) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                const transmissionDef = materialDef.extensions[NAME] = {
                    transmissionFactor: transmission.getTransmissionFactor()
                };
                if (transmission.getTransmissionTexture()) {
                    const texture = transmission.getTransmissionTexture();
                    const textureInfo = transmission.getTransmissionTextureInfo();
                    transmissionDef.transmissionTexture = context.createTextureInfoDef(texture, textureInfo);
                }
            }
        });
        return this;
    }
}
