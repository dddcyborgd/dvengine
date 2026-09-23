/*! dvengine — ktx-parse shim (vendor/gltf-transform/shims/ktx-parse.js) · minimal clean-room KTX2 container reader standing in for the `ktx-parse` package (header · level index · first DFD block) · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT · upstream © Don McCurdy (glTF-Transform, MIT) where derived */
/*
 * The fork imports { read, KHR_DF_MODEL_ETC1S, KHR_DF_MODEL_UASTC } from 'ktx-parse' in two places
 * (extensions/khr-texture-basisu, functions/inspect) and reads only: pixelWidth, pixelHeight,
 * levels[].levelData / uncompressedByteLength, dataFormatDescriptor[0].colorModel / samples[].channelType.
 * This is a from-the-spec reader of exactly that (KTX 2.0 §3 header, §4 level index, §5 DFD;
 * KDFS §5 basic block). Constants are the Khronos Data Format colour-model ids.
 */
export const KHR_DF_MODEL_ETC1S = 163;
export const KHR_DF_MODEL_UASTC = 166;
export const KHR_SUPERCOMPRESSION_NONE = 0;
export const KHR_SUPERCOMPRESSION_BASISLZ = 1;
export const KHR_SUPERCOMPRESSION_ZSTD = 2;
export const KHR_SUPERCOMPRESSION_ZLIB = 3;

const KTX2_ID = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];

/** @param {Uint8Array} data */
export function read(data) {
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  for (let i = 0; i < 12; i++) if (u8[i] !== KTX2_ID[i]) throw new Error('ktx-parse shim: missing KTX 2.0 identifier');
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let o = 12;
  const u32 = () => { const v = dv.getUint32(o, true); o += 4; return v; };
  const u64 = () => { const lo = dv.getUint32(o, true), hi = dv.getUint32(o + 4, true); o += 8; return hi * 0x100000000 + lo; };
  const c = {
    vkFormat: u32(), typeSize: u32(), pixelWidth: u32(), pixelHeight: u32(), pixelDepth: u32(),
    layerCount: u32(), faceCount: u32(), levelCount: u32(), supercompressionScheme: u32(),
    levels: [], dataFormatDescriptor: [], keyValue: {}, globalData: null,
  };
  const dfdByteOffset = u32(), dfdByteLength = u32(), kvdByteOffset = u32(), kvdByteLength = u32();
  const sgdByteOffset = u64(), sgdByteLength = u64();
  const levelCount = Math.max(1, c.levelCount);
  for (let i = 0; i < levelCount; i++) {
    const byteOffset = u64(), byteLength = u64(), uncompressedByteLength = u64();
    c.levels.push({ levelData: u8.subarray(byteOffset, byteOffset + byteLength), uncompressedByteLength });
  }
  // Data Format Descriptor: totalSize u32, then one basic descriptor block
  if (dfdByteLength >= 28) {
    o = dfdByteOffset + 4;
    const vendorAndType = u32();
    const versionNumber = dv.getUint16(o, true); const descriptorBlockSize = dv.getUint16(o + 2, true); o += 4;
    const block = {
      vendorId: vendorAndType & 0x1ffff, descriptorType: vendorAndType >>> 17, versionNumber, descriptorBlockSize,
      colorModel: u8[o], colorPrimaries: u8[o + 1], transferFunction: u8[o + 2], flags: u8[o + 3],
      texelBlockDimension: [u8[o + 4], u8[o + 5], u8[o + 6], u8[o + 7]],
      bytesPlane: Array.from(u8.subarray(o + 8, o + 16)), samples: [],
    };
    o += 16;
    const sampleCount = Math.max(0, (descriptorBlockSize - 24) / 16);
    for (let s = 0; s < sampleCount; s++) {
      const bitOffset = dv.getUint16(o, true), bitLength = u8[o + 2], channelType = u8[o + 3];
      block.samples.push({ bitOffset, bitLength, channelType, samplePosition: Array.from(u8.subarray(o + 4, o + 8)), sampleLower: dv.getUint32(o + 8, true), sampleUpper: dv.getUint32(o + 12, true) });
      o += 16;
    }
    c.dataFormatDescriptor.push(block);
  }
  // key/value data (keys are NUL-terminated UTF-8; values kept as bytes)
  if (kvdByteLength > 0) {
    o = kvdByteOffset; const end = kvdByteOffset + kvdByteLength;
    while (o + 4 <= end) {
      const len = u32(); if (!len || o + len > end) break;
      const entry = u8.subarray(o, o + len); let nul = entry.indexOf(0); if (nul < 0) nul = entry.length;
      const key = new TextDecoder().decode(entry.subarray(0, nul));
      c.keyValue[key] = entry.subarray(nul + 1);
      o += len; o += (4 - (len % 4)) % 4;
    }
  }
  if (sgdByteLength > 0) c.globalData = { bytes: u8.subarray(sgdByteOffset, sgdByteOffset + sgdByteLength) };
  return c;
}

export function write() { throw new Error('ktx-parse shim: write() unavailable — needs the ktx-parse package'); }
export default { read, write, KHR_DF_MODEL_ETC1S, KHR_DF_MODEL_UASTC };
