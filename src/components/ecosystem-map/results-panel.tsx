import { ChevronRight, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Organisation } from "@/lib/landscape-core";
import type { ResultFilterTag } from "@/lib/landscape-results";
import { cn } from "@/lib/utils";

export function ResultsPanel({
  regionalCount,
  totalCount,
  showRegionalRatio,
  regionLabel,
  contextLabel,
  filterTags,
  currentInsights = [],
  topOrganisations,
  onTagRemove,
  onClear,
  onInsights,
  onMore,
  className,
}: {
  regionalCount: number;
  totalCount: number;
  showRegionalRatio: boolean;
  regionLabel: string | null;
  contextLabel: string | null;
  filterTags: ResultFilterTag[];
  currentInsights?: { id: string; title: string }[];
  topOrganisations: Organisation[];
  onTagRemove: (tag: ResultFilterTag) => void;
  onClear: () => void;
  onInsights?: () => void;
  onMore: () => void;
  className?: string;
}) {
  const hasFilters = filterTags.length > 0;
  const hasCurrentInsights = Boolean(onInsights && currentInsights.length > 0);
  const resultCountLabel = showRegionalRatio
    ? `${regionLabel ?? "Region"}: ${regionalCount}`
    : String(totalCount);

  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden bg-card", className)}
      data-tour="result-summary"
    >
      <div className="relative p-3 after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-border after:content-['']">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {resultCountLabel}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {contextLabel
                ? `organisations in ${contextLabel}.`
                : "organisations in the active workbook."}
            </p>
          </div>
        </div>

        {hasFilters && (
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground">
              Activated Filters:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {filterTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="gap-1.5 pr-1.5"
                >
                  {tag.label}
                  <button
                    type="button"
                    onClick={() => onTagRemove(tag)}
                    className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                    aria-label={`Remove ${tag.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <p className="mb-2 text-xs text-muted-foreground">
          {hasCurrentInsights
            ? `${resultCountLabel} matching organisations across the active workbook.`
            : hasFilters
            ? `${resultCountLabel} matching organisations across the active workbook. Example organisations are shown below.`
            : "Example organisations from the active workbook."}
        </p>
        {hasCurrentInsights ? (
          <div className="grid gap-2">
            {currentInsights.slice(0, 4).map((insight) => (
              <button
                key={insight.id}
                type="button"
                className="min-w-0 rounded-md border bg-card px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-muted"
                onClick={onInsights}
              >
                <span className="block truncate">{insight.title}</span>
              </button>
            ))}
            <button
              type="button"
              className="group flex items-center justify-center gap-2 rounded-md border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
              onClick={onInsights}
            >
              Review all regional insights
              <ChevronRight
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </div>
        ) : topOrganisations.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {topOrganisations.slice(0, 4).map((org) => (
              <div key={org.id} className="min-w-0 rounded-md border bg-card p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {org.name}
                  </p>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {org.type}
                  </Badge>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {org.remit || "No remit recorded."}
                </p>
                <div className="mt-2 flex min-w-0 flex-wrap gap-1">
                  <Badge
                    variant="outline"
                    className="min-w-0 max-w-full shrink truncate text-xs"
                  >
                    {org.sourceSheet}
                  </Badge>
                  {org.location && (
                    <Badge
                      variant="outline"
                      className="min-w-0 max-w-full shrink truncate text-xs"
                    >
                      {org.location}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            {resultCountLabel} matching organisations across the active workbook. Example organisations are shown below.
          </div>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-end gap-2 bg-card p-2.5 before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-gradient-to-t before:from-card before:to-transparent before:content-['']">
        {hasFilters && (
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            <X aria-hidden="true" data-icon="inline-start" />
            Clear Filters
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onMore}
          data-tour="filtered-results"
        >
          All Filtered Results
          <ChevronRight aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
