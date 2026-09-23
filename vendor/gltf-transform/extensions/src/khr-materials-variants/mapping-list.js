import { ExtensionProperty, PropertyType } from '../../../core/index.js';
import { KHR_MATERIALS_VARIANTS } from '../constants.js';
export class MappingList extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;
    init() {
        this.extensionName = KHR_MATERIALS_VARIANTS;
        this.propertyType = 'MappingList';
        this.parentTypes = [
            PropertyType.PRIMITIVE
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            mappings: []
        });
    }
    addMapping(mapping) {
        return this.addRef('mappings', mapping);
    }
    removeMapping(mapping) {
        return this.removeRef('mappings', mapping);
    }
    listMappings() {
        return this.listRefs('mappings');
    }
}
