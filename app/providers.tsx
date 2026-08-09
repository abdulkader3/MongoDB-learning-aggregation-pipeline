"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useProgress } from "@/lib/stores/progress";
import { useEditor } from "@/lib/stores/editor";
import { useUi } from "@/lib/stores/ui";

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

  useEffect(() => {
    void useProgress.persist.rehydrate();
    void useEditor.persist.rehydrate();
    void useUi.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
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
