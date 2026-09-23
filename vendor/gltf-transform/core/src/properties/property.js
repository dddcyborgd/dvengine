import { $attributes, $immutableKeys, Graph, GraphNode, GraphEdge, isRef, isRefList, isRefMap } from '../../../property-graph/property-graph.modern.js';
import { equalsArray, equalsObject, equalsRef, equalsRefList, equalsRefMap, isArray, isPlainObject } from '../utils/index.js';
export const COPY_IDENTITY = (t)=>t;
const EMPTY_SET = new Set();
export class Property extends GraphNode {
    constructor(graph, name = ''){
        super(graph);
        this[$attributes]['name'] = name;
        this.init();
        this.dispatchEvent({
            type: 'create'
        });
    }
    getGraph() {
        return this.graph;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            name: '',
            extras: {}
        });
    }
    set(attribute, value) {
        if (Array.isArray(value)) value = value.slice();
        return super.set(attribute, value);
    }
    getName() {
        return this.get('name');
    }
    setName(name) {
        return this.set('name', name);
    }
    getExtras() {
        return this.get('extras');
    }
    setExtras(extras) {
        return this.set('extras', extras);
    }
    clone() {
        const PropertyClass = this.constructor;
        return new PropertyClass(this.graph).copy(this, COPY_IDENTITY);
    }
    copy(other, resolve = COPY_IDENTITY) {
        for(const key in this[$attributes]){
            const value = this[$attributes][key];
            if (value instanceof GraphEdge) {
                if (!this[$immutableKeys].has(key)) {
                    value.dispose();
                }
            } else if (isRefList(value)) {
                for (const ref of value){
                    ref.dispose();
                }
            } else if (isRefMap(value)) {
                for(const subkey in value){
                    const ref = value[subkey];
                    ref.dispose();
                }
            }
        }
        for(const key in other[$attributes]){
            const thisValue = this[$attributes][key];
            const otherValue = other[$attributes][key];
            if (otherValue instanceof GraphEdge) {
                if (this[$immutableKeys].has(key)) {
                    const ref = thisValue;
                    ref.getChild().copy(resolve(otherValue.getChild()), resolve);
                } else {
                    this.setRef(key, resolve(otherValue.getChild()), otherValue.getAttributes());
                }
            } else if (isRefList(otherValue)) {
                for (const ref of otherValue){
                    this.addRef(key, resolve(ref.getChild()), ref.getAttributes());
                }
            } else if (isRefMap(otherValue)) {
                for(const subkey in otherValue){
                    const ref = otherValue[subkey];
                    this.setRefMap(key, subkey, resolve(ref.getChild()), ref.getAttributes());
                }
            } else if (isPlainObject(otherValue)) {
                this[$attributes][key] = JSON.parse(JSON.stringify(otherValue));
            } else if (Array.isArray(otherValue) || otherValue instanceof ArrayBuffer || ArrayBuffer.isView(otherValue)) {
                this[$attributes][key] = otherValue.slice();
            } else {
                this[$attributes][key] = otherValue;
            }
        }
        return this;
    }
    equals(other, skip = EMPTY_SET) {
        if (this === other) return true;
        if (this.propertyType !== other.propertyType) return false;
        for(const key in this[$attributes]){
            if (skip.has(key)) continue;
            const a = this[$attributes][key];
            const b = other[$attributes][key];
            if (isRef(a) || isRef(b)) {
                if (!equalsRef(a, b)) {
                    return false;
                }
            } else if (isRefList(a) || isRefList(b)) {
                if (!equalsRefList(a, b)) {
                    return false;
                }
            } else if (isRefMap(a) || isRefMap(b)) {
                if (!equalsRefMap(a, b)) {
                    return false;
                }
            } else if (isPlainObject(a) || isPlainObject(b)) {
                if (!equalsObject(a, b)) return false;
            } else if (isArray(a) || isArray(b)) {
                if (!equalsArray(a, b)) return false;
            } else {
                if (a !== b) return false;
            }
        }
        return true;
    }
    detach() {
        this.graph.disconnectParents(this, (n)=>n.propertyType !== 'Root');
        return this;
    }
    listParents() {
        return this.graph.listParents(this);
    }
}
