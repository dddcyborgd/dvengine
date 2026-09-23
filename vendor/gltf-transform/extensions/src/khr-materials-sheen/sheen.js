import { ColorUtils, ExtensionProperty, PropertyType, Texture, TextureChannel, TextureInfo } from '../../../core/index.js';
import { KHR_MATERIALS_SHEEN } from '../constants.js';
const { R, G, B, A } = TextureChannel;
export class Sheen extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_SHEEN;
    init() {
        this.extensionName = KHR_MATERIALS_SHEEN;
        this.propertyType = 'Sheen';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            sheenColorFactor: [
                0.0,
                0.0,
                0.0
            ],
            sheenColorTexture: null,
            sheenColorTextureInfo: new TextureInfo(this.graph, 'sheenColorTextureInfo'),
            sheenRoughnessFactor: 0.0,
            sheenRoughnessTexture: null,
            sheenRoughnessTextureInfo: new TextureInfo(this.graph, 'sheenRoughnessTextureInfo')
        });
    }
    getSheenColorFactor() {
        return this.get('sheenColorFactor');
    }
    getSheenColorHex() {
        return ColorUtils.factorToHex(this.getSheenColorFactor());
    }
    setSheenColorFactor(factor) {
        return this.set('sheenColorFactor', factor);
    }
    setSheenColorHex(hex) {
        const factor = this.getSheenColorFactor().slice();
        return this.set('sheenColorFactor', ColorUtils.hexToFactor(hex, factor));
    }
    getSheenColorTexture() {
        return this.getRef('sheenColorTexture');
    }
    getSheenColorTextureInfo() {
        return this.getRef('sheenColorTexture') ? this.getRef('sheenColorTextureInfo') : null;
    }
    setSheenColorTexture(texture) {
        return this.setRef('sheenColorTexture', texture, {
            channels: R | G | B
        });
    }
    getSheenRoughnessFactor() {
        return this.get('sheenRoughnessFactor');
    }
    setSheenRoughnessFactor(factor) {
        return this.set('sheenRoughnessFactor', factor);
    }
    getSheenRoughnessTexture() {
        return this.getRef('sheenRoughnessTexture');
    }
    getSheenRoughnessTextureInfo() {
        return this.getRef('sheenRoughnessTexture') ? this.getRef('sheenRoughnessTextureInfo') : null;
    }
    setSheenRoughnessTexture(texture) {
        return this.setRef('sheenRoughnessTexture', texture, {
            channels: A
        });
    }
}
