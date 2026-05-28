import {
  buildHeuristicAnalysis,
  type StrategicSignal,
} from "@/lib/heuristic-engine";
import {
  buildFilteredMapClusters,
  buildResultContext,
  filterOrganisations,
  getResultFilterTags,
  getTopOrganisations,
  normalizeResultFilter,
  type OrganisationResultFilter,
} from "@/lib/landscape-results";
import {
  materialCategories,
  organisationTypes,
  supplyChainRoles,
  type LandscapeMetrics,
  type MapRegion,
  type Organisation,
} from "@/lib/landscape-core";
import type {
  RewireAgentCoverageItem,
  RewireAgentIntent,
  RewireAgentStrategicSignal,
  RewireAgentToolName,
  RewireAgentToolOutput,
  RewireAgentViewContext,
} from "@/lib/rewire-agent/types";

const remitLimit = 220;

function percentage(count: number, total: number) {
  return Math.round((count / Math.max(total, 1)) * 100);
}

function truncateText(value: string, limit: number) {
  const trimmed = value.replace(/\s+/g, " ").trim();

  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}...` : trimmed;
}

function countCoverage<T extends string>(
  keys: readonly T[],
  organisations: Organisation[],
  picker: (organisation: Organisation) => readonly T[],
): RewireAgentCoverageItem<T>[] {
  const total = organisations.length;

  return keys
    .map((key) => {
      const count = organisations.filter((organisation) =>
        picker(organisation).includes(key),
      ).length;

      return {
        key,
        count,
        share: percentage(count, total),
      };
    })
    .sort((a, b) => b.count - a.count);
}

function mapSignal(signal: StrategicSignal): RewireAgentStrategicSignal {
  return {
    id: signal.id,
    category: signal.category,
    severity: signal.severity,
    confidence: signal.confidence,
    title: signal.title,
    observation: signal.observation,
    interpretation: signal.interpretation,
    evidence: signal.evidence.map((item) => ({
      label: item.label,
      value: item.value,
    })),
    caveat: signal.caveat,
    recommendedAction: signal.recommendedAction,
  };
}

export function buildRewireAgentViewContext({
  metrics,
  sourceName,
  activeFilter,
  activeRegion,
}: {
  metrics: LandscapeMetrics;
  sourceName: string;
  activeFilter: OrganisationResultFilter;
  activeRegion: MapRegion | null;
}): RewireAgentViewContext {
  const scopedFilter = normalizeResultFilter({
    ...activeFilter,
    regions: activeRegion ? [activeRegion] : activeFilter.regions,
  });
  const scopedOrganisations = filterOrganisations(
    metrics.organisations,
    scopedFilter,
  );
  const regionalDistribution = buildFilteredMapClusters(
    metrics.organisations,
    activeFilter,
  ).map((cluster) => ({
    region: cluster.region,
    count: cluster.count,
    share: cluster.share,
    typeCounts: cluster.typeCounts,
  }));
  const resultContext = buildResultContext(scopedFilter);
  const analysis = buildHeuristicAnalysis(metrics, scopedFilter);

  return {
    sourceName,
    scope: {
      activeRegion,
      resultContextLabel: resultContext?.label ?? "All Results",
      generatedAt: new Date().toISOString(),
    },
    activeFilters: {
      filter: normalizeResultFilter(activeFilter),
      tags: getResultFilterTags(activeFilter),
    },
    currentResultCount: {
      selected: scopedOrganisations.length,
      total: metrics.organisations.length,
      share: percentage(scopedOrganisations.length, metrics.organisations.length),
    },
    regionalDistribution,
    supplyChainProfile: countCoverage(
      supplyChainRoles,
      scopedOrganisations,
      (organisation) => organisation.supplyChainRoles,
    ),
    materialProfile: countCoverage(
      materialCategories,
      scopedOrganisations,
      (organisation) => organisation.materials,
    ),
    actorMix: countCoverage(organisationTypes, scopedOrganisations, (
      organisation,
    ) => [organisation.type]),
    topOrganisations: getTopOrganisations(
      metrics.organisations,
      scopedFilter,
      6,
    ).map((organisation) => ({
      name: organisation.name,
      type: organisation.type,
      location: organisation.location,
      ukPresence: organisation.ukPresence,
      supplyChainRoles: organisation.supplyChainRoles,
      materials: organisation.materials,
      remit: truncateText(organisation.remit, remitLimit),
    })),
    strategicSignals: analysis.signals
      .filter((signal) => signal.category !== "methodology-caveat")
      .slice(0, 12)
      .map(mapSignal),
    dataCaveats: {
      globalCaveat: analysis.globalCaveat,
      dataQualityWatchlist: analysis.dataQualityWatchlist,
      missingRole: metrics.insights.dataQuality.missingRole,
      missingMaterial: metrics.insights.dataQuality.missingMaterial,
      missingLink: metrics.insights.dataQuality.missingLink,
      methodology: analysis.methodologySignals.map((signal) => signal.caveat),
    },
  };
}

export function buildRewireAgentToolOutput({
  toolName,
  input,
  context,
}: {
  toolName: RewireAgentToolName;
  input: unknown;
  context: RewireAgentViewContext;
}): RewireAgentToolOutput {
  const toolInput =
    input && typeof input === "object"
      ? (input as { userFocus?: unknown })
      : {};
  const intent: RewireAgentIntent =
    toolName === "rewire_summarize_insights"
      ? "summarize_insights"
      : "explain_view";

  return {
    ok: true,
    intent,
    userFocus:
      typeof toolInput.userFocus === "string" ? toolInput.userFocus : "",
    context,
  };
}
