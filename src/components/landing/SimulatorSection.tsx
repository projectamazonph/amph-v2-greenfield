import { BidElevator } from "./BidElevator";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./SimulatorSection.module.css";
import { PUBLIC_CURRICULUM_CLAIMS } from "@/domain/curriculum/PublicCurriculumClaims";

interface Tool {
  target: string;
  name: string;
  desc: string;
  status: "live" | "in-course" | "new";
  statusLabel: string;
  href?: string;
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  "bid-elevator":
    "Adjust bids on illustrative campaign data. See ACoS, sales, and spend update live.",
  "campaign-builder": "Build a Sponsored Products campaign from a client brief.",
  "str-triage": "Sort search terms into keep, optimize, pause, or negate.",
  "listing-audit": "Flag listing issues, then write the reason for each fix.",
  "keyword-research": "Categorize a generated keyword list by intent, filter, and rank.",
};

const TOOLS: Tool[] = Object.entries(PUBLIC_CURRICULUM_CLAIMS.simulators).map(
  ([target, simulator]) => ({
    target,
    name: simulator.label,
    desc: TOOL_DESCRIPTIONS[target] ?? "Guided Amazon PPC practice.",
    status: simulator.availability === "public-preview" ? "live" : "in-course",
    statusLabel: simulator.availability === "public-preview" ? "Live preview" : "Enrolled practice",
    ...(simulator.availability === "public-preview" ? { href: "#simulator" } : {}),
  }),
);

const SIMGRID_TOOLS: { name: string; desc: string }[] = [
  {
    name: "BuyBox Dojo",
    desc: "Listing fundamentals: research, match types, negatives, 7-day PPC pressure test.",
  },
  {
    name: "AdConsole Pro",
    desc: "Full Sponsored Ads console. Campaigns, ad groups, keywords, search terms, daily pacing.",
  },
  {
    name: "Keyword Lab",
    desc: "Research, build a hit list, and rank keywords before you spend a cent.",
  },
  {
    name: "Campaign Architect",
    desc: "Turn a product brief into structure, core targets, negative guardrails, and a first review rule.",
  },
  {
    name: "Search Term Triage",
    desc: "8, 12, or 16 terms a round. Read the report, pick the action, defend it.",
  },
  {
    name: "Bid Decisions",
    desc: "Read clicks, spend, sales, ACOS, ROAS, confidence. Choose before you touch the bid.",
  },
  { name: "Pacing Deck", desc: "Set day-parting. Watch the daily-budget flight log respond." },
  {
    name: "Bulk File",
    desc: "Upload a sheet. Validate. Get graded the way Amazon grades uploads.",
  },
  {
    name: "SQP Studio",
    desc: "Compare search-query performance and conversion signals. Separate data from hint.",
  },
  {
    name: "Account Audit",
    desc: "Rank urgency and pick the safest next action for waste, scale, listing.",
  },
  {
    name: "Client Onboarding",
    desc: "Turn a handoff into access, KPI, product facts, approval rules, launch blockers.",
  },
  {
    name: "Capstone",
    desc: "Run the full PPC workflow from research to setup, optimization, and reporting.",
  },
];

export function SimulatorSection() {
  return (
    <section className={[shared.sec, styles.sectionTint].join(" ")} id="simulator">
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§02 / THE SIMULATORS</span>
            <h2 className={shared.secTitle}>Move a bid. Watch the account breathe.</h2>
          </div>
          <p className={shared.secLede}>
            This is a <b>public preview</b> of the Bid Elevator plus a search-term harvest. Drag the
            budget and bid, then triage the table: promote winners to exact match, cut the waste,
            and watch the projected ACoS (Advertising Cost of Sales) respond. The public preview is
            illustrative. Enrolled tiers unlock the reviewed practice tools listed below; simulator
            results remain formative, not job-readiness proof.
          </p>
        </div>

        <Reveal>
          <BidElevator />
        </Reveal>

        <div className={styles.roster}>
          <div className={styles.rosterHead}>
            <span className={styles.rosterTitle}>All {TOOLS.length} AMPH practice tools</span>
            <span className={styles.rosterNote}>
              Availability follows the reviewed curriculum claim contract · public preview and
              enrolled practice are labelled separately
            </span>
          </div>
          <div className={styles.tools}>
            {TOOLS.map((tool) =>
              tool.href ? (
                <a
                  key={tool.name}
                  className={[styles.tool, styles.toolLive].join(" ")}
                  href={tool.href}
                >
                  <span className={styles.status}>{tool.statusLabel}</span>
                  <span className={styles.toolName}>{tool.name}</span>
                  <span className={styles.toolDesc}>{tool.desc}</span>
                </a>
              ) : (
                <div
                  key={tool.name}
                  className={[styles.tool, tool.status === "new" ? styles.toolNew : ""].join(" ")}
                >
                  <span className={styles.status}>{tool.statusLabel}</span>
                  <span className={styles.toolName}>{tool.name}</span>
                  <span className={styles.toolDesc}>{tool.desc}</span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className={styles.roster}>
          <div className={styles.rosterHead}>
            <span className={styles.rosterTitle}>
              SimGrid library — {SIMGRID_TOOLS.length} free simulators
            </span>
            <span className={styles.rosterNote}>
              Free for any signed-in student · no enrollment gate · round scores sync to the
              dashboard
            </span>
          </div>
          <div className={styles.tools}>
            {SIMGRID_TOOLS.map((tool) => (
              <div key={tool.name} className={styles.tool}>
                <span className={styles.status}>Free practice</span>
                <span className={styles.toolName}>{tool.name}</span>
                <span className={styles.toolDesc}>{tool.desc}</span>
              </div>
            ))}
            <a
              key="simgrid-cta"
              className={[styles.tool, styles.toolLive].join(" ")}
              href="/practice/simgrid"
              aria-label="Browse the SimGrid library"
            >
              <span className={styles.status}>Open library</span>
              <span className={styles.toolName}>SimGrid hub</span>
              <span className={styles.toolDesc}>
                Browse all 12 simulators, pick a workflow, drill until it sticks.
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
