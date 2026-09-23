import { PropertyType } from '../constants.js';
import { MathUtils } from '../utils/index.js';
import { ExtensibleProperty } from './extensible-property.js';
import { COPY_IDENTITY } from './property.js';
export class Accessor extends ExtensibleProperty {
    static Type = {
        SCALAR: 'SCALAR',
        VEC2: 'VEC2',
        VEC3: 'VEC3',
        VEC4: 'VEC4',
        MAT2: 'MAT2',
        MAT3: 'MAT3',
        MAT4: 'MAT4'
    };
    static ComponentType = {
        BYTE: 5120,
        UNSIGNED_BYTE: 5121,
        SHORT: 5122,
        UNSIGNED_SHORT: 5123,
        UNSIGNED_INT: 5125,
        FLOAT: 5126
    };
    init() {
        this.propertyType = PropertyType.ACCESSOR;
    }
    getDefaults() {
        return Object.assign(super.getDefaults(), {
            array: null,
            type: Accessor.Type.SCALAR,
            componentType: Accessor.ComponentType.FLOAT,
            normalized: false,
            sparse: false,
            buffer: null
        });
    }
    _in = MathUtils.identity;
    _out = MathUtils.identity;
    copy(other, resolve = COPY_IDENTITY) {
        super.copy(other, resolve);
        this._in = other._in;
        this._out = other._out;
        return this;
    }
    static getElementSize(type) {
        switch(type){
            case Accessor.Type.SCALAR:
                return 1;
            case Accessor.Type.VEC2:
                return 2;
            case Accessor.Type.VEC3:
                return 3;
            case Accessor.Type.VEC4:
                return 4;
            case Accessor.Type.MAT2:
                return 4;
            case Accessor.Type.MAT3:
                return 9;
            case Accessor.Type.MAT4:
                return 16;
            default:
                throw new Error('Unexpected type: ' + type);
        }
    }
    static getComponentSize(componentType) {
        switch(componentType){
            case Accessor.ComponentType.BYTE:
                return 1;
            case Accessor.ComponentType.UNSIGNED_BYTE:
                return 1;
            case Accessor.ComponentType.SHORT:
                return 2;
            case Accessor.ComponentType.UNSIGNED_SHORT:
                return 2;
            case Accessor.ComponentType.UNSIGNED_INT:
                return 4;
            case Accessor.ComponentType.FLOAT:
                return 4;
            default:
                throw new Error('Unexpected component type: ' + componentType);
        }
    }
    getMinNormalized(target) {
        const elementSize = this.getElementSize();
        this.getMin(target);
        for(let j = 0; j < elementSize; j++)target[j] = this._out(target[j]);
        return target;
    }
    getMin(target) {
        const array = this.get('array');
        const count = this.getCount();
        const elementSize = this.getElementSize();
        for(let j = 0; j < elementSize; j++)target[j] = Infinity;
        for(let i = 0; i < count * elementSize; i += elementSize){
            for(let j = 0; j < elementSize; j++){
                const value = array[i + j];
                if (Number.isFinite(value)) {
                    target[j] = Math.min(target[j], value);
                }
            }
        }
        return target;
    }
    getMaxNormalized(target) {
        const elementSize = this.getElementSize();
        this.getMax(target);
        for(let j = 0; j < elementSize; j++)target[j] = this._out(target[j]);
        return target;
    }
    getMax(target) {
        const array = this.get('array');
        const count = this.getCount();
        const elementSize = this.getElementSize();
        for(let j = 0; j < elementSize; j++)target[j] = -Infinity;
        for(let i = 0; i < count * elementSize; i += elementSize){
            for(let j = 0; j < elementSize; j++){
                const value = array[i + j];
                if (Number.isFinite(value)) {
                    target[j] = Math.max(target[j], value);
                }
            }
        }
        return target;
    }
    getCount() {
        const array = this.get('array');
        return array ? array.length / this.getElementSize() : 0;
    }
    getType() {
        return this.get('type');
    }
    setType(type) {
        return this.set('type', type);
    }
    getElementSize() {
        return Accessor.getElementSize(this.get('type'));
    }
    getComponentSize() {
        return this.get('array').BYTES_PER_ELEMENT;
    }
    getComponentType() {
        return this.get('componentType');
    }
    getNormalized() {
        return this.get('normalized');
    }
    setNormalized(normalized) {
        this.set('normalized', normalized);
        if (normalized) {
            this._out = (c)=>MathUtils.decodeNormalizedInt(c, this.get('componentType'));
            this._in = (f)=>MathUtils.encodeNormalizedInt(f, this.get('componentType'));
        } else {
            this._out = MathUtils.identity;
            this._in = MathUtils.identity;
        }
        return this;
    }
    getScalar(index) {
        const elementSize = this.getElementSize();
        return this._out(this.get('array')[index * elementSize]);
    }
    setScalar(index, x) {
        this.get('array')[index * this.getElementSize()] = this._in(x);
        return this;
    }
    getElement(index, target) {
        const elementSize = this.getElementSize();
        const array = this.get('array');
        for(let i = 0; i < elementSize; i++){
            target[i] = this._out(array[index * elementSize + i]);
        }
        return target;
    }
    setElement(index, value) {
        const elementSize = this.getElementSize();
        const array = this.get('array');
        for(let i = 0; i < elementSize; i++){
            array[index * elementSize + i] = this._in(value[i]);
        }
        return this;
    }
    getSparse() {
        return this.get('sparse');
    }
    setSparse(sparse) {
        return this.set('sparse', sparse);
    }
    getBuffer() {
        return this.getRef('buffer');
    }
    setBuffer(buffer) {
        return this.setRef('buffer', buffer);
    }
    getArray() {
        return this.get('array');
    }
    setArray(array) {
        this.set('componentType', array ? arrayToComponentType(array) : Accessor.ComponentType.FLOAT);
        this.set('array', array);
        return this;
    }
    getByteLength() {
        const array = this.get('array');
        return array ? array.byteLength : 0;
    }
}
function arrayToComponentType(array) {
    switch(array.constructor){
        case Float32Array:
            return Accessor.ComponentType.FLOAT;
        case Uint32Array:
            return Accessor.ComponentType.UNSIGNED_INT;
        case Uint16Array:
            return Accessor.ComponentType.UNSIGNED_SHORT;
        case Uint8Array:
            return Accessor.ComponentType.UNSIGNED_BYTE;
        case Int16Array:
            return Accessor.ComponentType.SHORT;
        case Int8Array:
            return Accessor.ComponentType.BYTE;
        default:
            throw new Error('Unknown accessor componentType.');
    }
}
