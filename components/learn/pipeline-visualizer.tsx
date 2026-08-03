"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { StageStat } from "@/lib/types";
import { formatMs } from "@/lib/format";
import { cn } from "@/lib/utils";

const STAGE_COLOR: Record<string, string> = {
  $match: "text-info border-info/40",
  $project: "text-success border-success/40",
  $addFields: "text-success border-success/40",
  $group: "text-warning border-warning/40",
  $sort: "text-accent-foreground border-border",
  $limit: "text-muted-foreground border-border",
  $skip: "text-muted-foreground border-border",
  $count: "text-info border-info/40",
  $unwind: "text-difficulty-medium border-difficulty-medium/40",
  $lookup: "text-difficulty-hard border-difficulty-hard/40",
  $facet: "text-difficulty-expert border-difficulty-expert/40",
  $setWindowFields: "text-difficulty-expert border-difficulty-expert/40",
  $graphLookup: "text-difficulty-expert border-difficulty-expert/40",
};

function StageNode({ data }: { data: { label: string; input?: number; output?: number; time?: number } }) {
  const color = STAGE_COLOR[data.label] ?? "text-foreground border-border";
  return (
    <div
      className={cn(
        "w-40 rounded-md border bg-card px-2.5 py-2 shadow-sm",
        color.split(" ")[1]
      )}
    >
      <Handle type="target" position={Position.Left} className="!border-border" />
      <div className={cn("font-mono text-xs font-semibold", color.split(" ")[0])}>
        {data.label}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {data.input ?? "?"} → {data.output ?? "?"}
        </span>
        {data.time != null ? <span>{formatMs(data.time)}</span> : null}
      </div>
      <Handle type="source" position={Position.Right} className="!border-border" />
    </div>
  );
}

function CollectionNode({ data }: { data: { label: string; count?: number } }) {
  return (
    <div className="w-36 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-2 shadow-sm">
      <Handle type="source" position={Position.Right} className="!border-primary" />
      <div className="font-mono text-xs font-semibold text-primary">db.{data.label}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {data.count != null ? `${data.count} docs` : "source"}
      </div>
    </div>
  );
}

function OutputNode({ data }: { data: { count?: number } }) {
  return (
    <div className="w-36 rounded-md border border-success/40 bg-success/10 px-2.5 py-2 shadow-sm">
      <Handle type="target" position={Position.Left} className="!border-success" />
      <div className="font-mono text-xs font-semibold text-success">result</div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {data.count != null ? `${data.count} docs` : "output"}
      </div>
    </div>
  );
}

export function PipelineVisualizer({
  pipeline,
  stages,
  sourceCount,
  collection,
}: {
  pipeline: Record<string, unknown>[];
  stages?: StageStat[];
  sourceCount?: number;
  collection?: string;
}) {
  const { nodes, edges } = useMemo(() => {
    const n: Node[] = [];
    const e: Edge[] = [];
    const W = 200;

    n.push({
      id: "src",
      type: "collection",
      position: { x: 20, y: 40 },
      data: { label: collection ?? "?", count: sourceCount },
    });

    pipeline.forEach((stage, i) => {
      const name = Object.keys(stage)[0] ?? "?";
      const stat = stages?.[i];
      n.push({
        id: `s${i}`,
        type: "stage",
        position: { x: 20 + (i + 1) * W, y: 40 + (i % 2) * 60 },
        data: {
          label: name,
          input: stat?.inputCount,
          output: stat?.outputCount,
          time: stat?.executionTimeMs,
        },
      });
      e.push({
        id: `e${i}`,
        source: i === 0 ? "src" : `s${i - 1}`,
        target: `s${i}`,
        animated: true,
      });
    });

    const last = pipeline.length > 0 ? `s${pipeline.length - 1}` : "src";
    const outCount = stages?.[stages.length - 1]?.outputCount;
    n.push({
      id: "out",
      type: "output",
      position: { x: 20 + (pipeline.length + 1) * W, y: 40 + ((pipeline.length - 1) % 2) * 60 },
      data: { count: outCount },
    });
    e.push({ id: "e-out", source: last, target: "out" });

    return { nodes: n, edges: e };
  }, [pipeline, stages, sourceCount, collection]);

  const nodeTypes = useMemo(
    () => ({
      stage: ({ data }: { data: { label: string; input?: number; output?: number; time?: number } }) => (
        <StageNode data={data} />
      ),
      collection: ({ data }: { data: { label: string; count?: number } }) => (
        <CollectionNode data={data} />
      ),
      output: ({ data }: { data: { count?: number } }) => <OutputNode data={data} />,
    }),
    []
  );

  if (pipeline.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Write a pipeline to see the stage-by-stage flow.
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={24} size={1} color="#1f2823" />
        <Controls />
        <MiniMap pannable zoomable className="!bg-card" />
      </ReactFlow>
    </div>
  );
}
