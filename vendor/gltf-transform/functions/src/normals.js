import { unweld } from './unweld.js';
import { createTransform } from './utils.js';
import { normalize } from '../../gl-matrix/vec3.js';
const NAME = 'normals';
const NORMALS_DEFAULTS = {
    overwrite: false
};
export function normals(_options = NORMALS_DEFAULTS) {
    const options = {
        ...NORMALS_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, async (document)=>{
        const logger = document.getLogger();
        let modified = 0;
        await document.transform(unweld());
        for (const mesh of document.getRoot().listMeshes()){
            for (const prim of mesh.listPrimitives()){
                const position = prim.getAttribute('POSITION');
                let normal = prim.getAttribute('NORMAL');
                if (options.overwrite && normal) {
                    normal.dispose();
                } else if (normal) {
                    logger.debug(`${NAME}: Skipping primitive: NORMAL found.`);
                    continue;
                }
                normal = document.createAccessor().setArray(new Float32Array(position.getCount() * 3)).setType('VEC3');
                const a = [
                    0,
                    0,
                    0
                ];
                const b = [
                    0,
                    0,
                    0
                ];
                const c = [
                    0,
                    0,
                    0
                ];
                for(let i = 0; i < position.getCount(); i += 3){
                    position.getElement(i + 0, a);
                    position.getElement(i + 1, b);
                    position.getElement(i + 2, c);
                    const faceNormal = computeNormal(a, b, c);
                    normal.setElement(i + 0, faceNormal);
                    normal.setElement(i + 1, faceNormal);
                    normal.setElement(i + 2, faceNormal);
                }
                prim.setAttribute('NORMAL', normal);
                modified++;
            }
        }
        if (!modified) {
            logger.warn(`${NAME}: No qualifying primitives found. See debug output.`);
        } else {
            logger.debug(`${NAME}: Complete.`);
        }
    });
}
function computeNormal(a, b, c) {
    const A = [
        b[0] - a[0],
        b[1] - a[1],
        b[2] - a[2]
    ];
    const B = [
        c[0] - a[0],
        c[1] - a[1],
        c[2] - a[2]
    ];
    const n = [
        A[1] * B[2] - A[2] * B[1],
        A[2] * B[0] - A[0] * B[2],
        A[0] * B[1] - A[1] * B[0]
    ];
    return normalize([
        0,
        0,
        0
    ], n);
}
