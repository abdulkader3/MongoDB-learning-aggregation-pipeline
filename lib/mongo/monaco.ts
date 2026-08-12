/**
 * Monaco integration for the MongoDB-aware pipeline editor.
 *
 * Registers a custom "mongodb-pipeline" language that tokenizes both strict
 * JSON and MongoDB-style unquoted keys with the exact same token scopes as
 * Monaco's JSON language (so colors are unchanged), plus:
 *   - a local completion provider (stages / query operators / expressions,
 *     selected by the syntactic context at the cursor),
 *   - a hover provider with the operator description,
 *   - a validator that reuses the shared parser for error markers.
 *
 * Everything is local — no network, no Atlas, no backend.
 */

import type * as Monaco from "monaco-editor";
import {
  MONGO_QUERY_OPERATORS,
  MONGO_STAGES,
  MONGO_EXPRESSION_OPERATORS,
  filterOperators,
  type MongoOperator,
  type MongoOperatorKind,
} from "./metadata";
import { getCompletionContext, isIdentChar, parsePipeline, type CompletionKind } from "./parse";

export const MONGO_PIPELINE_LANGUAGE_ID = "mongodb-pipeline";

let registered = false;

const KIND_LABEL: Record<MongoOperatorKind, string> = {
  stage: "stage",
  "query-operator": "query operator",
  expression: "expression",
};

const OPERATORS_FOR_CONTEXT: Record<CompletionKind, MongoOperator[]> = {
  stage: MONGO_STAGES,
  query: MONGO_QUERY_OPERATORS,
  expression: MONGO_EXPRESSION_OPERATORS,
  none: [],
};

function operatorForKind(kind: CompletionKind, name: string): MongoOperator | undefined {
  return OPERATORS_FOR_CONTEXT[kind].find((op) => op.name === name);
}

/** Registers the MongoDB pipeline language, providers and helpers once. */
export function ensureMongoPipelineLanguage(monaco: typeof Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.register({
    id: MONGO_PIPELINE_LANGUAGE_ID,
    aliases: ["MongoDB Pipeline", "mongodb"],
  });

  monaco.languages.setLanguageConfiguration(MONGO_PIPELINE_LANGUAGE_ID, {
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "'", close: "'", notIn: ["string"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    // NOTE: `$` must NOT be a word character here. If `$` is part of a word,
    // Monaco's suggest controller treats the trigger character as a "quick
    // suggest" case and skips the triggerCharacter path (see SuggestModel's
    // checkTriggerCharacter/shouldAutoTrigger), so typing `$` would never open
    // the completion popup. Excluding `$` makes the `triggerCharacters: ["$"]`
    // path fire immediately.
    wordPattern:
      /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\$\"\,\.\<\>\/\?\s]+)/g,
  });

  monaco.languages.setTokensProvider(MONGO_PIPELINE_LANGUAGE_ID, createTokensProvider());

  monaco.languages.registerCompletionItemProvider(
    MONGO_PIPELINE_LANGUAGE_ID,
    createCompletionProvider(monaco)
  );

  monaco.languages.registerHoverProvider(MONGO_PIPELINE_LANGUAGE_ID, {
    provideHover(model, position) {
      const text = model.getValue();
      const offset = model.getOffsetAt(position);
      const ctx = getCompletionContext(text, offset);
      if (ctx.kind === "none") return null;
      const op = operatorForKind(ctx.kind, ctx.word);
      if (!op) return null;
      const start = model.getPositionAt(ctx.wordStart);
      const end = model.getPositionAt(ctx.wordEnd);
      return {
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        contents: [
          {
            value: `**${op.name}** · ${KIND_LABEL[op.kind]}\n\n${op.description}`,
          },
        ],
      };
    },
  });
}

/** Pushes parser errors for the model as editor markers (red squiggles). */
export function validateMongoPipelineModel(monaco: typeof Monaco, model: Monaco.editor.ITextModel): void {
  const parsed = parsePipeline(model.getValue());
  const markers: Monaco.editor.IMarkerData[] = [];
  if (!parsed.ok) {
    const pos = model.getPositionAt(parsed.position ?? 0);
    markers.push({
      severity: monaco.MarkerSeverity.Error,
      message: parsed.error ?? "Invalid pipeline",
      startLineNumber: pos.lineNumber,
      startColumn: pos.column,
      endLineNumber: pos.lineNumber,
      endColumn: pos.column + 1,
    });
  }
  monaco.editor.setModelMarkers(model, "mongo-quest-validation", markers);
}

// ---------------------------------------------------------------------------
// Completion provider
// ---------------------------------------------------------------------------

function createCompletionProvider(
  monaco: typeof Monaco
): Monaco.languages.CompletionItemProvider {
  const kindIcon: Record<MongoOperatorKind, Monaco.languages.CompletionItemKind> = {
    stage: monaco.languages.CompletionItemKind.Module,
    "query-operator": monaco.languages.CompletionItemKind.Operator,
    expression: monaco.languages.CompletionItemKind.Function,
  };

  return {
    triggerCharacters: ["$"],
    provideCompletionItems(model, position) {
      const text = model.getValue();
      const offset = model.getOffsetAt(position);
      const ctx = getCompletionContext(text, offset);

      const ops = OPERATORS_FOR_CONTEXT[ctx.kind];
      if (ops.length === 0) {
        return { suggestions: [] };
      }

      const prefix = ctx.word;
      const start = model.getPositionAt(ctx.wordStart);
      const end = model.getPositionAt(ctx.wordEnd);
      const range = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);

      const suggestions: Monaco.languages.CompletionItem[] = [];
      for (const op of filterOperators(ops, prefix)) {
        suggestions.push({
          label: op.name,
          kind: kindIcon[op.kind],
          detail: KIND_LABEL[op.kind],
          documentation: op.description,
          insertText: op.name,
          range,
          filterText: op.name,
          sortText: op.name,
        });
      }
      return { suggestions };
    },
  };
}

