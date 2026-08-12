/**
 * Tokenizer, parser and completion-context detection for MongoDB-style
 * aggregation pipelines.
 *
 * The editor accepts two equivalent syntaxes:
 *   - strict JSON:   { "$match": { "status": "delivered" } }
 *   - Mongo-style:   { $match: { status: "delivered" } }
 *
 * Both are normalized here into plain JS values so the rest of the app (the
 * Mock Engine, validation, mission checks) keeps working unchanged. The parser
 * understands the actual syntax — it never relies on string replacement.
 */

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

export type TokenKind =
  | "lbrace"
  | "rbrace"
  | "lbracket"
  | "rbracket"
  | "colon"
  | "comma"
  | "string"
  | "ident"
  | "number"
  | "keyword"
  | "error"
  | "eof";

export interface Token {
  kind: TokenKind;
  start: number;
  end: number;
  raw: string;
  /** Decoded value for string tokens, raw text otherwise. */
  value: string;
}

const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const IDENT_CHAR = /[A-Za-z0-9_$]/;

export function isIdentChar(c: string): boolean {
  return IDENT_CHAR.test(c);
}

function decodeString(text: string, start: number, quote: string): { value: string; end: number } {
  let value = "";
  let i = start + 1;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === quote) return { value, end: i + 1 };
    if (c === "\\") {
      const e = text[i + 1];
      if (e === undefined) {
        value += "\\";
        i += 1;
        continue;
      }
      switch (e) {
        case "n": value += "\n"; break;
        case "t": value += "\t"; break;
        case "r": value += "\r"; break;
        case "b": value += "\b"; break;
        case "f": value += "\f"; break;
        case "v": value += "\v"; break;
        case "0": value += "\0"; break;
        case "u": {
          const hex = text.slice(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            value += String.fromCharCode(parseInt(hex, 16));
            i += 4;
          } else {
            value += "u";
          }
          break;
        }
        default:
          value += e;
      }
      i += 2;
      continue;
    }
    value += c;
    i += 1;
  }
  // Unterminated string: treat the rest of the input as the value.
  return { value, end: i };
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];
    const next = text[i + 1];

    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i += 1;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < n && text[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const start = i;
      const decoded = decodeString(text, i, c);
      i = decoded.end;
      tokens.push({
        kind: "string",
        start,
        end: i,
        raw: text.slice(start, i),
        value: decoded.value,
      });
      continue;
    }
    if (c === "{") { tokens.push({ kind: "lbrace", start: i, end: i + 1, raw: c, value: c }); i += 1; continue; }
    if (c === "}") { tokens.push({ kind: "rbrace", start: i, end: i + 1, raw: c, value: c }); i += 1; continue; }
    if (c === "[") { tokens.push({ kind: "lbracket", start: i, end: i + 1, raw: c, value: c }); i += 1; continue; }
    if (c === "]") { tokens.push({ kind: "rbracket", start: i, end: i + 1, raw: c, value: c }); i += 1; continue; }
    if (c === ":") { tokens.push({ kind: "colon", start: i, end: i + 1, raw: c, value: c }); i += 1; continue; }
    if (c === ",") { tokens.push({ kind: "comma", start: i, end: i + 1, raw: c, value: c }); i += 1; continue; }

    const numMatch = NUMBER_RE.exec(text.slice(i));
    if (numMatch) {
      const start = i;
      i += numMatch[0].length;
      tokens.push({ kind: "number", start, end: i, raw: numMatch[0], value: numMatch[0] });
      continue;
    }

    if (IDENT_CHAR.test(c)) {
      const start = i;
      while (i < n && IDENT_CHAR.test(text[i])) i += 1;
      const raw = text.slice(start, i);
      if (raw === "true" || raw === "false" || raw === "null") {
        tokens.push({ kind: "keyword", start, end: i, raw, value: raw });
      } else {
        tokens.push({ kind: "ident", start, end: i, raw, value: raw });
      }
      continue;
    }

    tokens.push({ kind: "error", start: i, end: i + 1, raw: c, value: c });
    i += 1;
  }

  tokens.push({ kind: "eof", start: n, end: n, raw: "", value: "" });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export interface ParseResult {
  ok: boolean;
  pipeline: Record<string, unknown>[];
  error?: string;
  position?: number;
}

