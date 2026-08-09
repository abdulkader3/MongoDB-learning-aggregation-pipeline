"use client";

import { CircleCheck, CircleX, AlertTriangle, Gauge, Timer, ScanSearch, Database } from "lucide-react";
import type { ExecutionResult, ValidationReport } from "@/lib/types";
import { DataTable } from "@/components/data-table";
import { JsonView } from "@/components/json-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePreferences, type ResultDocumentType } from "@/lib/stores/preferences";
import { formatMs, formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

function VerdictBanner({ validation }: { validation: ValidationReport }) {
  const ok = validation.passed;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3",
        ok ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10"
      )}
    >
      {ok ? (
        <CircleCheck className="h-5 w-5 shrink-0 text-success" />
      ) : (
        <CircleX className="h-5 w-5 shrink-0 text-destructive" />
      )}
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", ok ? "text-success" : "text-destructive")}>
          {validation.message}
        </p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            Score <b className={ok ? "text-success" : "text-destructive"}>{validation.score}/100</b>
          </span>
          {validation.checks
            .filter((c) => !c.passed)
            .map((c) => (
              <span key={c.label} className="text-muted-foreground">
                · {c.label}: {c.detail}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-mono text-sm">{value}</p>
      </div>
    </div>
  );
}

export function ResultPanel({
  result,
  validation,
}: {
  result: ExecutionResult | null;
  validation: ValidationReport | null;
}) {
  const docType = usePreferences((s) => s.preferences.resultDocumentType);
  const setDocType = usePreferences((s) => s.setResultDocumentType);

  if (!result || !validation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <Database className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Run the pipeline to see results.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-border p-3">
        <VerdictBanner validation={validation} />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Stat icon={<Timer className="h-3.5 w-3.5" />} label="Execution" value={formatMs(result.stats.executionTimeMs)} />
          <Stat icon={<ScanSearch className="h-3.5 w-3.5" />} label="Docs scanned" value={String(result.stats.documentsScanned)} />
          <Stat icon={<Database className="h-3.5 w-3.5" />} label="Docs returned" value={String(result.count)} />
          <Stat icon={<Gauge className="h-3.5 w-3.5" />} label="Response" value={formatBytes(result.stats.responseSizeBytes)} />
        </div>
        {result.warnings.length > 0 && (
          <div className="space-y-1">
            {result.warnings.map((w, i) => (
              <p key={i} className="flex items-start gap-2 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {w.message}
              </p>
            ))}
          </div>
        )}
        {result.errors.length > 0 && (
          <div className="space-y-1">
            {result.errors.map((err, i) => (
              <p key={i} className="flex items-start gap-2 text-xs text-destructive">
                <CircleX className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}
      </div>

      <Tabs
        value={docType}
        onValueChange={(v) => setDocType(v as ResultDocumentType)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 px-3 pt-2">
          <TabsList className="h-8">
            <TabsTrigger value="docs" className="text-xs">Documents ({result.count})</TabsTrigger>
            <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
            <TabsTrigger value="stages" className="text-xs">Stages</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="docs" className="flex min-h-0 flex-1 flex-col mt-2">
          <div className="min-h-0 flex-1 px-3 pb-3">
            <DataTable docs={result.documents} maxCols={8} maxRows={20} />
          </div>
        </TabsContent>
        <TabsContent value="json" className="flex min-h-0 flex-1 flex-col mt-2">
          <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
            <JsonView value={result.documents} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="stages" className="flex min-h-0 flex-1 flex-col mt-2">
          <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
            <div className="space-y-2">
              {result.stats.stages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stage statistics available.</p>
              ) : (
                result.stats.stages.map((s, i) => (
                  <div key={i} className="rounded-md border border-border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold text-info">
                        {i + 1}. {s.stage}
                      </span>
                      <Badge variant="muted" className="font-mono">
                        {formatMs(s.executionTimeMs)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.explanation}</p>
                    <div className="mt-1 text-xs text-muted-foreground">
                      input {s.inputCount} → output {s.outputCount} ·{" "}
                      {s.memoryBytes ? formatBytes(s.memoryBytes) : "no memory"}
                    </div>
                    {s.purpose && <p className="mt-1 text-[11px] text-muted-foreground/70">Purpose: {s.purpose}</p>}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
