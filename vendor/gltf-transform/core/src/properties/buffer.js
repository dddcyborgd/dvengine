import { PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
export class Buffer extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.BUFFER;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            uri: ''
        });
    }
    getURI() {
        return this.get('uri');
    }
    setURI(uri) {
        return this.set('uri', uri);
    }
}
