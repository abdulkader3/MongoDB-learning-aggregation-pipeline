import type { ExecutionResult, ValidationReport, Verdict } from "@/lib/types";
import { MISSION_MAP } from "@/lib/challenges/data";
import { getExpectedDocs } from "@/lib/challenges/expected";
import { runPipeline } from "@/lib/backend/client";
import { validateMission } from "@/lib/validation";
import { parsePipelineJson, stageNames } from "@/lib/stores/editor";
import { useProgress } from "@/lib/stores/progress";
import { logError, logInfo, logRequest, logSuccess, logWarn } from "@/lib/stores/console";
import { ENGINE_MODE } from "@/lib/config";

export interface RunOutcome {
  ok: boolean;
  result: ExecutionResult | null;
  validation: ValidationReport | null;
  verdict: Verdict | "error";
  error: string | null;
  unlocked: string[];
  xpGained: number;
  levelUp: boolean;
}

export interface CheckReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function checkStageRestrictions(
  missionId: string,
  pipeline: Record<string, unknown>[]
): CheckReport {
  const mission = MISSION_MAP[missionId];
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!mission) return { ok: true, errors, warnings };

  const names = stageNames(pipeline);
  const allowed = mission.allowedStages;
  const forbidden = mission.forbiddenStages;

  if (allowed && allowed.length) {
    for (const name of names) {
      if (!allowed.includes(name)) {
        errors.push(`Stage ${name} is not allowed for this mission (allowed: ${allowed.join(", ")}).`);
      }
    }
  }
  if (forbidden) {
    for (const name of names) {
      if (forbidden.includes(name)) {
        errors.push(`Stage ${name} is explicitly forbidden for this mission.`);
      }
    }
  }

  for (const name of names) {
    if (name === "$out" || name === "$merge") {
      errors.push(`Write stage ${name} is not allowed — this is a read-only practice.`);
    }
  }

  const reqCol = mission.collections[0];
  if (!pipeline.some((s) => s && typeof s === "object" && Object.keys(s)[0].startsWith("$"))) {
    warnings.push("Your pipeline looks empty — did you forget to add stages?");
  }
  void reqCol;
  return { ok: errors.length === 0, errors, warnings };
}

export async function executeMission(
  missionId: string,
  text: string
): Promise<RunOutcome> {
  const mission = MISSION_MAP[missionId];
  if (!mission) {
    logError(`Unknown mission ${missionId}`);
    return { ok: false, result: null, validation: null, verdict: "error", error: `Unknown mission ${missionId}`, unlocked: [], xpGained: 0, levelUp: false };
  }

  const parsed = parsePipelineJson(text);
  if (!parsed.ok) {
    logError("Pipeline failed to parse", parsed.error);
    return { ok: false, result: null, validation: null, verdict: "error", error: parsed.error ?? "Invalid JSON", unlocked: [], xpGained: 0, levelUp: false };
  }

  const restriction = checkStageRestrictions(missionId, parsed.pipeline);
  if (!restriction.ok) {
    restriction.errors.forEach((e) => logWarn(e));
    logError("Stage restrictions blocked the run");
    return { ok: false, result: null, validation: null, verdict: "error", error: restriction.errors.join(" "), unlocked: [], xpGained: 0, levelUp: false };
  }

  logInfo(`Executing mission ${missionId} (${ENGINE_MODE} engine)`, {
    collection: mission.collections[0],
    stages: stageNames(parsed.pipeline),
  });

  let result: ExecutionResult;
  try {
    const resp = await runPipeline({
      missionId,
      collection: mission.collections[0],
      collections: mission.collections,
      pipeline: parsed.pipeline,
    });
    result = resp.result;
    logRequest("POST", `/api/challenges/${missionId}`, result.success ? 200 : 400, resp.latencyMs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Execution failed";
    logError("Execution failed", msg);
    return { ok: false, result: null, validation: null, verdict: "error", error: msg, unlocked: [], xpGained: 0, levelUp: false };
  }

  if (!result.success) {
    logError("Engine rejected the pipeline", result.errors);
    return { ok: false, result, validation: null, verdict: "error", error: result.rawError ?? result.errors.join(" "), unlocked: [], xpGained: 0, levelUp: false };
  }

  if (result.warnings.length) {
    for (const w of result.warnings) logWarn(w.message);
  }

  const expected = getExpectedDocs(missionId);
  if (!expected) {
    logWarn(`No expected output embedded for ${missionId} — skipping validation`);
    return { ok: false, result, validation: null, verdict: "error", error: "Expected output not available.", unlocked: [], xpGained: 0, levelUp: false };
  }

  const validation = validateMission({
    missionId,
    actual: result.documents,
    expected,
    pipeline: parsed.pipeline,
    options: {
      exactOrder: mission.expectExactOrder ?? true,
      ignoreInternalIds: mission.ignoreInternalIds ?? true,
      tolerance: 0.0001,
    },
  });

  const progress = useProgress.getState();
  if (validation.passed) {
    const attempts = progress.state.attempts[missionId] ?? 0;
    const { unlocked, levelUp } = progress.solve({
      missionId,
      attempts: attempts + 1,
      durationMs: result.stats.executionTimeMs,
      verdict: validation.verdict,
      score: validation.score,
      xp: mission.xp,
    });
    logSuccess(`Mission ${missionId} solved — +${mission.xp} XP (score ${validation.score}/100)`, { verdict: validation.verdict });
    return {
      ok: true,
      result,
      validation,
      verdict: validation.verdict,
      error: null,
      unlocked,
      xpGained: mission.xp,
      levelUp,
    };
  }

  progress.fail(missionId);
  logWarn(`Mission ${missionId} not solved yet`, validation.message);
  return {
    ok: false,
    result,
    validation,
    verdict: validation.verdict,
    error: validation.message,
    unlocked: [],
    xpGained: 0,
    levelUp: false,
  };
}

export async function runSandboxPipeline(
  collection: string,
  text: string
): Promise<{ result: ExecutionResult | null; error: string | null }> {
  const parsed = parsePipelineJson(text);
  if (!parsed.ok) {
    return { result: null, error: parsed.error ?? "Invalid JSON" };
  }
  try {
    const resp = await runPipeline({
      missionId: "sandbox",
      collection,
      collections: [collection],
      pipeline: parsed.pipeline,
    });
    return { result: resp.result, error: null };
  } catch (err) {
    return { result: null, error: err instanceof Error ? err.message : "Execution failed" };
  }
}
