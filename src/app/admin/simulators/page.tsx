/**
 * /admin/simulators — admin simulator scenario list.
 *
 * STORY-050b. Server component.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import { AdminSimulatorsTable, type ScenarioRow } from "@/components/astryx/AdminSimulatorsTable";
import styles from "./page.module.css";

const SIMULATOR_IDS: SimulatorId[] = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
];

interface PageProps {
  searchParams: Promise<{ simulatorId?: string }>;
}

export default async function AdminSimulatorsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const filter: { simulatorId?: SimulatorId } = {};
  if (sp.simulatorId && SIMULATOR_IDS.includes(sp.simulatorId as SimulatorId)) {
    filter.simulatorId = sp.simulatorId as SimulatorId;
  }

  const result = await container.adminListScenarios.execute(filter);
  const scenarios = result.ok ? result.value.scenarios : [];

  // Map domain SimulatorScenario[] → ScenarioRow[]
  const rows: ScenarioRow[] = scenarios.map((s) => ({
    id: s.id,
    simulatorId: s.simulatorId,
    name: s.name,
    difficulty: s.difficulty,
    estimatedMinutes: s.estimatedMinutes,
  }));

  return (
    <div>
      <TopBar
        title="Simulator scenarios"
        subtitle="Manage the scenarios used in live simulator sessions"
        actions={
          <Link href="/admin/simulators/new" className={styles.addButton}>
            + Add scenario
          </Link>
        }
      />

      <Card padding={6}>
        <AdminSimulatorsTable scenarios={rows} currentSimulatorId={filter.simulatorId} />
      </Card>
    </div>
  );
}
