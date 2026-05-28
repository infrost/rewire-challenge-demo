import {
  inferMapRegion,
  materialCategories,
  supplyChainRoles,
  type MapRegion,
  type Organisation,
  type SupplyChainRole,
} from "@/lib/landscape-core";
import {
  filterOrganisations,
  normalizeResultFilter,
  type OrganisationResultFilter,
} from "@/lib/landscape-results";

import {
  DOMINANT_SHARE,
  countMaterial,
  countRole,
  formatPercent,
  makeResultFilter,
  mapRegions,
  share,
  sortByCount,
  type HeuristicRuleContext,
} from "./context";
import type { StrategicSignal } from "./types";

const regionalDownstreamRoles: SupplyChainRole[] = [
  "Manufacturing",
  "Packaging",
  "End user",
];

function thematicFilter(filter: OrganisationResultFilter) {
  return normalizeResultFilter({
    ...filter,
    regions: undefined,
  });
}

function regionalProfileFilter(region: MapRegion, patch: OrganisationResultFilter = {}) {
  return normalizeResultFilter({
    ...patch,
    regions: [region],
  });
}

function themeLabel(filter: OrganisationResultFilter) {
  const parts = [
    ...(filter.materials ?? []),
    ...(filter.supplyChainRoles ?? []),
  ];

  if (parts.length === 0) {
    return "the active view";
  }

  return parts.join(" x ");
}

function themeViewLabel(filter: OrganisationResultFilter) {
  const parts = [
    ...(filter.materials ?? []),
    ...(filter.supplyChainRoles ?? []),
  ];

  if (parts.length === 0) {
    return "active view";
  }

  return `${parts.join(" x ")} view`;
}

function countByRegion(organisations: Organisation[]) {
  return mapRegions
    .map((region) => ({
      key: region,
      count: organisations.filter(
        (organisation) => inferMapRegion(organisation) === region,
      ).length,
      share: 0,
    }))
    .map((item) => ({
      ...item,
      share: Math.round(share(item.count, organisations.length) * 100),
    }));
}

function typeCount(organisations: Organisation[], type: Organisation["type"]) {
  return organisations.filter((organisation) => organisation.type === type)
    .length;
}

function adjacentRoles(role: SupplyChainRole) {
  const index = supplyChainRoles.indexOf(role);

  return [supplyChainRoles[index - 1], supplyChainRoles[index + 1]].filter(
    (item): item is SupplyChainRole => Boolean(item),
  );
}

