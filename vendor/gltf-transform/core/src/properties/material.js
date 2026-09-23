import { PropertyType, TextureChannel } from '../constants.js';
import { ColorUtils } from '../utils/index.js';
import { ExtensibleProperty } from './extensible-property.js';
import { TextureInfo } from './texture-info.js';
const { R, G, B, A } = TextureChannel;
export class Material extends ExtensibleProperty {
    static AlphaMode = {
        OPAQUE: 'OPAQUE',
        MASK: 'MASK',
        BLEND: 'BLEND'
    };
    init() {
        this.propertyType = PropertyType.MATERIAL;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            alphaMode: Material.AlphaMode.OPAQUE,
            alphaCutoff: 0.5,
            doubleSided: false,
            baseColorFactor: [
                1,
                1,
                1,
                1
            ],
            baseColorTexture: null,
            baseColorTextureInfo: new TextureInfo(this.graph, 'baseColorTextureInfo'),
            emissiveFactor: [
                0,
                0,
                0
            ],
            emissiveTexture: null,
            emissiveTextureInfo: new TextureInfo(this.graph, 'emissiveTextureInfo'),
            normalScale: 1,
            normalTexture: null,
            normalTextureInfo: new TextureInfo(this.graph, 'normalTextureInfo'),
            occlusionStrength: 1,
            occlusionTexture: null,
            occlusionTextureInfo: new TextureInfo(this.graph, 'occlusionTextureInfo'),
            roughnessFactor: 1,
            metallicFactor: 1,
            metallicRoughnessTexture: null,
            metallicRoughnessTextureInfo: new TextureInfo(this.graph, 'metallicRoughnessTextureInfo')
        });
    }
    getDoubleSided() {
        return this.get('doubleSided');
    }
    setDoubleSided(doubleSided) {
        return this.set('doubleSided', doubleSided);
    }
    getAlpha() {
        return this.get('baseColorFactor')[3];
    }
    setAlpha(alpha) {
        const baseColorFactor = this.get('baseColorFactor').slice();
        baseColorFactor[3] = alpha;
        return this.set('baseColorFactor', baseColorFactor);
    }
    getAlphaMode() {
        return this.get('alphaMode');
    }
    setAlphaMode(alphaMode) {
        return this.set('alphaMode', alphaMode);
    }
    getAlphaCutoff() {
        return this.get('alphaCutoff');
    }
    setAlphaCutoff(alphaCutoff) {
        return this.set('alphaCutoff', alphaCutoff);
    }
    getBaseColorFactor() {
        return this.get('baseColorFactor');
    }
    setBaseColorFactor(baseColorFactor) {
        return this.set('baseColorFactor', baseColorFactor);
    }
    getBaseColorHex() {
        return ColorUtils.factorToHex(this.get('baseColorFactor'));
    }
    setBaseColorHex(hex) {
        const factor = this.get('baseColorFactor').slice();
        return this.set('baseColorFactor', ColorUtils.hexToFactor(hex, factor));
    }
    getBaseColorTexture() {
        return this.getRef('baseColorTexture');
    }
    getBaseColorTextureInfo() {
        return this.getRef('baseColorTexture') ? this.getRef('baseColorTextureInfo') : null;
    }
    setBaseColorTexture(texture) {
        return this.setRef('baseColorTexture', texture, {
            channels: R | G | B | A
        });
    }
    getEmissiveFactor() {
        return this.get('emissiveFactor');
    }
    setEmissiveFactor(emissiveFactor) {
        return this.set('emissiveFactor', emissiveFactor);
    }
    getEmissiveHex() {
        return ColorUtils.factorToHex(this.get('emissiveFactor'));
    }
    setEmissiveHex(hex) {
        const factor = this.get('emissiveFactor').slice();
        return this.set('emissiveFactor', ColorUtils.hexToFactor(hex, factor));
    }
    getEmissiveTexture() {
        return this.getRef('emissiveTexture');
    }
    getEmissiveTextureInfo() {
        return this.getRef('emissiveTexture') ? this.getRef('emissiveTextureInfo') : null;
    }
    setEmissiveTexture(texture) {
        return this.setRef('emissiveTexture', texture, {
            channels: R | G | B
        });
    }
    getNormalScale() {
        return this.get('normalScale');
    }
    setNormalScale(scale) {
        return this.set('normalScale', scale);
    }
    getNormalTexture() {
        return this.getRef('normalTexture');
    }
    getNormalTextureInfo() {
        return this.getRef('normalTexture') ? this.getRef('normalTextureInfo') : null;
    }
    setNormalTexture(texture) {
        return this.setRef('normalTexture', texture, {
            channels: R | G | B
        });
    }
    getOcclusionStrength() {
        return this.get('occlusionStrength');
    }
    setOcclusionStrength(strength) {
        return this.set('occlusionStrength', strength);
    }
    getOcclusionTexture() {
        return this.getRef('occlusionTexture');
    }
    getOcclusionTextureInfo() {
        return this.getRef('occlusionTexture') ? this.getRef('occlusionTextureInfo') : null;
    }
    setOcclusionTexture(texture) {
        return this.setRef('occlusionTexture', texture, {
            channels: R
        });
    }
    getRoughnessFactor() {
        return this.get('roughnessFactor');
    }
    setRoughnessFactor(factor) {
        return this.set('roughnessFactor', factor);
    }
    getMetallicFactor() {
        return this.get('metallicFactor');
    }
    setMetallicFactor(factor) {
        return this.set('metallicFactor', factor);
    }
    getMetallicRoughnessTexture() {
        return this.getRef('metallicRoughnessTexture');
    }
    getMetallicRoughnessTextureInfo() {
        return this.getRef('metallicRoughnessTexture') ? this.getRef('metallicRoughnessTextureInfo') : null;
    }
    setMetallicRoughnessTexture(texture) {
        return this.setRef('metallicRoughnessTexture', texture, {
            channels: G | B
        });
    }
}
