import { BufferViewUsage, PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
export class AnimationSampler extends ExtensibleProperty {
    static Interpolation = {
        LINEAR: 'LINEAR',
        STEP: 'STEP',
        CUBICSPLINE: 'CUBICSPLINE'
    };
    init() {
        this.propertyType = PropertyType.ANIMATION_SAMPLER;
    }
    getDefaultAttributes() {
        return Object.assign(super.getDefaults(), {
            interpolation: AnimationSampler.Interpolation.LINEAR,
            input: null,
            output: null
        });
    }
    getInterpolation() {
        return this.get('interpolation');
    }
    setInterpolation(interpolation) {
        return this.set('interpolation', interpolation);
    }
    getInput() {
        return this.getRef('input');
    }
    setInput(input) {
        return this.setRef('input', input, {
            usage: BufferViewUsage.OTHER
        });
    }
    getOutput() {
        return this.getRef('output');
    }
    setOutput(output) {
        return this.setRef('output', output, {
            usage: BufferViewUsage.OTHER
        });
    }
}
