import type { LandscapeMetrics } from "@/lib/landscape-core";
import type { OrganisationResultFilter } from "@/lib/landscape-results";

import {
  HEURISTIC_GLOBAL_CAVEAT,
  HEURISTIC_PANEL_LABELS,
} from "./constants";
import {
  createHeuristicRuleContext,
  rankSignals,
} from "./context";
import {
  buildDataQualitySignals,
  buildDataQualityWatchlist,
} from "./data-quality-rules";
import { buildGapSignals } from "./gap-rules";
import { buildMaterialSignals } from "./material-rules";
import { buildMethodologySignals } from "./methodology-rules";
import { buildOpportunitySignals } from "./opportunity-rules";
import { buildOverviewSignals } from "./overview-rules";
import { buildRegionalSignals } from "./regional-rules";
import { buildSupplyChainSignals } from "./supply-chain-rules";
import { buildUkSignals } from "./uk-rules";
import type { HeuristicAnalysis, StrategicSignal } from "./types";

function limitSignals(signals: StrategicSignal[], limit: number) {
  return rankSignals(signals).slice(0, limit);
}

export function buildHeuristicAnalysis(
  metrics: LandscapeMetrics,
  activeFilter: OrganisationResultFilter = {},
): HeuristicAnalysis {
  const context = createHeuristicRuleContext(metrics, activeFilter);
  const overviewSignals = limitSignals(buildOverviewSignals(context), 3);
  const ukSignals = limitSignals(buildUkSignals(context), 3);
  const regionalSignals = limitSignals(buildRegionalSignals(context), 5);
  const supplyChainSignals = limitSignals(buildSupplyChainSignals(context), 4);
  const materialSignals = limitSignals(buildMaterialSignals(context), 4);
  const gapSignals = limitSignals(buildGapSignals(context), 5);
  const opportunitySignals = limitSignals(buildOpportunitySignals(context), 5);
  const dataQualitySignals = limitSignals(buildDataQualitySignals(context), 3);
  const methodologySignals = limitSignals(buildMethodologySignals(context), 1);
  const signals = rankSignals([
    ...overviewSignals,
    ...ukSignals,
    ...regionalSignals,
    ...supplyChainSignals,
    ...materialSignals,
    ...gapSignals,
    ...opportunitySignals,
    ...dataQualitySignals,
    ...methodologySignals,
  ]);

  return {
    signals,
    keySignals: signals.slice(0, 4),
    overviewSignals,
    ukSignals,
    regionalSignals,
    supplyChainSignals,
    materialSignals,
    gapSignals,
    opportunitySignals,
    dataQualitySignals,
    methodologySignals,
    dataQualityWatchlist: buildDataQualityWatchlist(context),
    globalCaveat: HEURISTIC_GLOBAL_CAVEAT,
  };
}

export { HEURISTIC_GLOBAL_CAVEAT, HEURISTIC_PANEL_LABELS };
export type {
  HeuristicAnalysis,
  SignalAction,
  SignalCategory,
  SignalConfidence,
  SignalEvidence,
  SignalSeverity,
  StrategicSignal,
} from "./types";
