import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProgressState, Verdict } from "@/lib/types";
import { MISSIONS, ACHIEVEMENTS } from "@/lib/challenges/data";
import { toDayKey, isYesterday, parseDayKey } from "@/lib/dates";

export interface SolveInput {
  missionId: string;
  attempts: number;
  durationMs: number;
  verdict: Verdict;
  score: number;
  xp: number;
}

interface ProgressStore {
  state: ProgressState;
  solve: (input: SolveInput) => { unlocked: string[]; levelUp: boolean; xpAfter: number };
  fail: (missionId: string) => void;
  trackOperators: (operators: string[]) => void;
  unlock: (id: string) => void;
  recordDaily: (challengeId: string) => void;
  reset: () => void;
}

function initialState(): ProgressState {
  return {
    startedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    completed: {},
    attempts: {},
    failedAttempts: {},
    fastestSolveMs: {},
    totalXp: 0,
    operatorUsage: {},
    achievements: {},
    daily: {},
    sessionHistory: [],
  };
}

function missionById(id: string) {
  return MISSIONS.find((m) => m.id === id);
}

export function checkAchievement(checkId: string, s: ProgressState): boolean {
  const completed = new Set(Object.keys(s.completed));
  const opCount = (op: string) =>
    MISSIONS.filter((m) => completed.has(m.id) && m.operators.includes(op)).length;

  switch (checkId) {
    case "completed-ge-1":
      return completed.size >= 1;
    case "used-match":
      return opCount("$match") >= 1;
    case "used-project-ge-5":
      return opCount("$project") >= 5;
    case "used-group-ge-5":
      return opCount("$group") >= 5;
    case "used-lookup-ge-3":
      return opCount("$lookup") >= 3;
    case "used-unwind-ge-2":
      return opCount("$unwind") >= 2;
    case "window-done":
      return completed.has("m24") && completed.has("m25");
    case "facet-done":
      return completed.has("m26");
    case "graph-done":
      return completed.has("m27");
    case "non-boss-done":
      return MISSIONS.filter((m) => m.id !== "m28").every((m) => completed.has(m.id));
    case "all-done":
      return MISSIONS.every((m) => completed.has(m.id));
    case "xp-1000":
      return s.totalXp >= 1000;
    case "streak-3":
      return computeStreak(s) >= 3;
    default:
      return false;
  }
}

export function evaluateAchievements(s: ProgressState): string[] {
  return ACHIEVEMENTS.filter(
    (a) => !s.achievements[a.id] && checkAchievement(a.checkId, s)
  ).map((a) => a.id);
}

export function computeStreak(s: ProgressState): number {
  const days = new Set(Object.keys(s.daily).filter((d) => s.daily[d].solved));
  let streak = 0;
  let day = toDayKey();
  if (!days.has(day)) {
    if (![...days].some((d) => isYesterday(d))) return 0;
    day = shiftDay(toDayKey(), -1);
  }
  while (days.has(day)) {
    streak += 1;
    day = shiftDay(day, -1);
  }
  return streak;
}

function shiftDay(key: string, delta: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + delta);
  return toDayKey(d);
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      state: initialState(),

      solve: ({ missionId, attempts, durationMs, verdict, score, xp }) => {
        const prev = get().state;
        const completedBefore = Boolean(prev.completed[missionId]);
        const now = new Date().toISOString();

        const next: ProgressState = {
          ...prev,
          lastActive: now,
          completed: {
            ...prev.completed,
            [missionId]: { at: now, passed: true, attempts, durationMs, verdict, score },
          },
          attempts: {
            ...prev.attempts,
            [missionId]: Math.max(attempts, prev.attempts[missionId] ?? 0),
          },
          fastestSolveMs: {
            ...prev.fastestSolveMs,
            [missionId]: Math.min(
              durationMs,
              prev.fastestSolveMs[missionId] ?? Number.MAX_SAFE_INTEGER
            ),
          },
          totalXp: prev.totalXp + (completedBefore ? 0 : xp),
          sessionHistory: [
            ...prev.sessionHistory,
            { at: now, label: missionById(missionId)?.title ?? missionId, xp: completedBefore ? 0 : xp },
          ],
        };

        const mission = missionById(missionId);
        if (mission) {
          for (const op of mission.operators) {
            next.operatorUsage[op] = (next.operatorUsage[op] ?? 0) + (completedBefore ? 0 : 1);
          }
        }

        const unlocked = evaluateAchievements(next);
        for (const id of unlocked) next.achievements[id] = now;

        set({ state: next });
        return { unlocked, levelUp: !completedBefore, xpAfter: next.totalXp };
      },

      fail: (missionId) => {
        const prev = get().state;
        set({
          state: {
            ...prev,
            lastActive: new Date().toISOString(),
            attempts: {
              ...prev.attempts,
              [missionId]: (prev.attempts[missionId] ?? 0) + 1,
            },
            failedAttempts: {
              ...prev.failedAttempts,
              [missionId]: (prev.failedAttempts[missionId] ?? 0) + 1,
            },
          },
        });
      },

      trackOperators: (operators) => {
        const prev = get().state;
        const usage = { ...prev.operatorUsage };
        for (const op of operators) usage[op] = (usage[op] ?? 0) + 1;
        set({ state: { ...prev, operatorUsage: usage } });
      },

      unlock: (id) => {
        const prev = get().state;
        if (prev.achievements[id]) return;
        set({
          state: {
            ...prev,
            achievements: { ...prev.achievements, [id]: new Date().toISOString() },
          },
        });
      },

      recordDaily: (challengeId) => {
        const prev = get().state;
        const today = toDayKey();
        set({
          state: {
            ...prev,
            daily: { ...prev.daily, [today]: { solved: true, challengeId } },
          },
        });
      },

      reset: () => set({ state: initialState() }),
    }),
    {
      name: "mongo-quest-progress-v1",
      partialize: (s) => ({ state: s.state }),
      skipHydration: true,
    }
  )
);

export function useCompletedIds() {
  return useProgress((s) => Object.keys(s.state.completed));
}
