"use client";

import { Activity, Server, Database } from "lucide-react";
import type { HealthStatus } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function HealthIndicator({ health }: { health: HealthStatus | null }) {
  if (!health) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
        Checking…
      </span>
    );
  }

  const ok = health.connected;
  const mode = health.mode === "mock" ? "Mock Engine" : "Live API";
  const dot = ok ? "bg-success" : "bg-destructive";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs",
            ok ? "border-success/30 text-success" : "border-destructive/30 text-destructive"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
          {mode}
        </span>
      </TooltipTrigger>
      <TooltipContent className="w-64">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Activity className="h-3.5 w-3.5" /> Backend
            </span>
            <span className={ok ? "text-success" : "text-destructive"}>
              {health.backend.up ? "up" : "down"} · {health.backend.latencyMs}ms
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Server className="h-3.5 w-3.5" /> Engine
            </span>
            <span>{health.mode === "mock" ? "in-browser" : "remote"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Database className="h-3.5 w-3.5" /> Database
            </span>
            <span>
              {health.mongo.connected
                ? `${health.mongo.databaseName} · ${health.mongo.collectionsLoaded} collections`
                : "not connected"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">{health.backend.message}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
