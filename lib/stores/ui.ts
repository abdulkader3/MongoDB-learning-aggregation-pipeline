import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  missionSidebarCollapsed: boolean;
  consoleCollapsed: boolean;
  toggleMissionSidebar: () => void;
  toggleConsole: () => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      missionSidebarCollapsed: false,
      consoleCollapsed: false,
      toggleMissionSidebar: () =>
        set((s) => ({ missionSidebarCollapsed: !s.missionSidebarCollapsed })),
      toggleConsole: () => set((s) => ({ consoleCollapsed: !s.consoleCollapsed })),
    }),
    {
      name: "mongo-quest-ui-v1",
      skipHydration: true,
    }
  )
);
