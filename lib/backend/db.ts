import { generateSeed, COLLECTION_ORDER } from "@/shared/seed.mjs";
import type { CollectionInfo, CollectionPage, ServerContext } from "@/lib/types";
import { SEED } from "@/lib/config";

type Db = Record<string, Record<string, unknown>[]>;

let cached: Db | null = null;

function db(): Db {
  if (!cached) {
    cached = generateSeed(SEED).collections;
  }
  return cached;
}

function fieldNames(doc: Record<string, unknown>): string[] {
  const out = new Set<string>();
  const walk = (d: Record<string, unknown>, prefix = "") => {
    for (const [k, v] of Object.entries(d)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out.add(path);
        walk(v as Record<string, unknown>, path);
      } else {
        out.add(path);
      }
    }
  };
  walk(doc);
  return [...out];
}

export function getServerContext(): ServerContext {
  const d = db();
  const collections: CollectionInfo[] = COLLECTION_ORDER.filter((n) => d[n]).map(
    (name) => {
      const docs = d[name];
      const fields = new Set<string>();
      for (const doc of docs.slice(0, 40)) {
        for (const f of fieldNames(doc)) fields.add(f);
      }
      return {
        name,
        count: docs.length,
        sizeBytes: JSON.stringify(docs.slice(0, 20)).length,
        fields: [...fields],
        sample: docs.slice(0, 3),
      };
    }
  );
  return { databaseName: "mongo_quest", collections };
}

export function getCollectionInfos(): CollectionInfo[] {
  return getServerContext().collections;
}

export function getCollectionInfo(name: string): CollectionInfo | undefined {
  return getCollectionInfos().find((c) => c.name === name);
}

export function getCollectionPage(
  name: string,
  skip = 0,
  limit = 25
): CollectionPage {
  const d = db();
  const docs = d[name] ?? [];
  const fields = new Set<string>();
  for (const doc of docs.slice(0, 40)) {
    for (const f of fieldNames(doc)) fields.add(f);
  }
  return {
    collection: name,
    total: docs.length,
    skip: Math.max(0, skip),
    limit: Math.min(100, Math.max(1, limit)),
    documents: docs.slice(skip, skip + limit),
    fields: [...fields],
  };
}

export function getMockDb(): Db {
  return db();
}

export function getCollectionNames(): string[] {
  return COLLECTION_ORDER.filter((n) => db()[n]);
}
