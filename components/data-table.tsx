"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  if (typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function collectKeys(docs: Record<string, unknown>[], maxCols = 8): string[] {
  const out: string[] = [];
  for (const doc of docs) {
    for (const k of Object.keys(doc)) {
      if (!out.includes(k)) out.push(k);
      if (out.length >= maxCols) return out;
    }
    if (out.length >= maxCols) break;
  }
  return out;
}

export function DataTable({
  docs,
  maxCols = 8,
  maxRows = 12,
  className,
}: {
  docs: Record<string, unknown>[];
  maxCols?: number;
  maxRows?: number;
  className?: string;
}) {
  const columns = useMemo(() => collectKeys(docs.slice(0, 30), maxCols), [docs, maxCols]);
  const rows = docs.slice(0, maxRows);

  if (docs.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No documents to display.</div>;
  }

  return (
    <ScrollArea className={cn("h-full w-full", className)}>
      <div className="min-w-max">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-secondary/60">
              <th className="px-3 py-2 font-medium text-muted-foreground">#</th>
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 font-mono font-medium text-accent-foreground/80">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((doc, i) => (
              <tr key={i} className={cn("border-b border-border/60", i % 2 === 1 && "bg-muted/30")}>
                <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                {columns.map((c) => {
                  const v = doc[c];
                  const text = cellText(v);
                  const isNested = v && typeof v === "object";
                  return (
                    <td
                      key={c}
                      className={cn(
                        "max-w-[240px] truncate px-3 py-1.5 font-mono",
                        isNested ? "text-info/80" : text === "" ? "text-muted-foreground/40" : "text-foreground"
                      )}
                      title={text}
                    >
                      {isNested ? JSON.stringify(v) : text || "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {docs.length > maxRows && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Showing {maxRows} of {docs.length} documents
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
