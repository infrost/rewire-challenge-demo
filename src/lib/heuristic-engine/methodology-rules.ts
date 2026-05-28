import { makeResultFilter, type HeuristicRuleContext } from "./context";
import { HEURISTIC_COPY } from "./constants";
import type { StrategicSignal } from "./types";

export function buildMethodologySignals(
  context: HeuristicRuleContext,
): StrategicSignal[] {
  return [
    {
      id: "dataset-coverage-caveat",
      category: "methodology-caveat",
      severity: "neutral",
      confidence: "high",
      title: HEURISTIC_COPY.methodologyTitle,
      observation: HEURISTIC_COPY.methodologyObservation,
      interpretation: HEURISTIC_COPY.methodologyInterpretation,
      evidence: [
        {
          label: HEURISTIC_COPY.methodologyEvidence,
          value: `${context.metrics.totals.organisations}`,
          resultFilter: makeResultFilter(context),
        },
      ],
      caveat: HEURISTIC_COPY.methodologyCaveat,
      recommendedAction: HEURISTIC_COPY.methodologyAction,
      priority: 10,
    },
  ];
}
