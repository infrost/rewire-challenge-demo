import {
  BROAD_ROLE_COVERAGE,
  NARROW_ROLE_COVERAGE,
  downstreamRoles,
  makeResultFilter,
  populated,
  sortByCount,
  sumCounts,
  upstreamRoles,
  type HeuristicRuleContext,
} from "./context";
import type { SignalSeverity, StrategicSignal } from "./types";

function weakestRoleSeverity(weakestCount: number, strongestCount: number) {
  const ratio = strongestCount > 0 ? weakestCount / strongestCount : 1;

  if (ratio < 0.25) {
    return "warning" satisfies SignalSeverity;
  }

  if (ratio < 0.5) {
    return "watch" satisfies SignalSeverity;
  }

  return "neutral" satisfies SignalSeverity;
}

export function buildSupplyChainSignals(
  context: HeuristicRuleContext,
): StrategicSignal[] {
  const signals: StrategicSignal[] = [];
  const populatedRoles = populated(context.roleCounts);
  const rankedRoles = sortByCount(populatedRoles);
  const strongestRole = rankedRoles[0];
  const weakestRole = rankedRoles.at(-1);
  const upstreamCount = sumCounts(context.roleCounts, upstreamRoles);
  const downstreamCount = sumCounts(context.roleCounts, downstreamRoles);

  if (strongestRole) {
    signals.push({
      id: "most-represented-role",
      category: "supply-chain-structure",
      severity: "neutral",
      confidence: "high",
      title: "Most represented supply-chain role",
      observation: `${strongestRole.key} has the highest role coverage in the active view.`,
      interpretation:
        "This shows where the current landscape is most visibly concentrated across the power electronics value chain.",
      evidence: [
        {
          label: "Linked organisations",
          value: `${strongestRole.count}`,
          resultFilter: makeResultFilter(context, {
            supplyChainRoles: [strongestRole.key],
          }),
        },
      ],
      caveat:
        "Organisation count does not measure capacity, investment, or market strength.",
      recommendedAction:
        "Inspect the most represented role by material to understand where activity is concentrated.",
      priority: 78,
    });
  }

  if (weakestRole && strongestRole && weakestRole.key !== strongestRole.key) {
    signals.push({
      id: "lowest-represented-role",
      category: "supply-chain-structure",
      severity: weakestRoleSeverity(weakestRole.count, strongestRole.count),
      confidence: "high",
      title: "Lowest represented role",
      observation: `${weakestRole.key} appears least represented among populated supply-chain roles in this dataset.`,
      interpretation:
        "This may indicate an upstream data enrichment priority or a strategic supply-chain area requiring further validation.",
      evidence: [
        {
          label: "Weakest role records",
          value: `${weakestRole.count}`,
          resultFilter: makeResultFilter(context, {
            supplyChainRoles: [weakestRole.key],
          }),
        },
        {
          label: "Strongest role records",
          value: `${strongestRole.count}`,
          resultFilter: makeResultFilter(context, {
            supplyChainRoles: [strongestRole.key],
          }),
        },
      ],
      caveat: "Low dataset coverage is not proof that capability is absent.",
      recommendedAction: `Review ${weakestRole.key.toLowerCase()}-related records and validate whether additional actors should be added.`,
      priority: 88,
    });
  }

  if (downstreamCount > upstreamCount && downstreamCount >= 10) {
    signals.push({
      id: "downstream-weighted-landscape",
      category: "supply-chain-structure",
      severity: "watch",
      confidence: "medium",
      title: "The landscape is downstream-weighted",
      observation:
        "Downstream and applied roles have more linked organisations than upstream roles in the active view.",
      interpretation:
        "The current dataset may show stronger visibility around application, manufacturing, packaging, or end-use activity than upstream wafer and substrate activity.",
      evidence: [
        {
          label: "Downstream role links",
          value: `${downstreamCount}`,
          resultFilter: makeResultFilter(context, {
            supplyChainRoles: downstreamRoles,
          }),
        },
        {
          label: "Upstream role links",
          value: `${upstreamCount}`,
          resultFilter: makeResultFilter(context, {
            supplyChainRoles: upstreamRoles,
          }),
        },
      ],
      caveat:
        "This is a dataset structure signal, not a verified supply-chain capacity assessment.",
      recommendedAction:
        "Compare upstream and downstream records by material to validate whether the imbalance is a data gap or an ecosystem pattern.",
      priority: 104,
    });
  }

  if (populatedRoles.length >= BROAD_ROLE_COVERAGE) {
    signals.push({
      id: "broad-role-coverage",
      category: "supply-chain-structure",
      severity: "positive",
      confidence: "high",
      title: "The active view covers much of the supply chain",
      observation: `${populatedRoles.length} supply-chain roles are represented in the active view.`,
      interpretation:
        "This supports broader ecosystem interpretation and role-by-role comparison.",
      evidence: [
        {
          label: "Covered roles",
          value: `${populatedRoles.length}`,
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat:
        "Role coverage depends on spreadsheet classification completeness.",
      recommendedAction:
        "Use role filters to compare where the chain is strongest and weakest.",
      priority: 64,
    });
  } else if (context.total > 0 && populatedRoles.length <= NARROW_ROLE_COVERAGE) {
    signals.push({
      id: "narrow-role-coverage",
      category: "supply-chain-structure",
      severity: "watch",
      confidence: "medium",
      title: "The selected view is role-specialised",
      observation: `Only ${populatedRoles.length} supply-chain roles are represented in the active view.`,
      interpretation:
        "This may reflect a specialised technology area or incomplete role classification.",
      evidence: [
        {
          label: "Covered roles",
          value: `${populatedRoles.length}`,
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat:
        "A narrow role spread is not inherently negative if the active view is intentionally specialised.",
      recommendedAction:
        "Check related roles and missing role tags before drawing ecosystem conclusions.",
      priority: 74,
    });
  }

  return signals;
}
