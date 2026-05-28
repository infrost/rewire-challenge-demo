import * as XLSX from "xlsx";
import { z } from "zod";

export const supplyChainRoles = [
  "Equipment",
  "Substrate",
  "Epiwafer",
  "Device design",
  "Manufacturing",
  "Packaging",
  "End user",
] as const;

export const materialCategories = ["SiC", "GaN", "Ga2O3", "Other"] as const;

export const organisationTypes = ["Industry", "Academic", "Other"] as const;

export type SupplyChainRole = (typeof supplyChainRoles)[number];
export type MaterialCategory = (typeof materialCategories)[number];
export type OrganisationType = (typeof organisationTypes)[number];

export type Organisation = {
  id: string;
  name: string;
  type: OrganisationType;
  contact: string | null;
  remit: string;
  location: string | null;
  ukPresence: boolean;
  supplyChainRoles: SupplyChainRole[];
  materials: MaterialCategory[];
  link: string | null;
  sourceSheet: string;
};

export type CoverageItem<T extends string> = {
  key: T;
  count: number;
  share: number;
};

export type GapCell = {
  role: SupplyChainRole;
  material: MaterialCategory;
  count: number;
};

export type MapRegion =
  | "United Kingdom"
  | "Europe"
  | "North America"
  | "Asia"
  | "Global / unknown";

export type MapCluster = {
  id: string;
  label: string;
  region: MapRegion;
  coordinates: [number, number];
  zoom: number;
  count: number;
  share: number;
  dominantType: OrganisationType;
  typeCounts: Record<OrganisationType, number>;
};

export type LandscapeMetrics = {
  organisations: Organisation[];
  importedSheets: string[];
  totals: {
    organisations: number;
    industry: number;
    academic: number;
    other: number;
    ukPresence: number;
    coveredRoles: number;
    coveredMaterials: number;
  };
  roleCoverage: CoverageItem<SupplyChainRole>[];
  materialCoverage: CoverageItem<MaterialCategory>[];
  typeCoverage: CoverageItem<OrganisationType>[];
  gapMatrix: GapCell[];
  mapClusters: MapCluster[];
  insights: {
    dominantMaterial: CoverageItem<MaterialCategory> | null;
    weakestRole: CoverageItem<SupplyChainRole> | null;
    lowestGapCells: GapCell[];
    dataQuality: {
      missingLocation: number;
      missingRole: number;
      missingMaterial: number;
      missingLink: number;
    };
  };
};

const rowSchema = z.object({
  name: z.string().min(1),
  type: z.enum(organisationTypes),
  contact: z.string().nullable(),
  remit: z.string(),
  location: z.string().nullable(),
  ukPresence: z.boolean(),
  supplyChainRoles: z.array(z.enum(supplyChainRoles)),
  materials: z.array(z.enum(materialCategories)),
  link: z.string().nullable(),
  sourceSheet: z.string(),
});

type SheetConfig = {
  name: string;
  type: OrganisationType;
  aliases: string[];
  headerRowIndex: number;
  columns: {
    name: number;
    contact: number;
    remit: number;
    location: number;
    link: number;
  };
};

const sheetConfigs: SheetConfig[] = [
  {
    name: "Industry",
    type: "Industry",
    aliases: ["industry"],
    headerRowIndex: 1,
    columns: {
      name: 0,
      contact: 1,
      remit: 2,
      location: 3,
      link: 15,
    },
  },
  {
    name: "Academic Groups",
    type: "Academic",
    aliases: ["academic groups", "academic", "academia"],
    headerRowIndex: 0,
    columns: {
      name: 0,
      contact: 2,
      remit: 3,
      location: 0,
      link: 15,
    },
  },
  {
    name: "Other",
    type: "Other",
    aliases: ["other", "others", "networks"],
    headerRowIndex: 1,
    columns: {
      name: 0,
      contact: 1,
      remit: 2,
      location: 3,
      link: 15,
    },
  },
];

const roleColumnByName: Record<SupplyChainRole, number> = {
  Equipment: 4,
  Substrate: 5,
  Epiwafer: 6,
  "Device design": 7,
  Manufacturing: 8,
  Packaging: 9,
  "End user": 10,
};

const materialColumnByName: Record<MaterialCategory, number> = {
  SiC: 11,
  GaN: 12,
  Ga2O3: 13,
  Other: 14,
};

