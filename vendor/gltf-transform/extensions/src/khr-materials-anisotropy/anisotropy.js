import { ExtensionProperty, PropertyType, Texture, TextureChannel, TextureInfo } from '../../../core/index.js';
import { KHR_MATERIALS_ANISOTROPY } from '../constants.js';
const { R, G } = TextureChannel;
export class Anisotropy extends ExtensionProperty {
    static EXTENSION_NAME = KHR_MATERIALS_ANISOTROPY;
    init() {
        this.extensionName = KHR_MATERIALS_ANISOTROPY;
        this.propertyType = 'Anisotropy';
        this.parentTypes = [
            PropertyType.MATERIAL
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            anisotropyStrength: 0.0,
            anisotropyRotation: 0.0,
            anisotropyTexture: null,
            anisotropyTextureInfo: new TextureInfo(this.graph, 'anisotropyTextureInfo')
        });
    }
    getAnisotropyStrength() {
        return this.get('anisotropyStrength');
    }
    setAnisotropyStrength(strength) {
        return this.set('anisotropyStrength', strength);
    }
    getAnisotropyRotation() {
        return this.get('anisotropyRotation');
    }
    setAnisotropyRotation(rotation) {
        return this.set('anisotropyRotation', rotation);
    }
    getAnisotropyTexture() {
        return this.getRef('anisotropyTexture');
    }
    getAnisotropyTextureInfo() {
        return this.getRef('anisotropyTexture') ? this.getRef('anisotropyTextureInfo') : null;
    }
    setAnisotropyTexture(texture) {
        return this.setRef('anisotropyTexture', texture, {
            channels: R | G
        });
    }
}
