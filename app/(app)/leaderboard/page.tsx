"use client";

import { Trophy, Award, Zap, CheckCircle2, Timer, Target, Lock } from "lucide-react";
import { ACHIEVEMENTS, LEVELS, MISSION_MAP } from "@/lib/challenges/data";
import { useProgress, computeStreak } from "@/lib/stores/progress";
import { levelFromXp, DIFFICULTIES } from "@/lib/xp";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMs } from "@/lib/format";
import { cn } from "@/lib/utils";

const RANK_TITLES = [
  { min: 0, title: "Padawan Aggregator" },
  { min: 1000, title: "Pipeline Apprentice" },
  { min: 3000, title: "Stage Sorcerer" },
  { min: 6000, title: "Lookup Legend" },
  { min: 12000, title: "Aggregation Architect" },
  { min: 20000, title: "Master of the Pipeline" },
];

function rankTitle(xp: number) {
  let title = RANK_TITLES[0].title;
  for (const r of RANK_TITLES) if (xp >= r.min) title = r.title;
  return title;
}

export default function LeaderboardPage() {
  const state = useProgress((s) => s.state);
  const streak = computeStreak(state);
  const { level, remaining, next } = levelFromXp(state.totalXp);
  const solvedCount = Object.keys(state.completed).length;
  const achievements = Object.keys(state.achievements).length;
  const bestScore = Object.values(state.completed).reduce(
    (max, a) => Math.max(max, a.score),
    0
  );
  const fastest = Object.entries(state.fastestSolveMs).sort((a, b) => a[1] - b[1])[0];

  const personalBests = Object.entries(state.completed)
    .map(([id, a]) => ({
      id,
      mission: MISSION_MAP[id],
      attempt: a,
      fastestMs: state.fastestSolveMs[id],
    }))
    .filter((x) => x.mission)
    .sort((a, b) => b.attempt.score - a.attempt.score);

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{rankTitle(state.totalXp)}</h1>
            <p className="text-sm text-muted-foreground">
              Level {level} · {state.totalXp} XP · {streak} day streak
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Solved" value={`${solvedCount}/${Object.keys(MISSION_MAP).length}`} />
          <StatCard icon={<Zap className="h-4 w-4" />} label="Total XP" value={String(state.totalXp)} />
          <StatCard icon={<Award className="h-4 w-4" />} label="Achievements" value={`${achievements}/${ACHIEVEMENTS.length}`} />
          <StatCard icon={<Target className="h-4 w-4" />} label="Best score" value={`${bestScore}/100`} />
          <StatCard icon={<Timer className="h-4 w-4" />} label="Fastest" value={fastest ? formatMs(fastest[1]) : "—"} />
          <StatCard icon={<Zap className="h-4 w-4" />} label="Next level" value={`${remaining}/${next}`} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Level completion</h2>
            <div className="space-y-3">
              {LEVELS.map((lv) => {
                const ids = lv.chapters.flatMap((c) => c.missionIds);
                const done = ids.filter((id) => state.completed[id]).length;
                return (
                  <div key={lv.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{lv.title}</span>
                      <span className="text-muted-foreground">{done}/{ids.length}</span>
                    </div>
                    <Progress value={(done / ids.length) * 100} indicatorClassName="bg-info" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Achievements</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = Boolean(state.achievements[a.id]);
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs",
                      unlocked
                        ? "border-success/30 bg-success/10"
                        : "border-border bg-muted/40 opacity-60"
                    )}
                  >
                    <span className={cn("text-muted-foreground", unlocked && "text-success")}>
                      {unlocked ? <Award className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("truncate font-medium", unlocked ? "text-success" : "text-muted-foreground")}>
                        {a.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground/80">{a.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Mission personal bests</h2>
          {personalBests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Solve missions to fill your personal bests.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Mission</th>
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Difficulty</th>
                    <th className="py-2 pr-3 font-medium">Score</th>
                    <th className="py-2 font-medium">Fastest</th>
                  </tr>
                </thead>
                <tbody>
                  {personalBests.map(({ id, mission, attempt, fastestMs }) => (
                    <tr key={id} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-mono text-info">{id}</td>
                      <td className="max-w-[240px] truncate py-2 pr-3 text-foreground">{mission.title}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={DIFFICULTIES[mission.difficulty].color}>
                          {DIFFICULTIES[mission.difficulty].label}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 font-medium text-success">{attempt.score}/100</td>
                      <td className="py-2 text-muted-foreground">{formatMs(fastestMs ?? attempt.durationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      <p className="mt-1.5 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
