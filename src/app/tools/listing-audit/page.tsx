/**
 * /tools/listing-audit — student-facing simulator page.
 *
 * STORY-085: content is no longer a hardcoded SCENARIO const — it's read
 * server-side from the currently published listing-audit SimulatorScenario,
 * so publishing a new version through the admin UI actually changes what
 * students see.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import { ListingAuditForm } from "@/components/tools/ListingAuditForm";
import { SimulatorCoachGuide } from "@/components/tools/SimulatorCoachGuide";
import { SimulatorPageHeader } from "@/components/tools/SimulatorPageHeader";
import { StudentShell } from "@/components/student/StudentShell";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SimulatorUnavailableNotice } from "@/components/tools/SimulatorUnavailableNotice";
import { listingAuditScenarioContentSchema } from "./scenarioContent";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const brItems = [{ href: "/tools", label: "Tools" }, { label: "Listing Audit" }];

export default async function ListingAuditPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("listing-audit");
  const scenarioResult = await container.scenarioRepo.findPublished("listing-audit");
  if (!sim || !scenarioResult.ok || !scenarioResult.value) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[simulator:error] listing-audit unavailable (not registered, or no published scenario)",
      );
    }
    return (
      <StudentShell>
        <main id="main-content" tabIndex={-1} className={styles.page}>
          <Breadcrumb items={brItems} />
          <SimulatorUnavailableNotice simulatorName="Listing Audit" />
        </main>
      </StudentShell>
    );
  }

  const scenario = scenarioResult.value;
  const content = listingAuditScenarioContentSchema.parse(scenario.inputSchema);

  const userId = await getSessionUserId();
  let challengeUnlocked = false;
  if (userId) {
    const unlockedResult = await container.checkChallengeModeUnlocked.execute({
      userId,
      simulatorId: "listing-audit",
    });
    challengeUnlocked = Result.isOk(unlockedResult) ? unlockedResult.value.unlocked : false;
  }

  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Listing Audit" }]} />
        <SimulatorPageHeader
          simulatorId="listing-audit"
          title={scenario.name}
          description={scenario.description}
        />
        <SimulatorCoachGuide simulatorId="listing-audit" />
        <ListingAuditForm
          initialTitle={scenario.name}
          initialBullets={content.bullets}
          initialDescription={content.description}
          challengeUnlocked={challengeUnlocked}
        />
      </main>
    </StudentShell>
  );
}
