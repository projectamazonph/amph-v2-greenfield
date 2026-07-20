/**
 * Practice — landing page section 4.
 *
 * Honest + specific. The simulator UIs are not built yet, but the
 * design specs are real (see docs/ui-specs/STITCH-PROMPTS.md §19-24
 * and docs/ui-specs/wireframes/tools/*.html). Each tool listed here
 * uses the actual scenario title from the design — not invented copy.
 *
 * Domain logic is also real: ~700 LOC across 4 simulators in
 * src/domain/simulator/. The student-facing pages are what's missing.
 *
 * The wireframes gallery preview at docs/previews/wireframes.html
 * shows all 5 tool UIs as Stitch outputs with placeholder content.
 */

import styles from "./Practice.module.css";

interface Tool {
  name: string;
  whatItDoes: string;
  /** Scenario title from the Stitch spec — keeps copy sourced. */
  scenario: string;
  /** Where the wireframe is in the repo. */
  wireframeHref: string;
  status: "in_development";
}

const TOOLS: ReadonlyArray<Tool> = [
  {
    name: "Bid Elevator",
    whatItDoes:
      "Adjust bids on a real campaign. See projected ACoS, sales, and spend update live.",
    scenario:
      "Reduce ACoS on a high-spend electronics campaign. 8–10 keyword rows, real bid data.",
    wireframeHref: "/docs/previews/wireframes.html#public",
    status: "in_development",
  },
  {
    name: "Campaign Builder",
    whatItDoes:
      "5-step wizard to build a Sponsored Products campaign from a brief.",
    scenario:
      "Launch an SP campaign for wireless earbuds. Manual targeting, exact + phrase keywords, ₱500/day budget.",
    wireframeHref: "/docs/previews/wireframes.html#public",
    status: "in_development",
  },
  {
    name: "Search Term Triage",
    whatItDoes:
      "Triage 20 search terms from a real report. Mark keep, optimize, pause, or negate.",
    scenario:
      "Clean up a broad match campaign for kitchen products getting irrelevant clicks.",
    wireframeHref: "/docs/previews/wireframes.html#public",
    status: "in_development",
  },
  {
    name: "Listing Audit",
    whatItDoes:
      "Two steps: flag the issues, then revise the listing. Real product data.",
    scenario:
      "Bamboo Cutting Board — Premium Kitchen Essential. ASIN B08N5WRWNW, AOV ₱1,200.",
    wireframeHref: "/docs/previews/wireframes.html#public",
    status: "in_development",
  },
  {
    name: "Keyword Research",
    whatItDoes:
      "Categorize a generated keyword list by intent. Filter, rank, export.",
    scenario:
      "Same bamboo cutting board niche. 25 seed terms, expand, categorize, ship to a campaign.",
    wireframeHref: "/docs/previews/wireframes.html#public",
    status: "in_development",
  },
];

export function Practice() {
  return (
    <section className={styles.section} aria-labelledby="practice-heading">
      <div className={styles.inner}>
        <h2 id="practice-heading" className={styles.heading}>
          You don&apos;t just watch lessons.
        </h2>
        <p className={styles.subhead}>
          The course includes 5 practice tools — the same kind we use on
          client accounts. The student-facing UI is in development; the
          domain logic behind each tool is built and tested, and the
          screen designs are specified.
        </p>
        <ul className={styles.list}>
          {TOOLS.map((tool) => (
            <li key={tool.name} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.nameRow}>
                  <h3 className={styles.toolName}>{tool.name}</h3>
                  <span
                    className={styles.badge}
                    aria-label="In development"
                  >
                    In development
                  </span>
                </div>
                <p className={styles.toolBody}>{tool.whatItDoes}</p>
                <p className={styles.scenario}>
                  <span className={styles.scenarioLabel}>Sample scenario:</span>{" "}
                  {tool.scenario}
                </p>
              </div>
              <a
                href="/docs/previews/wireframes.html"
                className={styles.previewLink}
                rel="noopener"
              >
                See wireframe
                <span aria-hidden="true"> →</span>
              </a>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Each tool has a domain simulator (~700 LOC total) and a detailed
          design spec. Sign up to the waitlist to get notified when the
          first ships.
        </p>
      </div>
    </section>
  );
}
