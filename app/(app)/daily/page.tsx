"use client";

import { useMemo } from "react";
import { CalendarDays, Flame } from "lucide-react";
import { DAILY_POOL, MISSION_MAP } from "@/lib/challenges/data";
import { toDayKey, last14Days } from "@/lib/dates";
import { useProgress, computeStreak } from "@/lib/stores/progress";
import { useMissionRun } from "@/lib/use-mission-run";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { MissionBrief } from "@/components/learn/mission-brief";
import { PipelineEditor } from "@/components/learn/pipeline-editor";
import { ResultPanel } from "@/components/learn/result-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function DailyPage() {
  const today = toDayKey();
  const missionId = useMemo(() => {
    let h = 7;
    for (let i = 0; i < today.length; i += 1) h = (h * 31 + today.charCodeAt(i)) % 100_000;
    return DAILY_POOL[h % DAILY_POOL.length];
  }, [today]);

  const mission = MISSION_MAP[missionId];
  const state = useProgress((s) => s.state);
  const streak = computeStreak(state);
  const solvedToday = Boolean(state.daily[today]?.solved);
  const { running, outcome, run } = useMissionRun(missionId);
  const heat = last14Days(today).map((d) => ({
    ...d,
    active: Boolean(state.daily[d.key]?.solved),
  }));

  if (!mission) return null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex w-[340px] shrink-0 flex-col border-r border-border bg-card/30">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
          <CalendarDays className="h-4 w-4 text-info" />
          <span className="text-sm font-semibold">Daily Challenge</span>
        </div>
        <div className="space-y-4 p-4">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Today&apos;s mission</p>
            <p className="mt-1 text-sm font-semibold">{mission.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <DifficultyBadge difficulty={mission.difficulty} />
              <span className="text-xs text-muted-foreground">+{mission.xp} XP</span>
            </div>
            {solvedToday ? (
              <p className="mt-2 text-xs text-success">Solved today — see you tomorrow!</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Complete today&apos;s mission before midnight to keep your streak alive.
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-warning" /> Streak
              </span>
              <span className={cn("font-semibold", streak > 0 ? "text-warning" : "")}>{streak} day{streak === 1 ? "" : "s"}</span>
            </div>
            <div className="flex gap-1">
              {heat.map((d) => (
                <div key={d.key} className="flex-1">
                  <div
                    className={cn(
                      "h-7 rounded-sm border",
                      d.active ? "border-success/50 bg-success/30" : "border-border bg-muted/40"
                    )}
                    title={`${d.key}${d.active ? " · solved" : ""}`}
                  />
                  <p className="mt-0.5 text-center text-[9px] uppercase text-muted-foreground/70">{d.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">All-time solves</p>
            <Progress
              value={(Object.keys(state.daily).filter((k) => state.daily[k].solved).length / 30) * 100}
              indicatorClassName="bg-warning"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {Object.keys(state.daily).filter((k) => state.daily[k].solved).length} solved in the last 30 days
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {mission.id} · {mission.title}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <DifficultyBadge difficulty={mission.difficulty} xp />
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_minmax(340px,1fr)]">
          <div className="min-h-0 border-r border-border bg-card/30">
            <MissionBrief mission={mission} />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col">
            <Tabs defaultValue="pipeline" className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-border px-3 py-1.5">
                <TabsList className="h-8">
                  <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="pipeline" className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col">
                <PipelineEditor
                  mission={mission}
                  running={running}
                  solved={solvedToday}
                  storageKey={`daily-${today}-${missionId}`}
                  onRun={(t) => {
                    run(t).then((res) => {
                      if (res?.ok) {
                        useProgress.getState().recordDaily(missionId);
                      }
                    });
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
          <div className="min-h-0 min-w-0 border-l border-border bg-card/20">
            <ResultPanel result={outcome?.result ?? null} validation={outcome?.validation ?? null} />
          </div>
        </div>
      </div>
    </div>
  );
}
