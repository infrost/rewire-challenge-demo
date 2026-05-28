import {
  buildMapClusters,
  inferMapRegion,
  materialCategories,
  organisationTypes,
  supplyChainRoles,
  type MapCluster,
  type MapRegion,
  type MaterialCategory,
  type Organisation,
  type OrganisationType,
  type SupplyChainRole,
} from "@/lib/landscape-core";

export type OrganisationResultFilter = {
  materials?: MaterialCategory[];
  supplyChainRoles?: SupplyChainRole[];
  organisationTypes?: OrganisationType[];
  sourceSheets?: string[];
  regions?: MapRegion[];
  dataQualityIssues?: DataQualityIssue[];
  ukPresence?: boolean | null;
  locationQuery?: string;
  search?: string;
};

const dataQualityIssues = [
  "missing-role",
  "missing-material",
  "missing-link",
] as const;

export type DataQualityIssue = (typeof dataQualityIssues)[number];

export const dataQualityIssueLabels: Record<DataQualityIssue, string> = {
  "missing-role": "Missing role",
  "missing-material": "Missing material",
  "missing-link": "Missing link",
};

export type ResultContext = {
  id: string;
  label: string;
  description: string;
  filter: OrganisationResultFilter;
};

export type ResultFilterTag = {
  id: string;
  label: string;
  field: keyof OrganisationResultFilter;
  value: string;
};

export type ResultFacetOption<T extends string> = {
  value: T;
  count: number;
};

type ResultFacets = {
  materials: ResultFacetOption<MaterialCategory>[];
  supplyChainRoles: ResultFacetOption<SupplyChainRole>[];
  organisationTypes: ResultFacetOption<OrganisationType>[];
  sourceSheets: ResultFacetOption<string>[];
  regions: ResultFacetOption<MapRegion>[];
  dataQualityIssues: ResultFacetOption<DataQualityIssue>[];
};

const typeRank: Record<OrganisationType, number> = {
  Industry: 0,
  Academic: 1,
  Other: 2,
};

function cleanArray<T extends string>(values: T[] | undefined) {
  return values?.length ? Array.from(new Set(values)) : undefined;
}

function joinWithinFilter(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? "";
  }

  return values.slice(0, -1).join(", ") + " and " + values[values.length - 1];
}

function buildContextLabel(filter: OrganisationResultFilter) {
  const groups: string[] = [];

  if (filter.materials?.length) {
    groups.push(`Materials (${joinWithinFilter(filter.materials)})`);
  }

  if (filter.supplyChainRoles?.length) {
    groups.push(`Roles (${joinWithinFilter(filter.supplyChainRoles)})`);
  }

  if (filter.organisationTypes?.length) {
    groups.push(`Types (${joinWithinFilter(filter.organisationTypes)})`);
  }

  if (filter.sourceSheets?.length) {
    groups.push(`Sheets (${joinWithinFilter(filter.sourceSheets)})`);
  }

  if (filter.regions?.length) {
    groups.push(`Regions (${joinWithinFilter(filter.regions)})`);
  }

  if (filter.dataQualityIssues?.length) {
    groups.push(
      `Data quality (${joinWithinFilter(
        filter.dataQualityIssues.map((issue) => dataQualityIssueLabels[issue]),
      )})`,
    );
  }

  if (typeof filter.ukPresence === "boolean") {
    groups.push(filter.ukPresence ? "UK presence" : "No UK presence");
  }

  if (filter.locationQuery) {
    groups.push(`Location: ${filter.locationQuery}`);
  }

  if (filter.search) {
    groups.push(`Search: ${filter.search}`);
  }

  return groups.join(" x ");
}

export function normalizeResultFilter(
  filter: OrganisationResultFilter,
): OrganisationResultFilter {
  return {
    materials: cleanArray(filter.materials),
    supplyChainRoles: cleanArray(filter.supplyChainRoles),
    organisationTypes: cleanArray(filter.organisationTypes),
    sourceSheets: cleanArray(filter.sourceSheets),
    regions: cleanArray(filter.regions),
    dataQualityIssues: cleanArray(filter.dataQualityIssues),
    ukPresence:
      typeof filter.ukPresence === "boolean" ? filter.ukPresence : undefined,
    locationQuery: filter.locationQuery?.trim() || undefined,
    search: filter.search?.trim() || undefined,
  };
}

