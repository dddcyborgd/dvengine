import {
  getUploadedAssets,
  getAssetByHash,
  setUploadedAsset,
  checkUploadedAsset,
  updateUpload,
  deleteUploads,
  setOptimizedFiles,
} from "../actions/user-uploads";

export type { SetUploadOpts, CheckResult } from "../server/user-uploads-service";
export type { UserAssetUpload } from "../types/user-upload";

export const ClientUserUploadsService = {
  getUploadedAssets,
  getAssetByHash,
  setUploadedAsset,
  checkUploadedAsset,
  updateUpload,
  deleteUploads,
  setOptimizedFiles,
};
