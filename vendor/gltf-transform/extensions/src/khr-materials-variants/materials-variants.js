import { Extension, ReaderContext, WriterContext } from '../../../core/index.js';
import { KHR_MATERIALS_VARIANTS } from '../constants.js';
import { Mapping } from './mapping.js';
import { MappingList } from './mapping-list.js';
import { Variant } from './variant.js';
const NAME = KHR_MATERIALS_VARIANTS;
export class KHRMaterialsVariants extends Extension {
    extensionName = NAME;
    static EXTENSION_NAME = NAME;
    createMappingList() {
        return new MappingList(this.document.getGraph());
    }
    createVariant(name = '') {
        return new Variant(this.document.getGraph(), name);
    }
    createMapping() {
        return new Mapping(this.document.getGraph());
    }
    listVariants() {
        return Array.from(this.properties).filter((prop)=>prop instanceof Variant);
    }
    read(context) {
        const jsonDoc = context.jsonDoc;
        if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME]) return this;
        const variantsRootDef = jsonDoc.json.extensions[NAME];
        const variantDefs = variantsRootDef.variants || [];
        const variants = variantDefs.map((variantDef)=>this.createVariant().setName(variantDef.name || ''));
        const meshDefs = jsonDoc.json.meshes || [];
        meshDefs.forEach((meshDef, meshIndex)=>{
            const mesh = context.meshes[meshIndex];
            const primDefs = meshDef.primitives || [];
            primDefs.forEach((primDef, primIndex)=>{
                if (!primDef.extensions || !primDef.extensions[NAME]) {
                    return;
                }
                const mappingList = this.createMappingList();
                const variantPrimDef = primDef.extensions[NAME];
                for (const mappingDef of variantPrimDef.mappings){
                    const mapping = this.createMapping();
                    if (mappingDef.material !== undefined) {
                        mapping.setMaterial(context.materials[mappingDef.material]);
                    }
                    for (const variantIndex of mappingDef.variants || []){
                        mapping.addVariant(variants[variantIndex]);
                    }
                    mappingList.addMapping(mapping);
                }
                mesh.listPrimitives()[primIndex].setExtension(NAME, mappingList);
            });
        });
        return this;
    }
    write(context) {
        const jsonDoc = context.jsonDoc;
        const variants = this.listVariants();
        if (!variants.length) return this;
        const variantDefs = [];
        const variantIndexMap = new Map();
        for (const variant of variants){
            variantIndexMap.set(variant, variantDefs.length);
            variantDefs.push(context.createPropertyDef(variant));
        }
        for (const mesh of this.document.getRoot().listMeshes()){
            const meshIndex = context.meshIndexMap.get(mesh);
            mesh.listPrimitives().forEach((prim, primIndex)=>{
                const mappingList = prim.getExtension(NAME);
                if (!mappingList) return;
                const primDef = context.jsonDoc.json.meshes[meshIndex].primitives[primIndex];
                const mappingDefs = mappingList.listMappings().map((mapping)=>{
                    const mappingDef = context.createPropertyDef(mapping);
                    const material = mapping.getMaterial();
                    if (material) {
                        mappingDef.material = context.materialIndexMap.get(material);
                    }
                    mappingDef.variants = mapping.listVariants().map((variant)=>variantIndexMap.get(variant));
                    return mappingDef;
                });
                primDef.extensions = primDef.extensions || {};
                primDef.extensions[NAME] = {
                    mappings: mappingDefs
                };
            });
        }
        jsonDoc.json.extensions = jsonDoc.json.extensions || {};
        jsonDoc.json.extensions[NAME] = {
            variants: variantDefs
        };
        return this;
    }
}
