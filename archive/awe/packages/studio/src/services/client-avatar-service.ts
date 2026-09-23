import {
  getAvatars,
  getAvatarByHash,
  setAvatarData,
  editAvatar,
  deleteAvatar,
  verifyAvatarHash,
} from "../actions/uploaded-avatars";

export type { Avatar } from "../server/avatar-service";

export const ClientAvatarService = {
  getAvatars,
  getAvatarByHash,
  setAvatarData,
  editAvatar,
  deleteAvatar,
  verifyAvatarHash,
};
