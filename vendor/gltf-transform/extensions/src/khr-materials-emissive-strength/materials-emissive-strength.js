import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_EMISSIVE_STRENGTH } from '../constants.js';
import { EmissiveStrength } from './emissive-strength.js';
const NAME = KHR_MATERIALS_EMISSIVE_STRENGTH;
export class KHRMaterialsEmissiveStrength extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createEmissiveStrength() {
        return new EmissiveStrength(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const emissiveStrength = this.createEmissiveStrength();
                context.materials[materialIndex].setExtension(NAME, emissiveStrength);
                const emissiveStrengthDef = materialDef.extensions[NAME];
                if (emissiveStrengthDef.emissiveStrength !== undefined) {
                    emissiveStrength.setEmissiveStrength(emissiveStrengthDef.emissiveStrength);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const emissiveStrength = material.getExtension(NAME);
            if (emissiveStrength) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                materialDef.extensions[NAME] = {
                    emissiveStrength: emissiveStrength.getEmissiveStrength()
                };
            }
        });
        return this;
    }
}
