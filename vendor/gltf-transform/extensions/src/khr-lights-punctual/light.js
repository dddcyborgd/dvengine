import { ExtensionProperty, PropertyType } from '../../../core/index.js';
import { ColorUtils } from '../../../core/index.js';
import { KHR_LIGHTS_PUNCTUAL } from '../constants.js';
export class Light extends ExtensionProperty {
    static EXTENSION_NAME = KHR_LIGHTS_PUNCTUAL;
    static Type = {
        POINT: 'point',
        SPOT: 'spot',
        DIRECTIONAL: 'directional'
    };
    init() {
        this.extensionName = KHR_LIGHTS_PUNCTUAL;
        this.propertyType = 'Light';
        this.parentTypes = [
            PropertyType.NODE
        ];
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            color: [
                1,
                1,
                1
            ],
            intensity: 1,
            type: Light.Type.POINT,
            range: null,
            innerConeAngle: 0,
            outerConeAngle: Math.PI / 4
        });
    }
    getColor() {
        return this.get('color');
    }
    setColor(color) {
        return this.set('color', color);
    }
    getColorHex() {
        return ColorUtils.factorToHex(this.getColor());
    }
    setColorHex(hex) {
        const color = this.getColor().slice();
        ColorUtils.hexToFactor(hex, color);
        return this.setColor(color);
    }
    getIntensity() {
        return this.get('intensity');
    }
    setIntensity(intensity) {
        return this.set('intensity', intensity);
    }
    getType() {
        return this.get('type');
    }
    setType(type) {
        return this.set('type', type);
    }
    getRange() {
        return this.get('range');
    }
    setRange(range) {
        return this.set('range', range);
    }
    getInnerConeAngle() {
        return this.get('innerConeAngle');
    }
    setInnerConeAngle(angle) {
        return this.set('innerConeAngle', angle);
    }
    getOuterConeAngle() {
        return this.get('outerConeAngle');
    }
    setOuterConeAngle(angle) {
        return this.set('outerConeAngle', angle);
    }
}
