import { PropertyType } from '../constants.js';
import { ExtensibleProperty } from './extensible-property.js';
import { COPY_IDENTITY } from './property.js';
export class Scene extends ExtensibleProperty {
    init() {
        this.propertyType = PropertyType.SCENE;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            children: []
        });
    }
    copy(other, resolve = COPY_IDENTITY) {
        if (resolve === COPY_IDENTITY) throw new Error('Scene cannot be copied.');
        return super.copy(other, resolve);
    }
    addChild(node) {
        return this.addRef('children', node);
    }
    removeChild(node) {
        return this.removeRef('children', node);
    }
    listChildren() {
        return this.listRefs('children');
    }
    traverse(fn) {
        for (const node of this.listChildren())node.traverse(fn);
        return this;
    }
}
