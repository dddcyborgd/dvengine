import { OptimizedFiles } from "./optimized-files";

type XYZ = {
  x: number;
  y: number;
  z: number;
};

type OptimizeModel = {
  useWeld?: boolean;
  useDraco?: boolean;
  useMeshOpt?: boolean;
};

export interface UserAssetUpload {
  name: string;
  hash: string;
  url: string;
  d_optimized_files?: OptimizedFiles;
  meta?: any;
  mimeType: string;
  position?: XYZ;
  rotation?: XYZ;
  scale?: XYZ;
  createdAt: number;
  lastModified: number;
  mutate?: () => void;
  optimEnabled?: boolean;
  optimiseParam?: OptimizeModel;
  weld_draco_meshopt?: OptimizedFiles;
}
