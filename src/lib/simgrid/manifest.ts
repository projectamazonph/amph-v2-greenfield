/**
 * SimGrid practice hub manifest.
 *
 * Task 7 of the 2026-09-30 SimGrid integration plan: the 12 browser
 * simulators that AMPH hosts via the vendored static site at
 * public/simgrid-v1/ are surfaced to students on /practice/simgrid.
 *
 * The canonical ordering, titles, tags, and descriptions are sourced
 * from the vendored catalog — see public/simgrid-v1/index.html
 * (the .pha-tcard blocks) and public/simgrid-v1/assets/curriculum-manifest.js
 * (the SIMULATORS array). Hardcoding here rather than parsing those
 * files at build time because:
 *   1. The vendored site is a static asset the browser downloads, not a
 *      build-time source of truth we own.
 *   2. Re-parsing on every page render would mean pulling a 100k+ JS
 *      file into the server bundle just to read five strings per entry.
 *   3. Whenever the vendored catalog changes, the diff here is the
 *      reviewable contract — review it the same way you would review a
 *      translation file.
 *
 * The `id` field is the SimgridSimulatorId allowlist value from
 * @/domain/simgrid (Task 3, commit 946c64a4); the `file` field is the
 * vendored HTML filename, and `href` is the route the AMPH wrapper
 * page mounts for that simulator. Both fields stay in sync — the
 * SIMGRID_SIMULATOR_META shape and the wrapper route /practice/simgrid
 * are wired together by the entry page.
 */

import { SIMGRID_SIMULATOR_IDS, type SimgridSimulatorId } from "@/domain/simgrid";

export interface SimgridSimulatorMeta {
  readonly id: SimgridSimulatorId;
  readonly title: string;
  readonly tag: string;
  readonly description: string;
  /** Wrapped page route under the AMPH origin (e.g. /practice/simgrid/listing.html). */
  readonly href: string;
  /** Vendored HTML filename served from /simgrid-v1/ (e.g. listing.html). */
  readonly file: string;
}

export const SIMGRID_SIMULATOR_META: readonly SimgridSimulatorMeta[] = [
  {
    id: "listing",
    title: "BuyBox Dojo",
    tag: "Listing + PPC",
    description:
      "Optimize a listing: research, match types, negatives, then run a 7-day PPC pressure test.",
    href: "/practice/simgrid/listing.html",
    file: "listing.html",
  },
  {
    id: "ad-console",
    title: "AdConsole Pro",
    tag: "Ad Operations",
    description:
      "Full Sponsored Ads console. Campaigns, ad groups, keywords, search terms, daily pacing, hour-by-hour auction.",
    href: "/practice/simgrid/ad-console.html",
    file: "ad-console.html",
  },
  {
    id: "keyword-lab",
    title: "Keyword Lab",
    tag: "Keyword Research",
    description:
      "Win the auction before you spend a cent. Research, build a hit list, and rank your keywords.",
    href: "/practice/simgrid/keyword-lab.html",
    file: "keyword-lab.html",
  },
  {
    id: "campaign-architect",
    title: "Campaign Architect",
    tag: "Planning",
    description:
      "Turn a product brief into campaign structure, core targets, negative guardrails, and a first review rule.",
    href: "/practice/simgrid/campaign-architect.html",
    file: "campaign-architect.html",
  },
  {
    id: "search-triage",
    title: "Search Term Triage",
    tag: "Triage",
    description: "8, 12, or 16 terms a round. Read the report, pick the action, defend it.",
    href: "/practice/simgrid/search-triage.html",
    file: "search-triage.html",
  },
  {
    id: "bid-decisions",
    title: "Bid Decisions",
    tag: "Optimization",
    description:
      "Read clicks, spend, sales, ACOS, ROAS, and confidence. Choose whether to raise, hold, lower, or investigate before touching the bid.",
    href: "/practice/simgrid/bid-decisions.html",
    file: "bid-decisions.html",
  },
  {
    id: "pacing-deck",
    title: "Pacing Deck",
    tag: "Budget + Pacing",
    description:
      "Set day-parting. Watch the flight log. See how Amazon burns through a daily budget.",
    href: "/practice/simgrid/pacing-deck.html",
    file: "pacing-deck.html",
  },
  {
    id: "bulk-file",
    title: "Bulk File",
    tag: "Bulk Operations",
    description:
      "Upload a sheet. Validate. Get graded the way Amazon actually grades bulk uploads.",
    href: "/practice/simgrid/bulk-file.html",
    file: "bulk-file.html",
  },
  {
    id: "sqp-studio",
    title: "SQP Studio",
    tag: "Analytics",
    description:
      "Compare search-query visibility and conversion signals. Separate what the data proves from what it only hints.",
    href: "/practice/simgrid/sqp-studio.html",
    file: "sqp-studio.html",
  },
  {
    id: "account-audit",
    title: "Account Audit",
    tag: "Audit",
    description:
      "Read a synthetic account snapshot, rank urgency, and pick the safest next action for waste, scale, listing, and thin-data findings.",
    href: "/practice/simgrid/account-audit.html",
    file: "account-audit.html",
  },
  {
    id: "client-onboarding",
    title: "Client Onboarding",
    tag: "VA Workflow",
    description:
      "Turn a client handoff into access, KPI, product facts, approval rules, and launch blockers before work starts.",
    href: "/practice/simgrid/client-onboarding.html",
    file: "client-onboarding.html",
  },
  {
    id: "capstone-sequence",
    title: "Capstone",
    tag: "Capstone",
    description:
      "Practice the full PPC workflow from research to setup, optimization, and evidence-based client reporting.",
    href: "/practice/simgrid/capstone-sequence.html",
    file: "capstone-sequence.html",
  },
] as const;

/**
 * Look up a simulator's metadata by its allowlisted id. Returns
 * `undefined` for unknown ids so callers can decide how to handle a
 * postMessage bridge attempt from an unrecognized simulator (rather
 * than silently dropping it).
 */
export function getSimgridSimulatorMeta(id: SimgridSimulatorId): SimgridSimulatorMeta | undefined {
  return SIMGRID_SIMULATOR_META.find((entry) => entry.id === id);
}

/**
 * Reverse lookup — given a vendored HTML filename, return its
 * SimgridSimulatorMeta entry. Used by the practice route handler to
 * validate the :file param before mounting the iframe.
 */
export function getSimgridSimulatorByFile(file: string): SimgridSimulatorMeta | undefined {
  return SIMGRID_SIMULATOR_META.find((entry) => entry.file === file);
}

/**
 * Compile-time invariant: every SimgridSimulatorId must be present
 * in the manifest exactly once, and the manifest must contain
 * exactly SIMGRID_SIMULATOR_IDS.length entries. Throws at module
 * load if the two lists drift apart.
 */
(function assertManifestCoverage(): void {
  if (SIMGRID_SIMULATOR_META.length !== SIMGRID_SIMULATOR_IDS.length) {
    throw new Error(
      `SIMGRID_SIMULATOR_META has ${SIMGRID_SIMULATOR_META.length} entries; expected ${SIMGRID_SIMULATOR_IDS.length}.`,
    );
  }
  for (const id of SIMGRID_SIMULATOR_IDS) {
    const matches = SIMGRID_SIMULATOR_META.filter((entry) => entry.id === id);
    if (matches.length !== 1) {
      throw new Error(
        `SIMGRID_SIMULATOR_META must contain exactly one entry for "${id}"; found ${matches.length}.`,
      );
    }
  }
})();
