import { Accessor, Document, Primitive, PrimitiveTarget, PropertyType } from '../../core/index.js';
import { cleanPrimitive } from './clean-primitive.js';
import { dedup } from './dedup.js';
import { prune } from './prune.js';
import { createIndices, createTransform, formatDeltaOp } from './utils.js';
const NAME = 'weld';
const Tolerance = {
    DEFAULT: 0.0001,
    TEXCOORD: 0.0001,
    COLOR: 0.01,
    NORMAL: 0.5,
    JOINTS: 0.0,
    WEIGHTS: 0.01
};
export const WELD_DEFAULTS = {
    tolerance: Tolerance.DEFAULT,
    overwrite: true,
    exhaustive: false
};
export function weld(_options = WELD_DEFAULTS) {
    const options = {
        ...WELD_DEFAULTS,
        ..._options
    };
    if (options.tolerance > 0.1 || options.tolerance < 0) {
        throw new Error(`${NAME}: Requires 0 ≤ tolerance ≤ 0.1`);
    }
    return createTransform(NAME, async (doc)=>{
        const logger = doc.getLogger();
        for (const mesh of doc.getRoot().listMeshes()){
            for (const prim of mesh.listPrimitives()){
                weldPrimitive(doc, prim, options);
                if (prim.getIndices().getCount() === 0) prim.dispose();
            }
            if (mesh.listPrimitives().length === 0) mesh.dispose();
        }
        await doc.transform(prune({
            propertyTypes: [
                PropertyType.ACCESSOR,
                PropertyType.NODE
            ]
        }));
        await doc.transform(dedup({
            propertyTypes: [
                PropertyType.ACCESSOR
            ]
        }));
        logger.debug(`${NAME}: Complete.`);
    });
}
export function weldPrimitive(doc, prim, options) {
    if (prim.getIndices() && !options.overwrite) return;
    if (prim.getMode() === Primitive.Mode.POINTS) return;
    if (options.tolerance === 0) {
        _indexPrimitive(doc, prim);
    } else {
        _weldPrimitive(doc, prim, options);
    }
}
function _indexPrimitive(doc, prim) {
    if (prim.getIndices()) return;
    const attr = prim.listAttributes()[0];
    const numVertices = attr.getCount();
    const buffer = attr.getBuffer();
    const indices = doc.createAccessor().setBuffer(buffer).setType(Accessor.Type.SCALAR).setArray(createIndices(numVertices));
    prim.setIndices(indices);
}
function _weldPrimitive(doc, prim, options) {
    const logger = doc.getLogger();
    const srcPosition = prim.getAttribute('POSITION');
    const srcIndices = prim.getIndices() || doc.createAccessor().setArray(createIndices(srcPosition.getCount()));
    const uniqueIndices = new Uint32Array(new Set(srcIndices.getArray())).sort();
    const baseTolerance = Math.max(options.tolerance, Number.EPSILON);
    const attributeTolerance = {};
    for (const semantic of prim.listSemantics()){
        const attribute = prim.getAttribute(semantic);
        attributeTolerance[semantic] = getAttributeTolerance(semantic, attribute, baseTolerance);
    }
    logger.debug(`${NAME}: Tolerance thresholds: ${formatKV(attributeTolerance)}`);
    const posA = [
        0,
        0,
        0
    ];
    const posB = [
        0,
        0,
        0
    ];
    const grid = {};
    const cellSize = attributeTolerance.POSITION;
    for(let i = 0; i < uniqueIndices.length; i++){
        srcPosition.getElement(uniqueIndices[i], posA);
        const key = getGridKey(posA, cellSize);
        grid[key] = grid[key] || [];
        grid[key].push(uniqueIndices[i]);
    }
    const weldMap = createIndices(uniqueIndices.length);
    const writeMap = new Array(uniqueIndices.length).fill(-1);
    const srcVertexCount = srcPosition.getCount();
    let dstVertexCount = 0;
    for(let i = 0; i < uniqueIndices.length; i++){
        const a = uniqueIndices[i];
        srcPosition.getElement(a, posA);
        const cellKeys = options.exhaustive ? getGridNeighborhoodKeys(posA, cellSize) : [
            getGridKey(posA, cellSize)
        ];
        cells: for (const cellKey of cellKeys){
            if (!grid[cellKey]) continue cells;
            neighbors: for (const j of grid[cellKey]){
                const b = weldMap[j];
                if (a <= b) continue neighbors;
                srcPosition.getElement(b, posB);
                const isBaseMatch = prim.listSemantics().every((semantic)=>{
                    const attribute = prim.getAttribute(semantic);
                    const tolerance = attributeTolerance[semantic];
                    return compareAttributes(attribute, a, b, tolerance, semantic);
                });
                const isTargetMatch = prim.listTargets().every((target)=>{
                    return target.listSemantics().every((semantic)=>{
                        const attribute = target.getAttribute(semantic);
                        const tolerance = attributeTolerance[semantic];
                        return compareAttributes(attribute, a, b, tolerance, semantic);
                    });
                });
                if (isBaseMatch && isTargetMatch) {
                    weldMap[a] = b;
                    break cells;
                }
            }
        }
        if (weldMap[a] === a) {
            writeMap[a] = dstVertexCount++;
        } else {
            writeMap[a] = writeMap[weldMap[a]];
        }
    }
    logger.debug(`${NAME}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);
    const dstIndicesCount = srcIndices.getCount();
    const dstIndicesArray = createIndices(dstIndicesCount, uniqueIndices.length);
    for(let i = 0; i < dstIndicesCount; i++){
        dstIndicesArray[i] = writeMap[srcIndices.getScalar(i)];
    }
    prim.setIndices(srcIndices.clone().setArray(dstIndicesArray));
    if (srcIndices.listParents().length === 1) srcIndices.dispose();
    for (const srcAttr of prim.listAttributes()){
        swapAttributes(prim, srcAttr, writeMap, dstVertexCount);
    }
    for (const target of prim.listTargets()){
        for (const srcAttr of target.listAttributes()){
            swapAttributes(target, srcAttr, writeMap, dstVertexCount);
        }
    }
    cleanPrimitive(prim);
}
function createArrayOfType(array, length) {
    const ArrayCtor = array.constructor;
    return new ArrayCtor(length);
}
function swapAttributes(parent, srcAttr, reorder, dstCount) {
    const dstAttrArray = createArrayOfType(srcAttr.getArray(), dstCount * srcAttr.getElementSize());
    const dstAttr = srcAttr.clone().setArray(dstAttrArray);
    const done = new Uint8Array(dstCount);
    for(let i = 0, el = []; i < reorder.length; i++){
        if (!done[reorder[i]]) {
            dstAttr.setElement(reorder[i], srcAttr.getElement(i, el));
            done[reorder[i]] = 1;
        }
    }
    parent.swap(srcAttr, dstAttr);
    if (srcAttr.listParents().length === 1) srcAttr.dispose();
}
const _a = [];
const _b = [];
function getAttributeTolerance(semantic, attribute, tolerance) {
    if (semantic === 'NORMAL' || semantic === 'TANGENT') return Tolerance.NORMAL;
    if (semantic.startsWith('COLOR_')) return Tolerance.COLOR;
    if (semantic.startsWith('TEXCOORD_')) return Tolerance.TEXCOORD;
    if (semantic.startsWith('JOINTS_')) return Tolerance.JOINTS;
    if (semantic.startsWith('WEIGHTS_')) return Tolerance.WEIGHTS;
    _a.length = _b.length = 0;
    attribute.getMinNormalized(_a);
    attribute.getMaxNormalized(_b);
    const range = Math.max(..._b) - Math.min(..._a) || 1;
    return tolerance * range;
}
function compareAttributes(attribute, a, b, tolerance, _semantic) {
    attribute.getElement(a, _a);
    attribute.getElement(b, _b);
    for(let i = 0, il = attribute.getElementSize(); i < il; i++){
        if (Math.abs(_a[i] - _b[i]) > tolerance) {
            return false;
        }
    }
    return true;
}
function formatKV(kv) {
    return Object.entries(kv).map(([k, v])=>`${k}=${v}`).join(', ');
}
const CELL_OFFSETS = [
    0,
    -1,
    1
];
function getGridNeighborhoodKeys(p, cellSize) {
    const keys = [];
    const _p = [
        0,
        0,
        0
    ];
    for (const i of CELL_OFFSETS){
        for (const j of CELL_OFFSETS){
            for (const k of CELL_OFFSETS){
                _p[0] = p[0] + i * cellSize;
                _p[1] = p[1] + j * cellSize;
                _p[2] = p[2] + k * cellSize;
                keys.push(getGridKey(_p, cellSize));
            }
        }
    }
    return keys;
}
function getGridKey(p, cellSize) {
    const cellX = Math.round(p[0] / cellSize);
    const cellY = Math.round(p[1] / cellSize);
    const cellZ = Math.round(p[2] / cellSize);
    return cellX + ':' + cellY + ':' + cellZ;
}
