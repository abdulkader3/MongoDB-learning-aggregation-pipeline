import { create } from "zustand";
import type { ConsoleEntry } from "@/lib/types";
import { uid } from "@/lib/utils";

const MAX_ENTRIES = 300;

interface ConsoleStore {
  entries: ConsoleEntry[];
  push: (entry: Omit<ConsoleEntry, "id" | "at">) => void;
  clear: () => void;
}

export const useConsole = create<ConsoleStore>()((set) => ({
  entries: [],
  push: (entry) =>
    set((s) => ({
      entries: [
        ...s.entries,
        { ...entry, id: uid("con"), at: new Date().toISOString() },
      ].slice(-MAX_ENTRIES),
    })),
  clear: () => set({ entries: [] }),
}));

export function logInfo(message: string, detail?: unknown) {
  useConsole.getState().push({ level: "info", message, detail });
}

export function logSuccess(message: string, detail?: unknown) {
  useConsole.getState().push({ level: "success", message, detail });
}

export function logWarn(message: string, detail?: unknown) {
  useConsole.getState().push({ level: "warn", message, detail });
}

export function logError(message: string, detail?: unknown) {
  useConsole.getState().push({ level: "error", message, detail });
}

export function logRequest(method: string, url: string, status: number, durationMs?: number) {
  useConsole.getState().push({ level: "req", method, url, status, durationMs, message: `${method} ${url}` });
}
