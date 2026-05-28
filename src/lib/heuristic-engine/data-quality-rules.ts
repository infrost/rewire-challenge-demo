import {
  formatPercent,
  makeResultFilter,
  share,
  type HeuristicRuleContext,
} from "./context";
import { HEURISTIC_COPY } from "./constants";
import type { SignalSeverity, StrategicSignal } from "./types";

export function buildDataQualityWatchlist(context: HeuristicRuleContext) {
  const dataQuality = getContextDataQuality(context);

  return `${dataQuality.missingRole} records have no role, ${dataQuality.missingMaterial} have no material, and ${dataQuality.missingLink} have no link.`;
}

function getContextDataQuality(context: HeuristicRuleContext) {
  return {
    missingLocation: context.organisations.filter(
      (organisation) => !organisation.location,
    ).length,
    missingRole: context.organisations.filter(
      (organisation) => organisation.supplyChainRoles.length === 0,
    ).length,
    missingMaterial: context.organisations.filter(
      (organisation) => organisation.materials.length === 0,
    ).length,
    missingLink: context.organisations.filter((organisation) => !organisation.link)
      .length,
  };
}

function severityFromShare(value: number): SignalSeverity {
  if (value >= 0.3) {
    return "warning";
  }

  if (value >= 0.1) {
    return "watch";
  }

  return "neutral";
}

export function buildDataQualitySignals(
  context: HeuristicRuleContext,
): StrategicSignal[] {
  const dataQuality = getContextDataQuality(context);
  const total = context.total || 1;
  const missingClassification =
    dataQuality.missingRole + dataQuality.missingMaterial;
  const missingClassificationShare = share(missingClassification, total);
  const missingLinkShare = share(dataQuality.missingLink, total);
  const missingLocationShare = share(dataQuality.missingLocation, total);
  const signals: StrategicSignal[] = [
    {
      id: "current-data-quality-watchlist",
      category: "data-quality",
      severity: severityFromShare(
        Math.max(missingClassificationShare, missingLinkShare),
      ),
      confidence: "high",
      title: HEURISTIC_COPY.dataQualityTitle,
      observation: buildDataQualityWatchlist(context),
      interpretation:
        "Missing fields reduce the reliability of gap analysis and follow-up workflows.",
      evidence: [
        {
          label: "Missing role",
          value: `${dataQuality.missingRole}`,
          resultFilter: makeResultFilter(context, {
            dataQualityIssues: ["missing-role"],
          }),
        },
        {
          label: "Missing material",
          value: `${dataQuality.missingMaterial}`,
          resultFilter: makeResultFilter(context, {
            dataQualityIssues: ["missing-material"],
          }),
        },
        {
          label: "Missing link",
          value: `${dataQuality.missingLink}`,
          resultFilter: makeResultFilter(context, {
            dataQualityIssues: ["missing-link"],
          }),
        },
      ],
      caveat:
        "Some records may intentionally remain broad ecosystem bodies rather than supply-chain actors.",
      recommendedAction:
        "Create a review queue for records missing core classification fields or external links.",
      priority: 68,
    },
  ];

  if (missingLinkShare >= 0.2) {
    signals.push({
      id: "missing-link-follow-up-limitation",
      category: "data-quality",
      severity: severityFromShare(missingLinkShare),
      confidence: "high",
      title: "Many records lack external links",
      observation: `${formatPercent(missingLinkShare)} of records do not include a link.`,
      interpretation:
        "This limits validation, follow-up, and stakeholder outreach from the tool.",
      evidence: [
        {
          label: "Missing link",
          value: `${dataQuality.missingLink}`,
          resultFilter: makeResultFilter(context, {
            dataQualityIssues: ["missing-link"],
          }),
        },
      ],
      caveat:
        "A missing link does not reduce the relevance of the organisation itself.",
      recommendedAction:
        "Prioritise link enrichment for high-priority organisations and selected gaps.",
      priority: 66,
    });
  }

  if (missingLocationShare >= 0.1) {
    signals.push({
      id: "unknown-geography-warning",
      category: "data-quality",
      severity: severityFromShare(missingLocationShare),
      confidence: "high",
      title: "Some geography needs enrichment",
      observation: `${formatPercent(missingLocationShare)} of records have no explicit location field.`,
      interpretation:
        "This reduces confidence in regional interpretation and map-based cluster analysis.",
      evidence: [
        {
          label: "Missing location",
          value: `${dataQuality.missingLocation}`,
          resultFilter: makeResultFilter(context, {
            regions: ["Global / unknown"],
          }),
        },
      ],
      caveat:
        "Some global ecosystem bodies may intentionally have broad or unresolved geography.",
      recommendedAction:
        "Enrich locations for records used in regional analysis or stakeholder outreach.",
      priority: 62,
    });
  }

  return signals;
}
