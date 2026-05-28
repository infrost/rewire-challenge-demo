import {
  inferMapRegion,
  materialCategories,
  organisationTypes,
  supplyChainRoles,
  type GapCell,
  type LandscapeMetrics,
  type MapRegion,
  type MaterialCategory,
  type Organisation,
  type OrganisationType,
  type SupplyChainRole,
} from "@/lib/landscape-core";
import {
  filterOrganisations,
  getResultFilterTags,
  normalizeResultFilter,
  type OrganisationResultFilter,
} from "@/lib/landscape-results";

export const LOW_CELL_COUNT = 2;
export const DOMINANT_SHARE = 0.45;
export const HIGH_UK_SHARE = 0.5;
export const BROAD_ROLE_COVERAGE = 5;
export const NARROW_ROLE_COVERAGE = 2;
export const BROAD_MATERIAL_COVERAGE = 3;
export const WORKING_GROUP_MIN_ORGS = 10;
export const WORKING_GROUP_MIN_ROLES = 4;

export const upstreamRoles: SupplyChainRole[] = [
  "Equipment",
  "Substrate",
  "Epiwafer",
];

export const downstreamRoles: SupplyChainRole[] = [
  "Manufacturing",
  "Packaging",
  "End user",
];

export const mapRegions: MapRegion[] = [
  "United Kingdom",
  "Europe",
  "North America",
  "Asia",
  "Global / unknown",
];

export type CountItem<T extends string> = {
  key: T;
  count: number;
  share: number;
};

export type HeuristicRuleContext = {
  metrics: LandscapeMetrics;
  activeFilter: OrganisationResultFilter;
  hasActiveFilter: boolean;
  organisations: Organisation[];
  total: number;
  roleCounts: CountItem<SupplyChainRole>[];
  materialCounts: CountItem<MaterialCategory>[];
  typeCounts: CountItem<OrganisationType>[];
  regionCounts: CountItem<MapRegion>[];
  gapCells: GapCell[];
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function share(count: number, total: number) {
  return total > 0 ? count / total : 0;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function sumCounts<T extends string>(
  counts: CountItem<T>[],
  keys: readonly T[],
) {
  return keys.reduce(
    (total, key) => total + (counts.find((item) => item.key === key)?.count ?? 0),
    0,
  );
}

export function sortByCount<T extends string>(counts: CountItem<T>[]) {
  return [...counts].sort((a, b) => b.count - a.count);
}

export function populated<T extends string>(counts: CountItem<T>[]) {
  return counts.filter((item) => item.count > 0);
}

export function makeResultFilter(
  context: HeuristicRuleContext,
  patch: OrganisationResultFilter = {},
) {
  return normalizeResultFilter({
    ...context.activeFilter,
    ...patch,
  });
}

export function rankSignals<T extends { priority: number }>(signals: T[]) {
  return [...signals].sort((a, b) => b.priority - a.priority);
}

export function countByValues<T extends string>(
  keys: readonly T[],
  organisations: Organisation[],
  picker: (organisation: Organisation) => readonly T[],
) {
  const total = organisations.length || 1;

  return keys.map((key) => {
    const count = organisations.filter((organisation) =>
      picker(organisation).includes(key),
    ).length;

    return {
      key,
      count,
      share: Math.round((count / total) * 100),
    };
  });
}

export function countRole(
  organisations: Organisation[],
  role: SupplyChainRole,
) {
  return organisations.filter((organisation) =>
    organisation.supplyChainRoles.includes(role),
  ).length;
}

export function countMaterial(
  organisations: Organisation[],
  material: MaterialCategory,
) {
  return organisations.filter((organisation) =>
    organisation.materials.includes(material),
  ).length;
}

export function countMaterialByType(
  organisations: Organisation[],
  material: MaterialCategory,
  type: OrganisationType,
) {
  return organisations.filter(
    (organisation) =>
      organisation.type === type && organisation.materials.includes(material),
  ).length;
}

export function countMaterialRole(
  organisations: Organisation[],
  material: MaterialCategory,
  role: SupplyChainRole,
) {
  return organisations.filter(
    (organisation) =>
      organisation.materials.includes(material) &&
      organisation.supplyChainRoles.includes(role),
  ).length;
}

export function materialRoleCoverage(
  organisations: Organisation[],
  material: MaterialCategory,
) {
  return supplyChainRoles.filter(
    (role) => countMaterialRole(organisations, material, role) > 0,
  ).length;
}

export function buildGapCells(organisations: Organisation[]) {
  return supplyChainRoles.flatMap((role) =>
    materialCategories.map((material) => ({
      role,
      material,
      count: countMaterialRole(organisations, material, role),
    })),
  );
}

export function createHeuristicRuleContext(
  metrics: LandscapeMetrics,
  activeFilter: OrganisationResultFilter = {},
): HeuristicRuleContext {
  const normalizedFilter = normalizeResultFilter(activeFilter);
  const organisations = filterOrganisations(
    metrics.organisations,
    normalizedFilter,
  );
  const total = organisations.length;

  return {
    metrics,
    activeFilter: normalizedFilter,
    hasActiveFilter: getResultFilterTags(normalizedFilter).length > 0,
    organisations,
    total,
    roleCounts: countByValues(
      supplyChainRoles,
      organisations,
      (organisation) => organisation.supplyChainRoles,
    ),
    materialCounts: countByValues(
      materialCategories,
      organisations,
      (organisation) => organisation.materials,
    ),
    typeCounts: countByValues(organisationTypes, organisations, (organisation) => [
      organisation.type,
    ]),
    regionCounts: countByValues(mapRegions, organisations, (organisation) => [
      inferMapRegion(organisation),
    ]),
    gapCells: buildGapCells(organisations),
  };
}
