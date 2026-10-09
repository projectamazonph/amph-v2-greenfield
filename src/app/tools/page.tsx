/**
 * /tools — student-facing tools index.
 *
 * Task 14 (simulator UI refactor): shows all 12 practice simulators in
 * a single unified 4-col grid (5 graded AMPH engines + 7 free practice
 * sims from the SimGrid library + 1 live Amazon Ad Console card).
 * No workflow overlap; all cards share the same status-pill
 * treatment.
 *
 * The 5 AMPH engines link to /tools/<id> (their existing server-rendered
 * pages). The 7 free practice sims link to /practice/<file> (the
 * iframe-wrapper route that hosts the vendored static site).
 *
 * Status badges: "Graded" for AMPH engines (enrolled practice),
 * "Free practice" for the 7 free sims, "Live account" for the
 * Amazon Ad Console.
 *
 * Each card carries a status pill sourced from PUBLIC_CURRICULUM_CLAIMS
 * so the availability distinction surfaces before the learner clicks
 * in.
 */

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { buildContainer } from "@/composition/container";
import { StudentShell } from "@/components/student/StudentShell";
import { getSimulatorCopy } from "@/lib/copy/simulatorCopy";
import { SIMGRID_SIMULATOR_META } from "@/lib/simgrid/manifest";
import {
  PUBLIC_CURRICULUM_CLAIMS,
  type PublicSimulatorAvailability,
} from "@/domain/curriculum/PublicCurriculumClaims";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface SimCard {
  readonly id: string;
  readonly name: string;
  readonly href: string;
  readonly description: string;
  readonly skillTag: string;
  readonly status: "graded" | "free" | "live";
}

const AMPH_SIMULATOR_SKILL_TAGS: Record<string, string> = {
  "bid-elevator": "Pricing & bids",
  "str-triage": "Search intent",
  "campaign-builder": "Campaign architecture",
  "listing-audit": "Listing compliance",
  "keyword-research": "Keyword discovery",
};

const AMPH_CARDS: SimCard[] = [
  {
    id: "bid-elevator",
    name: "Bid Elevator",
    href: "/tools/bid-elevator",
    description:
      "Tune bids against per-keyword economics, evidence thresholds, and the campaign budget.",
    skillTag: AMPH_SIMULATOR_SKILL_TAGS["bid-elevator"] ?? "Simulator",
    status: "graded",
  },
  {
    id: "campaign-builder",
    name: "Campaign Builder",
    href: "/tools/campaign-builder",
    description:
      "Build a Sponsored Products campaign from a client brief: structure, naming, negatives, review cadence.",
    skillTag: AMPH_SIMULATOR_SKILL_TAGS["campaign-builder"] ?? "Simulator",
    status: "graded",
  },
  {
    id: "listing-audit",
    name: "Listing Audit",
    href: "/tools/listing-audit",
    description: "Triage listing findings by urgency and write the reason for each fix.",
    skillTag: AMPH_SIMULATOR_SKILL_TAGS["listing-audit"] ?? "Simulator",
    status: "graded",
  },
  {
    id: "str-triage",
    name: "Search Term Triage",
    href: "/tools/str-triage",
    description:
      "Sort search-term reports into keep, optimize, pause, or negate. Defend each call.",
    skillTag: AMPH_SIMULATOR_SKILL_TAGS["str-triage"] ?? "Simulator",
    status: "graded",
  },
  {
    id: "keyword-research",
    name: "Keyword Research",
    href: "/tools/keyword-research",
    description:
      "Categorize a generated keyword list by intent, filter, and rank before you spend a cent.",
    skillTag: AMPH_SIMULATOR_SKILL_TAGS["keyword-research"] ?? "Simulator",
    status: "graded",
  },
];

