"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MaterialCoverageCard,
  SupplyChainCoverageCard,
  type MaterialCoverageItem,
  type SupplyChainCoverageItem,
} from "@/components/command-centre/coverage-card";
import { FloatingSpreadsheetControls } from "@/components/command-centre/floating-spreadsheet-controls";
import { startGuidedBriefing } from "@/components/command-centre/guided-briefing";
import { InsightCards } from "@/components/command-centre/insight-cards";
import { RewireAgent } from "@/components/command-centre/rewire-agent";
import { ShowResultsDialog } from "@/components/command-centre/show-results-dialog";
import { TwoColumnLayoutWarning } from "@/components/command-centre/two-column-layout-warning";
import type { ImportStatus } from "@/components/command-centre/types";
import { EcosystemMap } from "@/components/ecosystem-map";
import { buildHeuristicAnalysis } from "@/lib/heuristic-engine";
import {
  buildLandscapeMetricsFromWorkbook,
  inferMapRegion,
  type CoverageItem,
  type LandscapeMetrics,
  type MapRegion,
  type MaterialCategory,
  type Organisation,
  type OrganisationType,
  type SupplyChainRole,
  materialCategories,
  organisationTypes,
  supplyChainRoles,
} from "@/lib/landscape-core";
import {
  buildFilteredMapClusters,
  buildResultContext,
  filterOrganisations,
  getResultFilterTags,
  getTopOrganisations,
  normalizeResultFilter,
  removeResultFilterTag,
  toggleResultFilterValue,
  type OrganisationResultFilter,
  type ResultFilterTag,
} from "@/lib/landscape-results";
import { cn } from "@/lib/utils";

const regionLabelMap: Record<MapRegion, string> = {
  "United Kingdom": "UK",
  Europe: "Europe",
  "North America": "North America",
  Asia: "Asia",
  "Global / unknown": "Global / unknown",
};

const guidedBriefingStorageKey = "rewire-guided-briefing-seen";
const compactAppScale = 0.85;

const compactAppScaleStyle: CSSProperties = {
  zoom: compactAppScale,
};

const allOrganisationTypeButtonTone = {
  active: "hover:bg-primary/90",
  inactive:
    "border-primary text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground",
};

const organisationTypeButtonTone: Record<
  OrganisationType,
  {
    active: string;
    inactive: string;
  }
> = {
  Industry: {
    active:
      "border-ecosystem-industry bg-ecosystem-industry text-primary-foreground hover:bg-ecosystem-industry/90",
    inactive:
      "border-ecosystem-industry text-ecosystem-industry hover:border-ecosystem-industry hover:bg-ecosystem-industry hover:text-primary-foreground",
  },
  Academic: {
    active:
      "border-ecosystem-academic bg-ecosystem-academic text-primary-foreground hover:bg-ecosystem-academic/90",
    inactive:
      "border-ecosystem-academic text-ecosystem-academic hover:border-ecosystem-academic hover:bg-ecosystem-academic hover:text-primary-foreground",
  },
  Other: {
    active:
      "border-ecosystem-other bg-ecosystem-other text-primary-foreground hover:bg-ecosystem-other/90",
    inactive:
      "border-ecosystem-other text-ecosystem-other hover:border-ecosystem-other hover:bg-ecosystem-other hover:text-primary-foreground",
  },
};

function joinCoverageLabels(labels: string[]) {
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }

  return labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];
}

function buildCoverageContextLabel(
  selectedTypes: OrganisationType[] | undefined,
  regionLabel: string | null,
) {
  const typeLabels =
    selectedTypes?.length && selectedTypes.length < organisationTypes.length
      ? organisationTypes.filter((type) => selectedTypes.includes(type))
      : [];
  const typeLabel = typeLabels.length
    ? joinCoverageLabels(typeLabels)
    : "overall";

  return regionLabel ? `${typeLabel} in ${regionLabel}` : typeLabel;
}

