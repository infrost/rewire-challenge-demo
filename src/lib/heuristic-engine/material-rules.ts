import { materialCategories } from "@/lib/landscape-core";

import {
  BROAD_MATERIAL_COVERAGE,
  DOMINANT_SHARE,
  WORKING_GROUP_MIN_ROLES,
  formatPercent,
  makeResultFilter,
  materialRoleCoverage,
  populated,
  share,
  sortByCount,
  type HeuristicRuleContext,
} from "./context";
import type { StrategicSignal } from "./types";

export function buildMaterialSignals(
  context: HeuristicRuleContext,
): StrategicSignal[] {
  const signals: StrategicSignal[] = [];
  const populatedMaterials = populated(context.materialCounts);
  const rankedMaterials = sortByCount(populatedMaterials);
  const topMaterial = rankedMaterials[0];
  const secondMaterial = rankedMaterials[1];
  const coveredMaterials = populatedMaterials.length;
  const materialCounts = new Map(
    context.materialCounts.map((item) => [item.key, item.count]),
  );

  if (topMaterial) {
    const topShare = share(topMaterial.count, context.total);
    const isDominant =
      topShare >= DOMINANT_SHARE ||
      (secondMaterial ? topMaterial.count >= secondMaterial.count * 1.15 : true);

    signals.push({
      id: "material-focus",
      category: "material-intelligence",
      severity: isDominant ? "positive" : "neutral",
      confidence: "high",
      title: isDominant ? "Dominant material focus" : "Leading material focus",
      observation: `${topMaterial.key} has the widest material coverage in the active view.`,
      interpretation: isDominant
        ? "This suggests a clear material concentration in the active dataset."
        : "The material lead is visible, but not strong enough to overstate as dominance.",
      evidence: [
        {
          label: "Linked organisations",
          value: `${topMaterial.count}`,
          resultFilter: makeResultFilter(context, {
            materials: [topMaterial.key],
          }),
        },
        ...(secondMaterial
          ? [
              {
                label: "Second material",
                value: `${secondMaterial.key}: ${secondMaterial.count}`,
                resultFilter: makeResultFilter(context, {
                  materials: [secondMaterial.key],
                }),
              },
            ]
          : []),
      ],
      caveat:
        "This does not measure market size, investment intensity, or technical maturity.",
      recommendedAction: `Inspect ${topMaterial.key} organisations by supply-chain role.`,
      priority: 86,
    });
  }

  const sicCount = materialCounts.get("SiC") ?? 0;
  const ganCount = materialCounts.get("GaN") ?? 0;
  const ga2o3Count = materialCounts.get("Ga2O3") ?? 0;
  const sortedMaterialCounts = [...context.materialCounts]
    .map((item) => item.count)
    .sort((a, b) => a - b);
  const median =
    sortedMaterialCounts[Math.floor(sortedMaterialCounts.length / 2)] ?? 0;

  if (sicCount > 0 && ganCount > 0 && sicCount >= median && ganCount >= median) {
    signals.push({
      id: "sic-gan-core-material-base",
      category: "material-intelligence",
      severity: "positive",
      confidence: "high",
      title: "SiC and GaN form the core material base",
      observation:
        "SiC and GaN both have substantial representation in the active landscape.",
      interpretation:
        "This suggests the visible ecosystem is anchored around established wide-bandgap material areas.",
      evidence: [
        {
          label: "SiC records",
          value: `${sicCount}`,
          resultFilter: makeResultFilter(context, { materials: ["SiC"] }),
        },
        {
          label: "GaN records",
          value: `${ganCount}`,
          resultFilter: makeResultFilter(context, { materials: ["GaN"] }),
        },
      ],
      caveat:
        "Material count does not measure technology maturity, market share, or investment intensity.",
      recommendedAction:
        "Compare SiC and GaN by role to identify where each material ecosystem is strongest.",
      priority: 84,
    });
  }

  if (ga2o3Count > 0 && ga2o3Count < sicCount && ga2o3Count < ganCount) {
    signals.push({
      id: "ga2o3-emerging-signal",
      category: "material-intelligence",
      severity: "watch",
      confidence: "medium",
      title: "Ga2O3 appears more specialised",
      observation:
        "Ga2O3 has fewer linked organisations than SiC and GaN in the active view.",
      interpretation:
        "This may indicate an earlier-stage or more specialised material area in the current spreadsheet.",
      evidence: [
        {
          label: "Ga2O3 records",
          value: `${ga2o3Count}`,
          resultFilter: makeResultFilter(context, { materials: ["Ga2O3"] }),
        },
        {
          label: "SiC records",
          value: `${sicCount}`,
          resultFilter: makeResultFilter(context, { materials: ["SiC"] }),
        },
        {
          label: "GaN records",
          value: `${ganCount}`,
          resultFilter: makeResultFilter(context, { materials: ["GaN"] }),
        },
      ],
      caveat:
        "Lower representation is not proof of lower technical importance or future potential.",
      recommendedAction:
        "Inspect Ga2O3 records for research, design, and downstream translation opportunities.",
      priority: 80,
    });
  }

  if (coveredMaterials >= BROAD_MATERIAL_COVERAGE) {
    signals.push({
      id: "material-diversity",
      category: "material-intelligence",
      severity: "positive",
      confidence: "high",
      title: "The active view spans multiple materials",
      observation: `${coveredMaterials} material categories are represented in the active view.`,
      interpretation:
        "This supports comparison across material ecosystems rather than a single-material reading.",
      evidence: [
        {
          label: "Covered materials",
          value: `${coveredMaterials}`,
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat:
        "Material coverage depends on spreadsheet tagging and may include broad or cross-cutting organisations.",
      recommendedAction:
        "Compare material coverage by role to identify specialisation and translation gaps.",
      priority: 58,
    });
  }

  const broadMaterial = materialCategories
    .map((material) => ({
      material,
      roles: materialRoleCoverage(context.organisations, material),
      count: materialCounts.get(material) ?? 0,
    }))
    .filter((item) => item.roles >= WORKING_GROUP_MIN_ROLES)
    .sort((a, b) => b.roles - a.roles || b.count - a.count)[0];

  if (broadMaterial) {
    signals.push({
      id: `material-role-breadth-${broadMaterial.material}`,
      category: "material-intelligence",
      severity: "positive",
      confidence: "medium",
      title: `${broadMaterial.material} spans multiple supply-chain roles`,
      observation: `${broadMaterial.material} is represented across ${broadMaterial.roles} supply-chain roles.`,
      interpretation:
        "This suggests a broader visible ecosystem around the material, which may support pathway analysis.",
      evidence: [
        {
          label: "Role coverage",
          value: `${broadMaterial.roles}`,
          resultFilter: makeResultFilter(context, {
            materials: [broadMaterial.material],
          }),
        },
        {
          label: "Material share",
          value: formatPercent(share(broadMaterial.count, context.total)),
          resultFilter: makeResultFilter(context, {
            materials: [broadMaterial.material],
          }),
        },
      ],
      caveat:
        "A broad material footprint does not prove coordinated value-chain integration.",
      recommendedAction:
        "Review the material by adjacent roles to find possible translation pathways.",
      priority: 76,
    });
  }

  return signals;
}
