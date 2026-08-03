import expectedJson from "./expected-outputs.json";

export interface ExpectedBundle {
  generatedAt: string;
  seed: number;
  expected: Record<string, Record<string, unknown>[]>;
}

export const EXPECTED: ExpectedBundle = expectedJson as unknown as ExpectedBundle;

export function getExpectedDocs(missionId: string): Record<string, unknown>[] | undefined {
  return EXPECTED.expected[missionId];
}

export function getExpectedCount(missionId: string): number | undefined {
  return EXPECTED.expected[missionId]?.length;
}

export function hasExpected(missionId: string): boolean {
  return Boolean(EXPECTED.expected[missionId]);
}
