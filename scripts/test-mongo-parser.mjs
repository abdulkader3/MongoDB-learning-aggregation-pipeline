import { createRequire } from "module";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

const { parsePipeline, getCompletionContext } = loadTs("lib/mongo/parse.ts");
const {
  MONGO_STAGES,
  MONGO_QUERY_OPERATORS,
  MONGO_EXPRESSION_OPERATORS,
  filterOperators,
} = loadTs("lib/mongo/metadata.ts");

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

// ---------------------------------------------------------------------------
// Parsing: MongoDB-style unquoted syntax
// ---------------------------------------------------------------------------

const mongodbSyntax = `[
  {
    $match: { status: "delivered", total: { $gte: 250 } }
  },
  {
    $project: {
      _id: 0,
      totalWithTax: { $multiply: ["$total", 1.1] }
    }
  }
]`;

{
  const r = parsePipeline(mongodbSyntax);
  check("mongo-style parses ok", r.ok, JSON.stringify(r));
  check("stage count", r.ok && r.pipeline.length === 2);
  check(
    "stage key unquoted $match",
    r.ok && Object.keys(r.pipeline[0])[0] === "$match",
    JSON.stringify(r.pipeline)
  );
  check(
    "nested _id key",
    r.ok && r.pipeline[1].$project && "_id" in r.pipeline[1].$project,
    JSON.stringify(r.pipeline)
  );
  check(
    "numeric value",
    r.ok && r.pipeline[0].$match.total.$gte === 250,
    JSON.stringify(r.pipeline)
  );
  check(
    "field path string preserved",
    r.ok && r.pipeline[1].$project.totalWithTax.$multiply[0] === "$total",
    JSON.stringify(r.pipeline)
  );
}

// ---------------------------------------------------------------------------
// Parsing: existing quoted JSON syntax still works
// ---------------------------------------------------------------------------

const quotedSyntax = `[
  {
    "$match": {}
  },
  {
    "$project": {
      "_id": 0
    }
  }
]`;

{
  const r = parsePipeline(quotedSyntax);
  check("quoted JSON parses ok", r.ok, JSON.stringify(r));
  check("quoted stage count", r.ok && r.pipeline.length === 2);
  check(
    "quoted $match preserved",
    r.ok && Object.keys(r.pipeline[0])[0] === "$match",
    JSON.stringify(r.pipeline)
  );
}

// ---------------------------------------------------------------------------
// $lookup in Mongo-style syntax
// ---------------------------------------------------------------------------

{
  const r = parsePipeline(`[
    {
      $lookup: {
        from: "collection",
        localField: "field",
        foreignField: "field",
        as: "result"
      }
    }
  ]`);
  check("$lookup parses ok", r.ok, JSON.stringify(r));
  const lookup = r.ok ? r.pipeline[0].$lookup : null;
  check(
    "$lookup fields",
    lookup &&
      lookup.from === "collection" &&
      lookup.localField === "field" &&
      lookup.foreignField === "field" &&
      lookup.as === "result",
    JSON.stringify(lookup)
  );
}

// ---------------------------------------------------------------------------
// Comments, trailing commas, single quotes
// ---------------------------------------------------------------------------

{
  const r = parsePipeline(`[
    // a stage
    {
      $match: { status: 'delivered', },
    },
    { $limit: 5, },
  ]`);
  check("comments/trailing commas/single quotes parse ok", r.ok, JSON.stringify(r));
  check(
    "single-quoted string decoded",
    r.ok && r.pipeline[0].$match.status === "delivered",
    JSON.stringify(r.pipeline)
  );
}

// ---------------------------------------------------------------------------
// Default pipeline text (all commented out) still parses to []
// ---------------------------------------------------------------------------

{
  const r = parsePipeline("[\n  // {\n  //   \"$match\": {},\n  // },\n  // {\n  //   \"$project\": { \"_id\": 0 },\n  // },\n]");
  check("commented default parses ok", r.ok, JSON.stringify(r));
  check("commented default is empty", r.ok && r.pipeline.length === 0);
}

// ---------------------------------------------------------------------------
// Field path "$match" inside a string is NOT a stage
// ---------------------------------------------------------------------------

{
  const r = parsePipeline(`[{ $project: { value: "$match" } }]`);
  check("string field path is value not key", r.ok && r.pipeline[0].$project.value === "$match");
}

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

// Replaces `|` in a template with the cursor position so offsets stay correct.
function ctxAt(template, kind, word) {
  const idx = template.indexOf("|");
  if (idx === -1) throw new Error("missing cursor | in template");
  const text = template.replace("|", "");
  const ctx = getCompletionContext(text, idx);
  check(
    `context "${kind}" in ${JSON.stringify(template.replace(/\s+/g, " "))}`,
    ctx.kind === kind,
    JSON.stringify(ctx)
  );
  if (word !== undefined) {
    check(
      `word "${word}"`,
      ctx.word === word,
      JSON.stringify(ctx)
    );
  }
}

// ---------------------------------------------------------------------------
// Query operator context
// ---------------------------------------------------------------------------

ctxAt(`{\n  $match: {\n    total: {\n      |$\n    }\n  }\n}`, "query");
ctxAt(`{ $match: { total: { |$g } } }`, "query", "$g");

