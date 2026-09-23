import { ExtensionProperty } from '../../../core/index.js';
import { PropertyType } from '../../../core/index.js';
import { KHR_MATERIALS_UNLIT } from '../constants.js';
export class Unlit extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_UNLIT;
    init() {
        this.extensionName = KHR_MATERIALS_UNLIT;
        this.propertyType = 'Unlit';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
}
