import { Globe2 } from "lucide-react";

import {
  organisationTypes,
  type MapCluster,
  type OrganisationType,
} from "@/lib/landscape-core";
import { cn } from "@/lib/utils";

const typeTone: Record<
  OrganisationType,
  {
    bar: string;
    text: string;
  }
> = {
  Industry: {
    bar: "bg-ecosystem-industry",
    text: "text-ecosystem-industry",
  },
  Academic: {
    bar: "bg-ecosystem-academic",
    text: "text-ecosystem-academic",
  },
  Other: {
    bar: "bg-ecosystem-other",
    text: "text-ecosystem-other",
  },
};

function typeCountTotal(typeCounts: Record<OrganisationType, number>) {
  return organisationTypes.reduce((total, type) => total + typeCounts[type], 0);
}

function StackedTypeBar({
  typeCounts,
  denominator,
}: {
  typeCounts: Record<OrganisationType, number>;
  denominator: number;
}) {
  const safeDenominator = Math.max(denominator, 1);
  const segments = organisationTypes
    .map((type) => ({
      type,
      count: typeCounts[type],
      share: (typeCounts[type] / safeDenominator) * 100,
    }))
    .filter((segment) => segment.count > 0);
  const description = organisationTypes
    .map((type) => `${type} ${typeCounts[type]}`)
    .join(", ");

  return (
    <div
      role="img"
      aria-label={description}
      className="h-1 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="flex h-full w-full">
        {segments.map((segment) => (
          <span
            key={segment.type}
            className={cn(
              "h-full transition-all duration-500 ease-out",
              typeTone[segment.type].bar,
            )}
            style={{ width: `${segment.share}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function TypeBreakdown({
  typeCounts,
}: {
  typeCounts: Record<OrganisationType, number>;
}) {
  const total = typeCountTotal(typeCounts);

  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
      {organisationTypes.map((type) => {
        const count = typeCounts[type];
        const share = total ? Math.round((count / total) * 100) : 0;

        return (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", typeTone[type].bar)}
            />
            <span className={typeTone[type].text}>{type}</span>
            <span className="tabular-nums">{count}</span>
            <span className="tabular-nums">({share}%)</span>
          </span>
        );
      })}
    </div>
  );
}

export function RegionalConcentration({
  clusters,
  activeClusterId,
  totalCount,
  globalTypeCounts,
  contextLabel,
  onClusterSelect,
  onGlobalSelect,
}: {
  clusters: MapCluster[];
  activeClusterId: string | null;
  totalCount: number;
  globalTypeCounts: Record<OrganisationType, number>;
  contextLabel?: string | null;
  onClusterSelect: (cluster: MapCluster) => void;
  onGlobalSelect: () => void;
}) {
  const isGlobalActive = activeClusterId === null;
  const hasFilterContext = Boolean(contextLabel);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p
            className="truncate text-sm font-semibold text-foreground"
            title={
              hasFilterContext && contextLabel
                ? `Current regional distribution: ${contextLabel}`
                : undefined
            }
          >
            {hasFilterContext && contextLabel ? (
              <>
                Current regional distribution:{" "}
                <span className="font-normal text-muted-foreground">
                  {contextLabel}
                </span>
              </>
            ) : (
              "Regional concentration"
            )}
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          Sorted by parsed records
        </p>
      </div>

      {/* All-region pseudo-row */}
      <button
        type="button"
        onClick={onGlobalSelect}
        className={cn(
          "grid gap-1.5 rounded-md border px-2.5 py-1.5 text-left transition hover:bg-muted",
          isGlobalActive ? "border-primary bg-muted" : "border-border bg-card",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Globe2
              size={10}
              className={cn(
                "shrink-0",
                isGlobalActive ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span className="truncate text-sm font-medium text-foreground">
              All
            </span>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {totalCount}
          </span>
        </div>
        <StackedTypeBar typeCounts={globalTypeCounts} denominator={totalCount} />
        <TypeBreakdown typeCounts={globalTypeCounts} />
      </button>

      {clusters.length === 0 ? (
        <div className="rounded-md border bg-card px-3 py-5 text-sm text-muted-foreground">
          No regional matches for the current result context.
        </div>
      ) : null}
      {clusters.map((cluster) => (
        <button
          type="button"
          key={cluster.id}
          onClick={() => onClusterSelect(cluster)}
          className={cn(
            "grid gap-1.5 rounded-md border px-2.5 py-1.5 text-left transition hover:bg-muted",
            activeClusterId === cluster.id
              ? "border-primary bg-muted"
              : "border-border bg-card",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  typeTone[cluster.dominantType].bar,
                )}
              />
              <span className="truncate text-sm font-medium text-foreground">
                {cluster.label}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {cluster.count}
            </span>
          </div>
          <StackedTypeBar typeCounts={cluster.typeCounts} denominator={totalCount} />
          <TypeBreakdown typeCounts={cluster.typeCounts} />
        </button>
      ))}
    </div>
  );
}
