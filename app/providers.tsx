"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useProgress } from "@/lib/stores/progress";
import { useEditor } from "@/lib/stores/editor";
import { useUi } from "@/lib/stores/ui";
import { useProfile } from "@/lib/stores/profile";
import { usePreferences } from "@/lib/stores/preferences";
import { AppShellLoading } from "@/components/shell/app-shell-loading";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      useProgress.persist.rehydrate(),
      useEditor.persist.rehydrate(),
      useUi.persist.rehydrate(),
      useProfile.persist.rehydrate(),
      usePreferences.persist.rehydrate(),
    ]).then(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {hydrated ? children : <AppShellLoading />}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--popover)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
