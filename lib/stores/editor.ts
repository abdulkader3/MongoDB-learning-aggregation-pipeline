import { create } from "zustand";
import { persist } from "zustand/middleware";
import { parsePipeline, type ParseResult } from "@/lib/mongo/parse";

export type { ParseResult };

/**
 * Parses the editor text into the internal pipeline representation.
 *
 * Accepts both strict JSON (`{ "$match": {} }`) and MongoDB-style unquoted
 * keys (`{ $match: {} }`), along with comments, trailing commas and single
 * quoted strings. The result is plain JS values, so the rest of the app
 * (Mock Engine, validation, mission checks) is unchanged.
 */
export function parsePipelineJson(text: string): ParseResult {
  return parsePipeline(text);
}

interface EditorState {
  texts: Record<string, string>;
  activeMissionId: string | null;
  setActive: (id: string | null) => void;
  setText: (missionId: string, text: string) => void;
  textFor: (missionId: string) => string;
}

export const useEditor = create<EditorState>()(
  persist(
    (set, get) => ({
      texts: {},
      activeMissionId: null,
      setActive: (id) => set({ activeMissionId: id }),
      setText: (missionId, text) =>
        set((s) => ({ texts: { ...s.texts, [missionId]: text } })),
      textFor: (missionId) => get().texts[missionId] ?? "",
    }),
    { name: "mongo-quest-editor-v1", skipHydration: true }
  )
);

export function stageNames(pipeline: Record<string, unknown>[]): string[] {
  const out: string[] = [];
  for (const stage of pipeline) {
    if (stage && typeof stage === "object" && !Array.isArray(stage)) {
      const keys = Object.keys(stage);
      if (keys.length === 1 && keys[0].startsWith("$")) out.push(keys[0]);
      else out.push(Object.keys(stage)[0] ?? "(?)");
    }
  }
  return out;
}
