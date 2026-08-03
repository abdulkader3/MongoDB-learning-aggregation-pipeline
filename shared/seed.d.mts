export interface SeedMeta {
  seed: number;
  generatedAt: string;
  collectionCount: number;
  totalDocuments: number;
}

export interface SeedResult {
  collections: Record<string, Record<string, unknown>[]>;
  counts: Record<string, number>;
  meta: SeedMeta;
}

export function generateSeed(seed?: number): SeedResult;
export const COLLECTION_ORDER: readonly string[];
