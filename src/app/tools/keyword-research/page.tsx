/**
 * /tools/keyword-research — student-facing simulator page.
 *
 * STORY-081: Keyword Research is its own registered simulator (see
 * src/domain/simulator/keyword-research/), no longer a page reusing
 * ListingAuditSimulator's hardcoded keyword generator.
 *
 * STORY-085: the pre-filled niche is read server-side from the currently
 * published keyword-research SimulatorScenario instead of a hardcoded
 * page const, so publishing a new version through the admin UI changes
 * the default. The actual dataset content stays STORY-081's system
 * (KeywordDatasetRepository), not duplicated into this scenario.
 */

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import { StudentShell } from "@/components/student/StudentShell";
import { KeywordResearchForm } from "@/components/tools/KeywordResearchForm";
import { keywordResearchScenarioContentSchema } from "./scenarioContent";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function KeywordResearchPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("keyword-research");
  if (!sim) {
    throw new Error("Keyword Research simulator not registered");
  }

  const scenarioResult = await container.scenarioRepo.findPublished("keyword-research");
  if (!scenarioResult.ok || !scenarioResult.value) {
    throw new Error("No published keyword-research scenario found");
  }
  const scenario = scenarioResult.value;
  const content = keywordResearchScenarioContentSchema.parse(scenario.inputSchema);

  const userId = await getSessionUserId();
  let challengeUnlocked = false;
  if (userId) {
    const unlockedResult = await container.checkChallengeModeUnlocked.execute({
      userId,
      simulatorId: "keyword-research",
    });
    challengeUnlocked = Result.isOk(unlockedResult) ? unlockedResult.value.unlocked : false;
  }

  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/tools">
            <ArrowLeft size={16} aria-hidden /> Tools
          </Link>
          <span aria-hidden="true"> / </span>
          <span>Keyword Research</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Simulator</span>
          <h1 className={styles.title}>{scenario.name}</h1>
          <p className={styles.brief}>{scenario.description}</p>
        </header>
        <KeywordResearchForm
          initialNiche={content.defaultNicheId}
          challengeUnlocked={challengeUnlocked}
        />
      </main>
    </StudentShell>
  );
}
