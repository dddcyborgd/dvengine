import { getMimeType, mimetoExt } from "../../utils/mime-utils";
import { uploadFile } from "../../utils/uploader";
import {
  checkUploadLimit,
  getFileHash,
  getSWRUploadKey,
  UserAsseUpload,
} from "./utils";
import { ClientUserUploadsService as UserUploadService } from "../client-user-uploads-service";
import { OptimizedFiles } from "../../types/optimized-files";
import { mutate } from "swr";
import { OptimizerServices } from "../../utils/uploader/optimizer";
import { gifCompress } from "../../utils/ffmpeg/gif-compress";

export class RemoteUploader {
  //
  //
  private static instance: RemoteUploader;

  static get() {
    //
    if (this.instance == null) {
      //
      this.instance = new RemoteUploader();
    }

    return this.instance;
  }

  constructor() {}

  async fetchUploads() {
    let data = await UserUploadService.getUploadedAssets();

    // Sort using the native sort
    data.sort((a, b) => b.createdAt - a.createdAt);

    globalThis.$$userUploads = data;

    return data;
  }

  async deleteUpload({ hash }) {
    //
    await UserUploadService.deleteUploads([hash]);

    this.refresh();
  }

  updateUpload(hash, data) {
    //
    return UserUploadService.updateUpload(hash, data);
  }

  async saveUpload(opts: {
    file: File;
    mime: string;
    onProgress: (n: number) => unknown;
  }) {
    //
    let { file, mime, onProgress } = opts;

    checkUploadLimit(opts);

    onProgress(0);

    const hashHex = await getFileHash(file);

    const existingUpload = await UserUploadService.checkUploadedAsset(hashHex);

    if (existingUpload?.exists) {
      //
      return {
        exists: true,
        url: existingUpload.url,
        d_optimized_files: existingUpload.d_optimized_files,
        name: file.name,
        hash: hashHex,
        mimeType: mime,
      };
    }

    let url = existingUpload?.url;

    let d_optimized_files = existingUpload?.d_optimized_files;

    if (existingUpload == null) {
      //
      let ts = Date.now();

      let perfs = {
        upload: 0,
        optimize: 0,
      };

      let ext = mimetoExt[mime];

      let _file = file;

      if (mime === "image/gif") {
        try {
          console.log("gif compressing");

          const response = await gifCompress(file, hashHex);

          if (response) {
            _file = response;
            mime = "video/mp4";
          }
        } catch (err) {
          console.log("gif compressing error", err);
        }
      }

      let cResp = await uploadFile({
        file: _file,
        mimeType: mime,
        id: "uploaded-assets-" + hashHex + "." + ext,
        onProgress: (loaded, total) => {
          onProgress(Math.round((loaded * 100) / total));
        },
      });

      perfs.upload = Date.now() - ts;

      ts = Date.now();

      url = cResp.url;

      mime = cResp.mimeType;

      console.log("perfs", perfs);
    } else {
      //
      mime = existingUpload.mimeType ?? getMimeType(url) ?? mime;
    }

    await UserUploadService.setUploadedAsset({
      hash: hashHex,
      url,
      d_optimized_files,
      name: file.name,
      mimeType: mime,
    });

    if (d_optimized_files == null && mime.startsWith("model/")) {
      //
      OptimizerServices.optimizeAsset({
        asset: {
          type: "model",
          url,
          mime_type: mime,
          hash: hashHex,
        },
      }).then((result) => {
        d_optimized_files = result.optimized;
        this.setOptimizedFiles(hashHex, d_optimized_files);
      });
    }

    this.refresh();

    return {
      exists: false,
      url,
      d_optimized_files,
      name: file.name,
      hash: hashHex,
      mimeType: mime,
    };
  }

  async setOptimizedFiles(hash: string, files: OptimizedFiles) {
    //

    await UserUploadService.setOptimizedFiles(hash, files);

    this.refresh();
  }

  refresh() {
    mutate(getSWRUploadKey("admin"));
  }
}
