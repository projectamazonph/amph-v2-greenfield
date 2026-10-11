/**
 * /tools/connected-account — student-facing simulator page.
 *
 * STORY-089: Connected-Account Simulator. Sixth registry entry. The
 * scenario is read server-side from the currently published
 * SimulatorScenario so publishing a new version through the admin UI
 * takes effect without a redeploy (the same wiring STORY-085 added for
 * the other five simulators).
 *
 * The page mirrors the structure of `/tools/bid-elevator` and
 * `/tools/str-triage`: a server component reads the scenario, hands it
 * to a client component (`ConnectedAccountForm`) that owns the local
 * state for the student's bid adjustments and STR triage decisions,
 * and the action runs the simulator and renders an inline result.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { StudentShell } from "@/components/student/StudentShell";
import { SimulatorPageHeader } from "@/components/tools/SimulatorPageHeader";
import { SimulatorCoachGuide } from "@/components/tools/SimulatorCoachGuide";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ConnectedAccountForm } from "@/components/tools/ConnectedAccountForm";
import { connectedAccountScenarioContentSchema } from "./scenarioContent";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ConnectedAccountPage() {
  const container = buildContainer();
  const sim = container.simulatorRegistry.get("connected-account");
  if (!sim) {
    throw new Error("Connected Account simulator not registered");
  }

  const scenarioResult = await container.scenarioRepo.findPublished("connected-account");
  if (!scenarioResult.ok || !scenarioResult.value) {
    throw new Error("No published connected-account scenario found");
  }
  const scenario = scenarioResult.value;
  const content = connectedAccountScenarioContentSchema.parse(scenario.inputSchema);

  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <div className={styles.breadcrumbRow}>
          <Breadcrumb
            items={[{ href: "/tools", label: "Tools" }, { label: "Connected Account" }]}
          />
          <Link href="/tools/connected-account" className={styles.resetBtn}>
            Reset
          </Link>
        </div>
        <SimulatorPageHeader
          simulatorId="connected-account"
          title={scenario.name}
          description={scenario.description}
        />
        <SimulatorCoachGuide simulatorId="connected-account" />
        <ConnectedAccountForm scenario={content} />
      </main>
    </StudentShell>
  );
}
