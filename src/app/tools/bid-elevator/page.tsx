/**
 * /tools/bid-elevator — student-facing simulator page.
 *
 * STORY-079: Bid Elevator economic model rewrite. The scenario is
 * authored with per-keyword economics (baseline CTR/CVR, benchmark CPC,
 * available impression volume, bid elasticity, evidence counts) rather
 * than a bare keyword/volume/CPC row, so ground truth is reproducible
 * from authored data instead of a hardcoded 2% CTR constant.
 *
 * Per the STORY-079 scoping decision, the practice tool is
 * scenario-only: the student adjusts each keyword's bid, but does not
 * type in keyword economics themselves (those fields can't be filled in
 * meaningfully by a free-typing user under the new model).
 *
 * STORY-085: content is read server-side from the currently published
 * bid-elevator SimulatorScenario instead of a hardcoded page const, so
 * publishing a new version through the admin UI actually changes what
 * students see and get graded against.
 *
 * The result renders inline inside BidElevatorForm (client state) once
 * the student clicks "Run simulation" — no route change needed.
 */

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";
import { BidElevatorForm } from "@/components/tools/BidElevatorForm";
import { StudentShell } from "@/components/student/StudentShell";
import { bidElevatorScenarioContentSchema } from "./scenarioContent";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function BidElevatorPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("bid-elevator");
  if (!sim) {
    throw new Error("Bid Elevator simulator not registered");
  }

  const scenarioResult = await container.scenarioRepo.findPublished("bid-elevator");
  if (!scenarioResult.ok || !scenarioResult.value) {
    throw new Error("No published bid-elevator scenario found");
  }
  const scenario = scenarioResult.value;
  const content = bidElevatorScenarioContentSchema.parse(scenario.inputSchema);

  const userId = await getSessionUserId();
  let challengeUnlocked = false;
  if (userId) {
    const unlockedResult = await container.checkChallengeModeUnlocked.execute({
      userId,
      simulatorId: "bid-elevator",
    });
    challengeUnlocked = Result.isOk(unlockedResult) ? unlockedResult.value.unlocked : false;
  }

  return (
    <StudentShell>
      <main className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/tools"><ArrowLeft size={16} aria-hidden /> Tools</Link>
          <span aria-hidden="true"> / </span>
          <span>Bid Elevator</span>
          <Link
            href="/tools/bid-elevator"
            className={styles.resetBtn}
          >
            Reset
          </Link>
        </nav>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Simulator</span>
          <h1 className={styles.title}>{scenario.name}</h1>
          <p className={styles.brief}>{scenario.description}</p>
        </header>
        <BidElevatorForm scenario={content} challengeUnlocked={challengeUnlocked} />
      </main>
    </StudentShell>
  );
}
