import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ParseResult {
  ok: boolean;
  pipeline: Record<string, unknown>[];
  error?: string;
  position?: number;
}

/** Strips // and /* comments and trailing commas, then JSON.parse. */
export function parsePipelineJson(text: string): ParseResult {
  let cleaned = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  let i = 0;
  let quote = "";

  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];

    if (inLine) {
      if (c === "\n") {
        inLine = false;
        cleaned += c;
      }
      i += 1;
      continue;
    }
    if (inBlock) {
      if (c === "*" && next === "/") {
        inBlock = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (inString) {
      cleaned += c;
      if (c === "\\") {
        cleaned += next ?? "";
        i += 2;
        continue;
      }
      if (c === quote) inString = false;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      quote = c;
      cleaned += c;
      i += 1;
      continue;
    }
    if (c === "/" && next === "/") {
      inLine = true;
      i += 2;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlock = true;
      i += 2;
      continue;
    }
    if (c === ",") {
      // look ahead for a closing bracket/brace after whitespace
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j += 1;
      const ahead = text[j];
      if (ahead === "]" || ahead === "}") {
        i += 1;
        continue;
      }
    }
    cleaned += c;
    i += 1;
  }

  try {
    const value = JSON.parse(cleaned);
    if (!Array.isArray(value)) {
      return { ok: false, pipeline: [], error: "Pipeline must be an array of stage objects." };
    }
    return { ok: true, pipeline: value as Record<string, unknown>[] };
  } catch (err) {
    const e = err as Error;
    const pos = Number(/position (\d+)/.exec(e.message)?.[1] ?? 0);
    return { ok: false, pipeline: [], error: e.message, position: pos };
  }
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
