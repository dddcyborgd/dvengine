import { Property } from './property.js';
export class ExtensionProperty extends Property {
    static EXTENSION_NAME;
    _validateParent(parent) {
        if (!this.parentTypes.includes(parent.propertyType)) {
            throw new Error(`Parent "${parent.propertyType}" invalid for child "${this.propertyType}".`);
        }
    }
}
