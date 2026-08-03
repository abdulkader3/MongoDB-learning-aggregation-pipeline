// Mini MongoDB aggregation engine used by the demo/mock backend and the
// expected-output generator. Implements a practical subset of the real
// aggregation pipeline so the frontend can run without a live database.

const perf = typeof performance !== "undefined" ? performance : { now: () => Date.now() };

export const WRITE_STAGES = new Set(["$merge", "$out", "$createIndexes"]);

export const STAGE_PURPOSE = {
  $match: "Filter documents using query conditions. Reduces the working set early.",
  $project: "Reshape documents: include, exclude or compute fields.",
  $addFields: "Add new fields to each document without removing existing ones.",
  $set: "Alias of $addFields. Adds or overwrites fields.",
  $unset: "Remove one or more fields from every document.",
  $group: "Group documents by a key and compute accumulators per group.",
  $sort: "Reorder documents by one or more fields.",
  $limit: "Pass only the first N documents.",
  $skip: "Skip the first N documents.",
  $count: "Return a document with the total number of documents.",
  $unwind: "Deconstruct an array field, emitting one document per element.",
  $lookup: "Join documents from another collection (left outer join).",
  $facet: "Run multiple sub-pipelines over the same input in one stage.",
  $sortByCount: "Group by a value and sort the groups by count descending.",
  $sample: "Randomly select N documents.",
  $replaceRoot: "Replace the entire document with the specified expression.",
  $replaceWith: "Alias of $replaceRoot.",
  $bucket: "Categorize documents into groups defined by boundaries.",
  $bucketAuto: "Automatically group documents into N buckets by value.",
  $setWindowFields: "Compute window (rolling) functions across partitions.",
  $graphLookup: "Recursively search a collection following a graph.",
  $unionWith: "Concatenate documents from another collection.",
  $densify: "Create documents to densify missing values in a range.",
  $fill: "Fill missing (null) values with computed or literal values.",
  $documents: "Inject literal documents into the pipeline.",
  $redact: "Filter documents based on their structure using $userRoles/$descend.",
};

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function resolvePath(obj, path) {
  if (obj == null) return undefined;
  const parts = String(path).split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      if (/^\d+$/.test(p)) {
        cur = cur[Number(p)];
      } else {
        cur = cur.map((x) => (x == null ? undefined : x[p])).filter((x) => x !== undefined);
      }
    } else {
      cur = cur[p];
    }
  }
  return cur;
}

function setPath(obj, path, value) {
  const parts = String(path).split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== "object" || Array.isArray(cur[p])) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}

function unsetPath(obj, path) {
  const parts = String(path).split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur?.[parts[i]];
    if (cur == null) return;
  }
  delete cur[parts[parts.length - 1]];
}

function toTimestamp(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? NaN : t;
  }
  return NaN;
}

function compareValues(a, b) {
  const an = typeof a === "number" ? a : NaN;
  const bn = typeof b === "number" ? b : NaN;
  if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const ad = toTimestamp(a);
  const bd = toTimestamp(b);
  if (!Number.isNaN(ad) && !Number.isNaN(bd) && ad && bd) {
    if (ad === bd) return 0;
    return ad < bd ? -1 : 1;
  }
  if (typeof a === "string" && typeof b === "string") {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1;
  if (Array.isArray(a) && Array.isArray(b)) {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const c = compareValues(a[i], b[i]);
      if (c !== 0) return c;
    }
    return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
  }
  return 0;
}

function equalScalar(a, b) {
  if (typeof a === "number" && typeof b === "number") return a === b;
  return a === b;
}

function valuesMatch(a, b) {
  const arrs = [Array.isArray(a), Array.isArray(b)];
  if (arrs[0] && arrs[1]) return a.some((x) => b.some((y) => equalScalar(x, y)));
  if (arrs[0]) return a.some((x) => equalScalar(x, b));
  if (arrs[1]) return b.some((x) => equalScalar(x, a));
  return equalScalar(a, b);
}

function stableKey(v) {
  if (v == null) return "null";
  if (typeof v !== "object") return typeof v + ":" + String(v);
  if (Array.isArray(v)) return "arr:" + v.map(stableKey).join("|");
  const keys = Object.keys(v).sort();
  return "obj:" + keys.map((k) => k + "=" + stableKey(v[k])).join("|");
}

// ---------------------------------------------------------------------------
// Query matching
// ---------------------------------------------------------------------------

function resolveVarValue(v, ctx) {
  if (typeof v === "string" && v.startsWith("$$var")) {
    const rest = v.replace("$$var", "");
    if (rest === "") return ctx?.vars?.root;
    const key = rest.replace(/^\./, "");
    return resolvePath(ctx?.vars || {}, key);
  }
  if (Array.isArray(v)) return v.map((x) => resolveVarValue(x, ctx));
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = resolveVarValue(val, ctx);
    return out;
  }
  return v;
}

function matchQuery(doc, query, ctx) {
  query = resolveVarValue(query, ctx);
  for (const [key, cond] of Object.entries(query)) {
    if (key === "$and") {
      if (!cond.every((c) => matchQuery(doc, c, ctx))) return false;
    } else if (key === "$or") {
      if (!cond.some((c) => matchQuery(doc, c, ctx))) return false;
    } else if (key === "$nor") {
      if (cond.some((c) => matchQuery(doc, c, ctx))) return false;
    } else if (key === "$expr") {
      if (!isTruthy(evalExpr(cond, doc, ctx))) return false;
    } else if (key === "$text" || key === "$where") {
      throw new Error(`$match operator "${key}" is not supported in the demo engine`);
    } else {
      const val = resolvePath(doc, key);
      if (!matchField(val, cond, ctx)) return false;
    }
  }
  return true;
}

