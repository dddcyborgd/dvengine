import { ColorUtils, ExtensionProperty, PropertyType, Texture, TextureChannel, TextureInfo } from '../../../core/index.js';
import { KHR_MATERIALS_VOLUME } from '../constants.js';
const { G } = TextureChannel;
export class Volume extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_VOLUME;
    init() {
        this.extensionName = KHR_MATERIALS_VOLUME;
        this.propertyType = 'Volume';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            thicknessFactor: 0.0,
            thicknessTexture: null,
            thicknessTextureInfo: new TextureInfo(this.graph, 'thicknessTexture'),
            attenuationDistance: Infinity,
            attenuationColor: [
                1.0,
                1.0,
                1.0
            ]
        });
    }
    getThicknessFactor() {
        return this.get('thicknessFactor');
    }
    setThicknessFactor(factor) {
        return this.set('thicknessFactor', factor);
    }
    getThicknessTexture() {
        return this.getRef('thicknessTexture');
    }
    getThicknessTextureInfo() {
        return this.getRef('thicknessTexture') ? this.getRef('thicknessTextureInfo') : null;
    }
    setThicknessTexture(texture) {
        return this.setRef('thicknessTexture', texture, {
            channels: G
        });
    }
    getAttenuationDistance() {
        return this.get('attenuationDistance');
    }
    setAttenuationDistance(distance) {
        return this.set('attenuationDistance', distance);
    }
    getAttenuationColor() {
        return this.get('attenuationColor');
    }
    setAttenuationColor(color) {
        return this.set('attenuationColor', color);
    }
    getAttenuationColorHex() {
        return ColorUtils.factorToHex(this.getAttenuationColor());
    }
    setAttenuationColorHex(hex) {
        const factor = this.getAttenuationColor().slice();
        return this.set('attenuationColor', ColorUtils.hexToFactor(hex, factor));
    }
}
