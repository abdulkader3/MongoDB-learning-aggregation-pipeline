"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, BookOpen, FlaskConical, CalendarDays, Trophy, RotateCcw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHealth } from "@/lib/use-health";
import { HealthIndicator } from "@/components/health-indicator";
import { useProgress } from "@/lib/stores/progress";
import { SettingsDialog } from "@/components/shell/settings-dialog";
import { levelFromXp } from "@/lib/xp";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV = [
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/encyclopedia", label: "Encyclopedia", icon: Database },
  { href: "/sandbox", label: "Sandbox", icon: FlaskConical },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function TopNav() {
  const pathname = usePathname();
  const { health } = useHealth();
  const state = useProgress((s) => s.state);
  const reset = useProgress((s) => s.reset);
  const { level, remaining, next } = levelFromXp(state.totalXp);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-3">
      <Link href="/learn" className="flex items-center gap-2 pr-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Database className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Mongo Quest</span>
      </Link>

      <nav className="flex items-center gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/learn" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs">
              <span className="font-medium text-foreground">Lv {level}</span>
              <span className="h-1 w-14 overflow-hidden rounded-full bg-secondary">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (remaining / next) * 100)}%` }}
                />
              </span>
              <span className="text-muted-foreground">
                {remaining}/{next} XP
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{state.totalXp} total XP</TooltipContent>
        </Tooltip>

        <HealthIndicator health={health} />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                if (confirm("Reset all progress? This cannot be undone.")) reset();
              }}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Reset progress"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Reset progress</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
