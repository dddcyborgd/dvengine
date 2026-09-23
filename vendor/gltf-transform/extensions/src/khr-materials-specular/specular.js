import { ColorUtils, ExtensionProperty, PropertyType, Texture, TextureChannel, TextureInfo } from '../../../core/index.js';
import { KHR_MATERIALS_SPECULAR } from '../constants.js';
const { R, G, B, A } = TextureChannel;
export class Specular extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_SPECULAR;
    init() {
        this.extensionName = KHR_MATERIALS_SPECULAR;
        this.propertyType = 'Specular';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            specularFactor: 1.0,
            specularTexture: null,
            specularTextureInfo: new TextureInfo(this.graph, 'specularTextureInfo'),
            specularColorFactor: [
                1.0,
                1.0,
                1.0
            ],
            specularColorTexture: null,
            specularColorTextureInfo: new TextureInfo(this.graph, 'specularColorTextureInfo')
        });
    }
    getSpecularFactor() {
        return this.get('specularFactor');
    }
    setSpecularFactor(factor) {
        return this.set('specularFactor', factor);
    }
    getSpecularColorFactor() {
        return this.get('specularColorFactor');
    }
    setSpecularColorFactor(factor) {
        return this.set('specularColorFactor', factor);
    }
    getSpecularColorHex() {
        return ColorUtils.factorToHex(this.getSpecularColorFactor());
    }
    setSpecularColorHex(hex) {
        const factor = this.getSpecularColorFactor().slice();
        return this.set('specularColorFactor', ColorUtils.hexToFactor(hex, factor));
    }
    getSpecularTexture() {
        return this.getRef('specularTexture');
    }
    getSpecularTextureInfo() {
        return this.getRef('specularTexture') ? this.getRef('specularTextureInfo') : null;
    }
    setSpecularTexture(texture) {
        return this.setRef('specularTexture', texture, {
            channels: A
        });
    }
    getSpecularColorTexture() {
        return this.getRef('specularColorTexture');
    }
    getSpecularColorTextureInfo() {
        return this.getRef('specularColorTexture') ? this.getRef('specularColorTextureInfo') : null;
    }
    setSpecularColorTexture(texture) {
        return this.setRef('specularColorTexture', texture, {
            channels: R | G | B
        });
    }
}
