import { ColorUtils, ExtensionProperty, PropertyType, Texture, TextureChannel, TextureInfo } from '../../../core/index.js';
import { KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS } from '../constants.js';
const { R, G, B, A } = TextureChannel;
export class PBRSpecularGlossiness extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
    init() {
        this.extensionName = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
        this.propertyType = 'PBRSpecularGlossiness';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            diffuseFactor: [
                1.0,
                1.0,
                1.0,
                1.0
            ],
            diffuseTexture: null,
            diffuseTextureInfo: new TextureInfo(this.graph, 'diffuseTextureInfo'),
            specularFactor: [
                1.0,
                1.0,
                1.0
            ],
            glossinessFactor: 1.0,
            specularGlossinessTexture: null,
            specularGlossinessTextureInfo: new TextureInfo(this.graph, 'specularGlossinessTextureInfo')
        });
    }
    getDiffuseFactor() {
        return this.get('diffuseFactor');
    }
    setDiffuseFactor(factor) {
        return this.set('diffuseFactor', factor);
    }
    getDiffuseHex() {
        return ColorUtils.factorToHex(this.getDiffuseFactor());
    }
    setDiffuseHex(hex) {
        const factor = this.getDiffuseFactor().slice();
        return this.setDiffuseFactor(ColorUtils.hexToFactor(hex, factor));
    }
    getDiffuseTexture() {
        return this.getRef('diffuseTexture');
    }
    getDiffuseTextureInfo() {
        return this.getRef('diffuseTexture') ? this.getRef('diffuseTextureInfo') : null;
    }
    setDiffuseTexture(texture) {
        return this.setRef('diffuseTexture', texture, {
            channels: R | G | B | A
        });
    }
    getSpecularFactor() {
        return this.get('specularFactor');
    }
    setSpecularFactor(factor) {
        return this.set('specularFactor', factor);
    }
    getGlossinessFactor() {
        return this.get('glossinessFactor');
    }
    setGlossinessFactor(factor) {
        return this.set('glossinessFactor', factor);
    }
    getSpecularGlossinessTexture() {
        return this.getRef('specularGlossinessTexture');
    }
    getSpecularGlossinessTextureInfo() {
        return this.getRef('specularGlossinessTexture') ? this.getRef('specularGlossinessTextureInfo') : null;
    }
    setSpecularGlossinessTexture(texture) {
        return this.setRef('specularGlossinessTexture', texture, {
            channels: R | G | B | A
        });
    }
}
