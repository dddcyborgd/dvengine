import { ExtensionProperty, PropertyType, Texture, TextureChannel, TextureInfo } from '../../../core/index.js';
import { KHR_MATERIALS_CLEARCOAT } from '../constants.js';
const { R, G, B } = TextureChannel;
export class Clearcoat extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_CLEARCOAT;
    init() {
        this.extensionName = KHR_MATERIALS_CLEARCOAT;
        this.propertyType = 'Clearcoat';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            clearcoatFactor: 0,
            clearcoatTexture: null,
            clearcoatTextureInfo: new TextureInfo(this.graph, 'clearcoatTextureInfo'),
            clearcoatRoughnessFactor: 0,
            clearcoatRoughnessTexture: null,
            clearcoatRoughnessTextureInfo: new TextureInfo(this.graph, 'clearcoatRoughnessTextureInfo'),
            clearcoatNormalScale: 1,
            clearcoatNormalTexture: null,
            clearcoatNormalTextureInfo: new TextureInfo(this.graph, 'clearcoatNormalTextureInfo')
        });
    }
    getClearcoatFactor() {
        return this.get('clearcoatFactor');
    }
    setClearcoatFactor(factor) {
        return this.set('clearcoatFactor', factor);
    }
    getClearcoatTexture() {
        return this.getRef('clearcoatTexture');
    }
    getClearcoatTextureInfo() {
        return this.getRef('clearcoatTexture') ? this.getRef('clearcoatTextureInfo') : null;
    }
    setClearcoatTexture(texture) {
        return this.setRef('clearcoatTexture', texture, {
            channels: R
        });
    }
    getClearcoatRoughnessFactor() {
        return this.get('clearcoatRoughnessFactor');
    }
    setClearcoatRoughnessFactor(factor) {
        return this.set('clearcoatRoughnessFactor', factor);
    }
    getClearcoatRoughnessTexture() {
        return this.getRef('clearcoatRoughnessTexture');
    }
    getClearcoatRoughnessTextureInfo() {
        return this.getRef('clearcoatRoughnessTexture') ? this.getRef('clearcoatRoughnessTextureInfo') : null;
    }
    setClearcoatRoughnessTexture(texture) {
        return this.setRef('clearcoatRoughnessTexture', texture, {
            channels: G
        });
    }
    getClearcoatNormalScale() {
        return this.get('clearcoatNormalScale');
    }
    setClearcoatNormalScale(scale) {
        return this.set('clearcoatNormalScale', scale);
    }
    getClearcoatNormalTexture() {
        return this.getRef('clearcoatNormalTexture');
    }
    getClearcoatNormalTextureInfo() {
        return this.getRef('clearcoatNormalTexture') ? this.getRef('clearcoatNormalTextureInfo') : null;
    }
    setClearcoatNormalTexture(texture) {
        return this.setRef('clearcoatNormalTexture', texture, {
            channels: R | G | B
        });
    }
}
