import { materialCategories } from "@/lib/landscape-core";

import {
  LOW_CELL_COUNT,
  countRole,
  downstreamRoles,
  makeResultFilter,
  slugify,
  upstreamRoles,
  type HeuristicRuleContext,
} from "./context";
import type { StrategicSignal } from "./types";

export function buildGapSignals(context: HeuristicRuleContext): StrategicSignal[] {
  const signals: StrategicSignal[] = [];
  const positiveLowCells = context.gapCells
    .filter((cell) => cell.count > 0)
    .sort((a, b) => a.count - b.count)
    .slice(0, 3);

  signals.push(
    ...positiveLowCells.map<StrategicSignal>((cell, index) => ({
      id: `low-coverage-${slugify(`${cell.role}-${cell.material}`)}`,
      category: "gap-signal",
      severity: cell.count <= 1 ? "warning" : "watch",
      confidence: "high",
      title: `${cell.role} x ${cell.material}`,
      observation: `${cell.role} x ${cell.material} is underrepresented in the current dataset.`,
      interpretation:
        "This may indicate a data enrichment target or a supply-chain area worth validating with domain experts.",
      evidence: [
        {
          label: "Current records",
          value: `${cell.count}`,
          resultFilter: makeResultFilter(context, {
            supplyChainRoles: [cell.role],
            materials: [cell.material],
          }),
        },
      ],
      caveat:
        "This is a dataset coverage signal, not proof of missing UK or global capability.",
      recommendedAction:
        "Inspect matching organisations and check whether additional records should be added.",
      priority: 72 - index,
    })),
  );

  const lowSubstrateMaterials = materialCategories
    .map((material) => ({
      material,
      count:
        context.gapCells.find(
          (cell) => cell.role === "Substrate" && cell.material === material,
        )?.count ?? 0,
    }))
    .filter((item) => item.count <= LOW_CELL_COUNT);

  if (context.total > 0 && lowSubstrateMaterials.length >= 2) {
    signals.push({
      id: "repeated-substrate-underrepresentation",
      category: "gap-signal",
      severity: "warning",
      confidence: "high",
      title: "Substrate is repeatedly underrepresented",
      observation:
        "Substrate appears sparse across multiple material categories in the active view.",
      interpretation:
        "This may indicate an upstream mapping gap or a strategic supply-chain area requiring further validation.",
      evidence: [
        ...lowSubstrateMaterials.slice(0, 3).map((item) => ({
          label: `Substrate x ${item.material}`,
          value: `${item.count}`,
          resultFilter: makeResultFilter(context, {
            supplyChainRoles: ["Substrate"],
            materials: [item.material],
          }),
        })),
      ],
      caveat:
        "Repeated low substrate coverage is a dataset signal, not proof that substrate capability is absent.",
      recommendedAction:
        "Review substrate-related organisations and enrich the dataset if relevant upstream actors are missing.",
      priority: 102,
    });
  }

  const upstreamCount = upstreamRoles.reduce(
    (total, role) => total + countRole(context.organisations, role),
    0,
  );
  const downstreamCount = downstreamRoles.reduce(
    (total, role) => total + countRole(context.organisations, role),
    0,
  );

  if (downstreamCount > 0 && upstreamCount / downstreamCount < 0.6) {
    signals.push({
      id: "upstream-gap-pattern",
      category: "gap-signal",
      severity: "warning",
      confidence: "medium",
      title: "Upstream coverage is weaker than downstream coverage",
      observation:
        "Equipment, substrate, and epiwafer role links are materially lower than downstream role links.",
      interpretation:
        "This may point to an upstream data enrichment priority or a supply-chain structure that needs expert validation.",
      evidence: [
        {
          label: "Upstream role links",
          value: `${upstreamCount}`,
          resultFilter: makeResultFilter(context, {
            supplyChainRoles: upstreamRoles,
          }),
        },
        {
          label: "Downstream role links",
          value: `${downstreamCount}`,
          resultFilter: makeResultFilter(context, {
            supplyChainRoles: downstreamRoles,
          }),
        },
      ],
      caveat:
        "The dataset does not verify operating capacity or prove an actual upstream market gap.",
      recommendedAction:
        "Validate upstream records and compare them with manufacturing, packaging, and end-user activity.",
      priority: 98,
    });
  }

  return signals;
}
