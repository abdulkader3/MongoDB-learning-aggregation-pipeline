export type Difficulty = "easy" | "medium" | "hard" | "expert" | "boss";

export type MissionType =
  | "filtering"
  | "grouping"
  | "joining"
  | "reshaping"
  | "analytics"
  | "arrays"
  | "nested-arrays"
  | "time-series"
  | "financial"
  | "dashboard"
  | "search"
  | "recommendation"
  | "statistics"
  | "inventory"
  | "sales"
  | "healthcare"
  | "education"
  | "banking"
  | "ecommerce"
  | "social"
  | "streaming"
  | "iot"
  | "window"
  | "facet"
  | "graph";

export interface MissionHint {
  title: string;
  body: string;
}

export interface Mission {
  id: string;
  title: string;
  difficulty: Difficulty;
  xp: number;
  estimatedMinutes: number;
  description: string;
  scenario: string;
  collections: string[];
  /** The stage operators the mission intends you to use (for mastery tracking). */
  operators: string[];
  /** Stages that are allowed. Empty = all allowed. */
  allowedStages?: string[];
  /** Stages that are explicitly forbidden. */
  forbiddenStages?: string[];
  requirements: string[];
  rules: string[];
  restrictions: string[];
  hints: MissionHint[];
  commonMistakes: string[];
  objectives: string[];
  realWorldUses: string[];
  tags: MissionType[];
  /** Reference pipeline (documented for learning; NOT executed by frontend logic). */
  referencePipeline?: Record<string, unknown>[];
  /** Ids of missions that must be completed to unlock this one. */
  requires?: string[];
  /** Whether expected output is order-sensitive. */
  expectExactOrder?: boolean;
  /** When true, extra/missing helper fields like _id are ignored more leniently. */
  ignoreInternalIds?: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  missionIds: string[];
}

export interface Level {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
  chapters: Chapter[];
}

export interface CollectionInfo {
  name: string;
  count: number;
  sizeBytes: number;
  fields: string[];
  sample: Record<string, unknown>[];
}

export interface CollectionPage {
  collection: string;
  total: number;
  skip: number;
  limit: number;
  documents: Record<string, unknown>[];
  fields: string[];
}

export interface StageStat {
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

export interface PipelineWarning {
  type:
    | "match-after-group"
    | "unnecessary-project"
    | "missing-index"
    | "large-lookup"
    | "too-many-unwind"
    | "no-match-first"
    | "wide-group-output"
    | "unbounded-lookup";
  message: string;
}

export interface ExecutionResult {
  success: boolean;
  documents: Record<string, unknown>[];
  count: number;
  stats: {
    executionTimeMs: number;
    aggregationTimeMs: number;
    responseSizeBytes: number;
    totalDocsProcessed: number;
    documentsScanned: number;
    stages: StageStat[];
  };
  warnings: PipelineWarning[];
  errors: string[];
  rawError?: string;
}

export interface HealthStatus {
  connected: boolean;
  mode: "mock" | "live";
  backend: {
    up: boolean;
    latencyMs: number;
    message: string;
  };
  mongo: {
    connected: boolean;
    databaseName: string;
    collectionsLoaded: number;
  };
  lastCheck: string;
}

export interface ServerContext {
  databaseName: string;
  collections: CollectionInfo[];
}

export type EngineMode = "mock" | "live";

export interface ValidationOptions {
  exactOrder: boolean;
  ignoreInternalIds: boolean;
  tolerance: number;
}

export type Verdict =
  | "correct"
  | "wrong"
  | "almost-there"
  | "missing-stage"
  | "wrong-sorting"
  | "wrong-grouping"
  | "incorrect-projection";

export interface ValidationCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface ValidationReport {
  verdict: Verdict;
  passed: boolean;
  score: number;
  checks: ValidationCheck[];
  message: string;
  differences: {
    actualCount: number;
    expectedCount: number;
    missingFields: string[];
    extraFields: string[];
    valueMismatches: number;
    typeMismatches: number;
    orderMismatches: number;
  };
}

export interface OperatorEntry {
  stage: boolean;
  name: string;
  category: string;
  syntax: string;
  purpose: string;
  example: string;
  exampleOutput: string;
  realWorld: string;
  commonMistakes: string[];
  performanceTips: string[];
  related: string[];
  linkedChallengeIds: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Function-ish predicate id resolved in the store. */
  checkId: string;
}

export interface ConsoleEntry {
  id: string;
  at: string;
  level: "info" | "success" | "warn" | "error" | "log" | "req";
  method?: string;
  url?: string;
  status?: number;
  message: string;
  detail?: unknown;
  durationMs?: number;
}

export interface MissionAttempt {
  at: string;
  passed: boolean;
  attempts: number;
  durationMs: number;
  verdict: Verdict;
  score: number;
}

export interface ProgressState {
  startedAt: string;
  lastActive: string;
  completed: Record<string, MissionAttempt>;
  attempts: Record<string, number>;
  failedAttempts: Record<string, number>;
  fastestSolveMs: Record<string, number>;
  totalXp: number;
  operatorUsage: Record<string, number>;
  achievements: Record<string, string>;
  daily: Record<string, { solved: boolean; challengeId: string }>;
  sessionHistory: { at: string; label: string; xp: number }[];
}

export interface DailyChallengeInfo {
  date: string;
  missionId: string;
  title: string;
  difficulty: Difficulty;
  xp: number;
}
