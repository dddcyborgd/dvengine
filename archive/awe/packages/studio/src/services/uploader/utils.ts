import { isUploadable, getDefaultMimePreview } from "../../utils/mime-utils";
import { getMaxFileSizeBytes } from "../../utils/file-size";
import { RemoteUploader } from "./remote-uploader";

const MAX_FILE_SIZE = getMaxFileSizeBytes();

export function getSWRUploadKey(userId: string) {
  return `uploads/${userId}`;
}

export function checkUploadSizeLimit(fileSize: number) {
  return fileSize <= MAX_FILE_SIZE;
}

export function getPreviewUrl(url: string, mimeType: string) {
  //
  let previewUrl = null;

  if (mimeType.startsWith("image/")) {
    //
    previewUrl = url;
  }

  if (previewUrl == null) {
    previewUrl = getDefaultMimePreview(mimeType);
  }

  return previewUrl;
}

export type UserAsseUpload = Awaited<
  ReturnType<RemoteUploader["fetchUploads"]>
>[number];

export function getUploadErrorMsg(err: Error) {
  let title = "Upload error";
  let message = "Failed to upload file";

  if (err.message && err.message.includes("exists")) {
    //
    title = "Upload error";
    message = "File already exists";
  }

  if (err.message === "mime") {
    title = "Unsupported file type";
    message = "File must be either an image, video, audio or GLB model";
  } else if (
    err.message === "size-limit" ||
    (err.message && err.message.includes("size too large"))
  ) {
    title = "File size too big";
    const maxFileMB = Math.floor(MAX_FILE_SIZE / (1024 * 1024));
    message = `Maximum file size is currently ${maxFileMB}MB`;
  }

  return { title, message };
}

export function checkUploadLimit(opts) {
  //
  let { file, mime } = opts;

  if (mime == null || !isUploadable(mime)) {
    //
    throw new Error("mime");
  }

  if (!checkUploadSizeLimit(file.size)) {
    //
    throw new Error("size-limit");
  }
}

export async function getFileHash(file: File) {
  //
  const fileDataUrl = await new Promise<string>((resolve, reject) => {
    //
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.addEventListener(
      "load",
      () => {
        resolve(reader.result as string);
      },
      false
    );
  });

  const buffer = new TextEncoder().encode(fileDataUrl);

  const hash = await crypto.subtle.digest("SHA-256", buffer);

  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

export function getUploader() {
  return RemoteUploader.get();
}
