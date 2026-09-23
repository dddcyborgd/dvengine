import { PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
export class Mesh extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.MESH;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            weights: [],
            primitives: []
        });
    }
    addPrimitive(primitive) {
        return this.addRef('primitives', primitive);
    }
    removePrimitive(primitive) {
        return this.removeRef('primitives', primitive);
    }
    listPrimitives() {
        return this.listRefs('primitives');
    }
    getWeights() {
        return this.get('weights');
    }
    setWeights(weights) {
        return this.set('weights', weights);
    }
}
