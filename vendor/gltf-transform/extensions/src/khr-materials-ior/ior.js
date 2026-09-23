import { ExtensionProperty, PropertyType } from '../../../core/index.js';
import { KHR_MATERIALS_IOR } from '../constants.js';
export class IOR extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_IOR;
    init() {
        this.extensionName = KHR_MATERIALS_IOR;
        this.propertyType = 'IOR';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            ior: 1.5
        });
    }
    getIOR() {
        return this.get('ior');
    }
    setIOR(ior) {
        return this.set('ior', ior);
    }
}