// ---------------------------------------------------------------------------
// Tokenizer (same scopes as Monaco's JSON tokenizer so colors stay identical)
// ---------------------------------------------------------------------------

interface ParentNode {
  type: "object" | "array";
  parent: ParentNode | null;
}

class MongoTokenizerState implements Monaco.languages.IState {
  constructor(
    public inBlockComment: boolean,
    public inString: string | null,
    public lastWasColon: boolean,
    public parents: ParentNode | null
  ) {}

  clone(): MongoTokenizerState {
    return new MongoTokenizerState(
      this.inBlockComment,
      this.inString,
      this.lastWasColon,
      this.parents
    );
  }

  equals(other: Monaco.languages.IState): boolean {
    if (!(other instanceof MongoTokenizerState)) return false;
    return (
      this.inBlockComment === other.inBlockComment &&
      this.inString === other.inString &&
      this.lastWasColon === other.lastWasColon &&
      this.parents === other.parents
    );
  }
}

const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;

function topIsObject(parents: ParentNode | null): boolean {
  return parents ? parents.type === "object" : true;
}

function createTokensProvider(): Monaco.languages.TokensProvider {
  const getInitialState = (): MongoTokenizerState =>
    new MongoTokenizerState(false, null, false, null);

  const tokenize = (line: string, state: MongoTokenizerState) => {
    const tokens: { startIndex: number; scopes: string }[] = [];
    const n = line.length;
    let i = 0;
    let lastWasColon = state.lastWasColon;
    let parents = state.parents;
    let inBlockComment = state.inBlockComment;
    let inString = state.inString;

    const push = (startIndex: number, scopes: string) => {
      tokens.push({ startIndex, scopes });
    };

    while (i < n) {
      const c = line[i];
      const next = line[i + 1];

      if (inBlockComment) {
        const blockStart = i;
        const end = line.indexOf("*/", i);
        if (end === -1) {
          i = n;
        } else {
          inBlockComment = false;
          i = end + 2;
        }
        push(blockStart, "comment.block.json");
        continue;
      }

      if (inString) {
        const strStart = i;
        let j = i;
        let closed = false;
        while (j < n) {
          if (line[j] === "\\") {
            j += 2;
            continue;
          }
          if (line[j] === inString) {
            closed = true;
            j += 1;
            break;
          }
          j += 1;
        }
        push(strStart, "string.value.json");
        inString = closed ? null : inString;
        i = j;
        continue;
      }

      if (c === " " || c === "\t") {
        i += 1;
        continue;
      }
      if (c === "/" && next === "/") {
        push(i, "comment.line.json");
        i = n;
        continue;
      }
      if (c === "/" && next === "*") {
        const end = line.indexOf("*/", i + 2);
        if (end === -1) {
          inBlockComment = true;
          push(i, "comment.block.json");
          i = n;
        } else {
          push(i, "comment.block.json");
          i = end + 2;
        }
        continue;
      }
      if (c === '"' || c === "'") {
        const start = i;
        const quote = c;
        const isKey = !lastWasColon && topIsObject(parents);
        let j = i + 1;
        let closed = false;
        while (j < n) {
          if (line[j] === "\\") {
            j += 2;
            continue;
          }
          if (line[j] === quote) {
            closed = true;
            j += 1;
            break;
          }
          j += 1;
        }
        push(start, isKey ? "string.key.json" : "string.value.json");
        inString = closed ? null : quote;
        lastWasColon = false;
        i = j;
        continue;
      }
      if (c === "{") {
        parents = { type: "object", parent: parents };
        push(i, "delimiter.bracket.json");
        lastWasColon = false;
        i += 1;
        continue;
      }
      if (c === "}") {
        parents = parents ? parents.parent : null;
        push(i, "delimiter.bracket.json");
        lastWasColon = false;
        i += 1;
        continue;
      }
      if (c === "[") {
        parents = { type: "array", parent: parents };
        push(i, "delimiter.array.json");
        lastWasColon = false;
        i += 1;
        continue;
      }
      if (c === "]") {
        parents = parents ? parents.parent : null;
        push(i, "delimiter.array.json");
        lastWasColon = false;
        i += 1;
        continue;
      }
      if (c === ":") {
        push(i, "delimiter.colon.json");
        lastWasColon = true;
        i += 1;
        continue;
      }
      if (c === ",") {
        push(i, "delimiter.comma.json");
        lastWasColon = false;
        i += 1;
        continue;
      }

      const numMatch = NUMBER_RE.exec(line.slice(i));
      if (numMatch) {
        push(i, "number.json");
        lastWasColon = false;
        i += numMatch[0].length;
        continue;
      }

      if (isIdentChar(c)) {
        const start = i;
        while (i < n && isIdentChar(line[i])) i += 1;
        const raw = line.slice(start, i);
        if (raw === "true" || raw === "false" || raw === "null") {
          push(start, "keyword.json");
        } else if (!lastWasColon && topIsObject(parents)) {
          push(start, "string.key.json");
        } else {
          push(start, "invalid");
        }
        lastWasColon = false;
        continue;
      }

      push(i, "invalid");
      i += 1;
    }

    return {
      tokens,
      endState: new MongoTokenizerState(inBlockComment, inString, lastWasColon, parents),
    };
  };

  return { getInitialState, tokenize };
}
