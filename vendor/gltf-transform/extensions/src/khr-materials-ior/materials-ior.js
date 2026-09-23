import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_IOR } from '../constants.js';
import { IOR } from './ior.js';
const NAME = KHR_MATERIALS_IOR;
export class KHRMaterialsIOR extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createIOR() {
        return new IOR(this.document.getGraph());
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        const materialDefs = jsonDoc.json.materials || [];
        materialDefs.forEach((materialDef, materialIndex)=>{
            if (materialDef.extensions && materialDef.extensions[NAME]) {
                const ior = this.createIOR();
                context.materials[materialIndex].setExtension(NAME, ior);
                const iorDef = materialDef.extensions[NAME];
                if (iorDef.ior !== undefined) {
                    ior.setIOR(iorDef.ior);
                }
            }
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        this.document.getRoot().listMaterials().forEach((material)=>{
            const ior = material.getExtension(NAME);
            if (ior) {
                const materialIndex = context.materialIndexMap.get(material);
                const materialDef = jsonDoc.json.materials[materialIndex];
                materialDef.extensions = materialDef.extensions || {};
                materialDef.extensions[NAME] = {
                    ior: ior.getIOR()
                };
            }
        });
        return this;
    }
}
