"use client";

import { ChevronLeft, ChevronRight, Play, RotateCcw, CircleCheck } from "lucide-react";
import type { Mission } from "@/lib/types";
import { useProgress } from "@/lib/stores/progress";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { MissionAudioButton } from "@/components/learn/mission-audio-button";
import { cn } from "@/lib/utils";

export function MissionHeader({
  mission,
  running,
  onRun,
  onReset,
  hasRun,
  prevId,
  nextId,
  onNav,
}: {
  mission: Mission;
  running: boolean;
  onRun: () => void;
  onReset: () => void;
  hasRun: boolean;
  prevId?: string;
  nextId?: string;
  onNav?: (id: string) => void;
}) {
  const completed = useProgress((s) => Boolean(s.state.completed[mission.id]));
  const solvedBefore = useProgress((s) => s.state.completed[mission.id] ?? null);

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">
            {mission.title}
          </span>
          {completed && (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <CircleCheck className="h-3.5 w-3.5" />
              Solved{hasRun ? "" : solvedBefore ? ` · ${solvedBefore.score}/100` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{mission.id}</span>
          <span>·</span>
          <span>{mission.estimatedMinutes}m</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {mission.audio && <MissionAudioButton src={mission.audio} />}
        <DifficultyBadge difficulty={mission.difficulty} xp />
        <div className="flex items-center gap-0.5">
          <Button size="icon-sm" variant="ghost" disabled={!prevId || !onNav} onClick={() => prevId && onNav?.(prevId)} title="Previous mission (Shift+.)">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" disabled={!nextId || !onNav} onClick={() => nextId && onNav?.(nextId)} title="Next mission (Shift+/)">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onReset}
          disabled={!hasRun && !completed}
          aria-label="Reset run"
        >
          <RotateCcw />
          Reset
        </Button>
        <Button
          size="sm"
          onClick={onRun}
          disabled={running}
          className={cn(completed && hasRun && "bg-success/15 text-success border border-success/30 hover:bg-success/25")}
        >
          {running ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Running…
            </span>
          ) : (
            <>
              <Play className={cn(!completed && "text-primary-foreground")} />
              Run Pipeline
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
