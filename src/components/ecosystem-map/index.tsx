"use client";

import { useCallback, useMemo, useState } from "react";

import { regionViews } from "@/components/ecosystem-map/map-config";
import { RegionalConcentration } from "@/components/ecosystem-map/regional-concentration";
import { ResultsPanel } from "@/components/ecosystem-map/results-panel";
import { useMapLibreClusters } from "@/components/ecosystem-map/use-maplibre-clusters";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type {
  MapCluster,
  Organisation,
  OrganisationType,
} from "@/lib/landscape-core";
import type { ResultFilterTag } from "@/lib/landscape-results";
import { cn } from "@/lib/utils";

export function EcosystemMap({
  clusters,
  organisations,
  regionalOrganisations,
  globalTypeCounts,
  resultContextLabel,
  filterTags,
  currentInsights,
  topOrganisations,
  onTagRemove,
  onClear,
  onInsights,
  onMore,
  onRegionSelect,
  className,
}: {
  clusters: MapCluster[];
  organisations: number;
  regionalOrganisations: number;
  globalTypeCounts: Record<OrganisationType, number>;
  resultContextLabel?: string | null;
  filterTags: ResultFilterTag[];
  currentInsights?: { id: string; title: string }[];
  topOrganisations: Organisation[];
  onTagRemove: (tag: ResultFilterTag) => void;
  onClear: () => void;
  onInsights?: () => void;
  onMore: () => void;
  onRegionSelect?: (region: MapCluster["region"] | null) => void;
  className?: string;
}) {
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const activeCluster = useMemo(
    () => clusters.find((cluster) => cluster.id === activeClusterId) ?? null,
    [activeClusterId, clusters],
  );
  const maxCount = useMemo(
    () => Math.max(...clusters.map((cluster) => cluster.count), 0),
    [clusters],
  );
  const selectCluster = useCallback(
    (cluster: MapCluster) => {
      setActiveClusterId(cluster.id);
      onRegionSelect?.(cluster.region);
    },
    [onRegionSelect],
  );

  const { containerRef, focusMap } = useMapLibreClusters({
    clusters,
    maxCount,
    onClusterSelect: selectCluster,
  });

  const focusCluster = useCallback(
    (cluster: MapCluster) => {
      selectCluster(cluster);
      focusMap(cluster.coordinates, cluster.zoom);
    },
    [focusMap, selectCluster],
  );

  function focusView(center: [number, number], zoom: number, label: string) {
    const cluster = clusters.find((item) => item.label === label);
    if (cluster) {
      setActiveClusterId(cluster.id);
      onRegionSelect?.(cluster.region);
    } else {
      // "World" view — global
      setActiveClusterId(null);
      onRegionSelect?.(null);
    }
    focusMap(center, zoom);
  }

  return (
    <Card
      className={cn("flex min-h-[680px] flex-col overflow-hidden", className)}
      data-tour="ecosystem-map"
    >
      <CardContent className="grid min-h-0 flex-1 grid-rows-[minmax(340px,1fr)_minmax(200px,0.5fr)] p-0">
        <div className="grid min-h-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.36fr)]">
          <div className="min-h-[330px] bg-card p-3 lg:pr-0 lg:min-h-0">
            <div className="relative h-full min-h-[314px] overflow-hidden rounded-lg bg-muted ring-1 ring-border lg:min-h-0">
              <div className="absolute inset-0">
                <div ref={containerRef} className="size-full" />
              </div>
              <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
                {regionViews.map((view) => (
                  <Button
                    key={view.label}
                    type="button"
                    size="sm"
                    variant={
                      (activeClusterId === null && view.label === "World") ||
                      view.label === activeCluster?.label
                        ? "default"
                        : "secondary"
                    }
                    onClick={() => focusView(view.center, view.zoom, view.label)}
                  >
                    {view.label}
                  </Button>
                ))}
              </div>
              <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-md border border-border bg-card/90 px-3 py-2 text-xs leading-5 text-muted-foreground shadow-sm backdrop-blur">
                Circle size encodes organisation count. Click a region marker or
                control to zoom into that geography.
              </div>
            </div>
          </div>
          <ResultsPanel
            className="min-h-[330px] lg:min-h-0"
            regionalCount={regionalOrganisations}
            totalCount={organisations}
            showRegionalRatio={activeCluster !== null}
            regionLabel={activeCluster?.label ?? null}
            contextLabel={resultContextLabel ?? null}
            filterTags={filterTags}
            currentInsights={currentInsights}
            topOrganisations={topOrganisations}
            onTagRemove={onTagRemove}
            onClear={onClear}
            onInsights={onInsights}
            onMore={onMore}
          />
        </div>

        <div className="min-h-0 overflow-auto p-3">
          <div
            className="border-t border-border mx-4 pt-3"
            data-tour="regional-concentration"
          >
            <RegionalConcentration
              clusters={clusters}
              activeClusterId={activeClusterId}
              totalCount={organisations}
              globalTypeCounts={globalTypeCounts}
              onClusterSelect={focusCluster}
              onGlobalSelect={() => {
                setActiveClusterId(null);
                onRegionSelect?.(null);
                const worldView = { center: [12, 35] as [number, number], zoom: 1.2 };
                focusMap(worldView.center, worldView.zoom);
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