function buildSelectedRegionalSignals(
  context: HeuristicRuleContext,
  selectedRegion: MapRegion,
): StrategicSignal[] {
  const signals: StrategicSignal[] = [];
  const baseThemeFilter = thematicFilter(context.activeFilter);
  const label = themeLabel(baseThemeFilter);
  const viewLabel = themeViewLabel(baseThemeFilter);
  const themeOrganisations = filterOrganisations(
    context.metrics.organisations,
    baseThemeFilter,
  );
  const selectedRegionThemeOrganisations = filterOrganisations(
    context.metrics.organisations,
    regionalProfileFilter(selectedRegion, baseThemeFilter),
  );
  const regionProfileOrganisations = filterOrganisations(
    context.metrics.organisations,
    regionalProfileFilter(selectedRegion),
  );
  const themeTotal = themeOrganisations.length;
  const selectedRegionCount = selectedRegionThemeOrganisations.length;
  const selectedRegionShare = share(selectedRegionCount, themeTotal);
  const rankedThemeRegions = sortByCount(countByRegion(themeOrganisations)).filter(
    (item) => item.count > 0,
  );
  const topThemeRegion = rankedThemeRegions[0];
  const ukThemeCount =
    rankedThemeRegions.find((item) => item.key === "United Kingdom")?.count ?? 0;
  const industryCount = typeCount(selectedRegionThemeOrganisations, "Industry");
  const academicCount = typeCount(selectedRegionThemeOrganisations, "Academic");
  const otherCount = typeCount(selectedRegionThemeOrganisations, "Other");

  if (selectedRegionCount > 0) {
    signals.push({
      id: "regional-theme-presence",
      category: "regional-concentration",
      severity: selectedRegionShare < 0.15 ? "watch" : "neutral",
      confidence: "high",
      title:
        selectedRegionShare < 0.15
          ? `${selectedRegion} is present but sparse in this theme`
          : `${selectedRegion} is present in the current theme`,
      observation: `${selectedRegion} has ${selectedRegionCount} organisation${selectedRegionCount === 1 ? "" : "s"} matching ${label}.`,
      interpretation:
        selectedRegionShare < 0.15
          ? `${selectedRegion} is visible in the selected theme, but it is not a major concentration in the current dataset slice.`
          : "This indicates that the selected region is represented in the current thematic slice.",
      evidence: [
        {
          label: `${selectedRegion} matches`,
          value: `${selectedRegionCount} of ${themeTotal}`,
          resultFilter: makeResultFilter(context),
        },
        {
          label: "Theme share",
          value: formatPercent(selectedRegionShare),
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat:
        "Presence does not imply a regional cluster or market strength.",
      recommendedAction:
        "Inspect the matching organisations and compare against other regions.",
      priority: 118,
    });
  }

  if (
    topThemeRegion &&
    selectedRegion !== topThemeRegion.key &&
    selectedRegionCount < topThemeRegion.count
  ) {
    signals.push({
      id: "regional-not-leading-concentration",
      category: "regional-concentration",
      severity: "neutral",
      confidence: "high",
      title: `${selectedRegion} is not the main concentration for this theme`,
      observation: `${topThemeRegion.key} has more organisations matching ${label}.`,
      interpretation:
        "The selected region should be interpreted relative to the leading concentration rather than in isolation.",
      evidence: [
        {
          label: `${selectedRegion} matches`,
          value: `${selectedRegionCount}`,
          resultFilter: makeResultFilter(context),
        },
        {
          label: `${topThemeRegion.key} matches`,
          value: `${topThemeRegion.count}`,
          resultFilter: makeResultFilter(context, {
            regions: [topThemeRegion.key],
          }),
        },
      ],
      caveat:
        "The top region may reflect dataset scope or UK-focused data collection.",
      recommendedAction: `Compare ${selectedRegion} with ${topThemeRegion.key} to understand differences in actor type, material focus, and supply-chain position.`,
      priority: 112,
    });
  }

  if (themeTotal > 0 && ukThemeCount / themeTotal >= 0.5) {
    signals.push({
      id: "regional-uk-dominant-theme",
      category: "regional-concentration",
      severity: "neutral",
      confidence: "high",
      title: `The ${viewLabel} is UK-weighted`,
      observation:
        "The UK accounts for the majority of organisations matching the active filters.",
      interpretation:
        "This suggests the current material or role combination is strongly represented in the UK-focused part of the landscape dataset.",
      evidence: [
        {
          label: "UK matches",
          value: `${ukThemeCount} of ${themeTotal}`,
          resultFilter: makeResultFilter(context, {
            regions: ["United Kingdom"],
          }),
        },
        {
          label: `${selectedRegion} matches`,
          value: `${selectedRegionCount}`,
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat:
        "This may reflect the REWIRE dataset's UK focus rather than a complete global distribution.",
      recommendedAction:
        "Use the UK profile to identify domestic strengths and compare with non-UK actors for international context.",
      priority: 110,
    });
  }

  if (selectedRegionCount === 1) {
    signals.push({
      id: "regional-single-organisation-signal",
      category: "regional-concentration",
      severity: "watch",
      confidence: "high",
      title: "This regional signal is based on a single organisation",
      observation: `Only one organisation in ${selectedRegion} matches ${label}.`,
      interpretation:
        "This should be treated as a lead or data point rather than evidence of a regional cluster.",
      evidence: [
        {
          label: `${selectedRegion} matches`,
          value: "1",
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat:
        "A single record cannot establish regional ecosystem strength.",
      recommendedAction:
        "Use this result as a starting point for validation or data enrichment.",
      priority: 78,
    });
  }

  if (industryCount > 0 && academicCount === 0 && otherCount === 0) {
    signals.push({
      id: "regional-industry-only-match",
      category: "regional-concentration",
      severity: "watch",
      confidence: "medium",
      title: `${selectedRegion}'s ${label} match is industry-only`,
      observation:
        "The matching organisations in the selected region are industrial actors only.",
      interpretation:
        "This may indicate an industry-led regional signal, but no academic or ecosystem-body bridge is visible in the current filtered view.",
      evidence: [
        {
          label: "Industry",
          value: `${industryCount}`,
          resultFilter: makeResultFilter(context, {
            organisationTypes: ["Industry"],
          }),
        },
        {
          label: "Academic",
          value: `${academicCount}`,
          resultFilter: makeResultFilter(context, {
            organisationTypes: ["Academic"],
          }),
        },
        {
          label: "Other",
          value: `${otherCount}`,
          resultFilter: makeResultFilter(context, {
            organisationTypes: ["Other"],
          }),
        },
      ],
      caveat:
        "Academic or ecosystem organisations may exist but not match the active filters or current dataset tags.",
      recommendedAction:
        "Check whether academic groups or ecosystem bodies in the region should be mapped under the same theme.",
      priority: 76,
    });
  }

  const materialProfile = materialCategories
    .map((material) => ({
      material,
      count: countMaterial(regionProfileOrganisations, material),
    }))
    .sort((a, b) => b.count - a.count);
  const topMaterial = materialProfile[0];
  const secondMaterial = materialProfile[1];

  if (topMaterial && secondMaterial && topMaterial.count > 0) {
    if (topMaterial.count === secondMaterial.count) {
      signals.push({
        id: "regional-no-single-material-dominance",
        category: "regional-concentration",
        severity: "neutral",
        confidence: "medium",
        title: `${selectedRegion} has no single dominant material category`,
        observation:
          "The leading material categories in the selected region are tied or closely balanced.",
        interpretation:
          "The regional material profile appears mixed rather than dominated by one material.",
        evidence: [
          {
            label: topMaterial.material,
            value: `${topMaterial.count}`,
            resultFilter: regionalProfileFilter(selectedRegion, {
              materials: [topMaterial.material],
            }),
          },
          {
            label: secondMaterial.material,
            value: `${secondMaterial.count}`,
            resultFilter: regionalProfileFilter(selectedRegion, {
              materials: [secondMaterial.material],
            }),
          },
        ],
        caveat:
          "Small sample sizes can make material balance unstable.",
        recommendedAction:
          "Inspect material-specific organisations before drawing conclusions about regional focus.",
        priority: 62,
      });
    } else if (
      share(topMaterial.count, regionProfileOrganisations.length) >=
      DOMINANT_SHARE
    ) {
      signals.push({
        id: "regional-material-concentration",
        category: "regional-concentration",
        severity: "neutral",
        confidence: "medium",
        title: `${selectedRegion} shows concentration around ${topMaterial.material}`,
        observation: `${topMaterial.material} is the most represented material in ${selectedRegion}.`,
        interpretation:
          "This may indicate a regional material focus in the current landscape data.",
        evidence: [
          {
            label: topMaterial.material,
            value: `${topMaterial.count}`,
            resultFilter: regionalProfileFilter(selectedRegion, {
              materials: [topMaterial.material],
            }),
          },
        ],
        caveat:
          "This is based on tags in the spreadsheet and does not measure investment or commercial maturity.",
        recommendedAction: `Inspect ${topMaterial.material} organisations in ${selectedRegion} by supply-chain role.`,
        priority: 60,
      });
    }
  }

  const substrateCount = countRole(regionProfileOrganisations, "Substrate");
  const epiwaferCount = countRole(regionProfileOrganisations, "Epiwafer");
  const downstreamCount = regionalDownstreamRoles.reduce(
    (total, role) => total + countRole(regionProfileOrganisations, role),
    0,
  );
  const upstreamCount = substrateCount + epiwaferCount;

  if (regionProfileOrganisations.length > 0 && upstreamCount > downstreamCount) {
    signals.push({
      id: "regional-upstream-concentration",
      category: "regional-concentration",
      severity: "positive",
      confidence: "medium",
      title: `${selectedRegion} appears upstream-weighted`,
      observation:
        "Substrate and epiwafer roles are more represented than downstream roles in the selected region.",
      interpretation:
        "This suggests the region's visible activity in the dataset is more upstream-oriented.",
      evidence: [
        {
          label: "Substrate + Epiwafer",
          value: `${upstreamCount}`,
          resultFilter: regionalProfileFilter(selectedRegion, {
            supplyChainRoles: ["Substrate", "Epiwafer"],
          }),
        },
        {
          label: "Downstream roles",
          value: `${downstreamCount}`,
          resultFilter: regionalProfileFilter(selectedRegion, {
            supplyChainRoles: regionalDownstreamRoles,
          }),
        },
      ],
      caveat:
        "This is a role-tag pattern, not a validated supply-chain capability assessment.",
      recommendedAction:
        "Inspect upstream organisations and compare whether downstream links are present or missing.",
      priority: 106,
    });
  }

  const endUserCount = countRole(regionProfileOrganisations, "End user");
  const manufacturingCount = countRole(regionProfileOrganisations, "Manufacturing");
  const packagingCount = countRole(regionProfileOrganisations, "Packaging");

  if (
    regionProfileOrganisations.length >= 3 &&
    endUserCount === 0 &&
    manufacturingCount + packagingCount <= 2
  ) {
    signals.push({
      id: "regional-downstream-absence",
      category: "gap-signal",
      severity: "watch",
      confidence: "medium",
      title: `${selectedRegion} has limited downstream representation`,
      observation:
        "End-user and downstream roles are weakly represented in the selected region.",
      interpretation:
        "The regional profile may be more upstream or supply-side oriented than application-led.",
      evidence: [
        {
          label: "End user",
          value: `${endUserCount}`,
          resultFilter: regionalProfileFilter(selectedRegion, {
            supplyChainRoles: ["End user"],
          }),
        },
        {
          label: "Manufacturing + Packaging",
          value: `${manufacturingCount + packagingCount}`,
          resultFilter: regionalProfileFilter(selectedRegion, {
            supplyChainRoles: ["Manufacturing", "Packaging"],
          }),
        },
      ],
      caveat:
        "The spreadsheet does not confirm whether downstream actors are absent or simply not mapped.",
      recommendedAction:
        "Check whether end-user or application-side organisations in the region should be added.",
      priority: 82,
    });
  }

  const selectedRole = baseThemeFilter.supplyChainRoles?.[0];
  const adjacentRoleCounts = selectedRole
    ? adjacentRoles(selectedRole)
        .map((role) => ({
          role,
          count: countRole(regionProfileOrganisations, role),
        }))
        .filter((item) => item.count > 0)
    : [];
  const selectedRoleCount = selectedRole
    ? countRole(regionProfileOrganisations, selectedRole)
    : 0;

  if (selectedRole && selectedRoleCount > 0 && adjacentRoleCounts.length > 0) {
    signals.push({
      id: "regional-adjacent-role-opportunity",
      category: "collaboration-opportunity",
      severity: "positive",
      confidence: "medium",
      title: `${selectedRegion} has adjacent capability around ${selectedRole}`,
      observation: `${selectedRegion} has organisations in ${selectedRole} and adjacent supply-chain roles.`,
      interpretation:
        "This may indicate a possible value-chain pathway or collaboration context within the region.",
      evidence: [
        {
          label: selectedRole,
          value: `${selectedRoleCount}`,
          resultFilter: regionalProfileFilter(selectedRegion, {
            supplyChainRoles: [selectedRole],
          }),
        },
        ...adjacentRoleCounts.map((item) => ({
          label: item.role,
          value: `${item.count}`,
          resultFilter: regionalProfileFilter(selectedRegion, {
            supplyChainRoles: [item.role],
          }),
        })),
      ],
      caveat:
        "Adjacent role presence does not prove actual supply relationships.",
      recommendedAction:
        "Inspect organisations across adjacent roles in the selected region.",
      priority: 104,
    });
  }

  if (
    selectedRegionCount <= 1 &&
    regionProfileOrganisations.length >= 5 &&
    themeTotal > 0
  ) {
    signals.push({
      id: "regional-theme-mismatch",
      category: "regional-concentration",
      severity: "watch",
      confidence: "medium",
      title: `${selectedRegion} has broader activity, but limited match for this theme`,
      observation: `${selectedRegion} has several records overall, but few match ${label}.`,
      interpretation:
        "The region may be present in the landscape, but not strongly represented in the selected thematic slice.",
      evidence: [
        {
          label: `${selectedRegion} total records`,
          value: `${regionProfileOrganisations.length}`,
          resultFilter: regionalProfileFilter(selectedRegion),
        },
        {
          label: `${selectedRegion} theme matches`,
          value: `${selectedRegionCount}`,
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat:
        "This may reflect either true specialisation or incomplete tagging.",
      recommendedAction:
        "Compare the region's overall profile with the current filters to identify nearby opportunities.",
      priority: 74,
    });
  }

  return signals;
}

function buildGeneralRegionalSignals(
  context: HeuristicRuleContext,
): StrategicSignal[] {
  const signals: StrategicSignal[] = [];
  const rankedRegions = sortByCount(context.regionCounts).filter(
    (item) => item.count > 0,
  );
  const topRegion = rankedRegions[0];
  const secondRegion = rankedRegions[1];

  if (
    topRegion &&
    (share(topRegion.count, context.total) >= DOMINANT_SHARE ||
      (secondRegion && topRegion.count >= secondRegion.count * 1.25))
  ) {
    const regionShare = share(topRegion.count, context.total);

    signals.push({
      id: "dominant-region-concentration",
      category: "regional-concentration",
      severity: topRegion.key === "United Kingdom" ? "positive" : "neutral",
      confidence: "high",
      title:
        topRegion.key === "United Kingdom"
          ? "The map is strongly UK-focused"
          : `${topRegion.key} is the largest regional cluster`,
      observation: `${topRegion.key} accounts for ${formatPercent(regionShare)} of records in the active view.`,
      interpretation:
        "Regional concentration helps explain where visible activity is clustered and where the map should be interpreted with care.",
      evidence: [
        {
          label: "Regional records",
          value: `${topRegion.count}`,
          resultFilter: makeResultFilter(context, {
            regions: [topRegion.key],
          }),
        },
        ...(secondRegion
          ? [
              {
                label: "Next region",
                value: `${secondRegion.key}: ${secondRegion.count}`,
                resultFilter: makeResultFilter(context, {
                  regions: [secondRegion.key],
                }),
              },
            ]
          : []),
      ],
      caveat:
        "Regional counts reflect inferred or tagged locations, not verified site-level activity.",
      recommendedAction:
        "Inspect the regional cluster by actor type, material, and role before making location claims.",
      priority: 88,
    });
  }

  return signals;
}

export function buildRegionalSignals(
  context: HeuristicRuleContext,
): StrategicSignal[] {
  const selectedRegion = context.activeFilter.regions?.[0];

  if (selectedRegion) {
    return buildSelectedRegionalSignals(context, selectedRegion);
  }

  return buildGeneralRegionalSignals(context);
}
