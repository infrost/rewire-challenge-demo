import type { UIMessage } from "ai";
import type {
  MapRegion,
  MaterialCategory,
  OrganisationType,
  SupplyChainRole,
} from "@/lib/landscape-core";
import type {
  OrganisationResultFilter,
  ResultFilterTag,
} from "@/lib/landscape-results";
import type {
  SignalCategory,
  SignalConfidence,
  SignalSeverity,
} from "@/lib/heuristic-engine";

export type RewireAgentIntent =
  | "custom"
  | "explain_view"
  | "summarize_insights";

export type RewireAgentToolName =
  | "rewire_explain_view"
  | "rewire_summarize_insights";

export type RewireAgentToolInput = {
  userFocus?: string;
};

export type RewireAgentCoverageItem<T extends string> = {
  key: T;
  count: number;
  share: number;
};

export type RewireAgentStrategicSignal = {
  id: string;
  category: SignalCategory;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  title: string;
  observation: string;
  interpretation: string;
  evidence: { label: string; value: string }[];
  caveat: string;
  recommendedAction: string;
};

export type RewireAgentViewContext = {
  sourceName: string;
  scope: {
    activeRegion: MapRegion | null;
    resultContextLabel: string;
    generatedAt: string;
  };
  activeFilters: {
    filter: OrganisationResultFilter;
    tags: ResultFilterTag[];
  };
  currentResultCount: {
    selected: number;
    total: number;
    share: number;
  };
  regionalDistribution: {
    region: MapRegion;
    count: number;
    share: number;
    typeCounts: Record<OrganisationType, number>;
  }[];
  supplyChainProfile: RewireAgentCoverageItem<SupplyChainRole>[];
  materialProfile: RewireAgentCoverageItem<MaterialCategory>[];
  actorMix: RewireAgentCoverageItem<OrganisationType>[];
  topOrganisations: {
    name: string;
    type: OrganisationType;
    location: string | null;
    ukPresence: boolean;
    supplyChainRoles: SupplyChainRole[];
    materials: MaterialCategory[];
    remit: string;
  }[];
  strategicSignals: RewireAgentStrategicSignal[];
  dataCaveats: {
    globalCaveat: string;
    dataQualityWatchlist: string;
    missingRole: number;
    missingMaterial: number;
    missingLink: number;
    methodology: string[];
  };
};

export type RewireAgentToolOutput = {
  ok: true;
  intent: RewireAgentIntent;
  userFocus: string;
  context: RewireAgentViewContext;
};

export type RewireAgentTools = {
  rewire_explain_view: {
    input: RewireAgentToolInput;
    output: RewireAgentToolOutput;
  };
  rewire_summarize_insights: {
    input: RewireAgentToolInput;
    output: RewireAgentToolOutput;
  };
};

export type RewireAgentMessageMetadata = {
  intent?: RewireAgentIntent;
  createdAt?: number;
};

export type RewireAgentUIMessage = UIMessage<
  RewireAgentMessageMetadata,
  never,
  RewireAgentTools
>;

export type RewireAgentSessionRecord = {
  id: string;
  messages: RewireAgentUIMessage[];
  updatedAt: number;
};