function matchField(val, cond, ctx) {
  if (cond && typeof cond === "object" && !Array.isArray(cond)) {
    const ops = Object.keys(cond);
    if (ops.some((o) => o.startsWith("$"))) {
      for (const [op, arg] of Object.entries(cond)) {
        if (op === "$eq") { if (compareValues(val, evalExpr(arg, {}, ctx)) !== 0) return false; }
        else if (op === "$ne") { if (compareValues(val, evalExpr(arg, {}, ctx)) === 0) return false; }
        else if (op === "$gt") { if (!(compareValues(val, evalExpr(arg, {}, ctx)) > 0)) return false; }
        else if (op === "$gte") { if (!(compareValues(val, evalExpr(arg, {}, ctx)) >= 0)) return false; }
        else if (op === "$lt") { if (!(compareValues(val, evalExpr(arg, {}, ctx)) < 0)) return false; }
        else if (op === "$lte") { if (!(compareValues(val, evalExpr(arg, {}, ctx)) <= 0)) return false; }
        else if (op === "$in") { if (!arg.some((x) => compareValues(val, evalExpr(x, {}, ctx)) === 0)) return false; }
        else if (op === "$nin") { if (arg.some((x) => compareValues(val, evalExpr(x, {}, ctx)) === 0)) return false; }
        else if (op === "$exists") { if (arg ? val === undefined : val !== undefined) return false; }
        else if (op === "$size") {
          if (!Array.isArray(val) || val.length !== arg) return false;
        } else if (op === "$all") {
          if (!Array.isArray(val) || !arg.every((x) => val.some((y) => compareValues(y, evalExpr(x, {}, ctx)) === 0))) return false;
        } else if (op === "$regex") {
          const re = arg instanceof RegExp ? arg : new RegExp(String(arg), cond.$options || "");
          if (typeof val !== "string" || !re.test(val)) return false;
        } else if (op === "$not") {
          if (matchField(val, { [Object.keys(arg)[0]]: Object.values(arg)[0] }, ctx)) return false;
        } else if (op === "$elemMatch") {
          if (!Array.isArray(val)) return false;
          const hit = val.some((el) =>
            cond.$elemMatch && typeof cond.$elemMatch === "object" && Object.keys(cond.$elemMatch).some((k) => k.startsWith("$"))
              ? matchField(el, cond.$elemMatch, ctx)
              : matchQuery(el, cond.$elemMatch, ctx)
          );
          if (!hit) return false;
        } else if (op === "$type") {
          const t = typeOf(val);
          if (t !== arg) return false;
        } else if (op === "$mod") {
          if (typeof val !== "number" || val % arg[0] !== arg[1]) return false;
        } else {
          throw new Error(`Unsupported $match operator "${op}"`);
        }
      }
      return true;
    }
  }
  if (val === undefined) return false;
  return compareValues(val, cond) === 0;
}

