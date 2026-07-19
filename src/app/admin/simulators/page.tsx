/**
 * /admin/simulators — admin simulator scenario list.
 *
 * STORY-050b. Server component.
 */

import Link from "next/link";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import styles from "./page.module.css";

const SIMULATOR_IDS: SimulatorId[] = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "var(--color-accent)",
  intermediate: "var(--color-warning)",
  advanced: "var(--color-danger)",
};

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

      <Card padding="comfortable">
        {/* SimulatorId filter */}
        <div className={styles.filters}>
          <span className={styles.filterLabel}>Filter by simulator:</span>
          <Link
            href="/admin/simulators"
            className={`${styles.filterChip} ${!sp.simulatorId ? styles.filterChipActive : ""}`}
          >
            All
          </Link>
          {SIMULATOR_IDS.map((id) => (
            <Link
              key={id}
              href={`/admin/simulators?simulatorId=${id}`}
              className={`${styles.filterChip} ${sp.simulatorId === id ? styles.filterChipActive : ""}`}
            >
              {id}
            </Link>
          ))}
        </div>

        {scenarios.length === 0 ? (
          <p className={styles.empty}>No scenarios found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Simulator</th>
                <th>Name</th>
                <th>Difficulty</th>
                <th>Est. (min)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id}>
                  <td className={styles.mono}>{s.id}</td>
                  <td>
                    <span className={styles.simulatorTag}>{s.simulatorId}</span>
                  </td>
                  <td>{s.name}</td>
                  <td>
                    <span
                      style={{ color: DIFFICULTY_COLORS[s.difficulty] ?? "inherit" }}
                    >
                      {s.difficulty}
                    </span>
                  </td>
                  <td className={styles.mono}>{s.estimatedMinutes}</td>
                  <td>
                    <Link
                      href={`/admin/simulators/${s.id}/edit`}
                      className={styles.editLink}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
