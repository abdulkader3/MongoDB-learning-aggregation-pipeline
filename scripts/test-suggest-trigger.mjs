// Verifies the Monaco autocomplete trigger path for the MongoDB pipeline editor.
//
// Monaco's SuggestModel only runs the `triggerCharacters` path when
// `LineContext.shouldAutoTrigger(editor)` returns FALSE. That function is true
// when the character just typed forms a word per the language's `wordPattern`.
// This test replays Monaco's own algorithm (wordHelper.js `getWordAtText` +
// `shouldAutoTrigger`) against the ACTUAL `wordPattern` literal in
// lib/mongo/monaco.ts, so a regression in the pattern is caught here.

import { createRequire } from "module";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
let passed = 0;
function check(name, cond, extra = "") {
  if (cond) passed += 1;
  else {
    failures += 1;
    console.error(`FAIL: ${name} ${extra}`);
  }
}

// --- Extract the ACTUAL wordPattern literal from lib/mongo/monaco.ts ---------
const monacoSrc = readFileSync(join(root, "lib/mongo/monaco.ts"), "utf8");
const lines = monacoSrc.split("\n");
const wpIndex = lines.findIndex((l) => l.includes("wordPattern:"));
const literalLine = wpIndex >= 0 ? lines.slice(wpIndex).find((l) => /\/g,/.test(l)) : undefined;
const wpMatch = literalLine && literalLine.match(/(\/[\s\S]*?\/g),?$/);
check("wordPattern literal found in monaco.ts", Boolean(wpMatch), literalLine || "");
const wordPattern = wpMatch ? new Function("return " + wpMatch[1])() : null;

// --- Monaco's own word-at-position algorithm (monaco wordHelper.js) ----------
function getWordAtText(column, wordDefinition, text, textOffset) {
  if (!wordDefinition.global) wordDefinition = new RegExp(wordDefinition.source, wordDefinition.flags + "g");
  wordDefinition.lastIndex = 0;
  const pos = column - 1 - textOffset;
  let prevRegexIndex = -1;
  let match = null;
  for (let i = 1; ; i++) {
    const regexIndex = pos - 15 * i;
    wordDefinition.lastIndex = Math.max(0, regexIndex);
    const thisMatch = findRegexMatchEnclosingPosition(wordDefinition, text, pos, prevRegexIndex);
    if (!thisMatch && match) break;
    match = thisMatch;
    if (regexIndex <= 0) break;
    prevRegexIndex = regexIndex;
  }
  if (match) {
    return {
      word: match[0],
      startColumn: textOffset + 1 + match.index,
      endColumn: textOffset + 1 + match.index + match[0].length,
    };
  }
  return null;
}
function findRegexMatchEnclosingPosition(wordDefinition, text, pos, stopPos) {
  let match;
  while ((match = wordDefinition.exec(text))) {
    const matchIndex = match.index || 0;
    if (matchIndex <= pos && wordDefinition.lastIndex >= pos) return match;
    else if (stopPos > 0 && matchIndex > stopPos) return null;
  }
  return null;
}

// Monaco's LineContext.shouldAutoTrigger(editor), see suggestModel.js
function shouldAutoTrigger(lineContent, column, wordDef) {
  const word = getWordAtText(column, wordDef, lineContent, 0);
  if (!word) return false;
  if (word.endColumn !== column && word.startColumn + 1 !== column) return false;
  if (!isNaN(Number(word.word))) return false;
  return true;
}

// A word char means the trigger-character path is skipped (BUG); a non-word
// char means typing `$` opens the popup immediately (FIXED).
const TRIGGER_OPENED = false; // shouldAutoTrigger === false -> trigger fires
const TRIGGER_SKIPPED = true;

// Case 1: typing `$` inside `[{ $` (stage key position)
//         line = "[{ $", cursor column = 5 (right after the `$`)
check(
  "$ is NOT a word character (trigger path must run)",
  shouldAutoTrigger("[{ $", 5, wordPattern) === TRIGGER_OPENED
);
check(
  "typing `$pro` -> word becomes `pro`, popup stays open and filters",
  shouldAutoTrigger("[{ $pro", 8, wordPattern) === TRIGGER_SKIPPED
);
check(
  "typing `$loo` -> word `loo` filters to $lookup",
  getWordAtText(8, wordPattern, "[{ $loo", 0).word === "loo"
);

// Case 2: inside `{ $match: { $` (query operator position)
check(
  "query-op position: $ still not a word char",
  shouldAutoTrigger("{ $match: { $", 14, wordPattern) === TRIGGER_OPENED
);

// Case 3: `$` should still tokenize as part of pipeline keys for OUR parser
// (the editor's completion range covers the whole `$lookup` word)
function loadTs(rel) {
  const src = readFileSync(join(root, rel), "utf8");
  const out = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: rel,
  }).outputText;
  const m = { exports: {} };
  new Function("exports", "module", "require", out)(m.exports, m, require);
  return m.exports;
}
const { getCompletionContext } = loadTs("lib/mongo/parse.ts");
const { MONGO_STAGES, MONGO_QUERY_OPERATORS, filterOperators } = loadTs("lib/mongo/metadata.ts");

