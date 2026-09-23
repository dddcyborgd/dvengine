import { Accessor, Primitive, Mesh, PropertyType, PrimitiveTarget } from '../../core/index.js';
import { transformPrimitive } from './transform-primitive.js';
import { deepListAttributes } from './utils.js';
export function transformMesh(mesh, matrix, overwrite = false, skipIndices) {
    for (const srcPrim of mesh.listPrimitives()){
        const isShared = srcPrim.listParents().some((p)=>p.propertyType === PropertyType.MESH && p !== mesh);
        if (isShared) {
            const dstPrim = srcPrim.clone();
            mesh.swap(srcPrim, dstPrim);
            for (const srcTarget of dstPrim.listTargets()){
                const dstTarget = srcTarget.clone();
                dstPrim.swap(srcTarget, dstTarget);
            }
        }
    }
    if (!overwrite) {
        const parents = new Set([
            ...mesh.listPrimitives(),
            ...mesh.listPrimitives().flatMap((prim)=>prim.listTargets())
        ]);
        const attributes = new Map();
        for (const prim of mesh.listPrimitives()){
            for (const srcAttribute of deepListAttributes(prim)){
                const isShared = srcAttribute.listParents().some((a)=>(a instanceof Primitive || a instanceof PrimitiveTarget) && !parents.has(a));
                if (isShared && !attributes.has(srcAttribute)) {
                    attributes.set(srcAttribute, srcAttribute.clone());
                }
            }
        }
        for (const parent of parents){
            for (const [srcAttribute, dstAttribute] of attributes){
                parent.swap(srcAttribute, dstAttribute);
            }
        }
    }
    skipIndices = skipIndices || new Set();
    for (const prim of mesh.listPrimitives()){
        transformPrimitive(prim, matrix, skipIndices);
    }
}
