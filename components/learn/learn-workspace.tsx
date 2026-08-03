"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { MISSION_MAP, LEVELS } from "@/lib/challenges/data";
import { useProgress } from "@/lib/stores/progress";
import { useEditor } from "@/lib/stores/editor";
import { useMissionRun } from "@/lib/use-mission-run";
import { parsePipelineJson } from "@/lib/stores/editor";
import { getCollectionPageCached } from "@/lib/backend/client";
import { Sidebar } from "@/components/shell/sidebar";
import { RightPanel } from "@/components/shell/right-panel";
import { MissionHeader } from "@/components/learn/mission-header";
import { MissionBrief } from "@/components/learn/mission-brief";
import { DatasetViewer } from "@/components/learn/dataset-viewer";
import { PipelineEditor } from "@/components/learn/pipeline-editor";
import { PipelineVisualizer } from "@/components/learn/pipeline-visualizer";
import { ResultPanel } from "@/components/learn/result-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

function orderedMissionIds() {
  return LEVELS.flatMap((l) => l.chapters.flatMap((c) => c.missionIds));
}

export function LearnWorkspace({ missionId }: { missionId: string }) {
  const router = useRouter();
  const mission = MISSION_MAP[missionId];
  const completed = useProgress((s) => s.state.completed);
  const { running, outcome, run, reset } = useMissionRun(missionId);
  const [tab, setTab] = useState("pipeline");

  const ordered = useMemo(() => orderedMissionIds(), []);
  const idx = ordered.indexOf(missionId);
  const unlockedIndex = ordered.findIndex((id) => !completed[id]);
  const unlocked = unlockedIndex === -1 || idx <= unlockedIndex;
  const prevId = idx > 0 ? ordered[idx - 1] : undefined;
  const nextId = idx < ordered.length - 1 ? ordered[idx + 1] : undefined;

  const text = useEditor((s) => s.textFor(missionId));
  const parsed = useMemo(() => parsePipelineJson(text), [text]);
  const sourceCount = getCollectionPageCached(mission.collections[0], 0, 1).total;

  if (!mission) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Mission {missionId} not found.
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Lock className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Complete the previous missions to unlock <b className="text-foreground">{mission.title}</b>.
        </p>
        <Button size="sm" variant="outline" onClick={() => router.push(`/learn?m=${ordered[0]}`)}>
          Go to first mission
        </Button>
      </div>
    );
  }

  const solved = Boolean(completed[missionId]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <Sidebar activeId={missionId} />
      <main className="flex min-w-0 flex-1 flex-col">
        <MissionHeader
          mission={mission}
          running={running}
          hasRun={Boolean(outcome)}
          onRun={() => run(text)}
          onReset={reset}
          prevId={prevId}
          nextId={nextId}
          onNav={(id) => router.push(`/learn?m=${id}`)}
        />
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_minmax(340px,1fr)]">
          <div className="min-h-0 border-r border-border bg-card/30">
            <MissionBrief mission={mission} />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-border px-3 py-1.5">
                <TabsList className="h-8">
                  <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
                  <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
                  <TabsTrigger value="visualize" className="text-xs">Visualize</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="pipeline" className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col">
                <PipelineEditor mission={mission} running={running} solved={solved} onRun={run} />
              </TabsContent>
              <TabsContent value="data" className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col">
                <DatasetViewer collections={mission.collections} />
              </TabsContent>
              <TabsContent value="visualize" className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col">
                <PipelineVisualizer
                  pipeline={parsed.ok ? parsed.pipeline : []}
                  stages={outcome?.result?.stats.stages}
                  sourceCount={sourceCount}
                  collection={mission.collections[0]}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="min-h-0 min-w-0 border-l border-border bg-card/20">
            <ResultPanel result={outcome?.result ?? null} validation={outcome?.validation ?? null} />
          </div>
        </div>
      </main>
      <RightPanel />
    </div>
  );
}
