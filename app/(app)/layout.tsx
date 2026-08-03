import { TopNav } from "@/components/shell/top-nav";
import { ConsolePanel } from "@/components/shell/console-panel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <TopNav />
      <div className="flex min-h-0 flex-1">{children}</div>
      <ConsolePanel />
    </div>
  );
}
