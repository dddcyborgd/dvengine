import { BufferViewUsage, PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
export class Skin extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.SKIN;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            skeleton: null,
            inverseBindMatrices: null,
            joints: []
        });
    }
    getSkeleton() {
        return this.getRef('skeleton');
    }
    setSkeleton(skeleton) {
        return this.setRef('skeleton', skeleton);
    }
    getInverseBindMatrices() {
        return this.getRef('inverseBindMatrices');
    }
    setInverseBindMatrices(inverseBindMatrices) {
        return this.setRef('inverseBindMatrices', inverseBindMatrices, {
            usage: BufferViewUsage.INVERSE_BIND_MATRICES
        });
    }
    addJoint(joint) {
        return this.addRef('joints', joint);
    }
    removeJoint(joint) {
        return this.removeRef('joints', joint);
    }
    listJoints() {
        return this.listRefs('joints');
    }
}
