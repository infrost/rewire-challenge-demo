"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Layers3, ListFilter, RotateCcw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import {
  buildHeuristicAnalysis,
  HEURISTIC_PANEL_LABELS,
  type SignalCategory,
  type SignalConfidence,
  type SignalSeverity,
  type StrategicSignal,
} from "@/lib/heuristic-engine";
import type {
  LandscapeMetrics,
  MaterialCategory,
  SupplyChainRole,
} from "@/lib/landscape-core";
import type { OrganisationResultFilter } from "@/lib/landscape-results";
import { cn } from "@/lib/utils";

const categoryLabels: Record<StrategicSignal["category"], string> = {
  "ecosystem-overview": "Overview",
  "uk-ecosystem": "UK ecosystem",
  "regional-concentration": "Regional",
  "supply-chain-structure": "Supply chain",
  "material-intelligence": "Material",
  "gap-signal": "Gap",
  "collaboration-opportunity": "Opportunity",
  "data-quality": "Data quality",
  "methodology-caveat": "Methodology",
};

const severityBadgeClassName: Record<StrategicSignal["severity"], string> = {
  positive: "border-green-200 bg-green-50 text-green-700",
  neutral: "",
  watch: "border-yellow-200 bg-yellow-50 text-yellow-800",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
  negative: "border-red-200 bg-red-50 text-red-700",
  critical: "border-red-200 bg-red-50 text-red-700",
};

const confidenceBadgeClassName: Record<StrategicSignal["confidence"], string> = {
  high: "border-green-200 bg-green-50 text-green-700",
  medium: "border-yellow-200 bg-yellow-50 text-yellow-800",
  low: "border-red-200 bg-red-50 text-red-700",
};

const severityLabels: Record<SignalSeverity, string> = {
  positive: "Positive",
  neutral: "Neutral",
  watch: "Watch",
  warning: "Warning",
  negative: "Negative",
  critical: "Critical",
};

const confidenceLabels: Record<SignalConfidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function toggleFilterValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function filterButtonLabel<T extends string>({
  allLabel,
  selectedValues,
  labelForValue,
}: {
  allLabel: string;
  selectedValues: T[];
  labelForValue: (value: T) => string;
}) {
  if (selectedValues.length === 0) {
    return allLabel;
  }

  if (selectedValues.length === 1) {
    return labelForValue(selectedValues[0]);
  }

  return `${selectedValues.length} selected`;
}

