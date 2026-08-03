"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Play, Braces, AlertCircle, Eye, ListChecks } from "lucide-react";
import { useEditor, parsePipelineJson, stageNames } from "@/lib/stores/editor";
import { DEFAULT_PIPELINE_TEXT } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Mission } from "@/lib/types";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export function PipelineEditor({
  mission,
  running,
  onRun,
  solved,
  storageKey,
}: {
  mission: Mission;
  running: boolean;
  onRun: (text: string) => void;
  solved: boolean;
  storageKey?: string;
}) {
  const key = storageKey ?? mission.id;
  const text = useEditor((s) => s.textFor(key)) || DEFAULT_PIPELINE_TEXT;
  const setText = useEditor((s) => s.setText);

  const parsed = useMemo(() => parsePipelineJson(text), [text]);
  const names = parsed.ok ? stageNames(parsed.pipeline) : [];

  const format = useCallback(() => {
    if (!parsed.ok) return;
    setText(key, JSON.stringify(parsed.pipeline, null, 2));
  }, [parsed, key, setText]);

  const showReference = () => {
    if (!mission.referencePipeline) return;
    setText(key, JSON.stringify(mission.referencePipeline, null, 2));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <Braces className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline
        </span>
        <div className="ml-2 flex items-center gap-1 overflow-x-auto">
          {names.map((n, i) => (
            <Badge key={i} variant="secondary" className="font-mono whitespace-nowrap">
              {i + 1}. {n}
            </Badge>
          ))}
        </div>
        {!parsed.ok && (
          <span className="ml-2 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> Invalid JSON
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {solved && mission.referencePipeline && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={showReference}>
                  <Eye /> Reference
                </Button>
              </TooltipTrigger>
              <TooltipContent>Load the reference solution (revealed after solving).</TooltipContent>
            </Tooltip>
          )}
          <Button size="sm" variant="ghost" onClick={format}>
            <ListChecks /> Format
          </Button>
          <Button
            size="sm"
            onClick={() => onRun(text)}
            disabled={running || !parsed.ok}
          >
            {running ? "Running…" : (
              <>
                <Play className="text-primary-foreground" /> Run
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <MonacoEditor
          height="100%"
          language="json"
          theme="vs-dark"
          value={text}
          onChange={(v) => setText(key, v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            tabSize: 2,
            fontFamily: "var(--font-geist-mono), monospace",
            scrollBeyondLastLine: false,
            padding: { top: 10 },
            renderLineHighlight: "gutter",
            roundedSelection: false,
            automaticLayout: true,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}
