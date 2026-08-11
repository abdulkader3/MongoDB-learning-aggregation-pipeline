"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Lock,
  CheckCircle2,
  Circle,
  Database,
  TrendingUp,
  Sparkles,
  Trophy,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { LEVELS, MISSIONS, MISSION_MAP } from "@/lib/challenges/data";
import { useProgress } from "@/lib/stores/progress";
import { useUi } from "@/lib/stores/ui";
import { DIFFICULTIES } from "@/lib/xp";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const LEVEL_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  l1: Database,
  l2: TrendingUp,
  l3: Sparkles,
  l4: Trophy,
};

function orderedMissionIds(): string[] {
  return LEVELS.flatMap((l) => l.chapters.flatMap((c) => c.missionIds));
}

export function Sidebar({ activeId }: { activeId?: string | null }) {
  const router = useRouter();
  const completed = useProgress((s) => s.state.completed);
  const collapsed = useUi((s) => s.missionSidebarCollapsed);
  const toggleCollapse = useUi((s) => s.toggleMissionSidebar);
  const [openLevels, setOpenLevels] = useState<Record<string, boolean>>({
    l1: true,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.code === "KeyX") {
        const target = e.target as HTMLElement | null;
        const editable =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          Boolean(target?.isContentEditable);
        if (editable) return;
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapse]);

  const ordered = orderedMissionIds();
  const unlockedIndex = ordered.findIndex((id) => !completed[id]);
  const unlockedUntil = unlockedIndex === -1 ? ordered.length : unlockedIndex;

  const isUnlocked = (id: string) => {
    const idx = ordered.indexOf(id);
    return idx <= unlockedUntil;
  };

  const toggleLevel = (id: string) =>
    setOpenLevels((s) => ({ ...s, [id]: !s[id] }));

  const totalXp = MISSIONS.reduce((sum, m) => sum + m.xp, 0);
  const earnedXp = Object.keys(completed).reduce(
    (sum, id) => sum + (MISSION_MAP[id]?.xp ?? 0),
    0
  );

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-stretch border-r border-border bg-card/40">
        <button
          onClick={toggleCollapse}
          title="Expand missions sidebar (Shift+X)"
          aria-label="Expand missions sidebar"
          className="flex h-9 w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center gap-1 py-2">
            {ordered.map((id, i) => {
              const num = i + 1;
              const mission = MISSION_MAP[id];
              const done = Boolean(completed[id]);
              const locked = !isUnlocked(id);
              const active = activeId === id;
              return (
                <button
                  key={id}
                  disabled={locked}
                  onClick={() => router.push(`/learn?m=${id}`)}
                  title={`${num}. ${mission.title}`}
                  aria-label={`${num}. ${mission.title}`}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] transition-colors",
                    active
                      ? "bg-primary font-semibold text-primary-foreground shadow-[0_0_12px_-2px_rgba(0,237,100,0.6)]"
                      : done
                        ? "text-success"
                        : locked
                          ? "cursor-not-allowed text-muted-foreground/40"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="flex h-12 items-center gap-2 border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Missions
        </span>
        <button
          onClick={toggleCollapse}
          title="Collapse missions sidebar (Shift+X)"
          aria-label="Collapse missions sidebar"
          className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {Object.keys(completed).length}/{MISSIONS.length} · {earnedXp}/{totalXp} XP
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {LEVELS.map((level) => {
            const Icon = LEVEL_ICONS[level.id] ?? Database;
            const open = openLevels[level.id] ?? false;
            const allDone = level.chapters.every((c) => c.missionIds.every((m) => completed[m]));
            const someDone = level.chapters.some((c) => c.missionIds.some((m) => completed[m]));
            return (
              <div key={level.id} className="mb-1">
                <button
                  onClick={() => toggleLevel(level.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                >
                  <ChevronRight
                    className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
                  />
                  <Icon className="h-4 w-4 shrink-0" style={{ color: level.color }} />
                  <span className="flex-1 truncate text-sm font-medium">{level.title}</span>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      allDone ? "bg-success" : someDone ? "bg-info" : "bg-muted-foreground/40"
                    )}
                  />
                </button>

                {open &&
                  level.chapters.map((chapter) => (
                    <div key={chapter.id} className="ml-2 mt-1 border-l border-border pl-2">
                      <p className="px-1.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                        {chapter.title}
                      </p>
                      {chapter.missionIds.map((id) => {
                        const mission = MISSION_MAP[id];
                        const done = Boolean(completed[id]);
                        const unlocked = isUnlocked(id);
                        const active = activeId === id;
                        const diff = DIFFICULTIES[mission.difficulty];
                        return (
                          <button
                            key={id}
                            disabled={!unlocked}
                            onClick={() => router.push(`/learn?m=${id}`)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                              active ? "bg-secondary" : "hover:bg-accent",
                              !unlocked && "cursor-not-allowed opacity-40"
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                            ) : unlocked ? (
                              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                            )}
                            <span className={cn("flex-1 truncate", done && "text-muted-foreground")}>
                              {mission.title}
                            </span>
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", diff.dot)} />
                          </button>
                        );
                      })}
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
