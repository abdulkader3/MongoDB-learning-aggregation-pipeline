export type Difficulty = "easy" | "medium" | "hard" | "expert" | "boss";

export type ChallengeStatus = "locked" | "available" | "solved";

export type Verdict =
  | "perfect"
  | "correct"
  | "almost-there"
  | "wrong-projection"
  | "wrong-grouping"
  | "wrong-lookup"
  | "wrong-sorting"
  | "wrong-output-shape"
  | "error";

export type RunStatus = "idle" | "running" | "success" | "error";

export type VerdictTone = "success" | "warning" | "danger";

export interface CollectionMeta {
  name: string;
  title: string;
  description: string;
  schema: Record<string, "string" | "number" | "boolean" | "date" | "array" | "object" | "ObjectId" | "null">;
  sampleSize: number;
}

export interface DocumentSchema {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object" | "ObjectId" | "null";
  description?: string;
  nested?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Challenges                                                         */
/* ------------------------------------------------------------------ */

export interface ValueCheck {
  /** dot path into the document, e.g. "total" or "items.0.qty" */
  path: string;
  /** expected type — fails as wrong-output-shape if mismatched */
  type?: "string" | "number" | "boolean" | "array" | "object" | "date" | "ObjectId";
  /** exact expected primitive value */
  value?: string | number | boolean;
  /** if number, expected value is this expression resolved against a known constant */
  ref?: string;
  /** optional predicate id (stringly) */
  predicate?: "gt" | "gte" | "lt" | "lte" | "notNull" | "isEmail" | "isArrayNonEmpty";
  target?: number;
}

export interface ExpectedOutput {
  /** exact number of documents expected */
  docCount: number;
  /** does document ordering matter? */
  orderSensitive: boolean;
  /** keys that must appear on every result document */
  requiredKeys: string[];
  /** keys that must NOT appear on any result document */
  forbiddenKeys?: string[];
  /** dot-path value checks across the returned docs (index 0..n) */
  checks: { doc: number; path: string; type?: ValueCheck["type"]; value?: ValueCheck["value"]; predicate?: ValueCheck["predicate"]; target?: number }[];
}

export interface Challenge {
  id: string;
  chapterId: string;
  order: number;
  title: string;
  difficulty: Difficulty;
  xp: number;
  estimatedMinutes: number;
  objectives: string[];
  scenario: string;
  collections: string[];
  requirements: string[];
  rules: string[];
  allowedOperators: string[];
  forbiddenOperators: string[];
  hints: string[];
  commonMistakes: string[];
  expected: ExpectedOutput;
  tags: string[];
  /** optional recorded demo response used when backend is in demo mode */
  demo?: DemoExecution;
}

export interface DemoExecution {
  data: unknown[];
  pipeline: unknown[];
  stats: PipelineStats;
}

/* ------------------------------------------------------------------ */
/*  Roadmap                                                            */
/* ------------------------------------------------------------------ */

export interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  order: number;
  xpReward: number;
  challengeIds: string[];
}

export interface RoadmapState {
  byId: Record<string, ChallengeStatus>;
}

/* ------------------------------------------------------------------ */
/*  Operators                                                          */
/* ------------------------------------------------------------------ */

export interface Operator {
  name: string;
  category: "stage" | "expression";
  stageName?: string;
  summary: string;
  syntax: string;
  visual: string;
  useCases: string[];
  performanceNotes: string[];
  commonMistakes: string[];
  related: string[];
  miniChallenge?: {
    question: string;
    expectedKeys: string[];
  };
}

/* ------------------------------------------------------------------ */
/*  Achievements                                                       */
/* ------------------------------------------------------------------ */

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  condition: "first-solve" | "count" | "operator" | "chapter" | "streak" | "level" | "perfect";
  target: number;
  operator?: string;
}

/* ------------------------------------------------------------------ */
/*  Backend                                                            */
/* ------------------------------------------------------------------ */

export interface PipelineStageStat {
  stage: string;
  inputCount: number;
  outputCount: number;
  executionTimeMs: number;
  docsScanned?: number;
  memoryBytes?: number;
  explanation: string;
}

export interface PipelineStats {
  executionTimeMs: number;
  docsScanned: number;
  docsReturned: number;
  pipelineLength: number;
  memoryBytes?: number;
  stageStats?: PipelineStageStat[];
}

export interface BackendResponse {
  ok: boolean;
  data: unknown[];
  pipeline?: unknown[] | string;
  stats?: Partial<PipelineStats>;
  error?: string;
}

export interface BackendSettings {
  enabled: boolean;
  baseUrl: string;
  path: string;
  method: "POST" | "GET";
  timeoutMs: number;
  demoMode: boolean;
}

export interface RunRequestPayload {
  challengeId?: string;
  collection: string;
  collections: string[];
  params?: Record<string, unknown>;
}

export interface PipelineWarning {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  stageIndex?: number;
  stage?: string;
}

/* ------------------------------------------------------------------ */
/*  Progression                                                        */
/* ------------------------------------------------------------------ */

export interface ChallengeAttempt {
  challengeId: string;
  verdict: Verdict;
  at: string;
  xpEarned: number;
  ms: number;
}

export interface ActivityEntry {
  id: string;
  type: "solve" | "attempt" | "achievement" | "daily" | "streak" | "level";
  title: string;
  detail: string;
  xp?: number;
  at: string;
}

export interface ProgressionState {
  xp: number;
  completedIds: string[];
  attempts: Record<string, ChallengeAttempt[]>;
  operatorMastery: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  lastActiveDay: string | null;
  dailyHistory: Record<string, string>;
  achievements: string[];
  activity: ActivityEntry[];
  totalPerfect: number;
  totalRuns: number;
}

export interface AchievementUnlock {
  achievement: AchievementDef;
  newLevel?: number;
  xpBefore: number;
  xpAfter: number;
}

/* ------------------------------------------------------------------ */
/*  Console                                                            */
/* ------------------------------------------------------------------ */

export type ConsoleLevel = "log" | "info" | "warn" | "error" | "success";

export interface ConsoleEntry {
  id: string;
  level: ConsoleLevel;
  category: "request" | "response" | "validation" | "pipeline" | "system" | "progress";
  message: string;
  detail?: string;
  timestamp: number;
}

export interface RunExecution {
  id: string;
  challengeId?: string;
  label: string;
  startedAt: number;
  durationMs: number;
  status: "success" | "error";
  statusCode?: number;
  payload: RunRequestPayload;
  response?: BackendResponse;
  verdict?: Verdict;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Pipeline visualization                                             */
/* ------------------------------------------------------------------ */

export interface FlowNodeData {
  label: string;
  kind: "collection" | "stage" | "output";
  stageName?: string;
  inputCount?: number;
  outputCount?: number;
  executionTimeMs?: number;
  memoryBytes?: number;
  explanation?: string;
  stageIndex?: number;
  stage?: unknown;
}

export interface AnalyzerResult {
  stages: { name: string; stage: unknown }[];
  warnings: PipelineWarning[];
  inferred: {
    inputCount: number;
    outputCount: number;
    pipelineLength: number;
    score: number;
    estTimeMs: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Sandbox                                                            */
/* ------------------------------------------------------------------ */

export interface SandboxState {
  pipelineText: string;
  pipeline: unknown[];
  collection: string;
  warnings: PipelineWarning[];
}

export type DifficultyMeta = {
  key: Difficulty;
  label: string;
  xp: number;
  color: string;
  dot: string;
  glow: string;
};
