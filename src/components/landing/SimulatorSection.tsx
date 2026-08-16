import { BidElevator } from "./BidElevator";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./SimulatorSection.module.css";

interface Tool {
  name: string;
  desc: string;
  status: "live" | "in-course" | "new";
  statusLabel: string;
  href?: string;
}

const TOOLS: Tool[] = [
  {
    name: "Bid Elevator",
    desc: "Adjust bids on a real campaign. See ACoS, sales & spend update live.",
    status: "live",
    statusLabel: "Live preview",
    href: "#simulator",
  },
  {
    name: "Campaign Builder",
    desc: "5-step wizard to build a Sponsored Products campaign from a brief.",
    status: "in-course",
    statusLabel: "In-course",
  },
  {
    name: "Search Term Triage",
    desc: "Sort 20 real search terms into keep, optimize, pause, or negate.",
    status: "in-course",
    statusLabel: "In-course",
  },
  {
    name: "Listing Audit",
    desc: "Flag the issues, then revise the listing. Real product data.",
    status: "in-course",
    statusLabel: "In-course",
  },
  {
    name: "Keyword Research",
    desc: "Categorize a generated keyword list by intent. Filter, rank, export.",
    status: "new",
    statusLabel: "New",
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
            and watch the projected ACoS (Advertising Cost of Sales) respond. The full scored
            versions of all five tools ship inside every tier.
          </p>
        </div>

        <Reveal>
          <BidElevator />
        </Reveal>

        <div className={styles.roster}>
          <div className={styles.rosterHead}>
            <span className={styles.rosterTitle}>All five practice tools</span>
            <span className={styles.rosterNote}>
              Tools are built · the in-course student UI is in development · previews above run on
              the same logic
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
