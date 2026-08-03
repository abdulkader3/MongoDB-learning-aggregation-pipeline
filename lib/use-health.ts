"use client";

import { useEffect, useState } from "react";
import type { HealthStatus } from "@/lib/types";
import { fetchHealth } from "@/lib/backend/client";
import { logInfo } from "@/lib/stores/console";

const POLL_MS = 30_000;

export function useHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const h = await fetchHealth();
        if (!cancelled) {
          setHealth(h);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const refresh = async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
      logInfo(`Health check — ${h.connected ? "ok" : "unreachable"}`);
    } catch {
      /* ignore */
    }
  };

  return { health, loading, refresh };
}
