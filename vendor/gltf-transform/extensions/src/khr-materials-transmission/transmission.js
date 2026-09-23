import { ExtensionProperty, PropertyType, Texture, TextureChannel, TextureInfo } from '../../../core/index.js';
import { KHR_MATERIALS_TRANSMISSION } from '../constants.js';
const { R } = TextureChannel;
export class Transmission extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_TRANSMISSION;
    init() {
        this.extensionName = KHR_MATERIALS_TRANSMISSION;
        this.propertyType = 'Transmission';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            transmissionFactor: 0.0,
            transmissionTexture: null,
            transmissionTextureInfo: new TextureInfo(this.graph, 'transmissionTextureInfo')
        });
    }
    getTransmissionFactor() {
        return this.get('transmissionFactor');
    }
    setTransmissionFactor(factor) {
        return this.set('transmissionFactor', factor);
    }
    getTransmissionTexture() {
        return this.getRef('transmissionTexture');
    }
    getTransmissionTextureInfo() {
        return this.getRef('transmissionTexture') ? this.getRef('transmissionTextureInfo') : null;
    }
    setTransmissionTexture(texture) {
        return this.setRef('transmissionTexture', texture, {
            channels: R
        });
    }
}
