"use client";

import { Fragment } from "react";

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  if (typeof v === "boolean") return String(v);
  if (v === null) return "null";
  return JSON.stringify(v);
}

function tokenClass(v: unknown): string {
  if (typeof v === "string") return "text-success";
  if (typeof v === "number") return "text-info";
  if (typeof v === "boolean") return "text-warning";
  if (v === null) return "text-muted-foreground italic";
  return "text-foreground";
}

function JsonNode({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || typeof value !== "object") {
    return <span className={tokenClass(value)}>{stringify(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">[]</span>;
    const oneLine = value.length <= 3 && value.every((v) => typeof v !== "object");
    if (oneLine) {
      return (
        <span className="text-muted-foreground">
          [{" "}
          {value.map((v, i) => (
            <Fragment key={i}>
              {i > 0 ? <span>, </span> : null}
              <JsonNode value={v} depth={depth + 1} />
            </Fragment>
          ))}{" "}
          ]
        </span>
      );
    }
    return (
      <span className="text-muted-foreground">
        [
        {value.map((v, i) => (
          <div key={i} style={{ marginLeft: depth * 12 }} className="border-l border-border pl-2">
            {i + 1}. <JsonNode value={v} depth={depth + 1} />
          </div>
        ))}
        ]
      </span>
    );
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;
  return (
    <span className="text-muted-foreground">
      {"{"}
      {keys.map((k) => (
        <div key={k} style={{ marginLeft: depth * 12 }} className="pl-2">
          <span className="text-accent-foreground/80">&quot;{k}&quot;</span>
          <span>: </span>
          <JsonNode value={obj[k]} depth={depth + 1} />
        </div>
      ))}
      {"}"}
    </span>
  );
}

export function JsonView({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto p-0 font-mono text-xs leading-relaxed">
      <JsonNode value={value} depth={1} />
    </pre>
  );
}
