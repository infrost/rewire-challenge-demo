import {
  HIGH_UK_SHARE,
  formatPercent,
  makeResultFilter,
  share,
  type HeuristicRuleContext,
} from "./context";
import type { StrategicSignal } from "./types";

export function buildOverviewSignals(
  context: HeuristicRuleContext,
): StrategicSignal[] {
  const signals: StrategicSignal[] = [];
  const ukCount = context.organisations.filter(
    (organisation) => organisation.ukPresence,
  ).length;
  const ukShare = share(ukCount, context.total);

  if (context.hasActiveFilter && context.total === 0) {
    signals.push({
      id: "selected-view-has-no-matches",
      category: "ecosystem-overview",
      severity: "warning",
      confidence: "high",
      title: "The selected view has no matching organisations",
      observation:
        "The active filters do not currently match any records in the loaded spreadsheet.",
      interpretation:
        "This is usually a filter or classification coverage signal rather than evidence that capability is absent.",
      evidence: [
        {
          label: "Current records",
          value: "0",
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat:
        "Zero results should be interpreted as a spreadsheet coverage outcome, not a definitive ecosystem statement.",
      recommendedAction:
        "Broaden the filters or inspect missing role and material classifications.",
      priority: 120,
    });
  }

  if (context.total > 0 && ukShare >= HIGH_UK_SHARE) {
    signals.push({
      id: "uk-weighted-landscape",
      category: "ecosystem-overview",
      severity: "neutral",
      confidence: "high",
      title: "The current landscape is UK-weighted",
      observation: `${formatPercent(ukShare)} of records in the active view are marked as UK-based, UK-present, or UK-relevant.`,
      interpretation:
        "This makes the tool especially useful for understanding the UK ecosystem, while global comparisons should stay indicative.",
      evidence: [
        {
          label: "UK-relevant records",
          value: `${ukCount}`,
          resultFilter: makeResultFilter(context, { ukPresence: true }),
        },
        {
          label: "Current records",
          value: `${context.total}`,
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat:
        "UK weighting may reflect the purpose and scope of the dataset rather than actual global market distribution.",
      recommendedAction:
        "Use the UK ecosystem signals to inspect strengths, weak spots, and translation opportunities.",
      priority: 96,
    });
  }

  return signals;
}
