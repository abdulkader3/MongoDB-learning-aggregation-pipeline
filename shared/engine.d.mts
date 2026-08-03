export interface EngineStageStat {
  stage: string;
  inputCount: number;
  outputCount: number;
  executionTimeMs: number;
  memoryBytes: number;
  sampleInput: Record<string, unknown>[];
  sampleOutput: Record<string, unknown>[];
  explanation: string;
  purpose: string;
}

export interface AggregateResult {
  docs: Record<string, unknown>[];
  count: number;
  steps: EngineStageStat[];
  totalScanned: number;
  executionTimeMs: number;
  aggregationTimeMs: number;
  documentsScanned: number;
  warnings: { type: string; message: string }[];
}

export interface PipelineWarning {
  type: string;
  message: string;
}

export function aggregate(
  db: Record<string, Record<string, unknown>[]>,
  collection: string,
  pipeline: Record<string, unknown>[]
): AggregateResult;

export function analyzeWarnings(
  pipeline: Record<string, unknown>[],
  db?: Record<string, Record<string, unknown>[]>
): PipelineWarning[];

export const WRITE_STAGES: Set<string>;
export const STAGE_PURPOSE: Record<string, string>;
