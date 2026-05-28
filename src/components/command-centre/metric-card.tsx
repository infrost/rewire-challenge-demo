import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  compact = false,
  selected = false,
  onSelect,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  compact?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <Card
      size="sm"
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        onSelect ? "cursor-pointer transition hover:bg-muted" : undefined,
        selected ? "bg-muted ring-1 ring-primary/30" : undefined,
        compact ? "gap-1.5 py-2" : undefined,
      )}
    >
      <CardHeader className={cn(compact ? "px-2.5" : undefined)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={cn(
                "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground",
                compact
                  ? "truncate text-[0.62rem] tracking-[0.1em]"
                  : undefined,
              )}
            >
              {label}
            </p>
            <p
              className={cn(
                "mt-2 text-3xl font-semibold text-foreground",
                compact ? "mt-0.5 text-2xl" : undefined,
              )}
            >
              {value}
            </p>
          </div>
          <div
            className={cn(
              "grid size-10 place-items-center rounded-md bg-muted text-muted-foreground",
              compact ? "size-7" : undefined,
            )}
          >
            <Icon aria-hidden="true" size={compact ? 17 : 20} strokeWidth={1.8} />
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(compact ? "px-2.5" : undefined)}>
        <p
          className={cn(
            "text-sm leading-5 text-muted-foreground",
            compact ? "line-clamp-1 text-xs leading-4" : undefined,
          )}
        >
          {detail}
        </p>
      </CardContent>
    </Card>
  );
}
