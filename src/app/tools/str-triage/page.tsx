/**
 * /tools/str-triage — student-facing simulator page.
 *
 * STORY-082: Expand STR Triage classifier. Scenario now carries the full
 * search-term-report schema plus the economics needed for
 * targetCpa/zero-order thresholds, existing-target detection, and
 * per-brand-class target ROAS. See docs/stories/STORY-082.md.
 *
 * STORY-085: content is read server-side from the currently published
 * str-triage SimulatorScenario instead of a hardcoded page const, so
 * publishing a new version through the admin UI actually changes what
 * students see.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import { StrTriageForm } from "@/components/tools/StrTriageForm";
import { StudentShell } from "@/components/student/StudentShell";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { strTriageScenarioContentSchema } from "./scenarioContent";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function StrTriagePage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("str-triage");
  if (!sim) {
    throw new Error("STR Triage simulator not registered");
  }

  const scenarioResult = await container.scenarioRepo.findPublished("str-triage");
  if (!scenarioResult.ok || !scenarioResult.value) {
    throw new Error("No published str-triage scenario found");
  }
  const scenario = scenarioResult.value;
  const content = strTriageScenarioContentSchema.parse(scenario.inputSchema);

  const userId = await getSessionUserId();
  let challengeUnlocked = false;
  if (userId) {
    const unlockedResult = await container.checkChallengeModeUnlocked.execute({
      userId,
      simulatorId: "str-triage",
    });
    challengeUnlocked = Result.isOk(unlockedResult) ? unlockedResult.value.unlocked : false;
  }

  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Search Term Triage" }]} />
        <header className={styles.header}>
          <span className={styles.eyebrow}>Simulator</span>
          <h1 className={styles.title}>{scenario.name}</h1>
          <p className={styles.brief}>{scenario.description}</p>
          <p className={styles.meta}>
            <span className={styles.metaLabel}>Target ROAS (generic)</span>
            <span className={styles.metaValue}>{content.genericTargetRoas.toFixed(2)}×</span>
            <span className={styles.metaDivider}>·</span>
            <span className={styles.metaLabel}>Search terms</span>
            <span className={styles.metaValue}>{content.rows.length}</span>
          </p>
        </header>
        <StrTriageForm scenario={content} challengeUnlocked={challengeUnlocked} />
      </main>
    </StudentShell>
  );
}
