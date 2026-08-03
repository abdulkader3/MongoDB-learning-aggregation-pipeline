"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, ChevronDown, ChevronUp, Trash2, Play } from "lucide-react";
import { useConsole } from "@/lib/stores/console";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";

const LEVEL_STYLE: Record<string, string> = {
  info: "text-info",
  success: "text-success",
  warn: "text-warning",
  error: "text-destructive",
  log: "text-muted-foreground",
  req: "text-accent-foreground",
};

const LEVEL_TAG: Record<string, string> = {
  info: "INFO",
  success: "OK",
  warn: "WARN",
  error: "ERR",
  log: "LOG",
  req: "REQ",
};

export function ConsolePanel() {
  const entries = useConsole((s) => s.entries);
  const clear = useConsole((s) => s.clear);
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, open]);

  return (
    <div className="flex h-40 shrink-0 flex-col border-t border-border bg-card/50">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          <Terminal className="h-3.5 w-3.5" />
          Console
        </button>
        <span className="text-[11px] text-muted-foreground/70">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={clear}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Clear console"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-1 font-mono text-xs">
          {entries.length === 0 ? (
            <p className="py-2 text-muted-foreground/60">
              No activity yet. Run a pipeline to see the request/response log.
            </p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="flex gap-2 border-b border-border/40 py-1">
                <span className="shrink-0 text-muted-foreground/60">{formatTime(new Date(e.at).getTime())}</span>
                <span
                  className={cn(
                    "w-10 shrink-0 font-semibold",
                    LEVEL_STYLE[e.level]
                  )}
                >
                  {LEVEL_TAG[e.level] ?? e.level}
                </span>
                {e.level === "req" && e.method ? (
                  <span className="flex items-center gap-2">
                    <span className="text-info">{e.method}</span>
                    <span className="text-muted-foreground">{e.url}</span>
                    <span
                      className={cn(
                        "rounded px-1",
                        e.status && e.status < 400 ? "text-success" : "text-destructive"
                      )}
                    >
                      {e.status}
                    </span>
                    {e.durationMs != null ? <span className="text-muted-foreground/70">{Math.round(e.durationMs)}ms</span> : null}
                  </span>
                ) : (
                  <span className={LEVEL_STYLE[e.level]}>{e.message}</span>
                )}
                {e.level !== "req" && e.detail != null ? (
                  <span className="flex items-center gap-1 text-muted-foreground/80">
                    <Play className="h-3 w-3" />
                    {typeof e.detail === "string" ? e.detail : JSON.stringify(e.detail).slice(0, 220)}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
