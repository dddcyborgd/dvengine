import { BufferViewUsage, PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
export class Primitive extends ExtensibleProperty {
    static Mode = {
        POINTS: 0,
        LINES: 1,
        LINE_LOOP: 2,
        LINE_STRIP: 3,
        TRIANGLES: 4,
        TRIANGLE_STRIP: 5,
        TRIANGLE_FAN: 6
    };
    init() {
        this.propertyType = PropertyType.PRIMITIVE;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            mode: Primitive.Mode.TRIANGLES,
            material: null,
            indices: null,
            attributes: {},
            targets: []
        });
    }
    getIndices() {
        return this.getRef('indices');
    }
    setIndices(indices) {
        return this.setRef('indices', indices, {
            usage: BufferViewUsage.ELEMENT_ARRAY_BUFFER
        });
    }
    getAttribute(semantic) {
        return this.getRefMap('attributes', semantic);
    }
    setAttribute(semantic, accessor) {
        return this.setRefMap('attributes', semantic, accessor, {
            usage: BufferViewUsage.ARRAY_BUFFER
        });
    }
    listAttributes() {
        return this.listRefMapValues('attributes');
    }
    listSemantics() {
        return this.listRefMapKeys('attributes');
    }
    getMaterial() {
        return this.getRef('material');
    }
    setMaterial(material) {
        return this.setRef('material', material);
    }
    getMode() {
        return this.get('mode');
    }
    setMode(mode) {
        return this.set('mode', mode);
    }
    listTargets() {
        return this.listRefs('targets');
    }
    addTarget(target) {
        return this.addRef('targets', target);
    }
    removeTarget(target) {
        return this.removeRef('targets', target);
    }
}
