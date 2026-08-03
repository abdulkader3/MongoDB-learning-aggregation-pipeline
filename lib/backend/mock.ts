import { aggregate, analyzeWarnings } from "@/shared/engine.mjs";
import type {
  ExecutionResult,
  HealthStatus,
  PipelineWarning,
  StageStat,
} from "@/lib/types";
import { SEED } from "@/lib/config";
import { getMockDb, getServerContext } from "@/lib/backend/db";

const LATENCY = 2;

function toStageStats(steps: ReturnType<typeof aggregate>["steps"]): StageStat[] {
  return steps.map((s) => ({
    stage: s.stage,
    inputCount: s.inputCount,
    outputCount: s.outputCount,
    executionTimeMs: s.executionTimeMs,
    memoryBytes: s.memoryBytes,
    sampleInput: s.sampleInput,
    sampleOutput: s.sampleOutput,
    explanation: s.explanation,
    purpose: s.purpose,
  }));
}

export function runMockPipeline(
  collection: string,
  pipeline: Record<string, unknown>[]
): ExecutionResult {
  const started = performance.now();
  const db = getMockDb();
  if (!db[collection]) {
    return {
      success: false,
      documents: [],
      count: 0,
      stats: {
        executionTimeMs: 0,
        aggregationTimeMs: 0,
        responseSizeBytes: 0,
        totalDocsProcessed: 0,
        documentsScanned: 0,
        stages: [],
      },
      warnings: [],
      errors: [`Collection '${collection}' does not exist.`],
      rawError: `Unknown collection '${collection}'`,
    };
  }

  let out: ReturnType<typeof aggregate>;
  try {
    out = aggregate(db, collection, pipeline);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "The demo engine rejected this pipeline.";
    return {
      success: false,
      documents: [],
      count: 0,
      stats: {
        executionTimeMs: 0,
        aggregationTimeMs: 0,
        responseSizeBytes: 0,
        totalDocsProcessed: 0,
        documentsScanned: 0,
        stages: [],
      },
      warnings: [],
      errors: [msg],
      rawError: msg,
    };
  }

  const responseSizeBytes = new TextEncoder().encode(
    JSON.stringify(out.docs)
  ).length;

  const latency = LATENCY + (performance.now() - started);
  return {
    success: true,
    documents: out.docs,
    count: out.count,
    stats: {
      executionTimeMs: latency,
      aggregationTimeMs: out.aggregationTimeMs,
      responseSizeBytes,
      totalDocsProcessed: out.totalScanned,
      documentsScanned: out.documentsScanned,
      stages: toStageStats(out.steps),
    },
    warnings: out.warnings as unknown as PipelineWarning[],
    errors: [],
  };
}

export function analyzeMockWarnings(
  pipeline: Record<string, unknown>[],
  collection?: string
): PipelineWarning[] {
  const db = collection ? getMockDb() : undefined;
  return analyzeWarnings(pipeline, db) as unknown as PipelineWarning[];
}

export function getMockHealth(): HealthStatus {
  const ctx = getServerContext();
  return {
    connected: true,
    mode: "mock",
    backend: {
      up: true,
      latencyMs: LATENCY,
      message: "In-browser demo engine (no network required).",
    },
    mongo: {
      connected: true,
      databaseName: ctx.databaseName,
      collectionsLoaded: ctx.collections.length,
    },
    lastCheck: new Date().toISOString(),
  };
}

export function getMockMeta() {
  return { seed: SEED };
}
