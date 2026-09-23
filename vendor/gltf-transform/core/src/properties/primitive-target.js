import { BufferViewUsage, PropertyType } from '../constants.js';
import { Property } from './property.js';
export class PrimitiveTarget extends Property {
    init() {
        this.propertyType = PropertyType.PRIMITIVE_TARGET;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            attributes: {}
        });
    }
    getAttribute(semantic) {
        return this.getRefMap('attributes', semantic);
    }
    setAttribute(semantic, accessor) {
        return this.setRefMap('attributes', semantic, accessor, {
            usage: BufferViewUsage.ARRAY_BUFFER
        });
    }
    listAttributes() {
        return this.listRefMapValues('attributes');
    }
    listSemantics() {
        return this.listRefMapKeys('attributes');
    }
}
