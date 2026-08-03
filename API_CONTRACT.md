# Mongo Quest — Backend API Contract

The frontend ships with a **deterministic in-browser mock engine** that needs no server
(`NEXT_PUBLIC_AGG_API_MODE=mock`, the default). A real Express + MongoDB backend can be
plugged in later by implementing the two endpoints below and setting
`NEXT_PUBLIC_AGG_API_MODE=live`.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_AGG_API_MODE` | `mock` | `mock` runs pipelines in the browser; `live` POSTs to the backend. |
| `NEXT_PUBLIC_AGG_API_URL` | `http://localhost:4000` | Base URL of the backend (no trailing slash). |

Read at runtime by `lib/config.ts`. All requests go through `lib/backend/client.ts`.

## Seeding constraint (IMPORTANT)

The frontend embeds the expected outputs for all 28 missions in
`lib/challenges/expected-outputs.json`. Those outputs were generated with the
deterministic seed **`20260803`** (constant `SEED` in `lib/config.ts`). A live backend
**must reproduce the exact same dataset** (32 collections, same documents) for
validation to pass. The canonical generator is `shared/seed.mjs` — port its RNG and
collections 1:1 to the backend, or point `SEED` to a value whose dataset you regenerate
`expected-outputs.json` against.

## Endpoint 1 — `POST /api/challenges/:missionId`

Runs one aggregation pipeline and returns execution metadata + stage-by-stage stats.

### Request body

```json
{
  "collection": "orders",
  "collections": ["orders", "users", "products"],
  "pipeline": [
    { "$match": { "status": "shipped" } },
    { "$project": { "_id": 0, "orderNumber": 1, "total": 1 } }
  ]
}
```

- `collection` — primary input collection.
- `collections` — every collection the pipeline may touch (for `$lookup`).
- `pipeline` — array of MongoDB stage objects. Write stages (`$out`, `$merge`,
  `$createIndexes`) must be rejected with `success: false`.

### Success response — `200`

```json
{
  "success": true,
  "documents": [
    { "orderNumber": 10248, "total": 445.5 }
  ],
  "count": 1,
  "stats": {
    "executionTimeMs": 12.4,
    "aggregationTimeMs": 11.1,
    "responseSizeBytes": 184,
    "totalDocsProcessed": 520,
    "documentsScanned": 830,
    "stages": [
      {
        "stage": "$match",
        "inputCount": 830,
        "outputCount": 120,
        "executionTimeMs": 3.2,
        "memoryBytes": 0,
        "sampleInput": [{ "status": "pending" }],
        "sampleOutput": [{ "status": "shipped" }],
        "explanation": "Keeps only documents matching the predicate.",
        "purpose": "Filters the working set."
      }
    ]
  },
  "warnings": [],
  "errors": []
}
```

### Failure response — `200` with `success: false`

The backend should still return `200` and a well-formed `ExecutionResult` so the client
can render errors. `documents` is `[]`, `success` is `false`.

```json
{
  "success": false,
  "documents": [],
  "count": 0,
  "stats": { "executionTimeMs": 0, "aggregationTimeMs": 0, "responseSizeBytes": 0, "totalDocsProcessed": 0, "documentsScanned": 0, "stages": [] },
  "warnings": [],
  "errors": ["Pipeline uses unsupported operator $foo"],
  "rawError": "Unsupported operator: $foo"
}
```

### `warnings[].type` enum

The client narrows warning types to: `match-after-group`, `unnecessary-project`,
`missing-index`, `large-lookup`, `too-many-unwind`, `no-match-first`,
`wide-group-output`, `unbounded-lookup`. Any string type is tolerated by the client
(`coerceLiveResult` in `lib/backend/client.ts`), so use the enum when possible.

The client normalizes unknown/extra fields via `coerceLiveResult` — missing arrays
become `[]`, missing numbers become `0`, so a backend that returns the shape above
(tolerating `null`/absent fields) is safe.

### Execution semantics the client relies on

- Numbers may be floats; the validator compares with a `0.0001` tolerance.
- `_id` handling: validation ignores `_id` in the *actual* output when the expected
  output has no `_id` (all expected outputs were embedded without `_id`).
- Document order matters for most missions; the client sorts both sides before comparing
  unless the mission is flagged `expectExactOrder: false` (m01, m03, m10). The backend
  is not required to sort.

## Endpoint 2 — `GET /api/health`

```json
{
  "connected": true,
  "backend": {
    "up": true,
    "latencyMs": 1.2,
    "message": "Backend reachable"
  },
  "mongo": {
    "connected": true,
    "databaseName": "mongo_quest",
    "collectionsLoaded": 32
  }
}
```

Any HTTP error → the client reports `connected: false` (red pill in the top bar).

## Optional endpoints

Not required today; the client falls back to mock collection metadata in live mode.

- `GET /api/collections` → `Array<{ name, count, sizeBytes, fields, sample }>`
- `GET /api/collections/:name?skip=0&limit=25` → `{ collection, total, skip, limit, documents, fields }`

## Reference backend setup (Express + MongoDB)

1. `npm init -y && npm i express mongodb cors dotenv` in a new `server/` folder.
2. Create the database, then seed it by porting `shared/seed.mjs` (seed `20260803`).
3. Implement the two routes above. Use the MongoDB aggregation via
   `collection.aggregate(pipeline).toArray()`; wrap in `try/catch` and map errors to
   `{ success: false, errors: [...], rawError }`. Map each pipeline stage to a `StageStat`
   by running the partial pipeline up to each stage and counting input/output.
4. `app.listen(process.env.PORT || 4000)`.
5. In the frontend: `NEXT_PUBLIC_AGG_API_MODE=live`, `NEXT_PUBLIC_AGG_API_URL=http://localhost:4000`.
6. Sanity-check against the mock: run every mission's reference pipeline in
   `shared/reference.mjs` and confirm the live output matches the mock output, then confirm
   `expected-outputs.json` still validates each reference pipeline at score 100.

### Stage-to-StageStat mapping

For each stage `s_i` in the pipeline, run `aggregate([...s_0..s_i])`, record
`inputCount` = output of `s_{i-1}`, `outputCount` = result length, and
`explanation`/`purpose` from a static map keyed by stage name. `executionTimeMs` is the
per-stage runtime; `memoryBytes` is informational and may be `0`.
