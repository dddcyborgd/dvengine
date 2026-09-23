import { getPixels, savePixels } from '../../shims/ndarray-pixels.js';
import { Accessor, Document, Primitive, Property, PropertyType, Texture } from '../../core/index.js';
export function createTransform(name, fn) {
    Object.defineProperty(fn, 'name', {
        value: name
    });
    return fn;
}
export function isTransformPending(context, initial, pending) {
    if (!context) return false;
    const initialIndex = context.stack.lastIndexOf(initial);
    const pendingIndex = context.stack.lastIndexOf(pending);
    return initialIndex < pendingIndex;
}
export async function rewriteTexture(source, target, fn) {
    if (!source) return null;
    const srcImage = source.getImage();
    if (!srcImage) return null;
    const pixels = await getPixels(srcImage, source.getMimeType());
    for(let i = 0; i < pixels.shape[0]; ++i){
        for(let j = 0; j < pixels.shape[1]; ++j){
            fn(pixels, i, j);
        }
    }
    const dstImage = await savePixels(pixels, 'image/png');
    return target.setImage(dstImage).setMimeType('image/png');
}
export function getGLPrimitiveCount(prim) {
    const indices = prim.getIndices();
    const position = prim.getAttribute('POSITION');
    switch(prim.getMode()){
        case Primitive.Mode.POINTS:
            return position.getCount();
        case Primitive.Mode.LINES:
            return indices ? indices.getCount() / 2 : position.getCount() / 2;
        case Primitive.Mode.LINE_LOOP:
            return position.getCount();
        case Primitive.Mode.LINE_STRIP:
            return position.getCount() - 1;
        case Primitive.Mode.TRIANGLES:
            return indices ? indices.getCount() / 3 : position.getCount() / 3;
        case Primitive.Mode.TRIANGLE_STRIP:
        case Primitive.Mode.TRIANGLE_FAN:
            return position.getCount() - 2;
        default:
            throw new Error('Unexpected mode: ' + prim.getMode());
    }
}
export class SetMap {
    _map = new Map();
    get size() {
        return this._map.size;
    }
    has(k) {
        return this._map.has(k);
    }
    add(k, v) {
        let entry = this._map.get(k);
        if (!entry) {
            entry = new Set();
            this._map.set(k, entry);
        }
        entry.add(v);
        return this;
    }
    get(k) {
        return this._map.get(k) || new Set();
    }
    keys() {
        return this._map.keys();
    }
}
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = [
        'Bytes',
        'KB',
        'MB',
        'GB',
        'TB',
        'PB',
        'EB',
        'ZB',
        'YB'
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
export function formatLong(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
export function formatDelta(a, b, decimals = 2) {
    const prefix = a > b ? '–' : '+';
    const suffix = '%';
    return prefix + (Math.abs(a - b) / a * 100).toFixed(decimals) + suffix;
}
export function formatDeltaOp(a, b) {
    return `${formatLong(a)} → ${formatLong(b)} (${formatDelta(a, b)})`;
}
export function deepListAttributes(prim) {
    const accessors = [];
    for (const attribute of prim.listAttributes()){
        accessors.push(attribute);
    }
    for (const target of prim.listTargets()){
        for (const attribute of target.listAttributes()){
            accessors.push(attribute);
        }
    }
    return Array.from(new Set(accessors));
}
export function deepSwapAttribute(prim, src, dst) {
    prim.swap(src, dst);
    for (const target of prim.listTargets()){
        target.swap(src, dst);
    }
}
export function remapAttribute(attribute, remap, dstCount) {
    const elementSize = attribute.getElementSize();
    const srcCount = attribute.getCount();
    const srcArray = attribute.getArray();
    const dstArray = srcArray.slice(0, dstCount * elementSize);
    for(let i = 0; i < srcCount; i++){
        for(let j = 0; j < elementSize; j++){
            dstArray[remap[i] * elementSize + j] = srcArray[i * elementSize + j];
        }
    }
    attribute.setArray(dstArray);
}
export function createIndices(count, maxIndex = count) {
    const array = maxIndex <= 65534 ? new Uint16Array(count) : new Uint32Array(count);
    for(let i = 0; i < array.length; i++)array[i] = i;
    return array;
}
export function isUsed(prop) {
    return prop.listParents().some((parent)=>parent.propertyType !== PropertyType.ROOT);
}
export function createPrimGroupKey(prim) {
    const document = Document.fromGraph(prim.getGraph());
    const material = prim.getMaterial();
    const materialIndex = document.getRoot().listMaterials().indexOf(material);
    const mode = prim.getMode();
    const indices = !!prim.getIndices();
    const attributes = prim.listSemantics().sort().map((semantic)=>{
        const attribute = prim.getAttribute(semantic);
        const elementSize = attribute.getElementSize();
        const componentType = attribute.getComponentType();
        return `${semantic}:${elementSize}:${componentType}`;
    }).join('+');
    const targets = prim.listTargets().map((target)=>{
        return target.listSemantics().sort().map((semantic)=>{
            const attribute = prim.getAttribute(semantic);
            const elementSize = attribute.getElementSize();
            const componentType = attribute.getComponentType();
            return `${semantic}:${elementSize}:${componentType}`;
        }).join('+');
    }).join('~');
    return `${materialIndex}|${mode}|${indices}|${attributes}|${targets}`;
}
