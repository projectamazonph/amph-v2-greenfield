/**
 * /admin/simulators/[simulatorId]/[scenarioKey]/calibration — admin
 * calibration editor for one scenario family.
 *
 * STORY-086: Simulator grader — instructor calibration ranges.
 * Server component. The form action is an inline `"use server"` shim that
 * parses FormData into a `dimensionBands` map and calls
 * `setScenarioCalibrationAction`.
 */

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { redirect, notFound } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { KNOWN_DIMENSIONS, type GradingDimension } from "@/domain/entities/ScorePolicy";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import {
  setScenarioCalibrationAction,
} from "@/app/actions/setScenarioCalibration.action";
import formStyles from "../../../new/page.module.css";

const SIMULATOR_IDS: SimulatorId[] = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
  "keyword-research",
];

function isSimulatorId(value: string): value is SimulatorId {
  return (SIMULATOR_IDS as readonly string[]).includes(value);
}

interface PageProps {
  params: Promise<{ simulatorId: string; scenarioKey: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_simulator_id: "Invalid simulator.",
  invalid_scenario_key: "Scenario key is required.",
  unknown_dimension: "Submitted an unknown grading dimension.",
  invalid_band:
    "One of the bands is invalid. Check that min < max, both are 0–100, and the band is tighter than [0, 100].",
  db_error: "Something went wrong saving the calibration. Please try again.",
  unauthorized: "You do not have permission to set calibration.",
};

export default async function ScenarioCalibrationPage({
  params,
  searchParams,
}: PageProps) {
  const { simulatorId, scenarioKey } = await params;
  const sp = await searchParams;
  await requireAdmin();

  if (!isSimulatorId(simulatorId)) {
    notFound();
  }
  if (typeof scenarioKey !== "string" || scenarioKey.trim().length === 0) {
    notFound();
  }

  const container = buildContainer();
  const existing = await container.getScenarioCalibration.execute(
    simulatorId,
    scenarioKey,
  );
  if (!existing.ok) {
    return (
      <div>
        <TopBar title="Calibration" subtitle="Set per-dimension grading bands" />
        <Card padding={6}>
          <p style={{ color: "var(--danger)", margin: 0 }}>
            Calibration could not be loaded. Try again.
          </p>
        </Card>
      </div>
    );
  }

  // Build a quick lookup of existing bands so each row can default its
  // min/max from the persisted record. Missing entries stay blank.
  const existingBands: Record<string, { minScore: number; maxScore: number }> =
    existing.value.calibration?.dimensionBands ?? {};

  const errorMsg = sp.error ? ERROR_MESSAGES[sp.error] ?? "Something went wrong." : null;
  const savedNotice =
    sp.saved === "1" ? "Calibration saved. New attempts will use the new bands." : null;

  return (
    <div>
      <Link href="/admin/simulators" className={formStyles.backLink}>
        <ArrowLeft size={16} aria-hidden /> Back to scenarios
      </Link>

      <TopBar
        title="Calibration"
        subtitle={`${simulatorId} · scenarioKey: ${scenarioKey}`}
      />

      <Card padding={6}>
        <p style={{ fontSize: "0.875rem", color: "var(--ink-500)", margin: "0 0 1rem 0" }}>
          Each row tightens the grading range for one grading dimension. Leave both
          fields blank to skip a dimension. Bands must be a strict subset of [0, 100];
          a band of [0, 100] is rejected.
        </p>

        {savedNotice && (
          <p
            style={{
              color: "var(--accent)",
              margin: "0 0 1rem 0",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {savedNotice}
          </p>
        )}

        {errorMsg && (
          <p style={{ color: "var(--danger)", margin: "0 0 1rem 0", fontSize: "0.875rem" }}>
            {errorMsg}
          </p>
        )}

        <form action={handleSubmit(simulatorId, scenarioKey)} className={formStyles.form}>
          {KNOWN_DIMENSIONS.map((dim) => {
            const band = existingBands[dim];
            return (
              <div
                key={dim}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 7rem 7rem",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <label htmlFor={`min-${dim}`} style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                  {dim}
                </label>
                <input
                  id={`min-${dim}`}
                  type="number"
                  name={`min:${dim}`}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={band?.minScore ?? ""}
                  placeholder="min"
                  className={formStyles.input}
                  aria-label={`${dim} minimum score`}
                />
                <input
                  type="number"
                  name={`max:${dim}`}
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={band?.maxScore ?? ""}
                  placeholder="max"
                  className={formStyles.input}
                  aria-label={`${dim} maximum score`}
                />
              </div>
            );
          })}

          <div className={formStyles.actions}>
            <Link href="/admin/simulators" className={formStyles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={formStyles.submitButton}>
              Save calibration
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function handleSubmit(simulatorId: SimulatorId, scenarioKey: string) {
  return async function (formData: FormData) {
    "use server";

    const dimensionBands: Record<string, { minScore: number; maxScore: number }> = {};
    for (const dim of KNOWN_DIMENSIONS) {
      const minRaw = formData.get(`min:${dim}`);
      const maxRaw = formData.get(`max:${dim}`);
      // formData.get() returns either string or File; we only ever write
      // string inputs, so the casts are safe.
      const minStr = typeof minRaw === "string" ? minRaw : "";
      const maxStr = typeof maxRaw === "string" ? maxRaw : "";
      // Both fields must be present to count as a calibration entry;
      // a partially-filled row is treated as cleared so the admin sees
      // a clear error on the next page instead of a silent save.
      if (minStr === "" || maxStr === "") continue;
      const min = Number(minStr);
      const max = Number(maxStr);
      if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
      dimensionBands[dim as GradingDimension] = { minScore: min, maxScore: max };
    }

    const r = await setScenarioCalibrationAction({
      simulatorId,
      scenarioKey,
      dimensionBands,
    });

    if (!r.ok) {
      redirect(
        `/admin/simulators/${simulatorId}/${encodeURIComponent(scenarioKey)}/calibration?error=${r.error.kind}`,
      );
      return;
    }
    redirect(
      `/admin/simulators/${simulatorId}/${encodeURIComponent(scenarioKey)}/calibration?saved=1`,
    );
  };
}
