"use client";

import { Award, TrendingUp } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/challenges/data";
import { useProgress } from "@/lib/stores/progress";
import { levelFromXp } from "@/lib/xp";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";

export function RightPanel() {
  const state = useProgress((s) => s.state);
  const { level, remaining, next } = levelFromXp(state.totalXp);
  const recent = [...state.sessionHistory].slice(-8).reverse();
  const usage = Object.entries(state.operatorUsage).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-card/40">
      <ScrollArea className="flex-1">
        <div className="space-y-5 p-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Progress
              </span>
              <span className="text-xs font-medium text-primary">Lv {level}</span>
            </div>
            <Progress value={(remaining / next) * 100} />
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{remaining} XP to next level</span>
              <span>{state.totalXp} total</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Award className="h-3.5 w-3.5" /> Achievements
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = Boolean(state.achievements[a.id]);
                return (
                  <div
                    key={a.id}
                    title={a.description}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs",
                      unlocked
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-border bg-muted/40 text-muted-foreground/60"
                    )}
                  >
                    <span className="text-sm">{unlocked ? "✓" : "○"}</span>
                    <span className="truncate">{a.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Activity
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">Solve your first mission to start a streak.</p>
            ) : (
              <div className="space-y-1.5">
                {recent.map((e, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{e.label}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {e.xp > 0 && <span className="font-medium text-primary">+{e.xp}</span>}
                      <span className="text-muted-foreground/60">{formatRelative(e.at)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {usage.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Operator mastery
              </div>
              <div className="space-y-1.5">
                {usage.map(([op, count]) => (
                  <div key={op} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 font-mono text-muted-foreground">{op}</span>
                    <Progress value={Math.min(100, count * 20)} indicatorClassName="bg-info" className="h-1.5" />
                    <span className="w-4 text-right text-muted-foreground/70">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
