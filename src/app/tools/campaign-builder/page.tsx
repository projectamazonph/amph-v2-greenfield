/**
 * /tools/campaign-builder — student-facing simulator page.
 *
 * STORY-085: content is read server-side from the currently published
 * campaign-builder SimulatorScenario instead of a hardcoded page const,
 * so publishing a new version through the admin UI actually changes what
 * students see and get graded against.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import { CampaignBuilderForm } from "@/components/tools/CampaignBuilderForm";
import { SimulatorCoachGuide } from "@/components/tools/SimulatorCoachGuide";
import { SimulatorPageHeader } from "@/components/tools/SimulatorPageHeader";
import { StudentShell } from "@/components/student/StudentShell";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { campaignBuilderScenarioContentSchema } from "./scenarioContent";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function CampaignBuilderPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("campaign-builder");
  if (!sim) {
    throw new Error("Campaign Builder simulator not registered");
  }

  const scenarioResult = await container.scenarioRepo.findPublished("campaign-builder");
  if (!scenarioResult.ok || !scenarioResult.value) {
    throw new Error("No published campaign-builder scenario found");
  }
  const scenario = scenarioResult.value;
  const content = campaignBuilderScenarioContentSchema.parse(scenario.inputSchema);

  const userId = await getSessionUserId();
  let challengeUnlocked = false;
  if (userId) {
    const unlockedResult = await container.checkChallengeModeUnlocked.execute({
      userId,
      simulatorId: "campaign-builder",
    });
    challengeUnlocked = Result.isOk(unlockedResult) ? unlockedResult.value.unlocked : false;
  }

  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Campaign Builder" }]} />
        <SimulatorPageHeader
          simulatorId="campaign-builder"
          title={scenario.name}
          description={scenario.description}
        />
        <SimulatorCoachGuide simulatorId="campaign-builder" />
        <CampaignBuilderForm
          productCategory={content.productCategory}
          productNiche={content.productNiche}
          monthlyBudget={content.monthlyBudget}
          challengeUnlocked={challengeUnlocked}
        />
      </main>
    </StudentShell>
  );
}
