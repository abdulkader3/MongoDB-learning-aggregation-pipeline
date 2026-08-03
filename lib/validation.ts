import type {
  ValidationCheck,
  ValidationOptions,
  ValidationReport,
  Verdict,
} from "@/lib/types";

export interface ValidateInput {
  missionId: string;
  actual: Record<string, unknown>[];
  expected: Record<string, unknown>[];
  pipeline: Record<string, unknown>[];
  options: ValidationOptions;
}

const EPS = 0.0001;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = normalize(v);
    }
    return out;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 10000) / 10000;
  }
  return value;
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

function docKey(doc: Record<string, unknown>): string {
  return JSON.stringify(sortKeys(doc));
}

function equalValues(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= EPS;
  }
  return a === b;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return (
      ka.length === kb.length &&
      ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
    );
  }
  return equalValues(a, b);
}

export function validateMission(input: ValidateInput): ValidationReport {
  const { actual: rawActual, expected: rawExpected, options } = input;
  const expected = rawExpected.map((d) => normalize(d) as Record<string, unknown>);
  const actual = rawActual.map((d) => normalize(d) as Record<string, unknown>);

  const expectedHasId = expected.some((d) => Object.prototype.hasOwnProperty.call(d, "_id"));
  const stripIds = options.ignoreInternalIds && !expectedHasId;
  const clean = (docs: Record<string, unknown>[]) =>
    stripIds
      ? docs.map((d) => {
          const { _id, ...rest } = d;
          void _id;
          return rest;
        })
      : docs;

  const exp = clean(expected);
  const act = clean(actual);

  const checks: ValidationCheck[] = [];
  const diffs = {
    actualCount: act.length,
    expectedCount: exp.length,
    missingFields: [] as string[],
    extraFields: [] as string[],
    valueMismatches: 0,
    typeMismatches: 0,
    orderMismatches: 0,
  };

  // --- Count ---
  const countOk = act.length === exp.length;
  checks.push({
    label: "Document count",
    passed: countOk,
    detail: countOk
      ? `${act.length} / ${exp.length} documents`
      : `Got ${act.length}, expected ${exp.length}`,
  });

  // --- Fields (union of keys across expected docs) ---
  const requiredKeys = new Set<string>();
  const expKeys: string[][] = [];
  for (const doc of exp) {
    const keys = Object.keys(doc);
    expKeys.push(keys);
    keys.forEach((k) => requiredKeys.add(k));
  }
  const expectedDocKeys = new Set<string>();
  exp.forEach((d) => Object.keys(d).forEach((k) => expectedDocKeys.add(k)));
  const actualDocKeys = new Set<string>();
  act.forEach((d) => Object.keys(d).forEach((k) => actualDocKeys.add(k)));

  for (const k of expectedDocKeys) if (!actualDocKeys.has(k)) diffs.missingFields.push(k);
  for (const k of actualDocKeys) if (!expectedDocKeys.has(k)) diffs.extraFields.push(k);

  const fieldsOk = diffs.missingFields.length === 0 && diffs.extraFields.length === 0;
  checks.push({
    label: "Output fields",
    passed: fieldsOk,
    detail:
      diffs.missingFields.length === 0 && diffs.extraFields.length === 0
        ? `Exactly ${expectedDocKeys.size} field${expectedDocKeys.size === 1 ? "" : "s"}`
        : [
            diffs.missingFields.length ? `missing: ${diffs.missingFields.join(", ")}` : "",
            diffs.extraFields.length ? `extra: ${diffs.extraFields.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join("; "),
  });

  // --- Values + types (best-aligned comparison) ---
  if (countOk) {
    const actSorted = act.map(docKey);
    const expSorted = exp.map(docKey);
    const expMultiset = new Map<string, number>();
    expSorted.forEach((k) => expMultiset.set(k, (expMultiset.get(k) ?? 0) + 1));

    let valueMatches = 0;
    for (const k of actSorted) {
      if ((expMultiset.get(k) ?? 0) > 0) {
        expMultiset.set(k, expMultiset.get(k)! - 1);
        valueMatches += 1;
      }
    }
    diffs.valueMismatches = Math.max(0, act.length - valueMatches);

    let typeMismatches = 0;
    for (let i = 0; i < Math.min(act.length, exp.length); i += 1) {
      for (const k of expectedDocKeys) {
        const a = act[i][k];
        const e = exp[i][k];
        if (a !== undefined && e !== undefined && typeof a !== typeof e) {
          typeMismatches += 1;
        }
      }
    }
    diffs.typeMismatches = typeMismatches;

    let orderMismatches = 0;
    if (options.exactOrder) {
      for (let i = 0; i < act.length; i += 1) {
        if (docKey(act[i]) !== docKey(exp[i])) orderMismatches += 1;
      }
      diffs.orderMismatches = orderMismatches;
    }
  }

  const valuesOk = diffs.valueMismatches === 0 && diffs.typeMismatches === 0;
  checks.push({
    label: "Values & types",
    passed: valuesOk,
    detail: valuesOk
      ? "All values and types match the expected output"
      : `${diffs.valueMismatches} value mismatch(es)${diffs.typeMismatches ? `, ${diffs.typeMismatches} type mismatch(es)` : ""}`,
  });

  let orderOk = true;
  if (options.exactOrder && countOk) {
    orderOk = diffs.orderMismatches === 0;
    checks.push({
      label: "Order",
      passed: orderOk,
      detail: orderOk
        ? "Rows are in the expected order"
        : `${diffs.orderMismatches} row(s) out of order`,
    });
  }

  // --- Score ---
  const total = countOk ? 25 : 0;
  const fieldsScore = fieldsOk ? 25 : 0;
  const valuesScore = countOk ? Math.round(30 * (1 - diffs.valueMismatches / Math.max(1, exp.length))) : 0;
  const typesScore = countOk ? Math.round(10 * (1 - diffs.typeMismatches / Math.max(1, exp.length))) : 0;
  const orderScore = !options.exactOrder || orderOk ? 10 : 0;
  const score = total + fieldsScore + valuesScore + typesScore + orderScore;

  const passed = score === 100;
  const verdict = classify(input, {
    ...diffs,
    countOk,
    fieldsOk,
    valuesOk,
    orderOk,
    orderRelevant: options.exactOrder,
    score,
  });

  checks.push({
    label: "Verification",
    passed,
    detail: verdict,
  });

  const message = buildMessage(verdict, diffs, options);
  return { verdict, passed, score, checks, message, differences: diffs };
}

interface ClassifyCtx {
  countOk: boolean;
  fieldsOk: boolean;
  valuesOk: boolean;
  orderOk: boolean;
  orderRelevant: boolean;
  score: number;
  actualCount: number;
  expectedCount: number;
}

function usedOperators(pipeline: Record<string, unknown>[]): Set<string> {
  const out = new Set<string>();
  for (const stage of pipeline) {
    if (isPlainObject(stage)) {
      const keys = Object.keys(stage);
      if (keys.length === 1 && keys[0].startsWith("$")) out.add(keys[0]);
    }
  }
  return out;
}

function classify(
  input: ValidateInput,
  ctx: ClassifyCtx
): Verdict {
  if (ctx.score === 100) return "correct";
  if (!ctx.countOk) {
    const ops = usedOperators(input.pipeline);
    const needsGroup = input.missionId && /m(04|07|08|09|16|17|18|21|24|28)/.test(input.missionId) && !ops.has("$group");
    const needsLookup = /m(10|11|14|15|16|17|19|20|21|22|23)/.test(input.missionId) && !ops.has("$lookup");
    if (needsGroup || needsLookup || ctx.actualCount === 0) return "missing-stage";
    return "wrong";
  }
  if (!ctx.fieldsOk) return "incorrect-projection";
  if (ctx.orderRelevant && !ctx.orderOk) return "wrong-sorting";
  if (!ctx.valuesOk) {
    if (ctx.score >= 55) return "almost-there";
    return "wrong-grouping";
  }
  return "wrong";
}

function buildMessage(
  verdict: Verdict,
  d: ValidationReport["differences"],
  options: ValidationOptions
): string {
  switch (verdict) {
    case "correct":
      return "Perfect — your pipeline produces exactly the expected result.";
    case "almost-there":
      return "Close! Most rows match, but a few values are off. Compare your rounding, field paths and conditions.";
    case "missing-stage":
      return "A required stage is missing — check the mission's operators and your pipeline shape.";
    case "wrong-sorting":
      return "Values are right but the ordering is wrong — check your $sort direction and which field you sort on.";
    case "wrong-grouping":
      return "Your groups do not match. Re-check the _id expression and the accumulators in $group.";
    case "incorrect-projection":
      return "The fields you project do not match. Check missing/extra fields in your $project.";
    default:
      return `Got ${d.actualCount} documents but expected ${d.expectedCount} (${options.exactOrder ? "order-sensitive" : "order-insensitive"}).`;
  }
}

export { equalValues, deepEqual };
