/**
 * /tools/listing-audit — student-facing simulator page.
 *
 * STORY-085: content is no longer a hardcoded SCENARIO const — it's read
 * server-side from the currently published listing-audit SimulatorScenario,
 * so publishing a new version through the admin UI actually changes what
 * students see.
 */

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import { ListingAuditForm } from "@/components/tools/ListingAuditForm";
import { StudentShell } from "@/components/student/StudentShell";
import { listingAuditScenarioContentSchema } from "./scenarioContent";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ListingAuditPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("listing-audit");
  if (!sim) {
    throw new Error("Listing Audit simulator not registered");
  }

  const scenarioResult = await container.scenarioRepo.findPublished("listing-audit");
  if (!scenarioResult.ok || !scenarioResult.value) {
    throw new Error("No published listing-audit scenario found");
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
      <main className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/tools">
            <ArrowLeft size={16} aria-hidden /> Tools
          </Link>
          <span aria-hidden="true"> / </span>
          <span>Listing Audit</span>
        </nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Simulator</span>
          <h1 className={styles.title}>{scenario.name}</h1>
          <p className={styles.brief}>{scenario.description}</p>
        </header>
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
