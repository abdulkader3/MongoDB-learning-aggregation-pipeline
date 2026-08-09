import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ResultDocumentType = "docs" | "json" | "stages";

export interface Preferences {
  resultDocumentType: ResultDocumentType;
}

interface PreferencesStore {
  preferences: Preferences;
  setResultDocumentType: (type: ResultDocumentType) => void;
}

export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      preferences: { resultDocumentType: "docs" },
      setResultDocumentType: (resultDocumentType) =>
        set({ preferences: { resultDocumentType } }),
    }),
    {
      name: "mongo-quest-preferences-v1",
      partialize: (s) => ({ preferences: s.preferences }),
      skipHydration: true,
    }
  )
);
