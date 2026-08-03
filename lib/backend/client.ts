import type {
  CollectionInfo,
  CollectionPage,
  EngineMode,
  ExecutionResult,
  HealthStatus,
  PipelineWarning,
} from "@/lib/types";
import { ENGINE_MODE, API_BASE_URL } from "@/lib/config";
import {
  getCollectionInfos,
  getCollectionInfo,
  getCollectionPage,
} from "@/lib/backend/db";
import {
  runMockPipeline,
  analyzeMockWarnings,
  getMockHealth,
} from "@/lib/backend/mock";

export interface RunRequest {
  missionId: string;
  collection: string;
  collections: string[];
  pipeline: Record<string, unknown>[];
}

export interface RunResponse {
  result: ExecutionResult;
  mode: EngineMode;
  latencyMs: number;
}

const TIMEOUT_MS = 30_000;

async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text.slice(0, 400) || res.statusText}`);
  }
  return (await res.json()) as T;
}

function coerceLiveResult(raw: unknown): ExecutionResult {
  const r = (raw ?? {}) as Partial<ExecutionResult>;
  return {
    success: Boolean(r.success),
    documents: Array.isArray(r.documents) ? r.documents : [],
    count: Number(r.count ?? (Array.isArray(r.documents) ? r.documents.length : 0)),
    stats: {
      executionTimeMs: Number(r.stats?.executionTimeMs ?? 0),
      aggregationTimeMs: Number(r.stats?.aggregationTimeMs ?? 0),
      responseSizeBytes: Number(r.stats?.responseSizeBytes ?? 0),
      totalDocsProcessed: Number(r.stats?.totalDocsProcessed ?? 0),
      documentsScanned: Number(r.stats?.documentsScanned ?? 0),
      stages: Array.isArray(r.stats?.stages) ? r.stats.stages : [],
    },
    warnings: Array.isArray(r.warnings) ? r.warnings : [],
    errors: Array.isArray(r.errors) ? r.errors : [],
    rawError: r.rawError,
  };
}

export async function runPipeline(req: RunRequest): Promise<RunResponse> {
  const started = performance.now();
  if (ENGINE_MODE === "mock") {
    const result = runMockPipeline(req.collection, req.pipeline);
    return {
      result,
      mode: "mock",
      latencyMs: performance.now() - started,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${API_BASE_URL.replace(/\/$/, "")}/api/challenges/${encodeURIComponent(req.missionId)}`;
    const raw = await postJson<unknown>(url, {
      collection: req.collection,
      collections: req.collections,
      pipeline: req.pipeline,
    }, controller.signal);
    return {
      result: coerceLiveResult(raw),
      mode: "live",
      latencyMs: performance.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchHealth(): Promise<HealthStatus> {
  if (ENGINE_MODE === "mock") {
    return getMockHealth();
  }
  const started = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      connected?: boolean;
      backend?: { up?: boolean; latencyMs?: number; message?: string };
      mongo?: { connected?: boolean; databaseName?: string; collectionsLoaded?: number };
    };
    return {
      connected: true,
      mode: "live",
      backend: {
        up: Boolean(json.backend?.up),
        latencyMs: Number(json.backend?.latencyMs ?? (performance.now() - started)),
        message: json.backend?.message ?? "Live backend reachable.",
      },
      mongo: {
        connected: Boolean(json.mongo?.connected),
        databaseName: json.mongo?.databaseName ?? "",
        collectionsLoaded: Number(json.mongo?.collectionsLoaded ?? 0),
      },
      lastCheck: new Date().toISOString(),
    };
  } catch (err) {
    return {
      connected: false,
      mode: "live",
      backend: {
        up: false,
        latencyMs: Math.round(performance.now() - started),
        message: err instanceof Error ? err.message : "Backend unreachable",
      },
      mongo: { connected: false, databaseName: "", collectionsLoaded: 0 },
      lastCheck: new Date().toISOString(),
    };
  }
}

export function analyzeWarnings(
  pipeline: Record<string, unknown>[],
  collection?: string
): PipelineWarning[] {
  if (ENGINE_MODE === "mock") return analyzeMockWarnings(pipeline, collection);
  return [];
}

export function getCollections(): CollectionInfo[] {
  return getCollectionInfos();
}

export function getCollection(name: string): CollectionInfo | undefined {
  return getCollectionInfo(name);
}

export function getCollectionPageCached(
  name: string,
  skip = 0,
  limit = 25
): CollectionPage {
  return getCollectionPage(name, skip, limit);
}

export { ENGINE_MODE, API_BASE_URL };
