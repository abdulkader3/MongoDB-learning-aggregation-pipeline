import type { Difficulty } from "@/lib/types";

export const XP = {
  easy: 100,
  medium: 300,
  hard: 600,
  expert: 1200,
  boss: 3000,
} as const;

export interface DifficultyMeta {
  key: Difficulty;
  label: string;
  xp: number;
  color: string;
  dot: string;
  glow: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyMeta> = {
  easy: {
    key: "easy",
    label: "Easy",
    xp: XP.easy,
    color: "text-difficulty-easy",
    dot: "bg-difficulty-easy",
    glow: "shadow-[0_0_12px_-2px_rgba(0,237,100,0.6)]",
  },
  medium: {
    key: "medium",
    label: "Medium",
    xp: XP.medium,
    color: "text-difficulty-medium",
    dot: "bg-difficulty-medium",
    glow: "shadow-[0_0_12px_-2px_rgba(95,178,255,0.6)]",
  },
  hard: {
    key: "hard",
    label: "Hard",
    xp: XP.hard,
    color: "text-difficulty-hard",
    dot: "bg-difficulty-hard",
    glow: "shadow-[0_0_12px_-2px_rgba(255,159,67,0.6)]",
  },
  expert: {
    key: "expert",
    label: "Expert",
    xp: XP.expert,
    color: "text-difficulty-expert",
    dot: "bg-difficulty-expert",
    glow: "shadow-[0_0_12px_-2px_rgba(192,132,252,0.6)]",
  },
  boss: {
    key: "boss",
    label: "Boss",
    xp: XP.boss,
    color: "text-difficulty-boss",
    dot: "bg-difficulty-boss",
    glow: "shadow-[0_0_16px_-2px_rgba(255,92,92,0.7)]",
  },
};

/** Level curve: each level needs `level * 250` XP. */
export function xpForLevel(level: number) {
  return level * 250;
}

export function levelFromXp(xp: number) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, levelStart: xp - remaining, remaining, next: xpForLevel(level) };
}

export function xpForDifficulty(difficulty: Difficulty) {
  return XP[difficulty];
}
