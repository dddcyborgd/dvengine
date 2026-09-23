import { ExtensionProperty } from '../../../core/index.js';
import { KHR_MATERIALS_VARIANTS } from '../constants.js';
export class Variant extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_VARIANTS;
    init() {
        this.extensionName = KHR_MATERIALS_VARIANTS;
        this.propertyType = 'Variant';
        this.parentTypes = [
            'MappingList'
        ];
    }
}
