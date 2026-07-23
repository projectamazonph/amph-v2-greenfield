/**
 * AdminSimulatorsTable — Astryx Table for /admin/simulators.
 *
 * "use client" only because Table's renderCell prop is a function.
 */

"use client";

import Link from "next/link";
import { Table, type TableColumn, Badge } from "@astryxdesign/core";
import type { Difficulty, SimulatorId } from "@/domain/entities/SimulatorScenario";

// Must satisfy Table's `T extends Record<string, unknown>` constraint.
export interface ScenarioRow extends Record<string, unknown> {
  id: string;
  simulatorId: SimulatorId;
  name: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
}

interface AdminSimulatorsTableProps {
  scenarios: ScenarioRow[];
  currentSimulatorId?: string;
}

const SIMULATOR_IDS: SimulatorId[] = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
];

function difficultyVariant(d: Difficulty) {
  switch (d) {
    case "beginner":
      return "success" as const;
    case "intermediate":
      return "warning" as const;
    case "advanced":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

// ── Column definitions ─────────────────────────────────────────────────────────

const COLUMNS: TableColumn<ScenarioRow>[] = [
  {
    key: "id",
    header: "ID",
    width: { type: "proportional", value: 1 },
    renderCell: (row) => (
      <code style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.id}</code>
    ),
  },
  {
    key: "simulatorId",
    header: "Simulator",
    width: { type: "proportional", value: 1 },
    renderCell: (row) => (
      <span
        style={{
          fontFamily: "var(--font-family-code)",
          fontSize: 12,
          background: "var(--color-background-muted)",
          padding: "2px 6px",
          borderRadius: 3,
        }}
      >
        {row.simulatorId}
      </span>
    ),
  },
  {
    key: "name",
    header: "Name",
    width: { type: "proportional", value: 2 },
  },
  {
    key: "difficulty",
    header: "Difficulty",
    width: { type: "pixel", value: 110 },
    renderCell: (row) => (
      <Badge variant={difficultyVariant(row.difficulty)} label={row.difficulty} />
    ),
  },
  {
    key: "estimatedMinutes",
    header: "Est. (min)",
    width: { type: "pixel", value: 90 },
    renderCell: (row) => (
      <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>
        {row.estimatedMinutes}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    width: { type: "pixel", value: 60 },
    align: "end",
    renderCell: (row) => (
      <Link
        href={`/admin/simulators/${row.id}/edit`}
        style={{
          color: "var(--color-accent)",
          textDecoration: "none",
          fontWeight: 500,
          fontSize: "var(--font-size-sm)",
        }}
      >
        Edit
      </Link>
    ),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminSimulatorsTable({ scenarios, currentSimulatorId }: AdminSimulatorsTableProps) {
  return (
    <>
      {/* SimulatorId filter chips */}
      <div
        style={{
          display: "flex",
          gap: "var(--spacing-2)",
          marginBottom: "var(--spacing-4)",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-secondary)",
            fontWeight: 500,
          }}
        >
          Filter by simulator:
        </span>
        <Link
          href="/admin/simulators"
          style={{
            padding: "4px 10px",
            borderRadius: "var(--radius-full)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-family-code)",
            textDecoration: "none",
            background: !currentSimulatorId
              ? "var(--color-accent)"
              : "var(--color-background-muted)",
            color: !currentSimulatorId ? "var(--color-on-accent)" : "var(--color-text-primary)",
            fontWeight: !currentSimulatorId ? 600 : 400,
            transition: "background 120ms",
          }}
        >
          All
        </Link>
        {SIMULATOR_IDS.map((id) => (
          <Link
            key={id}
            href={`/admin/simulators?simulatorId=${id}`}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-family-code)",
              textDecoration: "none",
              background:
                currentSimulatorId === id ? "var(--color-accent)" : "var(--color-background-muted)",
              color:
                currentSimulatorId === id ? "var(--color-on-accent)" : "var(--color-text-primary)",
              fontWeight: currentSimulatorId === id ? 600 : 400,
              transition: "background 120ms",
            }}
          >
            {id}
          </Link>
        ))}
      </div>

      <Table
        data={scenarios}
        columns={COLUMNS}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
      />

      {scenarios.length === 0 && (
        <p
          style={{
            padding: "var(--spacing-8)",
            textAlign: "center",
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          No scenarios found.
        </p>
      )}
    </>
  );
}
