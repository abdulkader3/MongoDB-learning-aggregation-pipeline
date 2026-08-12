"use client";

import { useMemo, useState } from "react";
import { Play, FlaskConical } from "lucide-react";
import { getCollections } from "@/lib/backend/client";
import { runSandboxPipeline } from "@/lib/runner";
import { useEditor, parsePipelineJson, stageNames } from "@/lib/stores/editor";
import { DEFAULT_PIPELINE_TEXT } from "@/lib/config";
import { MONGO_PIPELINE_LANGUAGE_ID, ensureMongoPipelineLanguage, validateMongoPipelineModel } from "@/lib/mongo/monaco";
import { logInfo, logRequest, logError } from "@/lib/stores/console";
import type { ExecutionResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PipelineVisualizer } from "@/components/learn/pipeline-visualizer";
import { DataTable } from "@/components/data-table";
import { JsonView } from "@/components/json-view";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function SandboxPage() {
  const collections = useMemo(() => getCollections(), []);
  const [collection, setCollection] = useState("orders");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const text = useEditor((s) => s.textFor("__sandbox__")) || DEFAULT_PIPELINE_TEXT;
  const setText = useEditor((s) => s.setText);
  const parsed = useMemo(() => parsePipelineJson(text), [text]);

  const run = async () => {
    if (!parsed.ok) {
      setError(parsed.error ?? "Invalid JSON");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    logInfo(`Sandbox: running against ${collection}`, { stages: stageNames(parsed.pipeline) });
    try {
      const { result: r, error: e } = await runSandboxPipeline(collection, text);
      if (e) {
        setError(e);
        logError("Sandbox run failed", e);
      } else {
        setResult(r);
        logRequest("POST", `/api/challenges/sandbox`, r!.success ? 200 : 400);
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex w-[420px] shrink-0 flex-col border-r border-border bg-card/30">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
          <FlaskConical className="h-4 w-4 text-info" />
          <span className="text-sm font-semibold">Sandbox</span>
        </div>
        <div className="shrink-0 space-y-2 border-b border-border p-3">
          <label className="text-xs font-medium text-muted-foreground">Collection</label>
          <Select value={collection} onValueChange={setCollection}>
            <SelectTrigger className="font-mono">
              <SelectValue placeholder="Select collection" />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.name} value={c.name} className="font-mono">
                  {c.name} · {c.count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Run any read-only pipeline against the embedded seed dataset. No validation, no XP — just explore.
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline</span>
            <div className="ml-auto flex items-center gap-1 overflow-x-auto">
              {parsed.ok && stageNames(parsed.pipeline).map((n, i) => (
                <Badge key={i} variant="secondary" className="font-mono whitespace-nowrap">{n}</Badge>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <MonacoEditor
              height="100%"
              language={MONGO_PIPELINE_LANGUAGE_ID}
              theme="vs-dark"
              value={text}
              onChange={(v) => setText("__sandbox__", v ?? "")}
              beforeMount={(monaco) => ensureMongoPipelineLanguage(monaco)}
              onMount={(editor, monaco) => {
                const model = editor.getModel();
                if (model) {
                  validateMongoPipelineModel(monaco, model);
                  const listener = model.onDidChangeContent(() =>
                    validateMongoPipelineModel(monaco, model)
                  );
                  editor.onDidDispose(() => listener.dispose());
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                tabSize: 2,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "var(--font-geist-mono), monospace",
                quickSuggestions: { other: true, comments: false, strings: true },
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Output · {collection}
          </span>
          {result && (
            <span className="text-xs text-muted-foreground">
              {result.count} docs · {result.stats.executionTimeMs.toFixed(1)}ms
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={run} disabled={running || !parsed.ok}>
              {running ? "Running…" : (<><Play className="text-primary-foreground" /> Run</>)}
            </Button>
          </div>
        </div>

        {error && (
          <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {!result && !error && (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            Pick a collection, write a pipeline, and run it to see results.
          </div>
        )}

        {result && (
          <Tabs defaultValue="docs" className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 px-3 pt-2">
              <TabsList className="h-8">
                <TabsTrigger value="docs" className="text-xs">Documents ({result.count})</TabsTrigger>
                <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
                <TabsTrigger value="visualize" className="text-xs">Visualize</TabsTrigger>
                <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="docs" className="mt-2 flex min-h-0 flex-1 flex-col px-3 pb-3">
              <div className="min-h-0 flex-1">
                <DataTable docs={result.documents} maxCols={9} maxRows={30} />
              </div>
            </TabsContent>
            <TabsContent value="json" className="mt-2 flex min-h-0 flex-1 flex-col px-3 pb-3">
              <ScrollArea className="min-h-0 flex-1">
                <JsonView value={result.documents} />
              </ScrollArea>
            </TabsContent>
            <TabsContent value="visualize" className="mt-0 flex min-h-0 flex-1 flex-col">
              <PipelineVisualizer
                pipeline={parsed.ok ? parsed.pipeline : []}
                stages={result.stats.stages}
                collection={collection}
              />
            </TabsContent>
            <TabsContent value="stats" className="mt-2 flex min-h-0 flex-1 flex-col px-3 pb-3">
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <p key={i} className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                      {w.message}
                    </p>
                  ))}
                  {result.errors.map((err, i) => (
                    <p key={i} className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {err}
                    </p>
                  ))}
                  {result.stats.stages.map((s, i) => (
                    <div key={i} className="rounded-md border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-info">{i + 1}. {s.stage}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.inputCount} → {s.outputCount} · {s.executionTimeMs.toFixed(1)}ms
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{s.explanation}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