export function getResultFilterTags(
  filter: OrganisationResultFilter,
): ResultFilterTag[] {
  const normalized = normalizeResultFilter(filter);
  const tags: ResultFilterTag[] = [];

  for (const material of normalized.materials ?? []) {
    tags.push({
      id: `material-${material}`,
      label: material,
      field: "materials",
      value: material,
    });
  }

  for (const role of normalized.supplyChainRoles ?? []) {
    tags.push({
      id: `role-${role}`,
      label: role,
      field: "supplyChainRoles",
      value: role,
    });
  }

  for (const type of normalized.organisationTypes ?? []) {
    tags.push({
      id: `type-${type}`,
      label: type,
      field: "organisationTypes",
      value: type,
    });
  }

  for (const sheet of normalized.sourceSheets ?? []) {
    tags.push({
      id: `sheet-${sheet}`,
      label: sheet,
      field: "sourceSheets",
      value: sheet,
    });
  }

  for (const region of normalized.regions ?? []) {
    tags.push({
      id: `region-${region}`,
      label: region,
      field: "regions",
      value: region,
    });
  }

  for (const issue of normalized.dataQualityIssues ?? []) {
    tags.push({
      id: `data-quality-${issue}`,
      label: dataQualityIssueLabels[issue],
      field: "dataQualityIssues",
      value: issue,
    });
  }

  if (typeof normalized.ukPresence === "boolean") {
    tags.push({
      id: `uk-${normalized.ukPresence}`,
      label: normalized.ukPresence ? "UK presence" : "No UK presence",
      field: "ukPresence",
      value: String(normalized.ukPresence),
    });
  }

  if (normalized.locationQuery) {
    tags.push({
      id: `location-${normalized.locationQuery}`,
      label: `Location: ${normalized.locationQuery}`,
      field: "locationQuery",
      value: normalized.locationQuery,
    });
  }

  if (normalized.search) {
    tags.push({
      id: `search-${normalized.search}`,
      label: `Search: ${normalized.search}`,
      field: "search",
      value: normalized.search,
    });
  }

  return tags;
}

export function buildResultContext(
  filter: OrganisationResultFilter,
): ResultContext | null {
  const normalized = normalizeResultFilter(filter);
  const tags = getResultFilterTags(normalized);

  if (tags.length === 0) {
    return null;
  }

  const label = buildContextLabel(normalized);

  return {
    id: `filters-${tags.map((tag) => tag.id).join("-")}`,
    label,
    description: `Organisations matching ${label} across the active workbook.`,
    filter: normalized,
  };
}

export function toggleResultFilterValue<T extends string>(
  filter: OrganisationResultFilter,
  field:
    | "materials"
    | "supplyChainRoles"
    | "organisationTypes"
    | "sourceSheets"
    | "regions"
    | "dataQualityIssues",
  value: T,
): OrganisationResultFilter {
  const currentValues = (filter[field] ?? []) as T[];
  const nextValues = currentValues.includes(value)
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value];

  return normalizeResultFilter({
    ...filter,
    [field]: nextValues,
  });
}

export function removeResultFilterTag(
  filter: OrganisationResultFilter,
  tag: ResultFilterTag,
): OrganisationResultFilter {
  if (
    tag.field === "materials" ||
    tag.field === "supplyChainRoles" ||
    tag.field === "organisationTypes" ||
    tag.field === "sourceSheets" ||
    tag.field === "regions" ||
    tag.field === "dataQualityIssues"
  ) {
    return normalizeResultFilter({
      ...filter,
      [tag.field]: (filter[tag.field] ?? []).filter(
        (value) => value !== tag.value,
      ),
    });
  }

  return normalizeResultFilter({
    ...filter,
    [tag.field]: undefined,
  });
}

function includesAny<T extends string>(values: readonly T[], filters?: T[]) {
  return !filters?.length || filters.some((filter) => values.includes(filter));
}

function textIncludes(value: string | null | undefined, query?: string) {
  if (!query?.trim()) {
    return true;
  }

  return (value ?? "").toLowerCase().includes(query.trim().toLowerCase());
}

function matchesDataQualityIssue(
  organisation: Organisation,
  issue: DataQualityIssue,
) {
  if (issue === "missing-role") {
    return organisation.supplyChainRoles.length === 0;
  }

  if (issue === "missing-material") {
    return organisation.materials.length === 0;
  }

  return !organisation.link;
}

