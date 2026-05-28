# REWIRE Ecosystem Intelligence

REWIRE Ecosystem Intelligence is an interactive command centre for exploring the UK and global power electronics ecosystem. **It turns a Excel workbook into an exploratory dashboard** with map-based ecosystem intelligence, supply-chain coverage analysis, material intelligence, filterable organisation results, strategic signal cards, and optional AI-assisted interpretation.

The live demo itself includes a `Guided Briefing`. It is highly recommended to try the [live demo](https://rewire.linkto.host) first, then read this instructions.

## Table of Contents

- [Live Demo and Access Options](#live-demo-and-access-options)
- [What You Can Expect](#what-you-can-expect)
- [Privacy and Data Compliance](#privacy-and-data-compliance)
- [AI Features (Optional)](#ai-features-optional)
- [Interaction Model](#interaction-model)
- [Deploy On Vercel](#deploy-on-vercel)
- [Run Locally](#run-locally)
- [How to Use](#how-to-use)
- [Data Format](#data-format)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)
- [Notes](#notes)
- [Screenshot](./assets/screenshots/)

## Live Demo and Access Options

Please choose one of the following three options:


**Direct Access：**
1. [Use this demo](https://rewire.linkto.host)

**One-Click Deployment：**

2. [Deploy your own copy on Vercel](#deploy-on-vercel)

**Run Locally：**

3. [Run locally on your device](#run-locally)

For a step-by-step walkthrough, see [How to Use](#how-to-use)

* A larger screen is recommended for the best experience, such as a laptop, desktop, or iPad/tablet.


## What You Can Expect

This dashboard helps users answer questions such as:

- Where are UK and global power electronics organisations concentrated?
- Which regions have strong or weak supply-chain coverage?
- Which organisations are active in SiC, GaN, Ga2O3, or other materials?
- Which supply-chain stages are underrepresented?
- Which organisations match a selected region, material, or role?
- What strategic ecosystem signals emerge from the current filtered view?

## Privacy and Data Compliance

AI is an optional feature. Without AI enabled, the project is fully local — all data processing is performed entirely within user's browser, including a heuristic analysis engine. 

Additionally, the local deployment option supports running on-device AI, such as edge models like nvidia/nemotron-3-nano-4b using lm-studio (tested).

## AI Features (Optional)

### What the AI feature does

When enabled, the AI assistant receives a compact summary of the current dashboard state, including the active filters, visible organisations, supply-chain coverage, material coverage, and generated insight signals. It can explain the current view in plain language and suggest likely ecosystem implications.

### What the AI feature does not do

- It does not replace the underlying spreadsheet.
- It does not guarantee factual correctness.
- It should not be treated as authoritative evidence.
- It may be unavailable on the hosted demo if the configured provider or quota is unavailable.

### Technical details and configuration

The hosted demo's AI features are provided for convenience and are not guaranteed to be reliable or always available. If the demo AI stops working, deploy your own copy and use your own AI API key.

The AI integration uses an OpenAI-compatible chat completion endpoint through the Vercel/Next.js API route at `/api/rewire-agent`.

Recommended model families:

- `nvidia/nemotron-3` series (tested)
- `gpt-oss` series (tested)
- `glm-4.7-flash` (the demo's configured model)

Set the model with `REWIRE_AGENT_MODEL`. Set the provider endpoint with `OPENAI_BASE_URL`, and set the key with `OPENAI_API_KEY`.

Please note that to better support this project (such as functioning under Vercel serverless limitations), the AI agent for this project uses a custom backend. Please refer to the source code in `src\app\api\rewire-agent`.

## Interaction Model

The dashboard uses cross-filtering. Selecting an item in one panel updates the rest of the dashboard.

- Selecting a region filters the map, supply-chain view, material view, organisation table, and insight cards.
- Selecting a supply-chain role narrows the view to matching organisations.
- Selecting a material narrows the view to organisations associated with that material.
- Multiple selections can be combined to create a focused ecosystem view.
- The organisation table always shows the evidence behind the current selection.
- Clear filters to return to the full dataset.

## Deploy On Vercel

This is the recommended way to get a self-hosted full-featured version

Use the button below to deploy your own copy of the project on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/infrost/rewire-challenge-demo)

In Vercel, add these environment variables:

```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
REWIRE_AGENT_MODEL=gpt-oss-20b
```

If you are using an OpenAI-compatible provider, use that provider's `base URL` and a `tool-call-capable model/api` endpoint instead.

Do not commit real API keys to GitHub. Keep real keys in Vercel environment variables or in a local `.env.local` file.

## Run Locally

Requirements:

- Node.js `>=20.9.0` or compatible
- pnpm `10.15.1` or compatible

Install dependencies:

```bash
pnpm install
```

Create your local environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your own API key and model settings if you want to use AI features.

Start the development server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Build for production:

```bash
pnpm build
pnpm start
```

## How to Use

The live demo itself includes a `Guided Briefing`. It is highly recommended to try the [live demo](https://rewire.linkto.host) first, then read this instructions.

### 1. Open the dashboard

Use the hosted demo, deploy your own copy on Vercel, or run the project locally. The dashboard loads with the default demo spreadsheet so that users can immediately explore the ecosystem without uploading their own data.

### 2. Follow the first-time guide

On first launch, the guided briefing introduces the main exploration areas:

1. **Regional concentration** — use the map and region controls to understand where organisations are concentrated.
2. **Supply-chain coverage** — select supply-chain roles to identify strengths and gaps across the ecosystem.
3. **Material intelligence** — inspect material coverage such as SiC, GaN, Ga2O3, and other categories.
4. **Cross-filtering** — combine region, role, material, and organisation-type selections to narrow the view.
5. **Filtered results and insights** — review the matching organisations and read the strategic signal cards generated from the current selection.

### 3. Explore the map

Use the map to inspect organisation distribution by geography. The region controls allow users to switch focus between World, UK, Europe, North America, and Asia. Selecting a region filters the dashboard and updates the organisation results and insight cards.

### 4. Explore supply-chain coverage

The supply-chain panel groups organisations by their ecosystem role, such as equipment, substrate, epiwafer, device design, manufacturing, packaging, and end users. Selecting a role updates the map, material view, organisation table, and strategic insights.

### 5. Explore material intelligence

The material intelligence panel summarises the ecosystem by material categories such as SiC, GaN, Ga2O3, and other materials. Selecting a material reveals which organisations, regions, and supply-chain roles are associated with that material.

### 6. Combine filters

Filters can be combined. For example, a user can select a region, a supply-chain role, and a material to answer questions such as:

* Which UK organisations work on GaN device design?
* Which regions have substrate capability but limited packaging coverage?
* Which materials are concentrated in academic groups rather than industry?
* Which parts of the supply chain are underrepresented for a selected material?

Use the clear/reset controls to return to the full dataset.

### 7. Review organisation results

The organisation results table shows the filtered organisations with context such as source sheet, organisation type, role, material, location, contact/remit information, and source links where available. This table is the best place to validate the evidence behind the map, charts, and insight cards.

### 8. Use strategic signal cards

The strategic signal cards summarise notable patterns in the current view, including regional concentration, supply-chain gaps, material clusters, and decision-relevant observations. These cards are generated from the structured spreadsheet data and should be treated as exploratory signals rather than final conclusions.

### 9. Use Ask AI

If AI is enabled, the Ask AI capsule can summarise the current filtered view and explain likely ecosystem implications. AI is optional and is not required for the dashboard to function. Important conclusions should always be checked against the underlying organisation table and spreadsheet data.

### 10. Upload or reset your own data
The “More” icon in the lower-left corner allows you to reset or upload an Excel workbook.

## Data Format

The dashboard is built for the official REWIRE challenge Excel workbook.

The demo dataset follows the challenge workbook schema, including recognised sheets such as:

- Industry
- Academic Groups
- Other

The upload feature lets users replace or extend the dataset with another workbook that follows the same official schema. Within that schema, users can freely add new organisation rows, update existing entries, or extend the dataset with additional organisations.

To test the upload feature, download this sample Excel file and upload it in the app:

[Test Excel workbook](./assets/test.xlsx)

For best results, keep the original workbook structure, sheet names, and column layout. Workbooks that significantly change the official schema may not parse correctly.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui and Base UI components
- MapLibre GL
- TanStack Table
- AI SDK with OpenAI-compatible providers

## Troubleshooting

### The dashboard loads but no organisations appear

Check that the Excel workbook uses recognised sheet names such as `Industry`, `Academic Groups`, and `Other`. Also check that each organisation row contains a recognisable name and location/remit information.

### The map does not show expected locations

Check that location fields are consistently formatted. Very vague or missing locations may not be mapped precisely.

### The filters return no results

The selected region, role, material, or organisation type combination may have no matching organisations. Clear one or more filters to broaden the view.

### The AI feature does not respond

Check that `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `REWIRE_AGENT_MODEL` are set correctly. The selected model/provider must support OpenAI-compatible chat completion requests and the backend route at `/api/rewire-agent`.

### Vercel deployment fails

Check the Node.js and pnpm versions, environment variables, and whether the repository URL in the deploy button has been replaced.

## Notes

This project is intended as an exploratory dashboard and demo system. AI-generated summaries should be treated as assistive analysis, not as authoritative evidence. Always verify important conclusions against the underlying spreadsheet data and source links.
