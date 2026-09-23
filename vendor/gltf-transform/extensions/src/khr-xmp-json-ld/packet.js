import { PropertyType, ExtensionProperty } from '../../../core/index.js';
import { KHR_XMP_JSON_LD } from '../constants.js';
const PARENT_TYPES = [
    PropertyType.ROOT,
    PropertyType.SCENE,
    PropertyType.NODE,
    PropertyType.MESH,
    PropertyType.MATERIAL,
    PropertyType.TEXTURE,
    PropertyType.ANIMATION
];
export class Packet extends ExtensionProperty {
    static EXTENSION_NAME = KHR_XMP_JSON_LD;
    init() {
        this.extensionName = KHR_XMP_JSON_LD;
        this.propertyType = 'Packet';
        this.parentTypes = PARENT_TYPES;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            context: {},
            properties: {}
        });
    }
    getContext() {
        return this.get('context');
    }
    setContext(context) {
        return this.set('context', {
            ...context
        });
    }
    listProperties() {
        return Object.keys(this.get('properties'));
    }
    getProperty(name) {
        const properties = this.get('properties');
        return name in properties ? properties[name] : null;
    }
    setProperty(name, value) {
        this._assertContext(name);
        const properties = {
            ...this.get('properties')
        };
        if (value) {
            properties[name] = value;
        } else {
            delete properties[name];
        }
        return this.set('properties', properties);
    }
    toJSONLD() {
        const context = copyJSON(this.get('context'));
        const properties = copyJSON(this.get('properties'));
        return {
            '@context': context,
            ...properties
        };
    }
    fromJSONLD(jsonld) {
        jsonld = copyJSON(jsonld);
        const context = jsonld['@context'];
        if (context) this.set('context', context);
        delete jsonld['@context'];
        return this.set('properties', jsonld);
    }
    _assertContext(name) {
        const prefix = name.split(':')[0];
        if (!(prefix in this.get('context'))) {
            throw new Error(`${KHR_XMP_JSON_LD}: Missing context for term, "${name}".`);
        }
    }
}
function copyJSON(object) {
    return JSON.parse(JSON.stringify(object));
}
