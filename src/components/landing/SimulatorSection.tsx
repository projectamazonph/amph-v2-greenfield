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
  "bid-elevator": "Adjust bids on illustrative campaign data. See ACoS, sales, and spend update live.",
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
            illustrative. Enrolled tiers unlock the reviewed practice tools
            listed below; simulator results remain formative, not job-readiness proof.
          </p>
        </div>

        <Reveal>
          <BidElevator />
        </Reveal>

        <div className={styles.roster}>
          <div className={styles.rosterHead}>
            <span className={styles.rosterTitle}>All {TOOLS.length} practice tools</span>
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
      </div>
    </section>
  );
}
