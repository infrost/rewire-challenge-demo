import { materialCategories, supplyChainRoles } from "@/lib/landscape-core";

import {
  WORKING_GROUP_MIN_ORGS,
  WORKING_GROUP_MIN_ROLES,
  countMaterial,
  countMaterialByType,
  countMaterialRole,
  makeResultFilter,
  materialRoleCoverage,
  type HeuristicRuleContext,
} from "./context";
import type { SupplyChainRole } from "@/lib/landscape-core";
import type { StrategicSignal } from "./types";

const adjacentRolePairs: [SupplyChainRole, SupplyChainRole][] = supplyChainRoles
  .slice(0, -1)
  .map((role, index) => [role, supplyChainRoles[index + 1]]);

export function buildOpportunitySignals(
  context: HeuristicRuleContext,
): StrategicSignal[] {
  const signals: StrategicSignal[] = [];
  const overlap = materialCategories
    .map((material) => ({
      material,
      academic: countMaterialByType(context.organisations, material, "Academic"),
      industry: countMaterialByType(context.organisations, material, "Industry"),
    }))
    .filter((item) => item.academic > 0 && item.industry > 0)
    .sort((a, b) => b.academic + b.industry - (a.academic + a.industry))[0];

  if (overlap) {
    signals.push({
      id: `academic-industry-overlap-${overlap.material}`,
      category: "collaboration-opportunity",
      severity: "positive",
      confidence: "medium",
      title: `${overlap.material} shows academic-industry overlap`,
      observation: `Both academic and industry actors are linked to ${overlap.material} in the active landscape.`,
      interpretation:
        "This suggests potential for REWIRE to explore translation pathways between research capability and industrial activity.",
      evidence: [
        {
          label: "Academic actors",
          value: `${overlap.academic}`,
          resultFilter: makeResultFilter(context, {
            materials: [overlap.material],
            organisationTypes: ["Academic"],
          }),
        },
        {
          label: "Industry actors",
          value: `${overlap.industry}`,
          resultFilter: makeResultFilter(context, {
            materials: [overlap.material],
            organisationTypes: ["Industry"],
          }),
        },
      ],
      caveat:
        "Overlap does not prove existing collaboration or readiness to collaborate.",
      recommendedAction:
        "Review academic and industry organisations linked to the material and compare their supply-chain roles.",
      priority: 110,
    });
  }

  const adjacentPathway = materialCategories
    .flatMap((material) =>
      adjacentRolePairs.map(([firstRole, secondRole]) => ({
        material,
        firstRole,
        secondRole,
        firstCount: countMaterialRole(context.organisations, material, firstRole),
        secondCount: countMaterialRole(
          context.organisations,
          material,
          secondRole,
        ),
      })),
    )
    .filter((item) => item.firstCount > 0 && item.secondCount > 0)
    .sort(
      (a, b) =>
        b.firstCount + b.secondCount - (a.firstCount + a.secondCount),
    )[0];

  if (adjacentPathway) {
    signals.push({
      id: `adjacent-value-chain-pathway-${adjacentPathway.material}-${adjacentPathway.firstRole}-${adjacentPathway.secondRole}`,
      category: "collaboration-opportunity",
      severity: "positive",
      confidence: "low",
      title: `${adjacentPathway.material} has an adjacent value-chain pathway`,
      observation: `${adjacentPathway.firstRole} and ${adjacentPathway.secondRole} are both represented for ${adjacentPathway.material}.`,
      interpretation:
        "Adjacent role visibility can indicate a useful pathway for convening organisations around translation or supply-chain connection.",
      evidence: [
        {
          label: adjacentPathway.firstRole,
          value: `${adjacentPathway.firstCount}`,
          resultFilter: makeResultFilter(context, {
            materials: [adjacentPathway.material],
            supplyChainRoles: [adjacentPathway.firstRole],
          }),
        },
        {
          label: adjacentPathway.secondRole,
          value: `${adjacentPathway.secondCount}`,
          resultFilter: makeResultFilter(context, {
            materials: [adjacentPathway.material],
            supplyChainRoles: [adjacentPathway.secondRole],
          }),
        },
      ],
      caveat:
        "The dataset does not confirm existing relationships between adjacent-role organisations.",
      recommendedAction:
        "Compare adjacent-role organisations to identify candidate discussion themes or validation targets.",
      priority: 94,
    });
  }

  const workingGroup = materialCategories
    .map((material) => ({
      material,
      count: countMaterial(context.organisations, material),
      roles: materialRoleCoverage(context.organisations, material),
    }))
    .filter(
      (item) =>
        item.count >= WORKING_GROUP_MIN_ORGS &&
        item.roles >= WORKING_GROUP_MIN_ROLES,
    )
    .sort((a, b) => b.count - a.count || b.roles - a.roles)[0];

  if (workingGroup) {
    signals.push({
      id: `material-working-group-${workingGroup.material}`,
      category: "collaboration-opportunity",
      severity: "positive",
      confidence: "medium",
      title: `${workingGroup.material} may support a working group`,
      observation: `${workingGroup.material} has ${workingGroup.count} linked organisations across ${workingGroup.roles} roles.`,
      interpretation:
        "The combination of organisation count and role breadth may support a focused REWIRE working group or ecosystem review.",
      evidence: [
        {
          label: "Linked organisations",
          value: `${workingGroup.count}`,
          resultFilter: makeResultFilter(context, {
            materials: [workingGroup.material],
          }),
        },
        {
          label: "Covered roles",
          value: `${workingGroup.roles}`,
          resultFilter: makeResultFilter(context, {
            materials: [workingGroup.material],
          }),
        },
      ],
      caveat:
        "A working group signal is a convening prompt, not a recommendation of specific partners.",
      recommendedAction:
        "Inspect the material view and shortlist themes spanning academic, industrial, and supply-chain roles.",
      priority: 92,
    });
  }

  const bridgeActor = context.organisations
    .map((organisation) => ({
      organisation,
      score:
        organisation.materials.length + organisation.supplyChainRoles.length,
    }))
    .filter(
      (item) =>
        item.organisation.materials.length >= 2 ||
        item.organisation.supplyChainRoles.length >= 2,
    )
    .sort((a, b) => b.score - a.score)[0];

  if (bridgeActor) {
    signals.push({
      id: `bridge-actor-${bridgeActor.organisation.id}`,
      category: "collaboration-opportunity",
      severity: "neutral",
      confidence: "low",
      title: "Some organisations span multiple ecosystem dimensions",
      observation: `${bridgeActor.organisation.name} is tagged across multiple materials or supply-chain roles.`,
      interpretation:
        "Multi-tagged organisations can be useful starting points for exploring ecosystem connector roles.",
      evidence: [
        {
          label: "Materials",
          value: `${bridgeActor.organisation.materials.length}`,
          resultFilter: makeResultFilter(context, {
            search: bridgeActor.organisation.name,
          }),
        },
        {
          label: "Roles",
          value: `${bridgeActor.organisation.supplyChainRoles.length}`,
          resultFilter: makeResultFilter(context, {
            search: bridgeActor.organisation.name,
          }),
        },
      ],
      caveat:
        "Multiple tags do not prove formal bridging activity or collaboration readiness.",
      recommendedAction:
        "Inspect multi-role or multi-material organisations as possible ecosystem connectors for follow-up validation.",
      priority: 52,
    });
  }

  return signals;
}
