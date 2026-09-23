import { ExtensionProperty, PropertyType } from '../../../core/index.js';
import { KHR_MATERIALS_EMISSIVE_STRENGTH } from '../constants.js';
export class EmissiveStrength extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_EMISSIVE_STRENGTH;
    init() {
        this.extensionName = KHR_MATERIALS_EMISSIVE_STRENGTH;
        this.propertyType = 'EmissiveStrength';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            emissiveStrength: 1.0
        });
    }
    getEmissiveStrength() {
        return this.get('emissiveStrength');
    }
    setEmissiveStrength(strength) {
        return this.set('emissiveStrength', strength);
    }
}
