import { ExtensionProperty, PropertyType, Texture, TextureChannel, TextureInfo } from '../../../core/index.js';
import { KHR_MATERIALS_IRIDESCENCE } from '../constants.js';
const { R, G } = TextureChannel;
export class Iridescence extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_IRIDESCENCE;
    init() {
        this.extensionName = KHR_MATERIALS_IRIDESCENCE;
        this.propertyType = 'Iridescence';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            iridescenceFactor: 0.0,
            iridescenceTexture: null,
            iridescenceTextureInfo: new TextureInfo(this.graph, 'iridescenceTextureInfo'),
            iridescenceIOR: 1.3,
            iridescenceThicknessMinimum: 100,
            iridescenceThicknessMaximum: 400,
            iridescenceThicknessTexture: null,
            iridescenceThicknessTextureInfo: new TextureInfo(this.graph, 'iridescenceThicknessTextureInfo')
        });
    }
    getIridescenceFactor() {
        return this.get('iridescenceFactor');
    }
    setIridescenceFactor(factor) {
        return this.set('iridescenceFactor', factor);
    }
    getIridescenceTexture() {
        return this.getRef('iridescenceTexture');
    }
    getIridescenceTextureInfo() {
        return this.getRef('iridescenceTexture') ? this.getRef('iridescenceTextureInfo') : null;
    }
    setIridescenceTexture(texture) {
        return this.setRef('iridescenceTexture', texture, {
            channels: R
        });
    }
    getIridescenceIOR() {
        return this.get('iridescenceIOR');
    }
    setIridescenceIOR(ior) {
        return this.set('iridescenceIOR', ior);
    }
    getIridescenceThicknessMinimum() {
        return this.get('iridescenceThicknessMinimum');
    }
    setIridescenceThicknessMinimum(thickness) {
        return this.set('iridescenceThicknessMinimum', thickness);
    }
    getIridescenceThicknessMaximum() {
        return this.get('iridescenceThicknessMaximum');
    }
    setIridescenceThicknessMaximum(thickness) {
        return this.set('iridescenceThicknessMaximum', thickness);
    }
    getIridescenceThicknessTexture() {
        return this.getRef('iridescenceThicknessTexture');
    }
    getIridescenceThicknessTextureInfo() {
        return this.getRef('iridescenceThicknessTexture') ? this.getRef('iridescenceThicknessTextureInfo') : null;
    }
    setIridescenceThicknessTexture(texture) {
        return this.setRef('iridescenceThicknessTexture', texture, {
            channels: G
        });
    }
}
