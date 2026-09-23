import { NodeIO, VertexLayout } from "@gltf-transform/core";
// import { toktx } from "../texture/toktx"; // Disabled: cpu-features native module build issue on macOS ARM64
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { metalRough, resample, dedup } from "@gltf-transform/functions";
import { textureResize } from "../texture/texture-resize";
import {
  VRMExtension,
  VRMC_materials_mtoon,
  VRMC_springBone,
  VRMC_Extension,
  VRMC_node_constraint,
} from "./vrm-extensions";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Process a VRM file from disk with compression
 * 
 * @param filePath - Path to the VRM file
 * @param filename - Output filename
 * @returns Object containing buffer, file path, and filename
 * 
 * @internal
 */
export const processing = async function (filePath: string, filename: string) {
  try {
    const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);

    io.registerExtensions([
      VRMExtension,
      VRMC_materials_mtoon,
      VRMC_springBone,
      VRMC_Extension,
      VRMC_node_constraint,
    ]);

    io.setVertexLayout(VertexLayout.SEPARATE);

    const document = await io.read(filePath);

    await document.transform(
      metalRough(),
      resample(),
      dedup(),
      // @ts-ignore
      textureResize({ size: [256, 256], square: true })
      // toktx disabled due to cpu-features native module build issue on macOS ARM64
      // toktx({
      //   mode: "etc1s",
      //   powerOfTwo: true,
      // })
    );

    const parts = filePath.split(".");
    const base = parts.slice(0, parts.length - 1).join(".");
    const filepath = path.join(`${base}_compressed.glb`);

    await io.write(filepath, document);

    const vrm = fs.readFileSync(filepath);

    return {
      buffer: vrm,
      file: filepath,
      filename: `${filename.split(".")[0]}_compressed.glb`,
    };
  } catch (err: any) {
    console.log(err);

    return {
      success: false,
      message: err?.message || "Failed to compress vrm",
    };
  }
};

/**
 * Process and compress a VRM avatar buffer.
 * 
 * This function:
 * - Writes the buffer to a temporary file
 * - Applies VRM-specific optimizations
 * - Compresses textures to 256x256
 * - Converts textures to KTX2 format
 * - Cleans up temporary files
 * 
 * @param buffer - The VRM file buffer
 * @param filename - Original filename (for naming the output)
 * @returns Object containing compressed buffer and filename
 * 
 * @throws Error if VRM processing fails
 * 
 * @example
 * ```typescript
 * const vrmBuffer = await fs.readFile('avatar.vrm');
 * const result = await processVRMBuffer(vrmBuffer, 'avatar.vrm');
 * 
 * // Save the compressed VRM
 * await fs.writeFile(result.filename, result.buffer);
 * ```
 */
export async function processVRMBuffer(
  buffer: Buffer,
  filename: string
): Promise<{ buffer: Buffer; filename: string }> {
  // Write buffer to temporary file
  const tmpDir = os.tmpdir();
  const tmpFilePath = path.join(tmpDir, `${Date.now()}.vrm`);

  fs.writeFileSync(tmpFilePath, buffer);

  try {
    const result = await processing(tmpFilePath, filename);

    if ("success" in result && result.success === false) {
      throw new Error(result.message);
    }

    // Clean up original temp file
    fs.unlinkSync(tmpFilePath);

    // Clean up compressed temp file after reading
    if (result.file) {
      const compressedBuffer = result.buffer;
      fs.unlinkSync(result.file);

      return {
        buffer: compressedBuffer,
        filename: result.filename,
      };
    }

    throw new Error("VRM processing failed");
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
    throw error;
  }
}
