/**
 * Simulators — landing page section 5.
 * 5 cards, each with a static SVG mockup of what the tool looks like.
 * Real tools. Not screenshots from a marketing site; reproductions of
 * the actual UI in inline SVG so the page weight stays near-zero.
 */

import styles from "./Simulators.module.css";
import { SimulatorMockup, type SimulatorMockupVariant } from "./SimulatorMockup";

interface Tool {
  variant: SimulatorMockupVariant;
  name: string;
  blurb: string;
  youWill: string;
}

const TOOLS: ReadonlyArray<Tool> = [
  {
    variant: "campaign-builder",
    name: "Campaign Builder",
    blurb: "Build a Sponsored Products structure from a brief.",
    youWill: "Set budgets, pick bids, group keywords, see where you'd over-spend before launch.",
  },
  {
    variant: "bid-elevator",
    name: "Bid Elevator",
    blurb: "Practice bid changes on a live-ish account.",
    youWill: "Move a slider, see the projected ACoS, sales, and spend update in real time.",
  },
  {
    variant: "str-triage",
    name: "Search Term Triage",
    blurb: "Triage a search-term report like a real audit.",
    youWill: "Sort 28+ terms, mark EXACT or NEGATE, and write the rationale for the harder ones.",
  },
  {
    variant: "listing-audit",
    name: "Listing Audit",
    blurb: "Score a listing against the same checklist our team uses.",
    youWill: "Title, bullets, backend keywords, A+ content. Walk away with a score and the fixes.",
  },
  {
    variant: "keyword-research",
    name: "Keyword Research",
    blurb: "Expand a seed term into a working keyword set.",
    youWill: "Type a seed, see volume and CPC, pick the ones that match a real campaign structure.",
  },
];

export function Simulators() {
  return (
    <section
      className={styles.section}
      aria-labelledby="simulators-heading"
    >
      <div className={styles.inner}>
        <h2 id="simulators-heading" className={styles.heading}>
          You don't just watch lessons.
        </h2>
        <p className={styles.subhead}>
          You practice with the same tools we use on client accounts. Five
          simulators. Each one matches a module in the course.
        </p>
        <ul className={styles.grid}>
          {TOOLS.map((tool) => (
            <li key={tool.variant} className={styles.card}>
              <div className={styles.mockupFrame}>
                <SimulatorMockup variant={tool.variant} label={tool.name} />
              </div>
              <h3 className={styles.toolName}>{tool.name}</h3>
              <p className={styles.blurb}>{tool.blurb}</p>
              <p className={styles.youWill}>
                <span className={styles.youWillLabel}>You will:</span> {tool.youWill}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
