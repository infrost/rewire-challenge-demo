"use client";

import type { Config, DriveStep } from "driver.js";

const steps: DriveStep[] = [
  {
    element: '[data-tour="ecosystem-map"]',
    popover: {
      title: "Map / regional concentration",
      description:
        "Start with geography. The map and regional concentration panel show where the current landscape is concentrated. Select a region or focus the entire pattern.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="exploration-controls"]',
    popover: {
      title: "Cross-filter exploration",
      description:
        "Use the right-hand controls to build multi-select and cross-selected views. Organisation type, supply-chain role, and material choices can be combined, and the visualisations update dynamically as the selection changes.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-tour="supply-chain-coverage"]',
    popover: {
      title: "Supply-chain coverage",
      description:
        "Next, filter by supply-chain role. This shows how organisations are distributed across the power electronics value chain and lets you focus on roles such as device design, epiwafer, manufacturing, or end users.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-tour="material-intelligence"]',
    popover: {
      title: "Material intelligence",
      description:
        "Add a material lens. Selecting SiC, GaN, Ga2O3, or other material categories cross-filters the current regional and supply-chain view.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-tour="filtered-results"]',
    popover: {
      title: "Filtered results",
      description:
        "Open filtered results to inspect the organisations behind the selected view, including their source sheet, material tags, supply-chain roles, location, and contact information.",
      side: "top",
      align: "end",
    },
  },
  {
    element: '[data-tour="strategic-signals"]',
    popover: {
      title: "Strategic signals",
      description:
        "Use strategic signals to interpret the active view. These evidence-based cards highlight patterns, gaps, opportunities, and caveats so the dashboard supports decision-making rather than simple filtering.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-tour="command-capsule"]',
    popover: {
      title: "AI and data capsule",
      description:
        "Use this capsule to call Ask AI for analysis of the current view, import or restore spreadsheet data sources, clear filters, download the source data, or restart this guided briefing.",
      side: "top",
      align: "end",
    },
  },
];

const briefingConfig: Config = {
  steps,
  showProgress: true,
  allowClose: true,
  animate: true,
  overlayOpacity: 0.42,
  stagePadding: 8,
  stageRadius: 10,
  nextBtnText: "Next",
  prevBtnText: "Back",
  doneBtnText: "Finish",
  popoverClass: "guided-briefing-popover",
  progressText: "{{current}} of {{total}}",
};

export async function startGuidedBriefing() {
  const { driver } = await import("driver.js");
  const briefing = driver(briefingConfig);

  briefing.drive();
}
