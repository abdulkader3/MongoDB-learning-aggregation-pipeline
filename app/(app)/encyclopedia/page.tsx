"use client";

import { useMemo, useState } from "react";
import { Search, FunctionSquare, Layers } from "lucide-react";
import { OPERATORS } from "@/lib/operators";
import type { OperatorEntry } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function OperatorDetail({ op }: { op: OperatorEntry }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Syntax</p>
        <pre className="overflow-x-auto rounded-md border border-border bg-muted/60 p-3 font-mono text-xs">{op.syntax}</pre>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</p>
        <p className="text-sm text-muted-foreground">{op.purpose}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example</p>
        <pre className="overflow-x-auto rounded-md border border-border bg-muted/60 p-3 font-mono text-xs text-success">{op.example}</pre>
        <p className="text-xs text-muted-foreground">→ {op.exampleOutput}</p>
      </div>
      {op.realWorld && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Real-world</p>
          <p className="text-sm text-muted-foreground">{op.realWorld}</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-warning">Common mistakes</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {op.commonMistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-info">Performance tips</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {op.performanceTips.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related</p>
        <div className="flex flex-wrap gap-1">
          {op.related.map((r) => (
            <Badge key={r} variant="outline" className="font-mono">{r}</Badge>
          ))}
        </div>
      </div>
      {op.linkedChallengeIds.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Practise in missions
          </p>
          <div className="flex flex-wrap gap-1">
            {op.linkedChallengeIds.map((id) => (
              <Badge key={id} variant="secondary" className="font-mono">{id}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EncyclopediaPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "stage" | "expression">("all");
  const [selected, setSelected] = useState<OperatorEntry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OPERATORS.filter((op) => {
      if (filter === "stage" && !op.stage) return false;
      if (filter === "expression" && op.stage) return false;
      if (!q) return true;
      return (
        op.name.includes(q) ||
        op.purpose.toLowerCase().includes(q) ||
        op.category.toLowerCase().includes(q) ||
        op.linkedChallengeIds.some((id) => id.includes(q))
      );
    });
  }, [query, filter]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-5 py-4">
        <h1 className="text-lg font-semibold">Operator Encyclopedia</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          The MongoDB aggregation stages and expressions this quest teaches. Each entry links to the missions where you practise it.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search operators…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs">All ({OPERATORS.length})</TabsTrigger>
              <TabsTrigger value="stage" className="text-xs">Stages</TabsTrigger>
              <TabsTrigger value="expression" className="text-xs">Expressions</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((op) => (
            <button
              key={op.name}
              onClick={() => setSelected(op)}
              className={cn(
                "group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-info/40 hover:bg-accent"
              )}
            >
              <span className="mt-0.5 text-muted-foreground group-hover:text-info">
                {op.stage ? <Layers className="h-4 w-4" /> : <FunctionSquare className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-info">{op.name}</span>
                  <Badge variant={op.stage ? "default" : "muted"} className="text-[10px]">
                    {op.stage ? "stage" : "expression"}
                  </Badge>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{op.purpose}</span>
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full p-8 text-center text-sm text-muted-foreground">
              No operators match &quot;{query}&quot;.
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-info">
              {selected?.name}
              <Badge variant={selected?.stage ? "default" : "muted"} className="ml-2 align-middle text-[10px]">
                {selected?.stage ? "stage" : "expression"}
              </Badge>
            </DialogTitle>
            <DialogDescription>{selected?.category}</DialogDescription>
          </DialogHeader>
          {selected && (
            <ScrollArea className="max-h-[60vh] pr-2">
              <OperatorDetail op={selected} />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
