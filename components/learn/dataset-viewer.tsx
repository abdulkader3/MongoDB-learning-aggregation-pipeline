"use client";

import { useMemo, useState } from "react";
import { Database, Table } from "lucide-react";
import type { CollectionInfo } from "@/lib/types";
import { getCollections } from "@/lib/backend/client";
import { DataTable } from "@/components/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCompact, formatBytes } from "@/lib/format";

export function DatasetViewer({ collections }: { collections: string[] }) {
  const infos = useMemo(() => getCollections(), []);
  const [tab, setTab] = useState(collections[0] ?? "");
  const missionCols = collections.filter((c) => infos.some((i) => i.name === c));
  const others = infos.filter((i) => !collections.includes(i.name));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Datasets
        </span>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-border px-2">
          <TabsList className="h-8 bg-transparent">
            {missionCols.map((c) => (
              <TabsTrigger key={c} value={c} className="font-mono text-xs">
                {c}
              </TabsTrigger>
            ))}
            {others.length > 0 && (
              <TabsTrigger value="__all__" className="text-xs">
                Browse all
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {missionCols.map((c) => (
          <TabsContent key={c} value={c} className="flex min-h-0 flex-1 flex-col mt-0">
            <CollectionView info={infos.find((i) => i.name === c)} />
          </TabsContent>
        ))}

        <TabsContent value="__all__" className="flex min-h-0 flex-1 flex-col mt-0">
          <div className="flex-1 overflow-y-auto p-3">
            <p className="mb-3 text-xs text-muted-foreground">
              The sandbox dataset ships with {infos.length} interconnected collections (~11k documents).
              Browse any of them below.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {infos.map((i) => (
                <button
                  key={i.name}
                  onClick={() => setTab(i.name)}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left hover:bg-accent"
                >
                  <span className="flex items-center gap-2 font-mono text-xs">
                    <Table className="h-3.5 w-3.5 text-muted-foreground" />
                    {i.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatCompact(i.count)}</span>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CollectionView({ info }: { info?: CollectionInfo }) {
  if (!info) return <div className="p-4 text-sm text-muted-foreground">Collection not found.</div>;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
        <span>{formatCompact(info.count)} documents</span>
        <span>{info.fields.length} fields</span>
        <span>{formatBytes(info.sizeBytes * 50)} sampled</span>
        <span className="ml-auto font-mono text-[11px]">{info.fields.slice(0, 10).join(", ")}</span>
      </div>
      <div className="min-h-0 flex-1">
        <DataTable docs={info.sample} maxCols={7} maxRows={6} />
      </div>
    </div>
  );
}
