import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSeed } from "../shared/seed.mjs";
import { aggregate } from "../shared/engine.mjs";
import { REFERENCE_PIPELINES } from "../shared/reference.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function normalize(v, depth = 0) {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return v;
    return Math.round(v * 10000) / 10000;
  }
  if (Array.isArray(v)) return v.map((x) => normalize(x, depth + 1));
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = normalize(val, depth + 1);
    return out;
  }
  return v;
}

function stripUndefined(v) {
  if (Array.isArray(v)) return v.map(stripUndefined);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined) continue;
      out[k] = stripUndefined(val);
    }
    return out;
  }
  return v;
}

const MISSION_SOURCES = {
  m01: "orders",
  m02: "products",
  m03: "orders",
  m04: "orders",
  m05: "orders",
  m06: "orders",
  m07: "products",
  m08: "orders",
  m09: "orders",
  m10: "users",
  m11: "orders",
  m12: "orders",
  m13: "movies",
  m14: "actors",
  m15: "students",
  m16: "orders",
  m17: "employees",
  m18: "transactions",
  m19: "books",
  m20: "posts",
  m21: "appointments",
  m22: "users",
  m23: "products",
  m24: "orders",
  m25: "movies",
  m26: "orders",
  m27: "users",
  m28: "orders",
};

const { collections, counts, meta } = generateSeed(20260803);
const outputs = {};
const summary = {};

for (const [id, pipeline] of Object.entries(REFERENCE_PIPELINES)) {
  const source = MISSION_SOURCES[id] || "unknown";
  const t0 = performance.now();
  const res = aggregate(collections, source, pipeline);
  const ms = performance.now() - t0;
  const docs = res.docs.map((d) => normalize(stripUndefined(d)));
  outputs[id] = docs;
  summary[id] = { collection: source, count: docs.length, steps: res.steps.length, ms: Math.round(ms) };
}

const payload = { generatedAt: new Date().toISOString(), seed: 20260803, expected: outputs };
const outPath = join(root, "lib", "challenges", "expected-outputs.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 1));

console.log("Wrote", outPath);
console.log("Meta:", JSON.stringify(meta));
console.log("Summary:");
for (const [id, s] of Object.entries(summary)) {
  console.log(`  ${id}: ${s.collection} -> ${s.count} docs (${s.steps} steps, ${s.ms}ms)`);
}
