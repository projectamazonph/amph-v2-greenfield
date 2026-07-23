/**
 * Practice — landing page section 4.
 *
 * Shows all 5 live simulators with real screenshots from the running app.
 * No more "In development" — these are built and working.
 */

import Image from "next/image";
import styles from "./Practice.module.css";

interface Tool {
  id: string;
  name: string;
  whatItDoes: string;
  screenshot: string;
  href: string;
  badge?: string;
}

const TOOLS: ReadonlyArray<Tool> = [
  {
    id: "bid-elevator",
    name: "Bid Elevator",
    whatItDoes: "Adjust bids on a real campaign. See projected ACoS, sales, and spend update live.",
    screenshot: "/screenshots/bid-elevator.png",
    href: "/tools/bid-elevator",
  },
  {
    id: "campaign-builder",
    name: "Campaign Builder",
    whatItDoes: "5-step wizard to build a Sponsored Products campaign from a brief.",
    screenshot: "/screenshots/campaign-builder.png",
    href: "/tools/campaign-builder",
  },
  {
    id: "str-triage",
    name: "Search Term Triage",
    whatItDoes: "Triage 20 search terms from a real report. Mark keep, optimize, pause, or negate.",
    screenshot: "/screenshots/str-triage.png",
    href: "/tools/str-triage",
  },
  {
    id: "listing-audit",
    name: "Listing Audit",
    whatItDoes: "Two steps: flag the issues, then revise the listing. Real product data.",
    screenshot: "/screenshots/listing-audit.png",
    href: "/tools/listing-audit",
  },
  {
    id: "keyword-research",
    name: "Keyword Research",
    whatItDoes: "Categorize a generated keyword list by intent. Filter, rank, export.",
    screenshot: "/screenshots/keyword-research.png",
    href: "/tools/keyword-research",
    badge: "New",
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
          5 interactive simulators — the same tools we use on real client accounts. Practice with
          real data. Get scored instantly.
        </p>
        <ul className={styles.grid}>
          {TOOLS.map((tool) => (
            <li key={tool.id} className={styles.card}>
              <div className={styles.screenshotWrap}>
                <Image
                  src={tool.screenshot}
                  alt={`${tool.name} simulator interface`}
                  className={styles.screenshot}
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized
                />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.nameRow}>
                  <h3 className={styles.toolName}>{tool.name}</h3>
                  {tool.badge && (
                    <span className={styles.badge} aria-label="New tool">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <p className={styles.toolBody}>{tool.whatItDoes}</p>
                <a href={tool.href} className={styles.cardLink}>
                  Try it →
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
