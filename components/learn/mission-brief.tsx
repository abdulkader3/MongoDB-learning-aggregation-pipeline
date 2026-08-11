"use client";

import { BookOpen, Lightbulb, AlertTriangle, Target, ListChecks, XCircle } from "lucide-react";
import type { Mission } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useUi } from "@/lib/stores/ui";

function Section({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)}>
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

export function MissionBrief({ mission }: { mission: Mission }) {
  const collapsed = useUi((s) => s.missionSidebarCollapsed);
  const body = collapsed ? "text-sm" : "text-xs";
  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-5 p-4">
          <div>
            <p className={cn("leading-relaxed text-foreground", collapsed ? "text-base" : "text-sm")}>{mission.description}</p>
          </div>

          <Section icon={<BookOpen className="h-3.5 w-3.5" />} title="Scenario">
            <p className={cn("leading-relaxed text-muted-foreground", body)}>{mission.scenario}</p>
          </Section>

          <Separator />

          <Section icon={<ListChecks className="h-3.5 w-3.5" />} title="Requirements">
            <ul className="space-y-1.5">
              {mission.requirements.map((r, i) => (
                <li key={i} className={cn("flex gap-2 text-muted-foreground", body)}>
                  <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-info" />
                  {r}
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<Target className="h-3.5 w-3.5" />} title="Objectives">
            <ul className="space-y-1.5">
              {mission.objectives.map((o, i) => (
                <li key={i} className={cn("flex gap-2 text-muted-foreground", body)}>
                  <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {o}
                </li>
              ))}
            </ul>
          </Section>

          {mission.restrictions.length > 0 && (
            <Section icon={<XCircle className="h-3.5 w-3.5" />} title="Restrictions">
              <ul className="space-y-1.5">
                {mission.restrictions.map((r, i) => (
                  <li key={i} className={cn("flex gap-2 text-destructive/90", body)}>
                    <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-destructive" />
                    {r}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collections</p>
              <div className="flex flex-wrap gap-1">
                {mission.collections.map((c) => (
                  <Badge key={c} variant="secondary" className="font-mono">{c}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allowed stages</p>
              <div className="flex flex-wrap gap-1">
                {(mission.allowedStages ?? mission.operators).map((s) => (
                  <Badge key={s} variant="outline" className="font-mono">{s}</Badge>
                ))}
              </div>
            </div>
          </div>

          <Section icon={<Lightbulb className="h-3.5 w-3.5" />} title="Hints">
            <div className="space-y-2">
              {mission.hints.map((h, i) => (
                <details key={i} className="group rounded-md border border-border bg-muted/40">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-info hover:text-foreground">
                    {h.title}
                  </summary>
                  <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{h.body}</p>
                </details>
              ))}
            </div>
          </Section>

          <Section icon={<AlertTriangle className="h-3.5 w-3.5" />} title="Common mistakes">
            <ul className="space-y-1.5">
              {mission.commonMistakes.map((m, i) => (
                <li key={i} className={cn("flex gap-2 text-muted-foreground", body)}>
                  <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                  {m}
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={<Target className="h-3.5 w-3.5" />} title="Real-world uses">
            <div className="flex flex-wrap gap-1">
              {mission.realWorldUses.map((u, i) => (
                <Badge key={i} variant="muted">{u}</Badge>
              ))}
            </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}