function countOrganisationTypes(
  organisations: Organisation[],
): Record<OrganisationType, number> {
  return {
    Industry: organisations.filter(
      (organisation) => organisation.type === "Industry",
    ).length,
    Academic: organisations.filter(
      (organisation) => organisation.type === "Academic",
    ).length,
    Other: organisations.filter((organisation) => organisation.type === "Other")
      .length,
  };
}

function countCoverageByType(
  organisations: Organisation[],
  matcher: (organisation: Organisation) => boolean,
) {
  return organisationTypes.reduce(
    (counts, type) => ({
      ...counts,
      [type]: organisations.filter(
        (organisation) => organisation.type === type && matcher(organisation),
      ).length,
    }),
    {} as Record<OrganisationType, number>,
  );
}

function totalTypeCounts(typeCounts: Record<OrganisationType, number>) {
  return organisationTypes.reduce((sum, type) => sum + typeCounts[type], 0);
}

export function EcosystemCommandCentre({
  initialMetrics,
}: {
  initialMetrics: LandscapeMetrics;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [sourceName, setSourceName] = useState("Default REWIRE spreadsheet");
  const [activeFilter, setActiveFilter] = useState<OrganisationResultFilter>({});
  const [activeRegion, setActiveRegion] = useState<MapRegion | null>(null);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [heuristicDialogOpen, setHeuristicDialogOpen] = useState(false);
  const [heuristicDialogFilter, setHeuristicDialogFilter] =
    useState<OrganisationResultFilter>({});
  const [appScale, setAppScale] = useState(1);
  const [status, setStatus] = useState<ImportStatus>({
    state: "idle",
    message:
      "Import an .xlsx file with Industry, Academic Groups, and Other sheets to refresh the command centre.",
  });

  const activeResultContext = useMemo(
    () => buildResultContext(activeFilter),
    [activeFilter],
  );
  const filterTags = useMemo(
    () => getResultFilterTags(activeFilter),
    [activeFilter],
  );
  const hasActiveFilter = filterTags.length > 0;
  const currentInsightFilter = useMemo(
    () =>
      activeRegion ? { ...activeFilter, regions: [activeRegion] } : activeFilter,
    [activeFilter, activeRegion],
  );
  const activeHeuristicAnalysis = useMemo(
    () => buildHeuristicAnalysis(metrics, currentInsightFilter),
    [currentInsightFilter, metrics],
  );
  const hasActiveFilterInsights =
    (hasActiveFilter || activeRegion) &&
    activeHeuristicAnalysis.signals.some(
      (signal) => signal.category !== "methodology-caveat",
    );
  const currentInsightPreviews = useMemo(
    () =>
      activeHeuristicAnalysis.signals
        .filter((signal) => signal.category !== "methodology-caveat")
        .slice(0, 4)
        .map((signal) => ({
          id: signal.id,
          title: signal.title,
        })),
    [activeHeuristicAnalysis.signals],
  );

  const activeOrganisations = useMemo(
    () => filterOrganisations(metrics.organisations, activeFilter),
    [activeFilter, metrics.organisations],
  );
  const activeMapClusters = useMemo(
    () => buildFilteredMapClusters(metrics.organisations, activeFilter),
    [activeFilter, metrics.organisations],
  );
  const regionLabel = activeRegion ? regionLabelMap[activeRegion] : null;
  const globalTypeCounts = useMemo(
    () => countOrganisationTypes(activeOrganisations),
    [activeOrganisations],
  );

  const focusRegionOrganisations = useMemo(
    () =>
      activeRegion
        ? activeOrganisations.filter(
            (organisation) => inferMapRegion(organisation) === activeRegion,
          )
        : activeOrganisations,
    [activeOrganisations, activeRegion],
  );

  const appliedCoverageFilter = useMemo(
    () =>
      normalizeResultFilter({
        ...activeFilter,
        regions: activeRegion ? [activeRegion] : undefined,
      }),
    [activeFilter, activeRegion],
  );
  const coverageContextLabel = useMemo(
    () => buildCoverageContextLabel(activeFilter.organisationTypes, regionLabel),
    [activeFilter.organisationTypes, regionLabel],
  );
  const visibleCoverageTypes = useMemo(
    () =>
      activeFilter.organisationTypes?.length
        ? organisationTypes.filter((type) =>
            activeFilter.organisationTypes?.includes(type),
          )
        : [...organisationTypes],
    [activeFilter.organisationTypes],
  );
  const roleCoverageOrganisations = useMemo(
    () =>
      filterOrganisations(metrics.organisations, {
        ...appliedCoverageFilter,
        supplyChainRoles: undefined,
      }),
    [appliedCoverageFilter, metrics.organisations],
  );
  const materialCoverageOrganisations = useMemo(
    () =>
      filterOrganisations(metrics.organisations, {
        ...appliedCoverageFilter,
        materials: undefined,
      }),
    [appliedCoverageFilter, metrics.organisations],
  );

  const regionRoles = useMemo<SupplyChainCoverageItem[]>(() => {
    const total = roleCoverageOrganisations.length || 1;
    return [...supplyChainRoles]
      .map((key) => {
        const typeCounts = countCoverageByType(
          roleCoverageOrganisations,
          (org) => org.supplyChainRoles.includes(key),
        );
        const count = totalTypeCounts(typeCounts);

        return {
          key,
          count,
          share: Math.round((count / total) * 100),
          typeCounts,
        };
      });
  }, [roleCoverageOrganisations]);

  const regionMaterials = useMemo<MaterialCoverageItem[]>(() => {
    const total = materialCoverageOrganisations.length || 1;
    return [...materialCategories]
      .map((key) => {
        const typeCounts = countCoverageByType(
          materialCoverageOrganisations,
          (org) => org.materials.includes(key),
        );
        const count = totalTypeCounts(typeCounts);

        return {
          key,
          count,
          share: Math.round((count / total) * 100),
          typeCounts,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [materialCoverageOrganisations]);

  const topOrganisations = useMemo(
    () =>
      getTopOrganisations(
        metrics.organisations,
        activeRegion ? { ...activeFilter, regions: [activeRegion] } : activeFilter,
        4,
      ),
    [activeFilter, activeRegion, metrics.organisations],
  );

  function updateFilter(
    updater:
      | OrganisationResultFilter
      | ((current: OrganisationResultFilter) => OrganisationResultFilter),
  ) {
    setActiveFilter((current) =>
      normalizeResultFilter(
        typeof updater === "function" ? updater(current) : updater,
      ),
    );
  }

  function clearFilters(closeDialog = false) {
    setActiveFilter({});
    setHeuristicDialogOpen(false);
    setHeuristicDialogFilter({});
    if (closeDialog) {
      setResultsDialogOpen(false);
    }
  }

  function removeFilterTag(tag: ResultFilterTag) {
    updateFilter((current) => removeResultFilterTag(current, tag));
  }

  function toggleMaterial(item: CoverageItem<MaterialCategory>) {
    updateFilter((current) =>
      toggleResultFilterValue(current, "materials", item.key),
    );
  }

  function toggleRole(item: CoverageItem<SupplyChainRole>) {
    updateFilter((current) =>
      toggleResultFilterValue(current, "supplyChainRoles", item.key),
    );
  }

  function toggleOrganisationType(type: OrganisationType) {
    updateFilter((current) =>
      toggleResultFilterValue(current, "organisationTypes", type),
    );
  }

  function addGapCellFilter(
    role: SupplyChainRole,
    material: MaterialCategory,
  ) {
    updateFilter((current) => {
      const currentRoles = current.supplyChainRoles ?? [];
      const currentMaterials = current.materials ?? [];
      const isSelected =
        currentRoles.includes(role) && currentMaterials.includes(material);

      if (isSelected) {
        return {
          ...current,
          supplyChainRoles: currentRoles.filter((item) => item !== role),
          materials: currentMaterials.filter((item) => item !== material),
        };
      }

      return {
        ...current,
        supplyChainRoles: Array.from(new Set([...currentRoles, role])),
        materials: Array.from(new Set([...currentMaterials, material])),
      };
    });
  }

  function openResultsWithFilter(filter: OrganisationResultFilter) {
    updateFilter(filter);
    setResultsDialogOpen(true);
  }

  function scaleAppDown() {
    setAppScale(compactAppScale);
  }

  function toggleViewScale() {
    setAppScale((current) => (current < 1 ? 1 : compactAppScale));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setStatus({ state: "loading", message: `Importing ${file.name}...` });

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const nextMetrics = buildLandscapeMetricsFromWorkbook(workbook);

      if (nextMetrics.totals.organisations === 0) {
        throw new Error(
          "No organisations were parsed. Expected sheets named Industry, Academic Groups, and Other.",
        );
      }

      setMetrics(nextMetrics);
      clearFilters(true);
      setActiveRegion(null);
      setSourceName(file.name);
      setStatus({
        state: "success",
        message: `Imported ${nextMetrics.totals.organisations} organisations from ${nextMetrics.importedSheets.length} recognised sheets.`,
      });
    } catch (error) {
      setStatus({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "The spreadsheet could not be imported.",
      });
    } finally {
      input.value = "";
    }
  }

  function resetToDefault() {
    setMetrics(initialMetrics);
    clearFilters(true);
    setActiveRegion(null);
    setSourceName("Default REWIRE spreadsheet");
    setStatus({
      state: "idle",
      message:
        "Default landscape data restored. Import another .xlsx file to refresh the command centre.",
    });
  }

  useEffect(() => {
    if (window.localStorage.getItem(guidedBriefingStorageKey) === "true") {
      return;
    }

    window.localStorage.setItem(guidedBriefingStorageKey, "true");
    const briefingTimer = window.setTimeout(() => {
      void startGuidedBriefing();
    }, 800);

    return () => {
      window.clearTimeout(briefingTimer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div style={appScale === 1 ? undefined : compactAppScaleStyle}>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          aria-label="Import spreadsheet"
          onChange={handleFileChange}
        />

        <section
          className="mx-auto grid w-full max-w-[1800px] items-start gap-3 px-3 py-3 sm:px-4 md:px-5"
          style={{
            gridTemplateColumns: "minmax(680px, 1.15fr) minmax(360px, 0.85fr)",
          }}
        >
          <aside className="sticky top-4 h-[calc(100vh-2rem)] min-h-0">
            <EcosystemMap
              className="h-full"
              clusters={activeMapClusters}
              organisations={activeOrganisations.length}
              regionalOrganisations={focusRegionOrganisations.length}
              globalTypeCounts={globalTypeCounts}
              resultContextLabel={activeResultContext?.label ?? null}
              filterTags={filterTags}
              currentInsights={
                hasActiveFilterInsights ? currentInsightPreviews : undefined
              }
              topOrganisations={topOrganisations}
              onTagRemove={removeFilterTag}
              onClear={() => clearFilters(false)}
              onInsights={
                hasActiveFilterInsights
                  ? () => {
                      setHeuristicDialogFilter(currentInsightFilter);
                      setHeuristicDialogOpen(true);
                    }
                  : undefined
              }
              onMore={() => setResultsDialogOpen(true)}
              onRegionSelect={setActiveRegion}
            />
          </aside>

          <section className="grid gap-3">
          <section className="grid gap-3" data-tour="exploration-controls">
            <Card className="p-2 shadow-sm">
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant={!activeFilter.organisationTypes?.length ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    !activeFilter.organisationTypes?.length
                      ? allOrganisationTypeButtonTone.active
                      : allOrganisationTypeButtonTone.inactive,
                  )}
                  onClick={() => updateFilter((current) => ({ ...current, organisationTypes: undefined }))}
                >
                  All
                </Button>
                <Button
                  variant={activeFilter.organisationTypes?.includes("Industry") ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    activeFilter.organisationTypes?.includes("Industry")
                      ? organisationTypeButtonTone.Industry.active
                      : organisationTypeButtonTone.Industry.inactive,
                  )}
                  onClick={() => toggleOrganisationType("Industry")}
                >
                  Industry
                </Button>
                <Button
                  variant={activeFilter.organisationTypes?.includes("Academic") ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    activeFilter.organisationTypes?.includes("Academic")
                      ? organisationTypeButtonTone.Academic.active
                      : organisationTypeButtonTone.Academic.inactive,
                  )}
                  onClick={() => toggleOrganisationType("Academic")}
                >
                  Academic
                </Button>
                <Button
                  variant={activeFilter.organisationTypes?.includes("Other") ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    activeFilter.organisationTypes?.includes("Other")
                      ? organisationTypeButtonTone.Other.active
                      : organisationTypeButtonTone.Other.inactive,
                  )}
                  onClick={() => toggleOrganisationType("Other")}
                >
                  Other
                </Button>
              </div>
            </Card>

            <section className="grid gap-3">
              <SupplyChainCoverageCard
                roles={regionRoles}
                visibleTypes={visibleCoverageTypes}
                selectedKeys={activeFilter.supplyChainRoles ?? []}
                contextLabel={coverageContextLabel}
                onRoleToggle={toggleRole}
              />
              <MaterialCoverageCard
                materials={regionMaterials}
                visibleTypes={visibleCoverageTypes}
                selectedKeys={activeFilter.materials ?? []}
                contextLabel={coverageContextLabel}
                onMaterialToggle={toggleMaterial}
              />
            </section>
          </section>

          <div data-tour="strategic-signals">
            <InsightCards
              metrics={metrics}
              activeFilter={activeFilter}
              onMaterialToggle={(material) =>
                toggleMaterial({
                  key: material,
                  count:
                    metrics.materialCoverage.find((item) => item.key === material)
                      ?.count ?? 0,
                  share:
                    metrics.materialCoverage.find((item) => item.key === material)
                      ?.share ?? 0,
                })
              }
              onRoleToggle={(role) =>
                toggleRole({
                  key: role,
                  count:
                    metrics.roleCoverage.find((item) => item.key === role)
                      ?.count ?? 0,
                  share:
                    metrics.roleCoverage.find((item) => item.key === role)
                      ?.share ?? 0,
                })
              }
              onGapCellSelect={addGapCellFilter}
              onResultFilterSelect={openResultsWithFilter}
              analysisOpen={heuristicDialogOpen}
              analysisFilter={heuristicDialogFilter}
              onAnalysisOpenChange={setHeuristicDialogOpen}
              onAnalysisFilterChange={setHeuristicDialogFilter}
            />
          </div>
          </section>
        </section>
      </div>

      <ShowResultsDialog
        open={resultsDialogOpen}
        onOpenChange={setResultsDialogOpen}
        context={activeResultContext}
        organisations={metrics.organisations}
      />
      <FloatingSpreadsheetControls
        sourceName={sourceName}
        status={status}
        hasActiveFilter={hasActiveFilter}
        onImportClick={() => inputRef.current?.click()}
        onClearFilter={() => clearFilters(true)}
        onReset={resetToDefault}
        onStartBriefing={startGuidedBriefing}
        onViewScaleToggle={toggleViewScale}
        viewScaledDown={appScale < 1}
      >
        <RewireAgent
          metrics={metrics}
          sourceName={sourceName}
          activeFilter={activeFilter}
          activeRegion={activeRegion}
        />
      </FloatingSpreadsheetControls>
      <TwoColumnLayoutWarning onScaleDown={scaleAppDown} />
    </main>
  );
}
