"use client";

import { useCallback, useState } from "react";
import type { RunOutcome } from "@/lib/runner";
import { executeMission } from "@/lib/runner";
import { toast } from "sonner";

export function useMissionRun(missionId: string) {
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);

  const run = useCallback(
    async (text: string) => {
      setRunning(true);
      setOutcome(null);
      try {
        const res = await executeMission(missionId, text);
        setOutcome(res);
        if (res.ok) {
          toast.success(`Mission solved! +${res.xpGained} XP`, {
            description: res.unlocked.length
              ? `Achievement unlocked: ${res.unlocked.join(", ")}`
              : "Your pipeline matched the expected output.",
          });
        } else if (res.error) {
          toast.error("Not solved yet", { description: res.error });
        }
        return res;
      } finally {
        setRunning(false);
      }
    },
    [missionId]
  );

  const reset = useCallback(() => setOutcome(null), []);

  return { running, outcome, run, reset };
}
