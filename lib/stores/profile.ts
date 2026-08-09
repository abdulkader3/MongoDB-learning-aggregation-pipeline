import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Profile {
  name: string;
  avatar: string | null;
}

interface ProfileStore {
  profile: Profile;
  setName: (name: string) => void;
  setAvatar: (avatar: string | null) => void;
  save: (profile: Profile) => void;
}

export const useProfile = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: { name: "", avatar: null },
      setName: (name) => set((s) => ({ profile: { ...s.profile, name } })),
      setAvatar: (avatar) => set((s) => ({ profile: { ...s.profile, avatar } })),
      save: (profile) => set({ profile }),
    }),
    {
      name: "mongo-quest-profile-v1",
      partialize: (s) => ({ profile: s.profile }),
      skipHydration: true,
    }
  )
);

const MAX_AVATAR_EDGE = 256;
const AVATAR_TYPE = "image/jpeg";
const AVATAR_QUALITY = 0.85;

/** Reads an image file and returns a compact downscaled data URL suitable for localStorage. */
export function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read the file."));
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : null;
      if (!src) {
        reject(new Error("Failed to read the file."));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("The selected file is not a valid image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_AVATAR_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Image processing is not supported in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL(AVATAR_TYPE, AVATAR_QUALITY));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
