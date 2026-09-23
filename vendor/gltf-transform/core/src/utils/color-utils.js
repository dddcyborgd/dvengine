export class ColorUtils {
    static hexToFactor(hex, target) {
        hex = Math.floor(hex);
        const _target = target;
        _target[0] = (hex >> 16 & 255) / 255;
        _target[1] = (hex >> 8 & 255) / 255;
        _target[2] = (hex & 255) / 255;
        return this.convertSRGBToLinear(target, target);
    }
    static factorToHex(factor) {
        const target = [
            ...factor
        ];
        const [r, g, b] = this.convertLinearToSRGB(factor, target);
        return r * 255 << 16 ^ g * 255 << 8 ^ b * 255 << 0;
    }
    static convertSRGBToLinear(source, target) {
        const _source = source;
        const _target = target;
        for(let i = 0; i < 3; i++){
            _target[i] = _source[i] < 0.04045 ? _source[i] * 0.0773993808 : Math.pow(_source[i] * 0.9478672986 + 0.0521327014, 2.4);
        }
        return target;
    }
    static convertLinearToSRGB(source, target) {
        const _source = source;
        const _target = target;
        for(let i = 0; i < 3; i++){
            _target[i] = _source[i] < 0.0031308 ? _source[i] * 12.92 : 1.055 * Math.pow(_source[i], 0.41666) - 0.055;
        }
        return target;
    }
}
