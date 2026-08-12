import { createRequire } from "module";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const { aggregate } = await import("../shared/engine.mjs");
const { generateSeed } = await import("../shared/seed.mjs");

function loadTs(rel) {
  const src = readFileSync(join(root, rel), "utf8");
  const out = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: rel,
  }).outputText;
  const m = { exports: {} };
  new Function("exports", "module", "require", out)(m.exports, m, require);
  return m.exports;
}

const { parsePipeline } = loadTs("lib/mongo/parse.ts");

let failures = 0;
let passed = 0;

function check(name, cond, extra = "") {
  if (cond) {
    passed += 1;
  } else {
    failures += 1;
    console.error(`FAIL: ${name} ${extra}`);
  }
}

const db = generateSeed(20260803).collections;

function run(text) {
  const parsed = parsePipeline(text);
  if (!parsed.ok) throw new Error(parsed.error);
  return aggregate(db, "orders", parsed.pipeline).docs;
}

const quoted = `[
  { "$match": { "status": "delivered", "total": { "$gte": 250 } } },
  { "$project": { "_id": 0, "orderNumber": 1, "total": 1 } }
]`;

const mongodb = `[
  { $match: { status: "delivered", total: { $gte: 250 } } },
  { $project: { _id: 0, orderNumber: 1, total: 1 } }
]`;

{
  const a = run(quoted);
  const b = run(mongodb);
  check("executes", a.length > 0, JSON.stringify(a).slice(0, 200));
  check("identical results (quoted vs mongo-style)", JSON.stringify(a) === JSON.stringify(b));
}

{
  // Regression: the original example pipeline
  const a = run(`[ { "$match": {} }, { "$project": { "_id": 0 } } ]`);
  const b = run(`[ { $match: {} }, { $project: { _id: 0 } } ]`);
  check(
    "regression example identical",
    JSON.stringify(a) === JSON.stringify(b) && a.length === 520,
    `${a.length}`
  );
}

{
  // $lookup in mongo-style syntax against a real collection
  const docs = run(`[
    { $match: { userId: "u005" } },
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
    { $limit: 3 }
  ]`);
  check(
    "$lookup mongo-style executes",
    Array.isArray(docs) && docs.length >= 0 && docs.every((d) => Array.isArray(d.user)),
    JSON.stringify(docs).slice(0, 200)
  );
}

{
  // $group + accumulators with mongo-style syntax
  const docs = run(`[
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]`);
  check(
    "$group mongo-style executes",
    docs.length > 0 && docs.every((d) => typeof d.count === "number"),
    JSON.stringify(docs).slice(0, 200)
  );
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
