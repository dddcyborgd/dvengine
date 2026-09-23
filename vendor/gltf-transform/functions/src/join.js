import { AnimationChannel, Document, Mesh, Node, Primitive, PropertyType, Scene } from '../../core/index.js';
import { invert, multiply } from '../../gl-matrix/mat4.js';
import { joinPrimitives } from './join-primitives.js';
import { prune } from './prune.js';
import { transformPrimitive } from './transform-primitive.js';
import { createPrimGroupKey, createTransform, formatLong, isUsed } from './utils.js';
const NAME = 'join';
const { ROOT, NODE, MESH, PRIMITIVE, ACCESSOR } = PropertyType;
const _matrix = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
];
export const JOIN_DEFAULTS = {
    keepMeshes: false,
    keepNamed: false
};
export function join(_options = JOIN_DEFAULTS) {
    const options = {
        ...JOIN_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, async (document)=>{
        const root = document.getRoot();
        const logger = document.getLogger();
        for (const scene of root.listScenes()){
            _joinLevel(document, scene, options);
            scene.traverse((node)=>_joinLevel(document, node, options));
        }
        await document.transform(prune({
            propertyTypes: [
                NODE,
                MESH,
                PRIMITIVE,
                ACCESSOR
            ],
            keepLeaves: false,
            keepAttributes: true
        }));
        logger.debug(`${NAME}: Complete.`);
    });
}
function _joinLevel(document, parent, options) {
    const logger = document.getLogger();
    const groups = {};
    const children = parent.listChildren();
    for(let nodeIndex = 0; nodeIndex < children.length; nodeIndex++){
        const node = children[nodeIndex];
        const isAnimated = node.listParents().some((p)=>p instanceof AnimationChannel);
        if (isAnimated) continue;
        const mesh = node.getMesh();
        if (!mesh) continue;
        if (node.getExtension('EXT_mesh_gpu_instancing')) continue;
        if (node.getSkin()) continue;
        for (const prim of mesh.listPrimitives()){
            if (prim.listTargets().length > 0) continue;
            const material = prim.getMaterial();
            if (material && material.getExtension('KHR_materials_volume')) continue;
            let key = createPrimGroupKey(prim);
            const isNamed = mesh.getName() || node.getName();
            if (options.keepMeshes || options.keepNamed && isNamed) {
                key += `|${nodeIndex}`;
            }
            if (!(key in groups)) {
                groups[key] = {
                    prims: [],
                    primMeshes: [],
                    primNodes: [],
                    dstNode: node,
                    dstMesh: undefined
                };
            }
            const group = groups[key];
            group.prims.push(prim);
            group.primNodes.push(node);
        }
    }
    const joinGroups = Object.values(groups).filter(({ prims })=>prims.length > 1);
    const srcNodes = new Set(joinGroups.flatMap((group)=>group.primNodes));
    for (const node of srcNodes){
        const mesh = node.getMesh();
        const isSharedMesh = mesh.listParents().some((parent)=>{
            return parent.propertyType !== ROOT && node !== parent;
        });
        if (isSharedMesh) {
            node.setMesh(mesh.clone());
        }
    }
    for (const group of joinGroups){
        const { dstNode, primNodes } = group;
        group.dstMesh = dstNode.getMesh();
        group.primMeshes = primNodes.map((node)=>node.getMesh());
    }
    for (const group of joinGroups){
        const { prims, primNodes, primMeshes, dstNode, dstMesh } = group;
        const dstMatrix = dstNode.getMatrix();
        for(let i = 0; i < prims.length; i++){
            const primNode = primNodes[i];
            const primMesh = primMeshes[i];
            let prim = prims[i];
            primMesh.removePrimitive(prim);
            if (isUsed(prim) || hasSharedAttributes(prim)) {
                prim = prims[i] = _deepClonePrimitive(prims[i]);
            }
            if (primNode !== dstNode) {
                multiply(_matrix, invert(_matrix, dstMatrix), primNode.getMatrix());
                transformPrimitive(prim, _matrix);
            }
        }
        const dstPrim = joinPrimitives(prims);
        const dstVertexCount = dstPrim.listAttributes()[0].getCount();
        dstMesh.addPrimitive(dstPrim);
        logger.debug(`${NAME}: Joined Primitives (${prims.length}) containing ` + `${formatLong(dstVertexCount)} vertices under Node "${dstNode.getName()}".`);
    }
}
function _deepClonePrimitive(src) {
    const dst = src.clone();
    for (const semantic of dst.listSemantics()){
        dst.setAttribute(semantic, dst.getAttribute(semantic).clone());
    }
    const indices = dst.getIndices();
    if (indices) dst.setIndices(indices.clone());
    return dst;
}
function hasSharedAttributes(prim) {
    for (const attribute of prim.listAttributes()){
        for (const parent of attribute.listParents()){
            if (parent !== prim && parent.propertyType !== ROOT) {
                return true;
            }
        }
    }
    return false;
}
