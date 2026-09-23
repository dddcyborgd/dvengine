import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "public/data/uploaded_avatars.json");

export interface Avatar {
  id: string;
  url: string;
  fileHash: string;
  name: string;
  image?: string;
  urlCompressed: string;
  createdAt: number;
}

export class AvatarService {
  private static readAvatars(): Avatar[] {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        // Ensure directory exists
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, "[]", "utf-8");
        return [];
      }
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private static writeAvatars(avatars: Avatar[]): void {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(avatars, null, 2), "utf-8");
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  static getAvatars(): Avatar[] {
    return this.readAvatars();
  }

  static getAvatarByHash(
    fileHash: string
  ): { url: string; urlCompressed: string | null; image?: string } | false {
    const avatars = this.readAvatars();
    const avatar = avatars.find((a) => a.fileHash === fileHash);
    if (!avatar) return false;
    return {
      url: avatar.url,
      urlCompressed: avatar.urlCompressed || null,
      image: avatar.image,
    };
  }

  static setAvatarData(payload: {
    url: string;
    fileHash: string;
    name: string;
    urlCompressed: string;
    image?: string;
  }): { id: string } {
    const avatars = this.readAvatars();
    const id = this.generateId();
    const newAvatar: Avatar = {
      id,
      ...payload,
      createdAt: Date.now(),
    };
    avatars.push(newAvatar);
    this.writeAvatars(avatars);
    return { id };
  }

  static editAvatar(avatarId: string, updates: { name?: string }): boolean {
    const avatars = this.readAvatars();
    const index = avatars.findIndex((a) => a.id === avatarId);
    if (index === -1) {
      throw new Error("Avatar not found");
    }
    if (updates.name !== undefined) {
      avatars[index].name = updates.name;
    }
    this.writeAvatars(avatars);
    return true;
  }

  static deleteAvatar(avatarId: string): boolean {
    const avatars = this.readAvatars();
    const index = avatars.findIndex((a) => a.id === avatarId);
    if (index === -1) {
      throw new Error("Avatar not found");
    }
    avatars.splice(index, 1);
    this.writeAvatars(avatars);
    return true;
  }

  static verifyUserAvatarHash(fileHash: string): boolean {
    const avatars = this.readAvatars();
    return !avatars.some((a) => a.fileHash === fileHash);
  }
}
