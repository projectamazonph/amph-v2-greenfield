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
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import { StudentShell } from "@/components/student/StudentShell";
import { SimulatorCoachGuide } from "@/components/tools/SimulatorCoachGuide";
import { KeywordResearchForm } from "@/components/tools/KeywordResearchForm";
import { SimulatorPageHeader } from "@/components/tools/SimulatorPageHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SimulatorUnavailableNotice } from "@/components/tools/SimulatorUnavailableNotice";
import { keywordResearchScenarioContentSchema } from "./scenarioContent";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const brItems = [{ href: "/tools", label: "Tools" }, { label: "Keyword Research" }];

export default async function KeywordResearchPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("keyword-research");
  const scenarioResult = await container.scenarioRepo.findPublished("keyword-research");
  if (!sim || !scenarioResult.ok || !scenarioResult.value) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[simulator:error] keyword-research unavailable (not registered, or no published scenario)",
      );
    }
    return (
      <StudentShell>
        <main id="main-content" tabIndex={-1} className={styles.page}>
          <Breadcrumb items={brItems} />
          <SimulatorUnavailableNotice simulatorName="Keyword Research" />
        </main>
      </StudentShell>
    );
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
        <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Keyword Research" }]} />
        <SimulatorPageHeader
          simulatorId="keyword-research"
          title={scenario.name}
          description={scenario.description}
        />
        <SimulatorCoachGuide simulatorId="keyword-research" />
        <KeywordResearchForm
          initialNiche={content.defaultNicheId}
          challengeUnlocked={challengeUnlocked}
        />
      </main>
    </StudentShell>
  );
}