function searchText(organisation: Organisation) {
  return [
    organisation.name,
    organisation.type,
    organisation.contact,
    organisation.remit,
    organisation.location,
    organisation.link,
    organisation.sourceSheet,
    inferMapRegion(organisation),
    ...organisation.materials,
    ...organisation.supplyChainRoles,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function optionCounts<T extends string>(
  values: readonly T[],
  organisations: Organisation[],
  picker: (organisation: Organisation) => readonly T[],
) {
  return values.map((value) => ({
    value,
    count: organisations.filter((organisation) =>
      picker(organisation).includes(value),
    ).length,
  }));
}

export function filterOrganisations(
  organisations: Organisation[],
  filter: OrganisationResultFilter,
) {
  const search = filter.search?.trim().toLowerCase();

  return organisations.filter((organisation) => {
    if (!includesAny(organisation.materials, filter.materials)) {
      return false;
    }

    if (!includesAny(organisation.supplyChainRoles, filter.supplyChainRoles)) {
      return false;
    }

    if (
      filter.organisationTypes?.length &&
      !filter.organisationTypes.includes(organisation.type)
    ) {
      return false;
    }

    if (
      filter.sourceSheets?.length &&
      !filter.sourceSheets.includes(organisation.sourceSheet)
    ) {
      return false;
    }

    if (
      filter.regions?.length &&
      !filter.regions.includes(inferMapRegion(organisation))
    ) {
      return false;
    }

    if (
      filter.dataQualityIssues?.length &&
      !filter.dataQualityIssues.some((issue) =>
        matchesDataQualityIssue(organisation, issue),
      )
    ) {
      return false;
    }

    if (
      typeof filter.ukPresence === "boolean" &&
      organisation.ukPresence !== filter.ukPresence
    ) {
      return false;
    }

    if (!textIncludes(organisation.location, filter.locationQuery)) {
      return false;
    }

    if (search && !searchText(organisation).includes(search)) {
      return false;
    }

    return true;
  });
}

export function buildFilteredMapClusters(
  organisations: Organisation[],
  filter: OrganisationResultFilter,
): MapCluster[] {
  return buildMapClusters(filterOrganisations(organisations, filter));
}

export function buildResultFacets(organisations: Organisation[]): ResultFacets {
  const sourceSheets = Array.from(
    new Set(organisations.map((organisation) => organisation.sourceSheet)),
  ).sort((a, b) => a.localeCompare(b));
  const regions = Array.from(
    new Set(organisations.map((organisation) => inferMapRegion(organisation))),
  ).sort((a, b) => a.localeCompare(b)) as MapRegion[];

  return {
    materials: optionCounts(
      materialCategories,
      organisations,
      (organisation) => organisation.materials,
    ),
    supplyChainRoles: optionCounts(
      supplyChainRoles,
      organisations,
      (organisation) => organisation.supplyChainRoles,
    ),
    organisationTypes: optionCounts(organisationTypes, organisations, (
      organisation,
    ) => [organisation.type]),
    sourceSheets: optionCounts(sourceSheets, organisations, (organisation) => [
      organisation.sourceSheet,
    ]),
    regions: optionCounts(regions, organisations, (organisation) => [
      inferMapRegion(organisation),
    ]),
    dataQualityIssues: dataQualityIssues.map((issue) => ({
      value: issue,
      count: organisations.filter((organisation) =>
        matchesDataQualityIssue(organisation, issue),
      ).length,
    })),
  };
}

export function getTopOrganisations(
  organisations: Organisation[],
  filter: OrganisationResultFilter,
  limit = 5,
) {
  return filterOrganisations(organisations, filter)
    .sort((a, b) => {
      const ukPresence = Number(b.ukPresence) - Number(a.ukPresence);

      if (ukPresence !== 0) {
        return ukPresence;
      }

      const bContactScore = Number(Boolean(b.link)) + Number(Boolean(b.contact));
      const aContactScore = Number(Boolean(a.link)) + Number(Boolean(a.contact));
      const contactScore = bContactScore - aContactScore;

      if (contactScore !== 0) {
        return contactScore;
      }

      const rankedType = typeRank[a.type] - typeRank[b.type];

      if (rankedType !== 0) {
        return rankedType;
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
