/**
 * /tools — student-facing tools index.
 *
 * Lists the 5 graded AMPH simulators (from the registry), the 12-simulator
 * SimGrid practice library (linked to /practice/simgrid, which renders the
 * full grid), and the embedded Amazon Ad Console. ad-console is added
 * manually — it isn't a simulator, so it has no registry entry.
 *
 * Each simulator card carries a status pill (Public preview vs
 * Enrolled practice) sourced from PUBLIC_CURRICULUM_CLAIMS so the
 * availability distinction surfaces before the learner clicks in.
 */

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  PlayCircle,
  ShieldWarning,
} from "@phosphor-icons/react/dist/ssr";
import { buildContainer } from "@/composition/container";
import { StudentShell } from "@/components/student/StudentShell";
import { getSimulatorCopy } from "@/lib/copy/simulatorCopy";
import {
  PUBLIC_CURRICULUM_CLAIMS,
  type PublicSimulatorAvailability,
} from "@/domain/curriculum/PublicCurriculumClaims";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Practice Tools | Project Amazon PH Academy",
  description:
    "Five graded AMPH simulators, the free 12-simulator SimGrid library, and a live Amazon Ad Console. Practice campaign decisions in a safe environment before touching real accounts.",
  alternates: { canonical: "/tools" },
};

export const dynamic = "force-dynamic";

interface ToolInfo {
  name: string;
  href: string;
  /**
   * Short skill-track label rendered as a 10px mono caption above the
   * card name. Kept here (page-local) rather than in PublicCurriculumClaims
   * because the tracks are an internal curriculum taxonomy, not a
   * public-facing claim that needs the same review contract.
   */
  skillTag: string;
}

const SIMULATOR_SKILL_TAG: Record<string, string> = {
  "bid-elevator": "Pricing & bids",
  "str-triage": "Search intent",
  "campaign-builder": "Campaign architecture",
  "listing-audit": "Listing compliance",
  "keyword-research": "Keyword discovery",
};

const TOOL_INFO: Record<string, ToolInfo> = {
  "bid-elevator": {
    name: "Bid Elevator",
    href: "/tools/bid-elevator",
    skillTag: SIMULATOR_SKILL_TAG["bid-elevator"] ?? "Simulator",
  },
  "str-triage": {
    name: "Search Term Triage",
    href: "/tools/str-triage",
    skillTag: SIMULATOR_SKILL_TAG["str-triage"] ?? "Simulator",
  },
  "campaign-builder": {
    name: "Campaign Builder",
    href: "/tools/campaign-builder",
    skillTag: SIMULATOR_SKILL_TAG["campaign-builder"] ?? "Simulator",
  },
  "listing-audit": {
    name: "Listing Audit",
    href: "/tools/listing-audit",
    skillTag: SIMULATOR_SKILL_TAG["listing-audit"] ?? "Simulator",
  },
  "keyword-research": {
    name: "Keyword Research",
    href: "/tools/keyword-research",
    skillTag: SIMULATOR_SKILL_TAG["keyword-research"] ?? "Simulator",
  },
};

const STATUS_LABEL: Record<PublicSimulatorAvailability, string> = {
  "public-preview": "Public preview",
  "enrolled-practice": "Enrolled practice",
};

function availabilityFor(simulatorId: string): PublicSimulatorAvailability | null {
  // Sourced from the same reviewed claims contract that the rest of
  // the public surface uses; never invent, always read.
  const entry =
    PUBLIC_CURRICULUM_CLAIMS.simulators[
      simulatorId as keyof typeof PUBLIC_CURRICULUM_CLAIMS.simulators
    ];
  return entry?.availability ?? null;
}

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
            <span>5 graded simulators</span>
            <span className={styles.headerDivider} aria-hidden="true">
              ·
            </span>
            <span>12 SimGrid sims</span>
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
            <span className={styles.sectionCount}>Choose a bounded exercise</span>
          </div>
          <ul className={styles.grid}>
            {registered.map((sim) => {
              const info = TOOL_INFO[sim.simulatorId];
              if (!info) return null;
              const availability = availabilityFor(sim.simulatorId);
              const statusLabel = availability ? STATUS_LABEL[availability] : null;
              return (
                <li key={sim.simulatorId} className={styles.card}>
                  <div className={styles.cardMetaRow}>
                    <span className={styles.skillTag} aria-hidden="true">
                      {info.skillTag}
                    </span>
                    {statusLabel ? (
                      <span
                        className={`${styles.statusPill} ${
                          availability === "public-preview"
                            ? styles.statusPillPublic
                            : styles.statusPillEnrolled
                        }`}
                      >
                        {statusLabel}
                      </span>
                    ) : null}
                  </div>
                  <h2 className={styles.cardName}>{info.name}</h2>
                  <p className={styles.cardBlurb}>{getSimulatorCopy(sim.simulatorId).outcome}</p>
                  <Link href={info.href} className={styles.cardLink} prefetch>
                    Start practice <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
            {/* Amazon Ad Console — embedded external tool, not a registered simulator */}
            <li key="ad-console" className={`${styles.card} ${styles.liveCard}`}>
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
        <section aria-labelledby="simgrid-library-title">
          <div className={styles.sectionHeading}>
            <h2 id="simgrid-library-title" className={styles.sectionTitle}>
              SimGrid library
            </h2>
            <span className={styles.sectionCount}>Free practice for any signed-in student</span>
          </div>
          <p className={styles.subhead}>
            Twelve additional simulators from Project Amazon PH's SimGrid library cover listing
            fundamentals, the live Ad Console, pacing, bulk file operations, SQP analytics, account
            audit, client onboarding, and the capstone workflow. These are free for any signed-in
            student and do not gate course progression. Round-completion scores sync into your
            dashboard.
          </p>
          <Link href="/practice/simgrid" className={styles.cardLink}>
            Browse SimGrid library <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </section>
      </main>
    </StudentShell>
  );
}
