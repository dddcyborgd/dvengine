import { PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
export class TextureInfo extends ExtensibleProperty {
    static WrapMode = {
        CLAMP_TO_EDGE: 33071,
        MIRRORED_REPEAT: 33648,
        REPEAT: 10497
    };
    static MagFilter = {
        NEAREST: 9728,
        LINEAR: 9729
    };
    static MinFilter = {
        NEAREST: 9728,
        LINEAR: 9729,
        NEAREST_MIPMAP_NEAREST: 9984,
        LINEAR_MIPMAP_NEAREST: 9985,
        NEAREST_MIPMAP_LINEAR: 9986,
        LINEAR_MIPMAP_LINEAR: 9987
    };
    init() {
        this.propertyType = PropertyType.TEXTURE_INFO;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            texCoord: 0,
            magFilter: null,
            minFilter: null,
            wrapS: TextureInfo.WrapMode.REPEAT,
            wrapT: TextureInfo.WrapMode.REPEAT
        });
    }
    getTexCoord() {
        return this.get('texCoord');
    }
    setTexCoord(texCoord) {
        return this.set('texCoord', texCoord);
    }
    getMagFilter() {
        return this.get('magFilter');
    }
    setMagFilter(magFilter) {
        return this.set('magFilter', magFilter);
    }
    getMinFilter() {
        return this.get('minFilter');
    }
    setMinFilter(minFilter) {
        return this.set('minFilter', minFilter);
    }
    getWrapS() {
        return this.get('wrapS');
    }
    setWrapS(wrapS) {
        return this.set('wrapS', wrapS);
    }
    getWrapT() {
        return this.get('wrapT');
    }
    setWrapT(wrapT) {
        return this.set('wrapT', wrapT);
    }
}
