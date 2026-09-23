import { ExtensionProperty, Material } from '../../../core/index.js';
import { KHR_MATERIALS_VARIANTS } from '../constants.js';
export class Mapping extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;
    init() {
        this.extensionName = KHR_MATERIALS_VARIANTS;
        this.propertyType = 'Mapping';
        this.parentTypes = [
            'MappingList'
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            material: null,
            variants: []
        });
    }
    getMaterial() {
        return this.getRef('material');
    }
    setMaterial(material) {
        return this.setRef('material', material);
    }
    addVariant(variant) {
        return this.addRef('variants', variant);
    }
    removeVariant(variant) {
        return this.removeRef('variants', variant);
    }
    listVariants() {
        return this.listRefs('variants');
    }
}
