export type SimulatorCopyId =
  | "bid-elevator"
  | "str-triage"
  | "campaign-builder"
  | "listing-audit"
  | "keyword-research";

export interface SimulatorCopy {
  readonly label: string;
  readonly outcome: string;
  readonly task: string;
  readonly coachNote: string;
  readonly nextRep: string;
}

/**
 * Shared instructional frame for every registered simulator.
 * Scenario names and descriptions stay scenario-specific and database-backed.
 */
export const SIMULATOR_COPY = {
  "bid-elevator": {
    label: "Bid practice",
    outcome: "Set bids that protect target ROAS and keep useful volume moving.",
    task: "Read each keyword's evidence, then set the bid you would use first.",
    coachNote: "A higher bid can buy more clicks. It cannot fix weak conversion data.",
    nextRep: "On your next run, check the evidence count before you change the bid.",
  },
  "str-triage": {
    label: "Search-term practice",
    outcome: "Turn search-term data into clear campaign actions.",
    task: "Read the term, spend, sales, and orders before choosing an action.",
    coachNote: "Check relevance first. A relevant term may need a lower bid, not a negative.",
    nextRep: "On your next run, start with the highest-spend terms and work down.",
  },
  "campaign-builder": {
    label: "Campaign structure practice",
    outcome: "Build a campaign structure that gives each targeting job a clear home.",
    task: "Start with the campaign roles, then add ad groups, keywords, bids, and negatives.",
    coachNote: "A clean structure makes later optimization easier. Do not solve every problem in one ad group.",
    nextRep: "On your next run, name the campaign role before adding its keywords.",
  },
  "listing-audit": {
    label: "Listing review practice",
    outcome: "Find the listing issues that can limit paid-traffic performance.",
    task: "Review the listing, run the audit, then choose the first action for each finding.",
    coachNote: "Fix the issue that can change the buyer's decision before polishing low-impact details.",
    nextRep: "On your next run, sort findings by impact before you choose an action.",
  },
  "keyword-research": {
    label: "Keyword research practice",
    outcome: "Sort a keyword list by search intent and remove terms that do not belong.",
    task: "Classify each keyword, then flag the terms you would keep out of the campaign.",
    coachNote: "Ask what the shopper wants before you decide where the keyword belongs.",
    nextRep: "On your next run, mark the obvious irrelevant terms before sorting the harder ones.",
  },
} satisfies Record<SimulatorCopyId, SimulatorCopy>;

export function getSimulatorCopy(simulatorId: SimulatorCopyId): SimulatorCopy {
  return SIMULATOR_COPY[simulatorId];
}