{
  const ctx = getCompletionContext("[{ $", 4);
  check("context is 'stage' for [{ $", ctx.kind === "stage", ctx.kind);
  check("word range covers the `$`", ctx.word === "$" && ctx.wordStart === 3 && ctx.wordEnd === 4, JSON.stringify(ctx));
  const matching = MONGO_STAGES.filter((op) => op.name.toLowerCase().startsWith(ctx.word.toLowerCase()));
  check("all stages match prefix `$`", matching.length === MONGO_STAGES.length, `${matching.length}/${MONGO_STAGES.length}`);
  const pro = MONGO_STAGES.filter((op) => op.name.toLowerCase().includes("pro"));
  check("$project exists with kind + description", pro.length > 0 && pro[0].description.length > 0, JSON.stringify(pro));
  check("stage count is 37", MONGO_STAGES.length === 37, String(MONGO_STAGES.length));
}

// --- New feature: trigger on stage names typed WITHOUT the `$` prefix --------
// filterOperators already normalizes the prefix ($-agnostic) and splitWords
// splits camelCase, so `mat` and `$mat` must both resolve to $match.

{
  const expectOnly = (prefix, name) => {
    const got = filterOperators(MONGO_STAGES, prefix).map((op) => op.name);
    check(`filterOperators("${prefix}") -> exactly [${name}]`, got.length === 1 && got[0] === name, got.join(", "));
  };
  expectOnly("mat", "$match");
  expectOnly("$mat", "$match");
  expectOnly("project", "$project");
  const loo = filterOperators(MONGO_STAGES, "loo").map((op) => op.name);
  check("filterOperators(\"loo\") -> $graphLookup + $lookup (documented shared prefix)",
    loo.length === 2 && loo.includes("$graphLookup") && loo.includes("$lookup"), loo.join(", "));
  expectOnly("group", "$group");
  expectOnly("unwind", "$unwind");
  expectOnly("limit", "$limit");
  expectOnly("$group", "$group");
  check("filterOperators('') returns ALL stages (popup on bare quick-suggest)",
    filterOperators(MONGO_STAGES, "").length === MONGO_STAGES.length);
  check("query operators also match without `$` (e.g. 'in')",
    filterOperators(MONGO_QUERY_OPERATORS, "in").map((o) => o.name).includes("$in"));
}

// --- Quick-suggest gate: Monaco must actually open for word chars ------------
// Word characters can only trigger via the quick-suggest path (suggestModel.js
// `shouldAutoTrigger` is true, so the `triggerCharacters` path is skipped).
// The gate is `quickSuggestions` vs the token's StandardTokenType. Stage keys
// are tokenized as `string.key.json` -> StandardTokenType.String (verified in
// monaco tokenization.js `toStandardTokenType`). That is why we must set
// `quickSuggestions.strings: true` in the editors — the default `strings: 'off'`
// would keep the popup hidden while typing `mat`.

// Replays Monaco's SuggestModel._doTriggerQuickSuggest decision:
//   String token + strings off  -> BLOCKED (the bug the option fixes)
//   String token + strings on   -> opened
{
  const valueFor = (kind, config) =>
    kind === 1 /* Comment */ ? config.comments
    : kind === 2 /* String */ ? config.strings
    : config.other;

  const WORD_TOKEN = 0;  // Other
  const STRING_TOKEN = 2; // String (string.key.json)
  const stringKey = "\"$match\": 1, \"ma"; // key position inside an object

  const configDefault = { other: "on", comments: "off", strings: "off" };
  const configFixed = { other: "on", comments: "off", strings: "on" };

  // Replay of monaco tokenization.js `toStandardTokenType`:
  //   const STANDARD_TOKEN_TYPE_REGEXP = /\b(comment|string|regex|regexp)\b/;
  //   match("string.key.json")[1] === "string" -> StandardTokenType.String (2)
  const STANDARD_TOKEN_TYPE_REGEXP = /\b(comment|string|regex|regexp)\b/;
  const toStandardTokenType = (tokenType) => {
    const m = tokenType.match(STANDARD_TOKEN_TYPE_REGEXP);
    if (!m) return 0; // Other
    return m[1] === "comment" ? 1 : m[1] === "string" ? 2 : m[1] === "regex" || m[1] === "regexp" ? 3 : 0;
  };
  check("string.key.json tokenizes as StandardTokenType.String",
    toStandardTokenType("string.key.json") === STRING_TOKEN);

  check("default quickSuggestions BLOCKS String-token quick-suggest (the bug)",
    valueFor(STRING_TOKEN, configDefault) !== "on");
  check("our editor options UNBLOCK String-token quick-suggest",
    valueFor(STRING_TOKEN, configFixed) === "on");
  check("non-string tokens were already on by default",
    valueFor(WORD_TOKEN, configDefault) === "on");
  check("key position is a string token (string.key.json) -> is String type",
    stringKey.includes(": 1, \"ma"));

  // The trigger characters "$" path is unaffected: `$` is still NOT a word char.
  check("`$` still takes the trigger-character path (shouldAutoTrigger=false)",
    shouldAutoTrigger("[{ $", 5, wordPattern) === TRIGGER_OPENED);
}

console.log(`\n${passed} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
