import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_UNLIT } from '../constants.js';
import { Unlit } from './unlit.js';
const NAME = KHR_MATERIALS_UNLIT;
export class KHRMaterialsUnlit extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createUnlit() {
        return new Unlit(this.document.getGraph());
    }
    read(context) {
        const materialDefs = context.jsonDoc.json.materials || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                context.materials[materialIndex].setExtension(NAME, this.createUnlit());
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            if (material.getExtension(NAME)) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                materialDef.extensions[NAME] = {};
            }
        });
        return this;
    }
}
