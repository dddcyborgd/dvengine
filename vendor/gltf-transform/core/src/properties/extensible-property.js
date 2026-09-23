import { Property } from './property.js';
export class ExtensibleProperty extends Property {
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            extensions: {}
        });
    }
    getExtension(name) {
        return this.getRefMap('extensions', name);
    }
    setExtension(name, extensionProperty) {
        if (extensionProperty) extensionProperty._validateParent(this);
        return this.setRefMap('extensions', name, extensionProperty);
    }
    listExtensions() {
        return this.listRefMapValues('extensions');
    }
}
