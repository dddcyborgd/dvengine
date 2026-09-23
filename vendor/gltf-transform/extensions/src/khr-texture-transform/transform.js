import { ExtensionProperty } from '../../../core/index.js';
import { PropertyType } from '../../../core/index.js';
import { KHR_TEXTURE_TRANSFORM } from '../constants.js';
export class Transform extends ExtensionProperty {
    static EXTENSION_NAME = KHR_TEXTURE_TRANSFORM;
    init() {
        this.extensionName = KHR_TEXTURE_TRANSFORM;
        this.propertyType = 'Transform';
        this.parentTypes = [
            PropertyType.TEXTURE_INFO
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            offset: [
                0.0,
                0.0
            ],
            rotation: 0,
            scale: [
                1.0,
                1.0
            ],
            texCoord: null
        });
    }
    getOffset() {
        return this.get('offset');
    }
    setOffset(offset) {
        return this.set('offset', offset);
    }
    getRotation() {
        return this.get('rotation');
    }
    setRotation(rotation) {
        return this.set('rotation', rotation);
    }
    getScale() {
        return this.get('scale');
    }
    setScale(scale) {
        return this.set('scale', scale);
    }
    getTexCoord() {
        return this.get('texCoord');
    }
    setTexCoord(texCoord) {
        return this.set('texCoord', texCoord);
    }
}