function typeOf(v) {
  if (v == null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "double";
  if (typeof v === "string") return v.includes("T") && !Number.isNaN(Date.parse(v)) ? "date" : "string";
  if (typeof v === "boolean") return "bool";
  return "object";
}

function isTruthy(v) {
  if (v == null) return false;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

const argList = (args) => (Array.isArray(args) ? args : [args]);

// ---------------------------------------------------------------------------
// Expression evaluation
// ---------------------------------------------------------------------------

function evalExpr(expr, doc, ctx = {}) {
  if (expr == null) return null;
  if (typeof expr === "number" || typeof expr === "boolean") return expr;
  if (typeof expr === "string") {
    if (expr === "$$ROOT") return ctx.root ?? doc;
    if (expr === "$$CURRENT") return doc;
    if (expr === "$$NOW") return ctx.now ?? new Date().toISOString();
    if (expr.startsWith("$$")) {
      const p = expr.replace(/^\$\$/, "");
      if (p === "ROOT") return ctx.root ?? doc;
      if (p === "CURRENT") return doc;
      if (p === "NOW") return ctx.now ?? new Date().toISOString();
      if (ctx.vars && p in ctx.vars) return ctx.vars[p];
      if (ctx.vars) {
        const v = resolvePath(ctx.vars, p);
        if (v !== undefined) return v;
      }
      return resolvePath(ctx, p);
    }
    if (expr.startsWith("$")) return resolvePath(doc, expr.slice(1));
    return expr;
  }
  if (Array.isArray(expr)) return expr.map((e) => evalExpr(e, doc, ctx));
  const keys = Object.keys(expr);
  if (keys.length === 0) return {};
  const op = keys[0];
  if (!op.startsWith("$")) {
    const out = {};
    for (const [k, v] of Object.entries(expr)) out[k] = evalExpr(v, doc, ctx);
    return out;
  }
  const args = expr[op];
  switch (op) {
    case "$literal": return args;
    case "$ifNull": {
      for (const a of args) {
        const v = evalExpr(a, doc, ctx);
        if (v != null) return v;
      }
      return null;
    }
    case "$cond": return isTruthy(evalExpr(args[0] ?? args.if, doc, ctx)) ? evalExpr(args[1] ?? args.then, doc, ctx) : evalExpr(args[2] ?? args.else, doc, ctx);
    case "$switch": {
      for (const b of args.branches) {
        if (isTruthy(evalExpr(b.case, doc, ctx))) return evalExpr(b.then, doc, ctx);
      }
      return evalExpr(args.default, doc, ctx);
    }
    case "$and": return argList(args).every((a) => isTruthy(evalExpr(a, doc, ctx)));
    case "$or": return argList(args).some((a) => isTruthy(evalExpr(a, doc, ctx)));
    case "$not": return !isTruthy(evalExpr(args, doc, ctx));
    case "$eq": return compareValues(evalExpr(args[0], doc, ctx), evalExpr(args[1], doc, ctx)) === 0;
    case "$ne": return compareValues(evalExpr(args[0], doc, ctx), evalExpr(args[1], doc, ctx)) !== 0;
    case "$gt": return compareValues(evalExpr(args[0], doc, ctx), evalExpr(args[1], doc, ctx)) > 0;
    case "$gte": return compareValues(evalExpr(args[0], doc, ctx), evalExpr(args[1], doc, ctx)) >= 0;
    case "$lt": return compareValues(evalExpr(args[0], doc, ctx), evalExpr(args[1], doc, ctx)) < 0;
    case "$lte": return compareValues(evalExpr(args[0], doc, ctx), evalExpr(args[1], doc, ctx)) <= 0;
    case "$cmp": return compareValues(evalExpr(args[0], doc, ctx), evalExpr(args[1], doc, ctx));
    case "$in": {
      const arr = evalExpr(args[1], doc, ctx);
      const v = evalExpr(args[0], doc, ctx);
      return Array.isArray(arr) && arr.some((x) => compareValues(x, v) === 0);
    }
    case "$isArray": return Array.isArray(evalExpr(args, doc, ctx));
    case "$type": return typeOf(evalExpr(args, doc, ctx));
    case "$sum": {
      const vals = argList(args).map((a) => evalExpr(a, doc, ctx));
      if (argList(args).length === 1 && Array.isArray(vals[0])) return vals[0].reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
      return vals.reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
    }
    case "$avg": {
      const vals = argList(args).map((a) => evalExpr(a, doc, ctx));
      const flat = argList(args).length === 1 && Array.isArray(vals[0]) ? vals[0] : vals;
      const nums = flat.filter((v) => typeof v === "number");
      if (nums.length === 0) return null;
      return nums.reduce((s, v) => s + v, 0) / nums.length;
    }
    case "$add": {
      const v = argList(args).map((a) => evalExpr(a, doc, ctx));
      if (v.some((x) => typeof x === "string")) {
        let out = typeof v[0] === "string" ? v[0] : "";
        for (let i = 1; i < v.length; i++) out += v[i];
        return out;
      }
      return v.reduce((s, x) => s + (typeof x === "number" ? x : 0), 0);
    }
    case "$subtract": {
      const a = evalExpr(args[0], doc, ctx);
      const b = evalExpr(args[1], doc, ctx);
      const at = toTimestamp(a);
      const bt = toTimestamp(b);
      if (!Number.isNaN(at) && !Number.isNaN(bt) && at && bt) return at - bt;
      return a - b;
    }
    case "$multiply": return argList(args).map((a) => evalExpr(a, doc, ctx)).reduce((s, x) => s * x, 1);
    case "$divide": {
      const a = evalExpr(argList(args)[0], doc, ctx);
      const b = evalExpr(argList(args)[1], doc, ctx);
      if (b === 0) return null;
      return a / b;
    }
    case "$mod": return evalExpr(argList(args)[0], doc, ctx) % evalExpr(argList(args)[1], doc, ctx);
    case "$abs": return Math.abs(evalExpr(args, doc, ctx));
    case "$ceil": return Math.ceil(evalExpr(args, doc, ctx));
    case "$floor": return Math.floor(evalExpr(args, doc, ctx));
    case "$round": {
      const v = evalExpr(args[0], doc, ctx);
      const p = args.length > 1 ? evalExpr(args[1], doc, ctx) : 0;
      const f = Math.pow(10, p);
      return Math.round(v * f) / f;
    }
    case "$trunc": {
      const v = evalExpr(args[0], doc, ctx);
      const p = args.length > 1 ? evalExpr(args[1], doc, ctx) : 0;
      const f = Math.pow(10, p);
      return Math.trunc(v * f) / f;
    }
    case "$sqrt": return Math.sqrt(evalExpr(args, doc, ctx));
    case "$pow": return Math.pow(evalExpr(args[0], doc, ctx), evalExpr(args[1], doc, ctx));
    case "$exp": return Math.exp(evalExpr(args, doc, ctx));
    case "$ln": return Math.log(evalExpr(args, doc, ctx));
    case "$log10": return Math.log10(evalExpr(args, doc, ctx));
    case "$concat": return argList(args).map((a) => {
      const v = evalExpr(a, doc, ctx);
      return v == null ? "" : String(v);
    }).join("");
    case "$toLower": return String(evalExpr(args, doc, ctx) ?? "").toLowerCase();
    case "$toUpper": return String(evalExpr(args, doc, ctx) ?? "").toUpperCase();
    case "$substr":
    case "$substrCP": {
      const s = String(evalExpr(argList(args)[0], doc, ctx) ?? "");
      return s.substr(evalExpr(argList(args)[1], doc, ctx), evalExpr(argList(args)[2], doc, ctx));
    }
    case "$strLenCP": return String(evalExpr(args, doc, ctx) ?? "").length;
    case "$split": return String(evalExpr(argList(args)[0], doc, ctx) ?? "").split(evalExpr(argList(args)[1], doc, ctx));
    case "$trim": {
      const s = String(evalExpr(args.input ?? args, doc, ctx) ?? "");
      const chars = args.chars ? String(evalExpr(args.chars, doc, ctx)) : " ";
      return s.replace(new RegExp(`^[${chars}]+|[${chars}]+$`, "g"), "");
    }
    case "$replaceOne":
    case "$replaceAll": {
      const input = String(evalExpr(args.input, doc, ctx) ?? "");
      const find = String(evalExpr(args.find, doc, ctx));
      const repl = String(evalExpr(args.replacement, doc, ctx));
      return op === "$replaceOne" ? input.replace(find, repl) : input.replaceAll(find, repl);
    }
    case "$regexMatch": {
      const s = String(evalExpr(args.input, doc, ctx) ?? "");
      const re = String(evalExpr(args.regex, doc, ctx));
      return new RegExp(re).test(s);
    }
    case "$year": return new Date(evalExpr(args.date ?? args, doc, ctx)).getUTCFullYear();
    case "$month": return new Date(evalExpr(args.date ?? args, doc, ctx)).getUTCMonth() + 1;
    case "$dayOfMonth": return new Date(evalExpr(args.date ?? args, doc, ctx)).getUTCDate();
    case "$dayOfWeek": return new Date(evalExpr(args.date ?? args, doc, ctx)).getUTCDay() + 1;
    case "$dayOfYear": {
      const d = new Date(evalExpr(args.date ?? args, doc, ctx));
      const start = Date.UTC(d.getUTCFullYear(), 0, 0);
      return Math.floor((d.getTime() - start) / 86400000);
    }
    case "$hour": return new Date(evalExpr(args.date ?? args, doc, ctx)).getUTCHours();
    case "$minute": return new Date(evalExpr(args.date ?? args, doc, ctx)).getUTCMinutes();
    case "$second": return new Date(evalExpr(args.date ?? args, doc, ctx)).getUTCSeconds();
    case "$millisecond": return new Date(evalExpr(args.date ?? args, doc, ctx)).getUTCMilliseconds();
    case "$week":
    case "$isoWeek": {
      const d = new Date(evalExpr(args.date ?? args, doc, ctx));
      const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    }
    case "$dateToString": {
      const d = new Date(evalExpr(args.date, doc, ctx));
      const format = args.format || "%Y-%m-%d";
      const pad = (n, l = 2) => String(n).padStart(l, "0");
      const dayNum = d.getUTCDay() || 7;
      return format.replace(/%[YmdHMSLjuwVzZ%]/g, (m) => {
        switch (m) {
          case "%Y": return String(d.getUTCFullYear());
          case "%m": return pad(d.getUTCMonth() + 1);
          case "%d": return pad(d.getUTCDate());
          case "%H": return pad(d.getUTCHours());
          case "%M": return pad(d.getUTCMinutes());
          case "%S": return pad(d.getUTCSeconds());
          case "%L": return pad(d.getUTCMilliseconds(), 3);
          case "%j": return pad(dayOfYear(d), 3);
          case "%u": return String(dayNum);
          case "%w": return String(d.getUTCDay());
          case "%V": return pad(isoWeek(d));
          case "%z": return "+0000";
          case "%Z": return "UTC";
          case "%%": return "%";
        }
        return m;
      });
    }
    case "$dateFromParts": {
      const p = {};
      for (const [k, v] of Object.entries(args)) p[k] = evalExpr(v, doc, ctx);
      return new Date(Date.UTC(p.year, (p.month || 1) - 1, p.day || 1, p.hour || 0, p.minute || 0, p.second || 0, p.millisecond || 0)).toISOString();
    }
    case "$toDate": {
      const v = evalExpr(args, doc, ctx);
      return typeof v === "string" ? v : new Date(v).toISOString();
    }
    case "$dateAdd": {
      const start = new Date(evalExpr(args.startDate, doc, ctx));
      const unit = args.unit;
      const amount = evalExpr(args.amount, doc, ctx);
      const ms = { millisecond: 1, second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 7 * 86400000 }[unit];
      return new Date(start.getTime() + amount * ms).toISOString();
    }
    case "$dateSubtract": {
      const start = new Date(evalExpr(args.startDate, doc, ctx));
      const unit = args.unit;
      const amount = evalExpr(args.amount, doc, ctx);
      const ms = { millisecond: 1, second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 7 * 86400000 }[unit];
      return new Date(start.getTime() - amount * ms).toISOString();
    }
    case "$size": {
      const v = evalExpr(args, doc, ctx);
      return Array.isArray(v) ? v.length : 0;
    }
    case "$arrayElemAt": {
      const arr = evalExpr(args[0], doc, ctx);
      const idx = evalExpr(args[1], doc, ctx);
      if (!Array.isArray(arr)) return undefined;
      return arr[idx < 0 ? arr.length + idx : idx];
    }
    case "$first": {
      const v = evalExpr(args, doc, ctx);
      return Array.isArray(v) ? v[0] : undefined;
    }
    case "$last": {
      const v = evalExpr(args, doc, ctx);
      return Array.isArray(v) ? v[v.length - 1] : undefined;
    }
    case "$slice": {
      const arr = evalExpr(args[0], doc, ctx);
      if (!Array.isArray(arr)) return [];
      if (args.length === 2) {
        const n = evalExpr(args[1], doc, ctx);
        return n >= 0 ? arr.slice(0, n) : arr.slice(n);
      }
      const pos = evalExpr(args[1], doc, ctx);
      const n = evalExpr(args[2], doc, ctx);
      return arr.slice(pos, pos + n);
    }
    case "$concatArrays": {
      const out = [];
      for (const a of argList(args)) {
        const v = evalExpr(a, doc, ctx);
        if (Array.isArray(v)) out.push(...v);
      }
      return out;
    }
    case "$reverseArray": {
      const v = evalExpr(args, doc, ctx);
      return Array.isArray(v) ? [...v].reverse() : v;
    }
    case "$indexOfArray": {
      const arr = evalExpr(args[0], doc, ctx);
      const v = evalExpr(args[1], doc, ctx);
      return Array.isArray(arr) ? arr.findIndex((x) => compareValues(x, v) === 0) : -1;
    }
    case "$map": {
      const input = evalExpr(args.input, doc, ctx) || [];
      return input.map((el) => evalExpr(args.in, el, { ...ctx, [args.as || "this"]: el }));
    }
    case "$filter": {
      const input = evalExpr(args.input, doc, ctx) || [];
      const as = args.as || "this";
      return input.filter((el) => isTruthy(evalExpr(args.cond, el, { ...ctx, [as]: el })));
    }
    case "$reduce": {
      const input = evalExpr(args.input, doc, ctx) || [];
      const as = args.as || "this";
      let acc = evalExpr(args.initialValue, doc, ctx);
      for (const el of input) acc = evalExpr(args.in, el, { ...ctx, [as]: el, value: acc });
      return acc;
    }
    case "$sortArray": {
      const input = evalExpr(args.input, doc, ctx) || [];
      const sortSpec = args.sortBy;
      return [...input].sort((a, b) => {
        for (const [k, dir] of Object.entries(sortSpec)) {
          const c = compareValues(resolvePath(a, k), resolvePath(b, k)) * dir;
          if (c !== 0) return c;
        }
        return 0;
      });
    }
    case "$range": {
      const start = evalExpr(args[0], doc, ctx);
      const end = evalExpr(args[1], doc, ctx);
      const step = args.length > 2 ? evalExpr(args[2], doc, ctx) : 1;
      const out = [];
      for (let i = start; i < end; i += step) out.push(i);
      return out;
    }
    case "$min":
    case "$max": {
      const arr = Array.isArray(args) ? args.map((a) => evalExpr(a, doc, ctx)) : evalExpr(args, doc, ctx);
      const list = Array.isArray(arr) ? arr : [arr];
      return list.reduce((best, x) => (best === undefined || compareValues(x, best) < 0 === (op === "$min") ? x : best), undefined);
    }
    case "$mergeObjects": {
      const out = {};
      for (const a of argList(args)) Object.assign(out, evalExpr(a, doc, ctx) || {});
      return out;
    }
    case "$objectToArray": {
      const v = evalExpr(args, doc, ctx) || {};
      return Object.entries(v).map(([k, val]) => ({ k, v: val }));
    }
    case "$arrayToObject": {
      const v = evalExpr(args, doc, ctx) || [];
      const out = {};
      for (const item of v) {
        if (Array.isArray(item)) out[item[0]] = item[1];
        else out[item.k] = item.v;
      }
      return out;
    }
    case "$getField": {
      const v = evalExpr(args.input ?? args.field, doc, ctx);
      const f = evalExpr(args.field ?? args, doc, ctx);
      return v?.[f];
    }
    case "$let": {
      const sub = { ...ctx };
      for (const [k, v] of Object.entries(args.vars)) sub[k] = evalExpr(v, doc, ctx);
      return evalExpr(args.in, doc, sub);
    }
    case "$toString": return String(evalExpr(args, doc, ctx) ?? "");
    case "$toInt": return Math.trunc(evalExpr(args, doc, ctx));
    case "$toDouble": return Number(evalExpr(args, doc, ctx));
    case "$toBool": return isTruthy(evalExpr(args, doc, ctx));
    case "$convert": {
      const v = evalExpr(args.input, doc, ctx);
      const to = args.to;
      if (to === "int" || to === "long" || to === "double") return Number(v);
      if (to === "string") return String(v);
      if (to === "date") return v;
      if (to === "bool") return isTruthy(v);
      return v;
    }
    default:
      throw new Error(`Expression operator "${op}" is not supported in the demo engine`);
  }
}

function dayOfYear(d) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

function runProject(docs, spec, ctx) {
  const keys = Object.keys(spec);
  const isExpr = (v) => v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).some((k) => k.startsWith("$"));
  const hasInclude = keys.some((k) => spec[k] === 1 || spec[k] === true || isExpr(spec[k]));
  const hasExclude = keys.some((k) => spec[k] === 0 || spec[k] === false);
  const exclusionMode = !hasInclude && hasExclude;
  return docs.map((doc) => {
    if (exclusionMode) {
      const out = clone(doc);
      for (const k of keys) if (spec[k] === 0 || spec[k] === false) unsetPath(out, k);
      return out;
    }
    const out = {};
    if (!("_id" in spec) || spec._id === 1) out._id = clone(doc._id);
    for (const [k, v] of Object.entries(spec)) {
      if (k === "_id") continue;
      if (v === 1 || v === true) setPath(out, k, resolvePath(doc, k));
      else if (v === 0 || v === false) continue;
      else setPath(out, k, evalExpr(v, doc, ctx));
    }
    return out;
  });
}

function runAddFields(docs, spec, ctx) {
  return docs.map((doc) => {
    const out = clone(doc);
    for (const [k, v] of Object.entries(spec)) setPath(out, k, evalExpr(v, doc, ctx));
    return out;
  });
}

function runUnset(docs, spec) {
  const paths = Array.isArray(spec) ? spec : [spec];
  return docs.map((doc) => {
    const out = clone(doc);
    for (const p of paths) unsetPath(out, p);
    return out;
  });
}

function accumulate(accOp, accSpec, groupDocs, ctx) {
  switch (accOp) {
    case "$sum": {
      if (typeof accSpec === "number") return groupDocs.reduce((s) => s + accSpec, 0);
      return groupDocs.reduce((s, d) => {
        const v = evalExpr(accSpec, d, ctx);
        return s + (typeof v === "number" ? v : 0);
      }, 0);
    }
    case "$avg": {
      const vals = groupDocs.map((d) => evalExpr(accSpec, d, ctx)).filter((v) => typeof v === "number");
      if (vals.length === 0) return null;
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    }
    case "$min": return groupDocs.reduce((best, d) => {
      const v = evalExpr(accSpec, d, ctx);
      return best === undefined || compareValues(v, best) < 0 ? v : best;
    }, undefined);
    case "$max": return groupDocs.reduce((best, d) => {
      const v = evalExpr(accSpec, d, ctx);
      return best === undefined || compareValues(v, best) > 0 ? v : best;
    }, undefined);
    case "$first": return groupDocs.length ? clone(evalExpr(accSpec, groupDocs[0], ctx)) : undefined;
    case "$last": return groupDocs.length ? clone(evalExpr(accSpec, groupDocs[groupDocs.length - 1], ctx)) : undefined;
    case "$push": return groupDocs.map((d) => clone(evalExpr(accSpec, d, ctx)));
    case "$addToSet": {
      const set = new Map();
      for (const d of groupDocs) {
        const v = clone(evalExpr(accSpec, d, ctx));
        set.set(stableKey(v), v);
      }
      return [...set.values()];
    }
    case "$count": return groupDocs.length;
    case "$mergeObjects": {
      const out = {};
      for (const d of groupDocs) Object.assign(out, evalExpr(accSpec, d, ctx) || {});
      return out;
    }
    case "$stdDevPop":
    case "$stdDevSamp": {
      const vals = groupDocs.map((d) => evalExpr(accSpec, d, ctx)).filter((v) => typeof v === "number");
      if (vals.length === 0) return null;
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (accOp === "$stdDevPop" ? vals.length : vals.length - 1);
      return Math.sqrt(variance);
    }
    default:
      throw new Error(`Group accumulator "${accOp}" is not supported in the demo engine`);
  }
}

function runGroup(docs, spec, ctx) {
  const idSpec = spec._id;
  const buckets = new Map();
  const order = [];
  for (const doc of docs) {
    const key = idSpec === undefined ? null : evalExpr(idSpec, doc, ctx);
    const k = stableKey(key);
    if (!buckets.has(k)) {
      buckets.set(k, { key: clone(key), docs: [] });
      order.push(k);
    }
    buckets.get(k).docs.push(doc);
  }
  const out = [];
  for (const k of order) {
    const b = buckets.get(k);
    const outDoc = { _id: b.key };
    for (const [field, acc] of Object.entries(spec)) {
      if (field === "_id") continue;
      const accKey = Object.keys(acc)[0];
      outDoc[field] = accumulate(accKey, acc[accKey], b.docs, ctx);
    }
    out.push(outDoc);
  }
  return out;
}

function runSort(docs, spec) {
  const entries = Object.entries(spec);
  return [...docs].sort((a, b) => {
    for (const [k, dir] of entries) {
      const av = resolvePath(a, k);
      const bv = resolvePath(b, k);
      let c = compareValues(av, bv);
      if (typeof dir === "object" && dir.$meta) c = compareValues(String(av), String(bv));
      else c = c * dir;
      if (c !== 0) return c;
    }
    return 0;
  });
}

function runUnwind(docs, spec) {
  const isStr = typeof spec === "string";
  const path = isStr ? spec.slice(1) : spec.path.slice(1);
  const includeIndex = !isStr ? spec.includeArrayIndex : undefined;
  const preserve = !isStr ? !!spec.preserveNullAndEmptyArrays : false;
  const out = [];
  for (const doc of docs) {
    const val = resolvePath(doc, path);
    if (val === undefined || (Array.isArray(val) && val.length === 0)) {
      if (preserve) {
        const keep = clone(doc);
        if (!isStr) unsetPath(keep, path);
        out.push(keep);
      }
      continue;
    }
    if (!Array.isArray(val)) {
      const keep = clone(doc);
      setPath(keep, path, val);
      if (includeIndex) setPath(keep, includeIndex, null);
      out.push(keep);
      continue;
    }
    val.forEach((el, i) => {
      const keep = clone(doc);
      setPath(keep, path, clone(el));
      if (includeIndex) setPath(keep, includeIndex, i);
      out.push(keep);
    });
  }
  return out;
}

function runLookup(db, docs, spec, ctx) {
  const from = db[spec.from] || [];
  const as = spec.as;
  if (spec.pipeline) {
    const lets = spec.let || {};
    return docs.map((doc) => {
      const vars = {};
      for (const [k, v] of Object.entries(lets)) vars[k] = evalExpr(v, doc, ctx);
      const subCtx = { ...ctx, vars };
      const sub = runPipeline(from, spec.pipeline, subCtx);
      const out = clone(doc);
      out[as] = sub.docs;
      return out;
    });
  }
  return docs.map((doc) => {
    const lv = resolvePath(doc, spec.localField);
    const matches = from.filter((f) => valuesMatch(lv, resolvePath(f, spec.foreignField)));
    const out = clone(doc);
    out[as] = matches.map(clone);
    return out;
  });
}

function runFacet(db, docs, spec, ctx) {
  const out = {};
  for (const [name, subPipe] of Object.entries(spec)) {
    const sub = runPipeline(docs, subPipe, ctx);
    out[name] = sub.docs;
  }
  return [out];
}

function runSortByCount(docs, spec, ctx) {
  const buckets = new Map();
  const order = [];
  for (const doc of docs) {
    const v = clone(evalExpr(spec, doc, ctx));
    const k = stableKey(v);
    if (!buckets.has(k)) {
      buckets.set(k, { _id: v, count: 0 });
      order.push(k);
    }
    buckets.get(k).count += 1;
  }
  return order
    .map((k) => buckets.get(k))
    .sort((a, b) => b.count - a.count);
}

function runSample(docs, spec) {
  const n = spec.size || 1;
  const step = Math.max(1, Math.floor(docs.length / n));
  const out = [];
  for (let i = 0; i < docs.length && out.length < n; i += step) out.push(docs[i]);
  return out;
}

function runReplaceRoot(docs, spec, ctx) {
  return docs.map((doc) => {
    const newRoot = evalExpr(spec.newRoot, doc, { ...ctx, root: doc });
    return typeof newRoot === "object" && newRoot !== null ? newRoot : doc;
  });
}

function runBucket(docs, spec, ctx) {
  const boundaries = spec.boundaries.map((b) => evalExpr(b, {}, ctx));
  const defaultKey = spec.default;
  const outSpec = spec.output || {};
  const buckets = new Map();
  boundaries.forEach((b, i) => {
    const label = i === boundaries.length - 1 ? defaultKey : b;
    buckets.set(stableKey(label), { _id: label, docs: [] });
  });
  if (defaultKey !== undefined && !buckets.has(stableKey(defaultKey))) buckets.set(stableKey(defaultKey), { _id: defaultKey, docs: [] });
  for (const doc of docs) {
    const v = evalExpr(spec.groupBy, doc, ctx);
    let idx = boundaries.findIndex((b, i) => v < b);
    let bucket = idx === -1 ? defaultKey : idx === 0 ? boundaries[0] : boundaries[idx - 1];
    if (idx === -1 && defaultKey === undefined) continue;
    if (idx === -1) bucket = defaultKey;
    const b = buckets.get(stableKey(bucket));
    if (b) b.docs.push(doc);
  }
  return [...buckets.values()].map((b) => {
    const doc = { _id: b._id };
    for (const [field, acc] of Object.entries(outSpec)) {
      const accKey = Object.keys(acc)[0];
      doc[field] = accumulate(accKey, acc[accKey], b.docs, ctx);
    }
    return doc;
  });
}

function windowBounds(windowSpec, hasSort, n, i) {
  if (windowSpec && windowSpec.documents) {
    const [a, b] = windowSpec.documents;
    const pos = (v, def) => (v === "unbounded" ? (def === "start" ? 0 : n - 1) : v === "current" ? i : Math.max(0, Math.min(n - 1, i + v)));
    const start = pos(a, "start");
    const end = pos(b, "end");
    return { start, end };
  }
  if (windowSpec && windowSpec.range) {
    return { start: 0, end: n - 1 };
  }
  if (hasSort) return { start: 0, end: i };
  return { start: 0, end: n - 1 };
}

function rankAt(sorted, i, sortSpec) {
  const entries = Object.entries(sortSpec);
  const keyOf = (d) => entries.map(([k, dir]) => resolvePath(d, k) * (dir === 1 ? 1 : -1));
  let rank = 1;
  for (let j = 0; j < i; j++) {
    const a = keyOf(sorted[j]);
    const b = keyOf(sorted[i]);
    let less = true;
    for (let c = 0; c < entries.length; c++) {
      if (compareValues(a[c], b[c]) >= 0) { less = false; break; }
    }
    if (less) rank += 1;
  }
  return rank;
}

function denseRankAt(sorted, i, sortSpec) {
  const entries = Object.entries(sortSpec);
  const keyOf = (d) => entries.map(([k, dir]) => resolvePath(d, k) * (dir === 1 ? 1 : -1));
  const seen = [];
  for (let j = 0; j <= i; j++) {
    const k = keyOf(sorted[j]);
    if (!seen.some((s) => s.every((v, c) => compareValues(v, k[c]) === 0))) seen.push(k);
  }
  return seen.length;
}

function windowAccum(accOp, accSpec, group, ctx) {
  switch (accOp) {
    case "$count": return group.length;
    case "$sum": return group.reduce((s, d) => s + (typeof evalExpr(accSpec, d, ctx) === "number" ? evalExpr(accSpec, d, ctx) : 0), 0);
    case "$avg": {
      const vals = group.map((d) => evalExpr(accSpec, d, ctx)).filter((v) => typeof v === "number");
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    }
    case "$min": return group.reduce((best, d) => {
      const v = evalExpr(accSpec, d, ctx);
      return best === undefined || compareValues(v, best) < 0 ? v : best;
    }, undefined);
    case "$max": return group.reduce((best, d) => {
      const v = evalExpr(accSpec, d, ctx);
      return best === undefined || compareValues(v, best) > 0 ? v : best;
    }, undefined);
    case "$first": return group.length ? clone(evalExpr(accSpec, group[0], ctx)) : undefined;
    case "$last": return group.length ? clone(evalExpr(accSpec, group[group.length - 1], ctx)) : undefined;
    case "$push": return group.map((d) => clone(evalExpr(accSpec, d, ctx)));
    case "$addToSet": {
      const set = new Map();
      for (const d of group) {
        const v = clone(evalExpr(accSpec, d, ctx));
        set.set(stableKey(v), v);
      }
      return [...set.values()];
    }
    default:
      throw new Error(`Window operator "${accOp}" is not supported in the demo engine`);
  }
}

function runSetWindowFields(docs, spec, ctx) {
  const partitionExpr = spec.partitionBy;
  const sortSpec = spec.sortBy || {};
  const output = spec.output || {};
  const groups = new Map();
  const order = [];
  for (const doc of docs) {
    const k = partitionExpr ? stableKey(evalExpr(partitionExpr, doc, ctx)) : "all";
    if (!groups.has(k)) {
      groups.set(k, []);
      order.push(k);
    }
    groups.get(k).push(doc);
  }
  const result = [];
  for (const k of order) {
    const part = groups.get(k);
    const sorted = runSort(part, sortSpec);
    const n = sorted.length;
    const hasSort = Object.keys(sortSpec).length > 0;
    for (let i = 0; i < n; i++) {
      const doc = clone(sorted[i]);
      for (const [field, expr] of Object.entries(output)) {
        const opKey = Object.keys(expr)[0];
        const arg = expr[opKey];
        if (opKey === "$documentNumber") doc[field] = i + 1;
        else if (opKey === "$rank") doc[field] = rankAt(sorted, i, sortSpec);
        else if (opKey === "$denseRank") doc[field] = denseRankAt(sorted, i, sortSpec);
        else if (opKey === "$shift") {
          const by = arg?.by ?? 1;
          const outDefault = arg?.default;
          const j = i + by;
          doc[field] = j >= 0 && j < n ? clone(evalExpr(arg?.output ?? arg, sorted[j], ctx)) : outDefault;
        } else {
          const w = windowBounds(expr.window, hasSort, n, i);
          doc[field] = windowAccum(opKey, arg, sorted.slice(w.start, w.end + 1), ctx);
        }
      }
      result.push(doc);
    }
  }
  return result;
}

function runGraphLookup(db, docs, spec, ctx) {
  const from = db[spec.from] || [];
  const as = spec.as;
  const maxDepth = spec.maxDepth === undefined ? Infinity : spec.maxDepth;
  return docs.map((doc) => {
    const visited = new Set();
    const results = [];
    const startVal = evalExpr(spec.startWith, doc, ctx);
    const initial = (Array.isArray(startVal) ? startVal : [startVal]).filter((v) => v != null);
    const queue = initial.map((v) => ({ val: v, depth: 0 }));
    while (queue.length) {
      const { val, depth } = queue.shift();
      const k = stableKey(val);
      if (visited.has(k)) continue;
      visited.add(k);
      if (depth >= maxDepth) continue;
      const matches = from.filter((f) => equalScalar(resolvePath(f, spec.connectToField), val));
      for (const m of matches) {
        if (spec.restrictSearchWithMatch && !matchQuery(m, spec.restrictSearchWithMatch, ctx)) continue;
        const out = clone(m);
        if (spec.depthField) out[spec.depthField] = depth + 1;
        results.push(out);
        const next = resolvePath(m, spec.connectFromField);
        const nextVals = (Array.isArray(next) ? next : [next]).filter((v) => v != null);
        for (const nv of nextVals) queue.push({ val: nv, depth: depth + 1 });
      }
    }
    const out = clone(doc);
    out[as] = results;
    return out;
  });
}

function runUnionWith(db, docs, spec) {
  const from = db[spec.coll] || [];
  const sub = spec.pipeline ? runPipeline(from, spec.pipeline, {}).docs : from;
  return docs.concat(sub.docs ?? sub);
}

function runDensify(docs) {
  return docs;
}

function runFill(docs) {
  return docs;
}

function runDocuments(spec) {
  return clone(spec);
}

// ---------------------------------------------------------------------------
// Pipeline driver
// ---------------------------------------------------------------------------

export function runPipeline(input, pipeline, ctx = {}) {
  let docs = input;
  const steps = [];
  let totalScanned = input.length;
  for (const stage of pipeline) {
    if (!stage || typeof stage !== "object") throw new Error("Each pipeline stage must be an object");
    const key = Object.keys(stage)[0];
    if (WRITE_STAGES.has(key)) throw new Error(`Stage "${key}" writes to the database and is not allowed here`);
    const spec = stage[key];
    const inputDocs = docs;
    const t0 = perf.now();
    switch (key) {
      case "$match": docs = inputDocs.filter((d) => matchQuery(d, spec, ctx)); break;
      case "$project": docs = runProject(inputDocs, spec, ctx); break;
      case "$addFields":
      case "$set": docs = runAddFields(inputDocs, spec, ctx); break;
      case "$unset": docs = runUnset(inputDocs, spec); break;
      case "$group": docs = runGroup(inputDocs, spec, ctx); break;
      case "$sort": docs = runSort(inputDocs, spec); break;
      case "$limit": docs = inputDocs.slice(0, spec); break;
      case "$skip": docs = inputDocs.slice(spec); break;
      case "$count": docs = [{ [spec]: inputDocs.length }]; break;
      case "$unwind": docs = runUnwind(inputDocs, spec); break;
      case "$lookup": docs = runLookup(ctx.db || {}, inputDocs, spec, ctx); break;
      case "$facet": docs = runFacet(ctx.db || {}, inputDocs, spec, ctx); break;
      case "$sortByCount": docs = runSortByCount(inputDocs, spec, ctx); break;
      case "$sample": docs = runSample(inputDocs, spec); break;
      case "$replaceRoot": docs = runReplaceRoot(inputDocs, spec, ctx); break;
      case "$replaceWith": docs = inputDocs.map((d) => evalExpr(spec, d, { ...ctx, root: d })); break;
      case "$bucket": docs = runBucket(inputDocs, spec, ctx); break;
      case "$bucketAuto": docs = runBucket({ ...spec, boundaries: autoBoundaries(inputDocs, spec) }, ctx); break;
      case "$setWindowFields": docs = runSetWindowFields(inputDocs, spec, ctx); break;
      case "$graphLookup": docs = runGraphLookup(ctx.db || {}, inputDocs, spec, ctx); break;
      case "$unionWith": docs = runUnionWith(ctx.db || {}, inputDocs, spec); break;
      case "$densify": docs = runDensify(inputDocs); break;
      case "$fill": docs = runFill(inputDocs); break;
      case "$documents": docs = runDocuments(spec); break;
      case "$redact": docs = inputDocs.filter((d) => matchQuery(d, spec, ctx)); break;
      default:
        throw new Error(`Stage "${key}" is not recognized`);
    }
    const dt = Math.max(0, perf.now() - t0);
    totalScanned += inputDocs.length;
    steps.push({
      stage: key,
      inputCount: inputDocs.length,
      outputCount: docs.length,
      executionTimeMs: Math.round(dt * 1000) / 1000,
      memoryBytes: JSON.stringify(docs).length,
      sampleInput: inputDocs.slice(0, 5).map(clone),
      sampleOutput: docs.slice(0, 5).map(clone),
      explanation: STAGE_PURPOSE[key] || "",
      purpose: "transformation",
    });
  }
  return { docs, steps, totalScanned };
}

function autoBoundaries(docs, spec) {
  const values = docs.map((d) => evalExpr(spec.groupBy, d, {})).filter((v) => typeof v === "number").sort((a, b) => a - b);
  if (values.length === 0) return [0];
  const min = values[0];
  const max = values[values.length - 1];
  const n = spec.buckets || 5;
  const width = (max - min) / n || 1;
  const out = [];
  for (let i = 0; i < n; i++) out.push(min + i * width);
  out.push(max);
  return out;
}

const SUGGESTED_INDEXES = {
  orders: ["userId", "status", "createdAt", "total"],
  products: ["categoryId"],
  reviews: ["productId", "userId"],
  movies: ["year", "genre", "rating"],
  courses: ["teacherId"],
  students: ["courseIds"],
  employees: ["departmentId", "companyId", "salary"],
  transactions: ["accountId", "type", "merchant", "date"],
  appointments: ["patientId", "hospitalId", "date"],
  flights: ["from", "to", "airline"],
  menu: ["restaurantId"],
  inventory: ["restaurantId"],
  books: ["authorId", "publisherId", "category"],
  comments: ["postId", "authorId"],
  likes: ["postId", "userId"],
  followers: ["userId", "followsId"],
  messages: ["fromId", "toId"],
  notifications: ["userId"],
  posts: ["authorId"],
  departments: ["companyId"],
  patients: ["hospitalId"],
};

export function analyzeWarnings(pipeline, db = {}) {
  const warnings = [];
  const seenStages = pipeline.map((s) => Object.keys(s)[0]);
  let grouped = false;
  let matched = false;
  let matchIdx = seenStages.indexOf("$match");
  seenStages.forEach((key, idx) => {
    if (key === "$group") grouped = true;
    if (key === "$match") matched = true;
    if (key === "$group" && matched === false) {
      const bigInput = db[collectionForStage(pipeline, idx)]?.length > 400;
      if (bigInput) warnings.push({ type: "no-match-first", message: "Consider a $match before $group to reduce the working set." });
    }
    if (key === "$match" && grouped) warnings.push({ type: "match-after-group", message: "$match appears after a $group. Filtering before grouping scans far fewer documents." });
    if (key === "$project" && matchIdx !== -1 && idx < matchIdx) warnings.push({ type: "unnecessary-project", message: "A $project before $match may materialize fields that are then filtered. Move $match earlier." });
    if (key === "$unwind") {
      const count = seenStages.filter((s) => s === "$unwind").length;
      if (count >= 3) warnings.push({ type: "too-many-unwind", message: "Multiple $unwind stages can explode the document count exponentially. Consider reshaping." });
    }
    if (key === "$lookup") {
      const from = pipeline[idx].$lookup.from;
      if (db[from]?.length > 500) warnings.push({ type: "large-lookup", message: `$lookup against "${from}" (${
          db[from].length
        } docs) scans the whole foreign collection unless an index exists on the join field.` });
      const foreign = pipeline[idx].$lookup.foreignField;
      if (foreign && !(SUGGESTED_INDEXES[from] || []).includes(foreign)) {
        warnings.push({ type: "missing-index", message: `No suggested index on "${from}.${foreign}" for this $lookup join. Indexing the foreign key speeds up joins dramatically.` });
      }
    }
  });
  if (matchIdx === -1 && seenStages.some((s) => ["$group", "$lookup"].includes(s))) {
    warnings.push({ type: "no-match-first", message: "No $match in this pipeline. Filtering early is the #1 aggregation optimization." });
  }
  return warnings;
}

function collectionForStage(pipeline, idx) {
  if (pipeline[idx]?.$lookup) return pipeline[idx].$lookup.from;
  return null;
}

const now = () => perf.now();

/**
 * Run a full aggregation over a collection.
 * @param {Record<string, any[]>} db
 * @param {string} collection
 * @param {Array<Record<string, any>>} pipeline
 */
export function aggregate(db, collection, pipeline) {
  const t0 = now();
  const source = db[collection] || [];
  const { docs, steps, totalScanned } = runPipeline(source, pipeline, { db });
  const executionTimeMs = now() - t0;
  return {
    docs,
    count: docs.length,
    steps,
    totalScanned,
    executionTimeMs,
    aggregationTimeMs: executionTimeMs,
    documentsScanned: totalScanned,
    warnings: analyzeWarnings(pipeline, db),
  };
}

export { evalExpr, matchQuery, compareValues, resolvePath, clone };
