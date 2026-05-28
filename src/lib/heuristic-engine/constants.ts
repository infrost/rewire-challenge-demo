export const HEURISTIC_PANEL_LABELS = {
  mainTitle: "Strategic signals",
  gapTitle: "Gap signals",
  dialogTitle: "Heuristic analysis",
  dialogDescription:
    "Evidence-based interpretations generated from the active landscape view.",
  showAll: "Show all",
  loadingLabel: "Running heuristic analysis",
} as const;

export const HEURISTIC_GLOBAL_CAVEAT =
  "These are underrepresented in the current dataset, not definitive statements about the entire global ecosystem.";

export const HEURISTIC_COPY = {
  dataQualityTitle: "Current data quality watchlist",
  methodologyTitle: "Insights reflect the active landscape dataset",
  methodologyObservation:
    "All counts and signals are generated from the currently loaded spreadsheet.",
  methodologyInterpretation:
    "The tool supports high-level landscape mapping and visual exploration.",
  methodologyEvidence: "Current spreadsheet records",
  methodologyAction:
    "Use data quality notes and targeted enrichment to improve coverage over time.",
  methodologyCaveat:
    "The outputs should not be treated as a complete census of the global power semiconductor ecosystem.",
} as const;
