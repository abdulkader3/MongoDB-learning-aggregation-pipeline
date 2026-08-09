"use client";

import { Database } from "lucide-react";

export function AppShellLoading() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-3">
        <span className="flex items-center gap-2 pr-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Database className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Mongo Quest</span>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading your progress…
      </div>
    </div>
  );
}
