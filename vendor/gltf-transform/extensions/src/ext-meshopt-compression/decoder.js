import { EXT_MESHOPT_COMPRESSION } from '../constants.js';
export function isFallbackBuffer(bufferDef) {
    if (!bufferDef.extensions || !bufferDef.extensions[EXT_MESHOPT_COMPRESSION]) return false;
    const fallbackDef = bufferDef.extensions[EXT_MESHOPT_COMPRESSION];
    return !!fallbackDef.fallback;
}
