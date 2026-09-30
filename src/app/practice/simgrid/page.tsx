/**
 * /practice/simgrid — Task 7 of the 2026-09-30 SimGrid integration plan.
 *
 * Student-facing landing page for the 12 vendored SimGrid simulators.
 * Server component. Authentication is enforced by the default
 * <StudentShell> behavior (requireAuth={true} unless overridden).
 *
 * The page renders three blocks:
 *   1. Header (eyebrow, h1, lede).
 *   2. <FormativeScoreNotice /> — the shared STORY-078 disclaimer
 *      ("Practice score only...") that all 5 AMPH simulators render
 *      next to their score. It is rendered bare (no className prop —
 *      the component is plain presentational and manages its own
 *      styling). Layout control is handled by the surrounding
 *      <header>/<main> container, not by prop drilling.
 *   3. <SimgridPracticeGrid /> — the 12-card grid sourced from
 *      SIMGRID_SIMULATOR_META.
 *
 * Each card links to /practice/simgrid/<file>.html. The route handler
 * for that pattern (a follow-up task in this plan) mounts the vendored
 * HTML iframe at public/simgrid-v1/<file> with the parent-patch
 * bridge wired in.
 *
 * Metadata (title/description/canonical) is set statically so the
 * page is discoverable in search and shows consistent browser tab
 * copy before the JavaScript bundle parses.
 */

import type { Metadata } from "next";

import { StudentShell } from "@/components/student/StudentShell";
import { FormativeScoreNotice } from "@/components/tools/FormativeScoreNotice";
import { SimgridPracticeGrid } from "@/components/simgrid/SimgridPracticeGrid";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "SimGrid Practice | Project Amazon PH Academy",
  description: "12 browser-based Amazon PPC simulators. Practice-first training for Filipino VAs.",
  alternates: { canonical: "/practice/simgrid" },
};

export const dynamic = "force-dynamic";

export default function PracticeSimgridPage() {
  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Practice-first training</p>
          <h1 className={styles.title}>SimGrid Practice</h1>
          <p className={styles.lede}>
            12 browser-based simulators covering the full Amazon PPC workflow. Progress saves
            automatically and shows up in your dashboard.
          </p>
        </header>
        <FormativeScoreNotice />
        <SimgridPracticeGrid />
      </main>
    </StudentShell>
  );
}
