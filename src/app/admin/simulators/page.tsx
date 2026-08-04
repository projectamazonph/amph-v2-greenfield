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
import type { SimulatorId, SimulatorScenario } from "@/domain/entities/SimulatorScenario";
import { AdminSimulatorsTable, type ScenarioRow } from "@/components/astryx/AdminSimulatorsTable";
import styles from "./page.module.css";

/**
 * STORY-085: the list shows one row per scenarioKey "family" — the
 * published version if one exists, else the newest draft (listAll()
 * already excludes archived rows, so there's nothing further to filter
 * for that case).
 */
function pickRepresentative(scenarios: SimulatorScenario[]): SimulatorScenario[] {
  const families = new Map<string, SimulatorScenario[]>();
  for (const s of scenarios) {
    const group = families.get(s.scenarioKey) ?? [];
    group.push(s);
    families.set(s.scenarioKey, group);
  }
  return [...families.values()].map((group) => {
    const published = group.find((s) => s.status === "published");
    if (published) return published;
    return [...group].sort((a, b) => b.version - a.version)[0]!;
  });
}

const SIMULATOR_IDS: SimulatorId[] = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
  "keyword-research",
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
  const scenarios = result.ok ? pickRepresentative(result.value.scenarios) : [];

  // Map domain SimulatorScenario[] → ScenarioRow[]
  const rows: ScenarioRow[] = scenarios.map((s) => ({
    id: s.id,
    scenarioKey: s.scenarioKey,
    version: s.version,
    status: s.status,
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