// 7 free practice sims from the vendored SimGrid library that have no
// workflow overlap with the 5 AMPH engines above. Each card links to
// the AMPH wrapper route /practice/<file> (the catch-all under
// src/app/practice/[...slug]).
const PRACTICE_CARDS: SimCard[] = SIMGRID_SIMULATOR_META.filter((entry) => {
  // Skip the 5 that mirror AMPH engines — those are already shown
  // above as the graded path. Keeping only the 7 SimGrid-unique
  // workflows avoids workflow overlap.
  const mirrorIds = new Set([
    "listing",
    "keyword-lab",
    "campaign-architect",
    "search-triage",
    "bid-decisions",
  ]);
  return !mirrorIds.has(entry.id);
}).map((entry) => ({
  id: entry.id,
  name: entry.title,
  href: entry.href,
  description: entry.description,
  skillTag: entry.tag,
  status: "free" as const,
}));

const STATUS_LABEL: Record<SimCard["status"], string> = {
  graded: "Graded",
  free: "Free practice",
  live: "Live account",
};

export default async function ToolsIndexPage() {
  const container = buildContainer();
  const registered = container.simulatorRegistry.list();

  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Practice tools</span>
          <h1 className={styles.title}>Tools</h1>
          <p className={styles.subhead}>
            Practice campaign decisions in a safe environment. Use the live console only when you
            are ready to make real account changes.
          </p>
          <div className={styles.headerMeta} aria-label="Tool library summary">
            <span>{AMPH_CARDS.length} graded</span>
            <span className={styles.headerDivider} aria-hidden="true">
              ·
            </span>
            <span>{PRACTICE_CARDS.length} free practice</span>
            <span className={styles.headerDivider} aria-hidden="true">
              ·
            </span>
            <span>1 live console</span>
          </div>
        </header>
        <section aria-labelledby="practice-library-title">
          <div className={styles.sectionHeading}>
            <h2 id="practice-library-title" className={styles.sectionTitle}>
              Practice library
            </h2>
            <span className={styles.sectionCount}>
              {AMPH_CARDS.length + PRACTICE_CARDS.length + 1} tools, choose a bounded exercise
            </span>
          </div>
          <ul className={styles.grid}>
            {[...AMPH_CARDS, ...PRACTICE_CARDS].map((card) => (
              <li key={card.id} className={card.status === "live" ? styles.liveCard : styles.card}>
                <div className={styles.cardMetaRow}>
                  <span className={styles.skillTag} aria-hidden="true">
                    {card.skillTag}
                  </span>
                  <span
                    className={`${styles.statusPill} ${
                      card.status === "free"
                        ? styles.statusPillFree
                        : card.status === "live"
                          ? styles.statusPillLive
                          : styles.statusPillGraded
                    }`}
                  >
                    {STATUS_LABEL[card.status]}
                  </span>
                </div>
                <h2 className={card.status === "live" ? styles.cardNameLive : styles.cardName}>
                  {card.name}
                </h2>
                <p className={styles.cardBlurb}>{card.description}</p>
                <Link href={card.href} className={styles.cardLink} prefetch>
                  {card.status === "live" ? (
                    <>
                      Open live console <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Start practice <ArrowRight size={16} weight="bold" aria-hidden="true" />
                    </>
                  )}
                </Link>
              </li>
            ))}
            <li className={`${styles.card} ${styles.liveCard}`}>
              <div className={styles.cardMetaRow}>
                <span className={`${styles.skillTag} ${styles.skillTagLive}`} aria-hidden="true">
                  Production environment
                </span>
                <span
                  className={`${styles.statusPill} ${styles.statusPillLive}`}
                  aria-label="Live account"
                >
                  Live account
                </span>
              </div>
              <h2 className={`${styles.cardName} ${styles.cardNameLive}`}>Amazon Ad Console</h2>
              <p className={styles.cardBlurb}>
                A live campaign console for your own Amazon Advertising account. Changes affect real
                data and real ad spend.
              </p>
              <Link href="/tools/ad-console" className={styles.cardLink}>
                Open live console <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </StudentShell>
  );
}