// ---------------------------------------------------------------------------
// Stage context
// ---------------------------------------------------------------------------

ctxAt(`[\n  {\n    |$\n  }\n]`, "stage");
ctxAt(`[\n  {\n    |$loo\n  }\n]`, "stage", "$loo");
ctxAt(`[{ |$pro }]`, "stage", "$pro");
ctxAt(`[{ |$gro }]`, "stage", "$gro");
ctxAt(`[{ |$un }]`, "stage", "$un");

// ---------------------------------------------------------------------------
// Expression context
// ---------------------------------------------------------------------------

ctxAt(`[\n  {\n    $project: {\n      result: {\n        |$\n      }\n    }\n  }\n]`, "expression");
ctxAt(`[\n  {\n    $project: {\n      result: { |$m }\n    }\n  }\n]`, "expression", "$m");

// ---------------------------------------------------------------------------
// No stage suggestions inside a string (field path)
// ---------------------------------------------------------------------------

ctxAt(`[{ $project: { value: "|$user.name" } }]`, "none");
ctxAt(`[{ $match: { total: { $gte: "|$x" } } }]`, "none");

// ---------------------------------------------------------------------------
// $lookup stage + $project must NOT suggest stages at $lookup key position
// ---------------------------------------------------------------------------

ctxAt(`[{ $lookup: { |$ } }]`, "none");

// ---------------------------------------------------------------------------
// $group accumulator context
// ---------------------------------------------------------------------------

ctxAt(`[{ $group: { _id: "$x", count: { |$s } } }]`, "expression", "$s");

// ---------------------------------------------------------------------------
// $facet sub-pipeline → stage context
// ---------------------------------------------------------------------------

ctxAt(`[{ $facet: { byStatus: [{ |$ }] } }]`, "stage");

// ---------------------------------------------------------------------------
// $lookup pipeline → stage context
// ---------------------------------------------------------------------------

ctxAt(`[{ $lookup: { from: "x", pipeline: [{ |$ }] } }]`, "stage");

// ---------------------------------------------------------------------------
// $expr → expression context
// ---------------------------------------------------------------------------

ctxAt(`[{ $match: { $expr: { |$ } } }]`, "expression");

// ---------------------------------------------------------------------------
// Value position → no suggestions
// ---------------------------------------------------------------------------

ctxAt(`[{ $limit: |$ }]`, "none");

// ---------------------------------------------------------------------------
// $setWindowFields.output → no suggestions at key, expression in values
// ---------------------------------------------------------------------------

ctxAt(`[{ $setWindowFields: { output: { |$ } } }]`, "none");
ctxAt(`[{ $setWindowFields: { output: { rank: { |$ } } } }]`, "expression");

// ---------------------------------------------------------------------------
// Completion filtering
// ---------------------------------------------------------------------------

const names = (ops) => ops.map((o) => o.name);

check(
  "$loo filters stages to $lookup + $graphLookup",
  JSON.stringify(names(filterOperators(MONGO_STAGES, "$loo")).sort()) ===
    JSON.stringify(["$graphLookup", "$lookup"]),
  JSON.stringify(names(filterOperators(MONGO_STAGES, "$loo")))
);

check(
  "$ filters all stages",
  names(filterOperators(MONGO_STAGES, "$")).length === MONGO_STAGES.length
);

check(
  "$pro filters to $project",
  JSON.stringify(names(filterOperators(MONGO_STAGES, "$pro"))) ===
    JSON.stringify(["$project"]),
  JSON.stringify(names(filterOperators(MONGO_STAGES, "$pro")))
);

check(
  "$gro filters to $group",
  JSON.stringify(names(filterOperators(MONGO_STAGES, "$gro"))) ===
    JSON.stringify(["$group"]),
  JSON.stringify(names(filterOperators(MONGO_STAGES, "$gro")))
);

{
  const un = names(filterOperators(MONGO_STAGES, "$un")).sort();
  check(
    "$un filters stages to $unset/$unionWith/$unwind",
    JSON.stringify(un) === JSON.stringify(["$unionWith", "$unset", "$unwind"]),
    JSON.stringify(un)
  );
}

{
  const q = names(filterOperators(MONGO_QUERY_OPERATORS, "$gte"));
  check("$gte query operator", JSON.stringify(q) === JSON.stringify(["$gte"]), JSON.stringify(q));
}

{
  const m = names(filterOperators(MONGO_EXPRESSION_OPERATORS, "$multiply"));
  check(
    "$multiply expression",
    JSON.stringify(m) === JSON.stringify(["$multiply"]),
    JSON.stringify(m)
  );
}

check(
  "metadata contains all stage suggestions from spec",
  ["$match", "$project", "$lookup", "$group", "$sort", "$limit", "$skip", "$unwind", "$count", "$set", "$unset", "$replaceRoot", "$replaceWith", "$sample", "$facet", "$bucket", "$bucketAuto", "$graphLookup", "$unionWith", "$merge", "$out"].every((n) =>
    MONGO_STAGES.some((o) => o.name === n)
  ),
  JSON.stringify(names(MONGO_STAGES))
);

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