class ParseError extends Error {
  position: number;
  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

export function parsePipeline(text: string): ParseResult {
  const tokens = tokenize(text);
  let idx = 0;

  const peek = (): Token => tokens[idx];
  const advance = (): Token => {
    const t = tokens[idx];
    if (t.kind !== "eof") idx += 1;
    return t;
  };

  function parseValue(): unknown {
    const t = peek();
    switch (t.kind) {
      case "lbrace": return parseObject();
      case "lbracket": return parseArray();
      case "string":
        advance();
        return t.value;
      case "number":
        advance();
        return Number(t.raw);
      case "keyword":
        advance();
        return t.raw === "true" ? true : t.raw === "false" ? false : null;
      case "ident":
        throw new ParseError(`Unexpected token '${t.raw}'. String values must be quoted.`, t.start);
      case "error":
        throw new ParseError(`Unexpected character '${t.raw}'.`, t.start);
      case "rbrace":
        throw new ParseError("Expected a value, found '}'.", t.start);
      case "rbracket":
        throw new ParseError("Expected a value, found ']'.", t.start);
      case "colon":
        throw new ParseError("Unexpected ':' — missing a value before it.", t.start);
      case "comma":
        throw new ParseError("Expected a value, found ','.", t.start);
      case "eof":
        throw new ParseError("Unexpected end of input — expected a value.", t.start);
    }
  }

  function parseObject(): Record<string, unknown> {
    advance(); // {
    const obj: Record<string, unknown> = {};
    for (;;) {
      const t = peek();
      if (t.kind === "rbrace") {
        advance();
        return obj;
      }
      if (t.kind === "comma") {
        advance();
        continue;
      }
      if (t.kind === "eof") {
        throw new ParseError("Unexpected end of input — expected '}'.", t.start);
      }
      if (t.kind === "error") {
        throw new ParseError(`Unexpected character '${t.raw}' in object.`, t.start);
      }
      if (t.kind !== "string" && t.kind !== "ident" && t.kind !== "number") {
        throw new ParseError("Expected a field name, found '" + t.raw + "'.", t.start);
      }
      advance();
      const key = t.kind === "string" ? t.value : t.raw;
      const colon = peek();
      if (colon.kind === "colon") {
        advance();
      } else {
        throw new ParseError(`Expected ':' after '${key}'.`, t.end);
      }
      obj[key] = parseValue();
    }
  }

  function parseArray(): unknown[] {
    advance(); // [
    const arr: unknown[] = [];
    for (;;) {
      const t = peek();
      if (t.kind === "rbracket") {
        advance();
        return arr;
      }
      if (t.kind === "comma") {
        advance();
        continue;
      }
      if (t.kind === "eof") {
        throw new ParseError("Unexpected end of input — expected ']'.", t.start);
      }
      arr.push(parseValue());
    }
  }

  try {
    const value = parseValue();
    if (!Array.isArray(value)) {
      return { ok: false, pipeline: [], error: "Pipeline must be an array of stage objects." };
    }
    return { ok: true, pipeline: value as Record<string, unknown>[] };
  } catch (err) {
    if (err instanceof ParseError) {
      return { ok: false, pipeline: [], error: err.message, position: err.position };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Completion context detection
// ---------------------------------------------------------------------------

export type CompletionKind = "stage" | "query" | "expression" | "none";

export interface CompletionContext {
  kind: CompletionKind;
  /** Partial operator being typed, e.g. "$loo". */
  word: string;
  /** Character offsets of the word being replaced (for the completion range). */
  wordStart: number;
  wordEnd: number;
}

type ContainerKind =
  | "stage"
  | "query"
  | "expression"
  | "group"
  | "window"
  | "facet"
  | "lookup"
  | "replaceRoot"
  | "bucket"
  | "unionWith"
  | "project-fields"
  | "plain";

interface Container {
  brace: "obj" | "arr";
  context: ContainerKind;
  elementContext: ContainerKind;
}

/** Context of an object/array that appears as the value of `key` in `parentCtx`. */
function valueContext(parentCtx: ContainerKind, key: string): ContainerKind {
  switch (parentCtx) {
    case "stage":
      switch (key) {
        case "$match": return "query";
        case "$expr": return "expression";
        case "$project":
        case "$addFields":
        case "$set":
        case "$replaceWith":
        case "$redact":
          return "project-fields";
        case "$group": return "group";
        case "$setWindowFields": return "window";
        case "$facet": return "facet";
        case "$lookup": return "lookup";
        case "$replaceRoot": return "replaceRoot";
        case "$bucket":
        case "$bucketAuto":
          return "bucket";
        case "$unionWith": return "unionWith";
        case "$sortByCount":
        case "$densify":
        case "$fill":
        case "$documents":
          return "expression";
        case "$sort":
        case "$limit":
        case "$skip":
        case "$count":
        case "$sample":
        case "$unwind":
        case "$unset":
        case "$out":
        case "$merge":
        case "$geoNear":
        case "$collStats":
        case "$indexStats":
        case "$planCacheStats":
        case "$currentOp":
        case "$changeStream":
        case "$search":
        case "$searchMeta":
        case "$vectorSearch":
        case "$listLocalSessions":
        case "$listSessions":
          return "plain";
        default:
          return "expression";
      }
    case "query":
      if (key.startsWith("$")) {
        switch (key) {
          case "$expr": return "expression";
          case "$elemMatch":
          case "$not":
          case "$and":
          case "$or":
          case "$nor":
            return "query";
          default:
            return "plain";
        }
      }
      // A named field → its value is a condition object.
      return "query";
    case "project-fields":
      return "expression";
    case "expression":
    case "group":
      return "expression";
    case "window":
      if (key === "partitionBy") return "expression";
      if (key === "output") return "project-fields";
      return "plain";
    case "facet":
      return "stage";
    case "lookup":
      return key === "pipeline" ? "stage" : "plain";
    case "replaceRoot":
      return key === "newRoot" ? "expression" : "plain";
    case "bucket":
      return key === "groupBy" || key === "output" ? "expression" : "plain";
    case "unionWith":
      return key === "pipeline" ? "stage" : "plain";
    case "plain":
    default:
      return "plain";
  }
}

/** Context of the elements of an array that is the value of `key` in `parentCtx`. */
function arrayElementContext(parentCtx: ContainerKind, key: string): ContainerKind {
  switch (parentCtx) {
    case "facet":
      return "stage";
    case "lookup":
    case "unionWith":
      return key === "pipeline" ? "stage" : "plain";
    case "query":
      return key === "$and" || key === "$or" || key === "$nor" || key === "$elemMatch"
        ? "query"
        : "plain";
    case "stage":
      return "stage";
    case "project-fields":
    case "expression":
    case "group":
    case "window":
      return "expression";
    case "replaceRoot":
    case "bucket":
      return "expression";
    default:
      return "plain";
  }
}

function isWordChar(c: string): boolean {
  return isIdentChar(c);
}

/**
 * Determine which kind of `$` operator should be suggested at `position`.
 *
 * The detector walks the token stream (up to the cursor) and builds a stack of
 * containers so it knows whether the cursor sits at an aggregation stage key,
 * inside a query condition, or inside an aggregation expression.
 */
export function getCompletionContext(text: string, position: number): CompletionContext {
  const bounded = Math.max(0, Math.min(position, text.length));

  // The word being typed / replaced.
  let wordStart = bounded;
  while (wordStart > 0 && isWordChar(text[wordStart - 1])) wordStart -= 1;
  let wordEnd = bounded;
  while (wordEnd < text.length && isWordChar(text[wordEnd])) wordEnd += 1;
  const word = text.slice(wordStart, wordEnd);

  const tokens = tokenize(text);

  // Anchor: the last token that ends at or before the start of the word.
  let anchor: Token | null = null;
  for (const t of tokens) {
    if (t.end <= wordStart) anchor = t;
    else break;
  }

  const stack: Container[] = [];
  let pendingKey = "";

  for (const t of tokens) {
    if (t.end > wordStart) break;
    if (t.kind === "eof") break;
    switch (t.kind) {
      case "lbrace": {
        const parent = stack.length ? stack[stack.length - 1] : null;
        const ctx = parent
          ? parent.brace === "arr"
            ? parent.elementContext
            : valueContext(parent.context, pendingKey)
          : "stage";
        stack.push({ brace: "obj", context: ctx, elementContext: ctx });
        pendingKey = "";
        break;
      }
      case "lbracket": {
        const parent = stack.length ? stack[stack.length - 1] : null;
        const ctx = parent
          ? parent.brace === "arr"
            ? parent.elementContext
            : valueContext(parent.context, pendingKey)
          : "stage";
        const elementCtx = parent
          ? parent.brace === "arr"
            ? parent.elementContext
            : arrayElementContext(parent.context, pendingKey)
          : "stage";
        stack.push({ brace: "arr", context: ctx, elementContext: elementCtx });
        pendingKey = "";
        break;
      }
      case "rbrace":
      case "rbracket":
        if (stack.length) stack.pop();
        pendingKey = "";
        break;
      case "comma":
      case "colon":
        break;
      case "string":
      case "ident":
      case "number":
        if (stack.length && stack[stack.length - 1].brace === "obj") {
          pendingKey = t.value;
        }
        break;
      case "keyword":
      case "error":
        break;
    }
  }

  const top = stack.length ? stack[stack.length - 1] : null;

  // Only object key positions can offer `$` operator completions.
  if (!top || top.brace !== "obj") {
    return { kind: "none", word, wordStart, wordEnd };
  }

  const inKeyPosition =
    anchor !== null && (anchor.kind === "lbrace" || anchor.kind === "comma");

  if (!inKeyPosition) {
    return { kind: "none", word, wordStart, wordEnd };
  }

  switch (top.context) {
    case "stage":
      return { kind: "stage", word, wordStart, wordEnd };
    case "query":
      return { kind: "query", word, wordStart, wordEnd };
    case "expression":
      return { kind: "expression", word, wordStart, wordEnd };
    default:
      return { kind: "none", word, wordStart, wordEnd };
  }
}
