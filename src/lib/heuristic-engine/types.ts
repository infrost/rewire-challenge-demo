import type {
  GapCell,
  MaterialCategory,
  SupplyChainRole,
} from "@/lib/landscape-core";
import type { OrganisationResultFilter } from "@/lib/landscape-results";

export type SignalCategory =
  | "ecosystem-overview"
  | "uk-ecosystem"
  | "regional-concentration"
  | "supply-chain-structure"
  | "material-intelligence"
  | "gap-signal"
  | "collaboration-opportunity"
  | "data-quality"
  | "methodology-caveat";

export type SignalSeverity =
  | "positive"
  | "neutral"
  | "watch"
  | "warning"
  | "negative"
  | "critical";

export type SignalConfidence = "high" | "medium" | "low";

export type SignalEvidence = {
  label: string;
  value: string;
  resultFilter?: OrganisationResultFilter;
};

export type SignalAction = {
  label: string;
  target?:
    | { type: "material"; value: MaterialCategory }
    | { type: "role"; value: SupplyChainRole }
    | { type: "gap-cell"; value: GapCell };
};

export type StrategicSignal = {
  id: string;
  category: SignalCategory;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  title: string;
  observation: string;
  interpretation: string;
  evidence: SignalEvidence[];
  caveat: string;
  recommendedAction: string;
  action?: SignalAction;
  priority: number;
};

export type HeuristicAnalysis = {
  signals: StrategicSignal[];
  keySignals: StrategicSignal[];
  overviewSignals: StrategicSignal[];
  ukSignals: StrategicSignal[];
  regionalSignals: StrategicSignal[];
  supplyChainSignals: StrategicSignal[];
  materialSignals: StrategicSignal[];
  gapSignals: StrategicSignal[];
  opportunitySignals: StrategicSignal[];
  dataQualitySignals: StrategicSignal[];
  methodologySignals: StrategicSignal[];
  dataQualityWatchlist: string;
  globalCaveat: string;
};
