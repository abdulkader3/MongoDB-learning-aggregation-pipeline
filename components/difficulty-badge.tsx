import type { Difficulty } from "@/lib/types";
import { DIFFICULTIES } from "@/lib/xp";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function DifficultyBadge({
  difficulty,
  xp,
  className,
}: {
  difficulty: Difficulty;
  xp?: boolean;
  className?: string;
}) {
  const meta = DIFFICULTIES[difficulty];
  return (
    <Badge variant="outline" className={cn("gap-1.5", meta.color, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
      {xp ? <span className="text-muted-foreground">· +{meta.xp} XP</span> : null}
    </Badge>
  );
}
