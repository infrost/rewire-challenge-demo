import { materialCategories, supplyChainRoles } from "@/lib/landscape-core";

import {
  BROAD_ROLE_COVERAGE,
  countMaterialByType,
  countRole,
  makeResultFilter,
  upstreamRoles,
  type HeuristicRuleContext,
} from "./context";
import type { StrategicSignal } from "./types";

export function buildUkSignals(context: HeuristicRuleContext): StrategicSignal[] {
  const ukOrganisations = context.organisations.filter(
    (organisation) => organisation.ukPresence,
  );
  const industryCount = ukOrganisations.filter(
    (organisation) => organisation.type === "Industry",
  ).length;
  const academicCount = ukOrganisations.filter(
    (organisation) => organisation.type === "Academic",
  ).length;
  const otherCount = ukOrganisations.filter(
    (organisation) => organisation.type === "Other",
  ).length;
  const signals: StrategicSignal[] = [];

  if (industryCount > 0 && academicCount > 0 && otherCount > 0) {
    signals.push({
      id: "uk-mixed-actor-ecosystem",
      category: "uk-ecosystem",
      severity: "positive",
      confidence: "high",
      title: "The UK subset contains mixed actor types",
      observation:
        "Industry, academic, and other ecosystem organisations are all represented in the UK-relevant view.",
      interpretation:
        "This gives REWIRE a broader base for convening research, commercial, and ecosystem coordination activity.",
      evidence: [
        {
          label: "Industry",
          value: `${industryCount}`,
          resultFilter: makeResultFilter(context, {
            ukPresence: true,
            organisationTypes: ["Industry"],
          }),
        },
        {
          label: "Academic",
          value: `${academicCount}`,
          resultFilter: makeResultFilter(context, {
            ukPresence: true,
            organisationTypes: ["Academic"],
          }),
        },
        {
          label: "Other",
          value: `${otherCount}`,
          resultFilter: makeResultFilter(context, {
            ukPresence: true,
            organisationTypes: ["Other"],
          }),
        },
      ],
      caveat:
        "Actor type diversity does not measure organisation scale, readiness, or existing relationships.",
      recommendedAction:
        "Compare UK actors by material and supply-chain role to find convening themes.",
      priority: 90,
    });
  }

  const sharedMaterial = materialCategories
    .map((material) => ({
      material,
      academic: countMaterialByType(ukOrganisations, material, "Academic"),
      industry: countMaterialByType(ukOrganisations, material, "Industry"),
    }))
    .filter((item) => item.academic > 0 && item.industry > 0)
    .sort((a, b) => b.academic + b.industry - (a.academic + a.industry))[0];

  if (sharedMaterial) {
    signals.push({
      id: `uk-academic-industry-bridge-${sharedMaterial.material}`,
      category: "collaboration-opportunity",
      severity: "positive",
      confidence: "medium",
      title: "UK academic-industry bridge potential",
      observation: `The UK subset contains both academic and industry actors linked to ${sharedMaterial.material}.`,
      interpretation:
        "This supports REWIRE's role in connecting research capability with industrial translation pathways.",
      evidence: [
        {
          label: "UK academic actors",
          value: `${sharedMaterial.academic}`,
          resultFilter: makeResultFilter(context, {
            ukPresence: true,
            materials: [sharedMaterial.material],
            organisationTypes: ["Academic"],
          }),
        },
        {
          label: "UK industry actors",
          value: `${sharedMaterial.industry}`,
          resultFilter: makeResultFilter(context, {
            ukPresence: true,
            materials: [sharedMaterial.material],
            organisationTypes: ["Industry"],
          }),
        },
      ],
      caveat:
        "Overlap does not prove existing collaboration or readiness to collaborate.",
      recommendedAction:
        "Review UK academic and industry actors by material and adjacent supply-chain role.",
      priority: 108,
    });
  }

  const coveredRoles = supplyChainRoles.filter(
    (role) => countRole(ukOrganisations, role) > 0,
  ).length;

  if (coveredRoles >= BROAD_ROLE_COVERAGE) {
    signals.push({
      id: "uk-role-breadth",
      category: "uk-ecosystem",
      severity: "positive",
      confidence: "high",
      title: "The UK view spans much of the supply chain",
      observation: `UK-relevant records cover ${coveredRoles} supply-chain roles.`,
      interpretation:
        "This suggests the UK subset can support ecosystem-level analysis rather than only a narrow technology slice.",
      evidence: [
        {
          label: "Covered UK roles",
          value: `${coveredRoles}`,
          resultFilter: makeResultFilter(context, { ukPresence: true }),
        },
      ],
      caveat:
        "Role coverage is based on spreadsheet tags rather than verified operating activity.",
      recommendedAction:
        "Inspect UK role coverage to find where the chain is strongest and where validation is needed.",
      priority: 82,
    });
  }

  const ukUpstreamCount = upstreamRoles.reduce(
    (total, role) => total + countRole(ukOrganisations, role),
    0,
  );

  if (ukOrganisations.length > 0 && ukUpstreamCount <= upstreamRoles.length * 2) {
    signals.push({
      id: "uk-upstream-weakness",
      category: "uk-ecosystem",
      severity: "watch",
      confidence: "medium",
      title: "UK upstream coverage needs validation",
      observation:
        "UK-relevant upstream role coverage is comparatively sparse in the active view.",
      interpretation:
        "This may point to a data enrichment need or a strategic area for further upstream ecosystem validation.",
      evidence: [
        {
          label: "UK upstream role links",
          value: `${ukUpstreamCount}`,
          resultFilter: makeResultFilter(context, {
            ukPresence: true,
            supplyChainRoles: upstreamRoles,
          }),
        },
      ],
      caveat:
        "Sparse UK upstream records are not proof that substrate, equipment, or epiwafer capability is absent.",
      recommendedAction:
        "Validate UK upstream actors and enrich missing role classifications where needed.",
      priority: 84,
    });
  }

  return signals;
}