function SignalFilterMenu<T extends string>({
  label,
  allLabel,
  values,
  selectedValues,
  labelForValue,
  onChange,
}: {
  label: string;
  allLabel: string;
  values: T[];
  selectedValues: T[];
  labelForValue: (value: T) => string;
  onChange: (values: T[]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-between"
          />
        }
      >
        <ListFilter aria-hidden="true" data-icon="inline-start" />
        {filterButtonLabel({ allLabel, selectedValues, labelForValue })}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={selectedValues.length === 0}
            onCheckedChange={() => onChange([])}
          >
            {allLabel}
          </DropdownMenuCheckboxItem>
          {values.map((value) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={selectedValues.includes(value)}
              onCheckedChange={() =>
                onChange(toggleFilterValue(selectedValues, value))
              }
            >
              {labelForValue(value)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SignalEvidenceRows({
  signal,
  onResultFilterSelect,
}: {
  signal: StrategicSignal;
  onResultFilterSelect?: (filter: OrganisationResultFilter) => void;
}) {
  return (
    <div className="grid gap-1 rounded-md bg-muted p-2 text-xs">
      {signal.evidence.map((item) => {
        const rowContent = (
          <>
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium tabular-nums text-foreground">
              {item.value}
            </span>
          </>
        );

        if (item.resultFilter && onResultFilterSelect) {
          return (
            <button
              key={`${signal.id}-${item.label}`}
              type="button"
              className="flex items-center justify-between gap-3 rounded-sm px-1.5 py-1 text-left transition hover:bg-background"
              onClick={() => onResultFilterSelect(item.resultFilter ?? {})}
            >
              {rowContent}
            </button>
          );
        }

        return (
          <div
            key={`${signal.id}-${item.label}`}
            className="flex items-center justify-between gap-3 px-1.5 py-1"
          >
            {rowContent}
          </div>
        );
      })}
    </div>
  );
}

function SignalCard({
  signal,
  onResultFilterSelect,
}: {
  signal: StrategicSignal;
  onResultFilterSelect?: (filter: OrganisationResultFilter) => void;
}) {
  return (
    <article className="grid gap-2 rounded-lg border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{categoryLabels[signal.category]}</Badge>
            <Badge
              variant="outline"
              className={severityBadgeClassName[signal.severity]}
            >
              {signal.severity}
            </Badge>
            <Badge
              variant="outline"
              className={confidenceBadgeClassName[signal.confidence]}
            >
              {signal.confidence} confidence
            </Badge>
          </div>
          <h3 className="text-sm font-medium text-foreground">
            {signal.title}
          </h3>
        </div>
      </div>

      <div className="grid gap-2 text-sm leading-5 text-muted-foreground">
        <p>{signal.observation}</p>
        <p>{signal.interpretation}</p>
      </div>

      <SignalEvidenceRows
        signal={signal}
        onResultFilterSelect={onResultFilterSelect}
      />

      <div className="grid gap-1 text-xs leading-5 text-muted-foreground">
        <p>{signal.caveat}</p>
        <p className="font-medium text-foreground">
          {signal.recommendedAction}
        </p>
      </div>
    </article>
  );
}

function SignalGroup({
  title,
  signals,
  onResultFilterSelect,
}: {
  title: string;
  signals: StrategicSignal[];
  onResultFilterSelect?: (filter: OrganisationResultFilter) => void;
}) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-2">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <div className="grid gap-2">
        {signals.map((signal) => (
          <SignalCard
            key={signal.id}
            signal={signal}
            onResultFilterSelect={onResultFilterSelect}
          />
        ))}
      </div>
    </section>
  );
}

export function InsightCards({
  metrics,
  activeFilter,
  onMaterialToggle,
  onRoleToggle,
  onGapCellSelect,
  onResultFilterSelect,
  analysisOpen,
  analysisFilter,
  onAnalysisOpenChange,
  onAnalysisFilterChange,
  className,
}: {
  metrics: LandscapeMetrics;
  activeFilter: OrganisationResultFilter;
  onMaterialToggle: (material: MaterialCategory) => void;
  onRoleToggle: (role: SupplyChainRole) => void;
  onGapCellSelect: (role: SupplyChainRole, material: MaterialCategory) => void;
  onResultFilterSelect: (filter: OrganisationResultFilter) => void;
  analysisOpen?: boolean;
  analysisFilter?: OrganisationResultFilter;
  onAnalysisOpenChange?: (open: boolean) => void;
  onAnalysisFilterChange?: (filter: OrganisationResultFilter) => void;
  className?: string;
}) {
  const globalHeuristicAnalysis = useMemo(
    () => buildHeuristicAnalysis(metrics, {}),
    [metrics],
  );
  const [internalAnalysisOpen, setInternalAnalysisOpen] = useState(false);
  const [internalAnalysisFilter, setInternalAnalysisFilter] =
    useState<OrganisationResultFilter>({});
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<SignalCategory[]>(
    [],
  );
  const [selectedSeverities, setSelectedSeverities] = useState<SignalSeverity[]>(
    [],
  );
  const [selectedConfidences, setSelectedConfidences] = useState<
    SignalConfidence[]
  >([]);
  const isAnalysisOpen = analysisOpen ?? internalAnalysisOpen;
  const currentAnalysisFilter = analysisFilter ?? internalAnalysisFilter;
  const heuristicAnalysis = useMemo(
    () => buildHeuristicAnalysis(metrics, currentAnalysisFilter),
    [currentAnalysisFilter, metrics],
  );
  const visibleGaps = metrics.insights.lowestGapCells;
  const dominantMaterial = metrics.insights.dominantMaterial;
  const weakestRole = metrics.insights.weakestRole;
  const selectedMaterials = activeFilter.materials ?? [];
  const selectedRoles = activeFilter.supplyChainRoles ?? [];
  const analysisLoading = isAnalysisOpen && analysisProgress < 100;
  const materialFocusTitle =
    globalHeuristicAnalysis.materialSignals.find(
      (signal) => signal.id === "material-focus",
    )?.title ?? "Leading material focus";
  const availableCategories = useMemo(
    () =>
      Array.from(
        new Set(heuristicAnalysis.signals.map((signal) => signal.category)),
      ),
    [heuristicAnalysis.signals],
  );
  const availableSeverities = useMemo(
    () =>
      Array.from(
        new Set(heuristicAnalysis.signals.map((signal) => signal.severity)),
      ),
    [heuristicAnalysis.signals],
  );
  const availableConfidences = useMemo(
    () =>
      Array.from(
        new Set(heuristicAnalysis.signals.map((signal) => signal.confidence)),
      ),
    [heuristicAnalysis.signals],
  );

  function matchesSignalFilters(signal: StrategicSignal) {
    return (
      (selectedCategories.length === 0 ||
        selectedCategories.includes(signal.category)) &&
      (selectedSeverities.length === 0 ||
        selectedSeverities.includes(signal.severity)) &&
      (selectedConfidences.length === 0 ||
        selectedConfidences.includes(signal.confidence))
    );
  }

  function filterSignals(signals: StrategicSignal[]) {
    return signals.filter(matchesSignalFilters);
  }

  const filteredSignalCount = heuristicAnalysis.signals.filter(
    matchesSignalFilters,
  ).length;
  const hasSignalFilters =
    selectedCategories.length > 0 ||
    selectedSeverities.length > 0 ||
    selectedConfidences.length > 0;

  function resetSignalFilters() {
    setSelectedCategories([]);
    setSelectedSeverities([]);
    setSelectedConfidences([]);
  }

  useEffect(() => {
    if (!isAnalysisOpen) {
      return;
    }

    const progressTimer = window.setInterval(() => {
      setAnalysisProgress((current) => Math.min(current + 10, 100));
    }, 100);
    const completionTimer = window.setTimeout(() => {
      setAnalysisProgress(100);
    }, 1000);

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(completionTimer);
    };
  }, [isAnalysisOpen]);

  function updateAnalysisOpen(open: boolean) {
    if (!open) {
      setAnalysisProgress(0);
      resetSignalFilters();
    }

    onAnalysisOpenChange?.(open);

    if (analysisOpen === undefined) {
      setInternalAnalysisOpen(open);
    }
  }

  function updateAnalysisFilter(filter: OrganisationResultFilter) {
    onAnalysisFilterChange?.(filter);

    if (analysisFilter === undefined) {
      setInternalAnalysisFilter(filter);
    }
  }

  function openAnalysis(filter: OrganisationResultFilter) {
    setAnalysisProgress(0);
    resetSignalFilters();
    updateAnalysisFilter(filter);
    updateAnalysisOpen(true);
  }

  function selectResultFilter(filter: OrganisationResultFilter) {
    updateAnalysisOpen(false);
    onResultFilterSelect(filter);
  }

  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles aria-hidden="true" size={17} />
          {HEURISTIC_PANEL_LABELS.mainTitle}
        </CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              openAnalysis({});
            }}
          >
            {HEURISTIC_PANEL_LABELS.showAll}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 px-3 pb-3 pt-0 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
        <section className="grid gap-2.5">
          <button
            type="button"
            disabled={!dominantMaterial}
            onClick={() => {
              if (dominantMaterial) {
                onMaterialToggle(dominantMaterial.key);
              }
            }}
            className={cn(
              "rounded-md p-1.5 text-left transition hover:bg-muted disabled:pointer-events-none disabled:opacity-70",
              dominantMaterial &&
                selectedMaterials.includes(dominantMaterial.key)
                ? "bg-muted ring-1 ring-primary/30"
                : undefined,
            )}
          >
            <p className="text-sm font-medium text-foreground">
              {materialFocusTitle}
            </p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {dominantMaterial?.key ? (
                <span className="inline-block rounded-md bg-primary/10 px-2 font-medium text-primary">
                  {dominantMaterial.key}
                </span>
              ) : (
                "No material"
              )}{" "}
              has the widest coverage in the current spreadsheet with{" "}
              {dominantMaterial?.count ?? 0} linked organisations.
            </p>
          </button>
          <button
            type="button"
            disabled={!weakestRole}
            onClick={() => {
              if (weakestRole) {
                onRoleToggle(weakestRole.key);
              }
            }}
            className={cn(
              "rounded-md p-1.5 text-left transition hover:bg-muted disabled:pointer-events-none disabled:opacity-70",
              weakestRole && selectedRoles.includes(weakestRole.key)
                ? "bg-muted ring-1 ring-primary/30"
                : undefined,
            )}
          >
            <p className="text-sm font-medium text-foreground">
              Lowest represented role
            </p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {weakestRole?.key ? (
                <span className="inline-block rounded-md bg-primary/10 px-2 font-medium text-primary">
                  {weakestRole.key}
                </span>
              ) : (
                "No role"
              )}{" "}
              appears least represented among populated supply-chain roles in this
              dataset.
            </p>
          </button>
        </section>

        <section className="grid gap-2.5 border-t pt-3 md:border-l md:border-t-0 md:pl-3 md:pt-0">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Layers3 aria-hidden="true" size={17} />
            {HEURISTIC_PANEL_LABELS.gapTitle}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            These role and material combinations have the fewest records in the
            current dataset.
          </p>
          <div className="grid gap-2">
            {visibleGaps.map((cell) => {
              const selected =
                selectedRoles.includes(cell.role) &&
                selectedMaterials.includes(cell.material);

              return (
                <button
                  type="button"
                  key={`${cell.role}-${cell.material}`}
                  onClick={() => onGapCellSelect(cell.role, cell.material)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md bg-muted px-2.5 py-1.5 text-left transition hover:bg-accent",
                    selected ? "ring-1 ring-primary/30" : undefined,
                  )}
                >
                  <span className="min-w-0 text-sm font-medium text-foreground">
                    {cell.role} x {cell.material}
                  </span>
                  <Badge variant="outline" className="tabular-nums">
                    {cell.count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </section>
      </CardContent>

      <Dialog
        open={isAnalysisOpen}
        onOpenChange={updateAnalysisOpen}
      >
        <DialogContent className="overflow-hidden p-0 sm:max-w-3xl">
          <div className="grid max-h-[min(760px,calc(100vh-2rem))] gap-4 overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>{HEURISTIC_PANEL_LABELS.dialogTitle}</DialogTitle>
            <DialogDescription className="pr-8">
              {HEURISTIC_PANEL_LABELS.dialogDescription}
            </DialogDescription>
          </DialogHeader>

          {analysisLoading ? (
            <div className="grid min-h-48 content-center gap-3">
              <Progress value={analysisProgress}>
                <ProgressLabel>
                  {HEURISTIC_PANEL_LABELS.loadingLabel}
                </ProgressLabel>
              </Progress>
              <p className="text-sm text-muted-foreground">
                Diagnosing counts, gaps, and caveats from the active
                spreadsheet.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-2 rounded-lg border bg-muted/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {filteredSignalCount} of {heuristicAnalysis.signals.length}{" "}
                    signals shown
                  </p>
                  {hasSignalFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetSignalFilters}
                    >
                      <RotateCcw aria-hidden="true" data-icon="inline-start" />
                      Reset
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <SignalFilterMenu<SignalCategory>
                    label="Category"
                    allLabel="All categories"
                    values={availableCategories}
                    selectedValues={selectedCategories}
                    labelForValue={(value) => categoryLabels[value]}
                    onChange={setSelectedCategories}
                  />
                  <SignalFilterMenu<SignalSeverity>
                    label="Tone"
                    allLabel="All tones"
                    values={availableSeverities}
                    selectedValues={selectedSeverities}
                    labelForValue={(value) => severityLabels[value]}
                    onChange={setSelectedSeverities}
                  />
                  <SignalFilterMenu<SignalConfidence>
                    label="Confidence"
                    allLabel="All confidence"
                    values={availableConfidences}
                    selectedValues={selectedConfidences}
                    labelForValue={(value) => confidenceLabels[value]}
                    onChange={setSelectedConfidences}
                  />
                </div>
              </div>
              <SignalGroup
                title="Ecosystem overview"
                signals={filterSignals(heuristicAnalysis.overviewSignals)}
                onResultFilterSelect={selectResultFilter}
              />
              <SignalGroup
                title="UK ecosystem"
                signals={filterSignals(heuristicAnalysis.ukSignals)}
                onResultFilterSelect={selectResultFilter}
              />
              <SignalGroup
                title="Regional interpretation"
                signals={filterSignals(heuristicAnalysis.regionalSignals)}
                onResultFilterSelect={selectResultFilter}
              />
              <SignalGroup
                title="Supply-chain structure"
                signals={filterSignals(heuristicAnalysis.supplyChainSignals)}
                onResultFilterSelect={selectResultFilter}
              />
              <SignalGroup
                title="Material intelligence"
                signals={filterSignals(heuristicAnalysis.materialSignals)}
                onResultFilterSelect={selectResultFilter}
              />
              <SignalGroup
                title={HEURISTIC_PANEL_LABELS.gapTitle}
                signals={filterSignals(heuristicAnalysis.gapSignals)}
                onResultFilterSelect={selectResultFilter}
              />
              <SignalGroup
                title="Opportunity signals"
                signals={filterSignals(heuristicAnalysis.opportunitySignals)}
                onResultFilterSelect={selectResultFilter}
              />
              <SignalGroup
                title="Data quality notes"
                signals={filterSignals(heuristicAnalysis.dataQualitySignals)}
                onResultFilterSelect={selectResultFilter}
              />
              <SignalGroup
                title="Methodology notes"
                signals={filterSignals(heuristicAnalysis.methodologySignals)}
                onResultFilterSelect={selectResultFilter}
              />
              {filteredSignalCount === 0 && (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  No heuristic signals match the current filter combination.
                </p>
              )}
              <p className="border-t pt-3 text-xs leading-5 text-muted-foreground">
                {heuristicAnalysis.globalCaveat}
              </p>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
