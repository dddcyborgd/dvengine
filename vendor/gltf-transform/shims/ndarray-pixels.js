/*! dvengine — ndarray-pixels shim (vendor/gltf-transform/shims/ndarray-pixels.js) · loadable stand-in for the `ndarray-pixels` image codec; every call reports `unavailable` instead of decoding · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © Don McCurdy (glTF-Transform, MIT) where derived */
/*
 * functions/src/utils.js imports { getPixels, savePixels } at top level (rewriteTexture). Only the
 * spec-gloss → metal-rough TEXTURE conversion path reaches them; every pure transform we re-export
 * links fine with this shim and the one textured path fails loudly with the dependency it needs.
 */
const MSG = 'unavailable: needs ndarray-pixels (image decode/encode) — vendor it or run the native lane';
export async function getPixels() { throw new Error(MSG); }
export async function savePixels() { throw new Error(MSG); }
export const unavailable = MSG;
