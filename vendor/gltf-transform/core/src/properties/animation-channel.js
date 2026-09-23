import { PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
export class AnimationChannel extends ExtensibleProperty {
    static TargetPath = {
        TRANSLATION: 'translation',
        ROTATION: 'rotation',
        SCALE: 'scale',
        WEIGHTS: 'weights'
    };
    init() {
        this.propertyType = PropertyType.ANIMATION_CHANNEL;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            targetPath: null,
            targetNode: null,
            sampler: null
        });
    }
    getTargetPath() {
        return this.get('targetPath');
    }
    setTargetPath(targetPath) {
        return this.set('targetPath', targetPath);
    }
    getTargetNode() {
        return this.getRef('targetNode');
    }
    setTargetNode(targetNode) {
        return this.setRef('targetNode', targetNode);
    }
    getSampler() {
        return this.getRef('sampler');
    }
    setSampler(sampler) {
        return this.setRef('sampler', sampler);
    }
}