function cellText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function normalizeExternalLink(value: unknown) {
  const text = cellText(value);

  if (!text) {
    return null;
  }

  const candidate = /^www\./i.test(text) ? `https://${text}` : text;

  if (/^[a-z][a-z\d+\-.]*:/i.test(candidate)) {
    try {
      const url = new URL(candidate);

      if (
        url.protocol === "http:" ||
        url.protocol === "https:" ||
        url.protocol === "mailto:"
      ) {
        return url.href;
      }
    } catch {
      return null;
    }

    return null;
  }

  if (
    !/\s/.test(candidate) &&
    /^[a-z0-9.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(candidate)
  ) {
    return `https://${candidate}`;
  }

  return null;
}

function cellHyperlinkTarget(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnIndex: number,
) {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
  const cell = worksheet[address] as
    | {
        l?: {
          Target?: unknown;
        };
      }
    | undefined;

  return cell?.l?.Target;
}

function cellLink(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnIndex: number,
  fallbackValue: unknown,
) {
  return (
    normalizeExternalLink(cellHyperlinkTarget(worksheet, rowIndex, columnIndex)) ??
    normalizeExternalLink(fallbackValue)
  );
}

function isMarked(value: unknown) {
  const normalized = cellText(value).toLowerCase();
  return normalized === "x" || normalized === "yes" || normalized === "y";
}

function normalizeSheetName(value: string) {
  return value.trim().toLowerCase();
}

function findSheetName(workbook: XLSX.WorkBook, config: SheetConfig) {
  const normalizedNames = new Map(
    workbook.SheetNames.map((sheetName) => [normalizeSheetName(sheetName), sheetName]),
  );

  for (const alias of config.aliases) {
    const match = normalizedNames.get(normalizeSheetName(alias));

    if (match) {
      return match;
    }
  }

  return null;
}

function deriveUkPresence(
  type: OrganisationType,
  location: string | null,
  ukColumnValue: unknown,
) {
  if (type === "Academic") {
    return true;
  }

  if (isMarked(ukColumnValue)) {
    return true;
  }

  const locationText = (location ?? "").toLowerCase();
  return /\buk\b|united kingdom|england|scotland|wales|northern ireland/.test(
    locationText,
  );
}

function makeId(type: OrganisationType, name: string, index: number) {
  return `${type}-${name}-${index}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function countBy<T extends string>(
  keys: readonly T[],
  organisations: Organisation[],
  picker: (organisation: Organisation) => T[],
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

function parseSheet(workbook: XLSX.WorkBook, config: SheetConfig) {
  const sheetName = findSheetName(workbook, config);

  if (!sheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return rows
    .slice(config.headerRowIndex + 1)
    .map((row, index) => {
      const rowIndex = config.headerRowIndex + 1 + index;
      const name = cellText(row[config.columns.name]);

      if (!name) {
        return null;
      }

      const location = cellText(row[config.columns.location]) || null;
      const supplyChain = supplyChainRoles.filter((role) =>
        isMarked(row[roleColumnByName[role]]),
      );
      const materials = materialCategories.filter((material) =>
        isMarked(row[materialColumnByName[material]]),
      );

      const parsed = rowSchema.parse({
        name,
        type: config.type,
        contact: cellText(row[config.columns.contact]) || null,
        remit: cellText(row[config.columns.remit]),
        location,
        ukPresence: deriveUkPresence(config.type, location, row[3]),
        supplyChainRoles: supplyChain,
        materials,
        link: cellLink(
          worksheet,
          rowIndex,
          config.columns.link,
          row[config.columns.link],
        ),
        sourceSheet: sheetName,
      });

      return {
        id: makeId(config.type, parsed.name, index),
        ...parsed,
      };
    })
    .filter((organisation): organisation is Organisation => Boolean(organisation));
}

function buildGapMatrix(organisations: Organisation[]) {
  return supplyChainRoles.flatMap((role) =>
    materialCategories.map((material) => ({
      role,
      material,
      count: organisations.filter(
        (organisation) =>
          organisation.supplyChainRoles.includes(role) &&
          organisation.materials.includes(material),
      ).length,
    })),
  );
}

const mapRegionConfig: Record<
  MapRegion,
  {
    id: string;
    label: string;
    coordinates: [number, number];
    zoom: number;
  }
> = {
  "United Kingdom": {
    id: "uk",
    label: "UK",
    coordinates: [-2.5, 54.5],
    zoom: 5.2,
  },
  Europe: {
    id: "europe",
    label: "Europe",
    coordinates: [11, 50.5],
    zoom: 4,
  },
  "North America": {
    id: "north-america",
    label: "North America",
    coordinates: [-96, 39],
    zoom: 3.2,
  },
  Asia: {
    id: "asia",
    label: "Asia",
    coordinates: [103, 35],
    zoom: 3.2,
  },
  "Global / unknown": {
    id: "global-unknown",
    label: "Global / unknown",
    coordinates: [-32, 8],
    zoom: 1.7,
  },
};

export function inferMapRegion(organisation: Organisation): MapRegion {
  const text = `${organisation.name} ${organisation.location ?? ""} ${
    organisation.remit
  }`.toLowerCase();

  if (organisation.ukPresence || organisation.type === "Academic") {
    return "United Kingdom";
  }

  if (
    /\b(us|usa|u\.s\.|united states|america|canada|mexico|california|arizona|texas)\b/.test(
      text,
    )
  ) {
    return "North America";
  }

  if (
    /\b(china|japan|korea|taiwan|singapore|malaysia|india|asia|thailand|vietnam)\b/.test(
      text,
    )
  ) {
    return "Asia";
  }

  if (
    /\b(europe|germany|france|italy|netherlands|belgium|sweden|norway|finland|spain|switzerland|austria|ireland|denmark|poland)\b/.test(
      text,
    )
  ) {
    return "Europe";
  }

  return "Global / unknown";
}

export function buildMapClusters(organisations: Organisation[]): MapCluster[] {
  const total = organisations.length || 1;

  return Object.entries(mapRegionConfig)
    .map(([region, config]) => {
      const regionOrganisations = organisations.filter(
        (organisation) => inferMapRegion(organisation) === region,
      );
      const typeCounts = organisationTypes.reduce(
        (counts, type) => ({
          ...counts,
          [type]: regionOrganisations.filter(
            (organisation) => organisation.type === type,
          ).length,
        }),
        {} as Record<OrganisationType, number>,
      );
      const dominantType = [...organisationTypes].sort(
        (a, b) => typeCounts[b] - typeCounts[a],
      )[0];

      return {
        id: config.id,
        label: config.label,
        region: region as MapRegion,
        coordinates: config.coordinates,
        zoom: config.zoom,
        count: regionOrganisations.length,
        share: Math.round((regionOrganisations.length / total) * 100),
        dominantType,
        typeCounts,
      };
    })
    .filter((cluster) => cluster.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function buildLandscapeMetricsFromWorkbook(
  workbook: XLSX.WorkBook,
): LandscapeMetrics {
  const organisations = sheetConfigs.flatMap((config) =>
    parseSheet(workbook, config),
  );

  const roleCoverage = countBy(
    supplyChainRoles,
    organisations,
    (organisation) => organisation.supplyChainRoles,
  );
  const materialCoverage = countBy(
    materialCategories,
    organisations,
    (organisation) => organisation.materials,
  );
  const typeCoverage = countBy(organisationTypes, organisations, (organisation) => [
    organisation.type,
  ]);
  const gapMatrix = buildGapMatrix(organisations);
  const mapClusters = buildMapClusters(organisations);
  const positiveRoleCoverage = roleCoverage.filter((item) => item.count > 0);
  const positiveGapCells = gapMatrix.filter((cell) => cell.count > 0);

  return {
    organisations,
    importedSheets: sheetConfigs
      .map((config) => findSheetName(workbook, config))
      .filter((sheetName): sheetName is string => Boolean(sheetName)),
    totals: {
      organisations: organisations.length,
      industry: organisations.filter(
        (organisation) => organisation.type === "Industry",
      ).length,
      academic: organisations.filter(
        (organisation) => organisation.type === "Academic",
      ).length,
      other: organisations.filter((organisation) => organisation.type === "Other")
        .length,
      ukPresence: organisations.filter((organisation) => organisation.ukPresence)
        .length,
      coveredRoles: roleCoverage.filter((item) => item.count > 0).length,
      coveredMaterials: materialCoverage.filter((item) => item.count > 0).length,
    },
    roleCoverage,
    materialCoverage,
    typeCoverage,
    gapMatrix,
    mapClusters,
    insights: {
      dominantMaterial:
        [...materialCoverage].sort((a, b) => b.count - a.count)[0] ?? null,
      weakestRole:
        [...positiveRoleCoverage].sort((a, b) => a.count - b.count)[0] ?? null,
      lowestGapCells: [...positiveGapCells]
        .sort((a, b) => a.count - b.count)
        .slice(0, 3),
      dataQuality: {
        missingLocation: organisations.filter(
          (organisation) => !organisation.location,
        ).length,
        missingRole: organisations.filter(
          (organisation) => organisation.supplyChainRoles.length === 0,
        ).length,
        missingMaterial: organisations.filter(
          (organisation) => organisation.materials.length === 0,
        ).length,
        missingLink: organisations.filter((organisation) => !organisation.link)
          .length,
      },
    },
  };
}
