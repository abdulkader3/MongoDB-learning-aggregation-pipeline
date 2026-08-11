import type { EngineMode } from "@/lib/types";

export const ENGINE_MODE: EngineMode =
  process.env.NEXT_PUBLIC_AGG_API_MODE === "live" ? "live" : "mock";

/** Base URL of the live backend (only used in live mode). */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_AGG_API_URL ?? "http://localhost:4000";

export const SEED = 20260803;

export const DEFAULT_PIPELINE_TEXT = "[\n  // {\n  //   \"$match\": {},\n  // },\n  // {\n  //   \"$project\": { \"_id\": 0 },\n  // },\n]";
