import { Accessor, Document, Primitive, uuid } from '../../core/index.js';
import { createTransform } from './utils.js';
const NAME = 'tangents';
const TANGENTS_DEFAULTS = {
    overwrite: false
};
export function tangents(_options = TANGENTS_DEFAULTS) {
    if (!_options.generateTangents) {
        throw new Error(`${NAME}: generateTangents callback required — install "mikktspace".`);
    }
    const options = {
        ...TANGENTS_DEFAULTS,
        ..._options
    };
    return createTransform(NAME, (doc)=>{
        const logger = doc.getLogger();
        const attributeIDs = new Map();
        const tangentCache = new Map();
        let modified = 0;
        for (const mesh of doc.getRoot().listMeshes()){
            const meshName = mesh.getName();
            const meshPrimitives = mesh.listPrimitives();
            for(let i = 0; i < meshPrimitives.length; i++){
                const prim = meshPrimitives[i];
                if (!filterPrimitive(prim, logger, meshName, i, options.overwrite)) continue;
                const texcoordSemantic = getNormalTexcoord(prim);
                const position = prim.getAttribute('POSITION').getArray();
                const normal = prim.getAttribute('NORMAL').getArray();
                const texcoord = prim.getAttribute(texcoordSemantic).getArray();
                const positionID = attributeIDs.get(position) || uuid();
                attributeIDs.set(position, positionID);
                const normalID = attributeIDs.get(normal) || uuid();
                attributeIDs.set(normal, normalID);
                const texcoordID = attributeIDs.get(texcoord) || uuid();
                attributeIDs.set(texcoord, texcoordID);
                const prevTangent = prim.getAttribute('TANGENT');
                if (prevTangent && prevTangent.listParents().length === 2) prevTangent.dispose();
                const attributeHash = `${positionID}|${normalID}|${texcoordID}`;
                let tangent = tangentCache.get(attributeHash);
                if (tangent) {
                    logger.debug(`${NAME}: Found cache for primitive ${i} of mesh "${meshName}".`);
                    prim.setAttribute('TANGENT', tangent);
                    modified++;
                    continue;
                }
                logger.debug(`${NAME}: Generating for primitive ${i} of mesh "${meshName}".`);
                const tangentBuffer = prim.getAttribute('POSITION').getBuffer();
                const tangentArray = options.generateTangents(position instanceof Float32Array ? position : new Float32Array(position), normal instanceof Float32Array ? normal : new Float32Array(normal), texcoord instanceof Float32Array ? texcoord : new Float32Array(texcoord));
                for(let i = 3; i < tangentArray.length; i += 4)tangentArray[i] *= -1;
                tangent = doc.createAccessor().setBuffer(tangentBuffer).setArray(tangentArray).setType('VEC4');
                prim.setAttribute('TANGENT', tangent);
                tangentCache.set(attributeHash, tangent);
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
function getNormalTexcoord(prim) {
    const material = prim.getMaterial();
    if (!material) return 'TEXCOORD_0';
    const normalTextureInfo = material.getNormalTextureInfo();
    if (!normalTextureInfo) return 'TEXCOORD_0';
    const texcoord = normalTextureInfo.getTexCoord();
    const semantic = `TEXCOORD_${texcoord}`;
    if (prim.getAttribute(semantic)) return semantic;
    return 'TEXCOORD_0';
}
function filterPrimitive(prim, logger, meshName, i, overwrite) {
    if (prim.getMode() !== Primitive.Mode.TRIANGLES || !prim.getAttribute('POSITION') || !prim.getAttribute('NORMAL') || !prim.getAttribute('TEXCOORD_0')) {
        logger.debug(`${NAME}: Skipping primitive ${i} of mesh "${meshName}": primitives must` + ' have attributes=[POSITION, NORMAL, TEXCOORD_0] and mode=TRIANGLES.');
        return false;
    }
    if (prim.getAttribute('TANGENT') && !overwrite) {
        logger.debug(`${NAME}: Skipping primitive ${i} of mesh "${meshName}": TANGENT found.`);
        return false;
    }
    if (prim.getIndices()) {
        logger.warn(`${NAME}: Skipping primitive ${i} of mesh "${meshName}": primitives must` + ' be unwelded.');
        return false;
    }
    return true;
}
