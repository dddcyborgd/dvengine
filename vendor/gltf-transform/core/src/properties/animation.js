import { PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
export class Animation extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.ANIMATION;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            channels: [],
            samplers: []
        });
    }
    addChannel(channel) {
        return this.addRef('channels', channel);
    }
    removeChannel(channel) {
        return this.removeRef('channels', channel);
    }
    listChannels() {
        return this.listRefs('channels');
    }
    addSampler(sampler) {
        return this.addRef('samplers', sampler);
    }
    removeSampler(sampler) {
        return this.removeRef('samplers', sampler);
    }
    listSamplers() {
        return this.listRefs('samplers');
    }
}
