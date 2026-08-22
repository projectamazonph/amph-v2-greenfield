/**
 * /admin/simulators/[id]/[scenarioKey]/calibration — admin
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
  type ScenarioCalibration,
  type DimensionBand,
} from "@/domain/entities/SimulatorScenarioCalibration";
import { setScenarioCalibrationAction } from "@/app/actions/setScenarioCalibration.action";
import formStyles from "../../new/page.module.css";
import styles from "./page.module.css";

function isSimulatorId(s: string): s is SimulatorId {
  return ["bid-elevator", "str-triage", "campaign-builder", "listing-audit"].includes(s);
}

interface PageProps {
  params: Promise<{ id: string; scenarioKey: string }>;
  searchParams: Promise<{ saved?: string }>;
}

export default async function CalibrationPage({ params, searchParams }: PageProps) {
  const admin = await requireAdmin();
  const { id, scenarioKey } = await params;

  if (!isSimulatorId(id)) {
    return notFound();
  }

  const container = await buildContainer();
  const scenarioRepo = container.simulatorScenarioRepository;
  const calibrationRepo = container.simulatorScenarioCalibrationRepository;

  // Resolve the scenario to get its current state.
  const scenarioResult = await scenarioRepo.findBySimulatorAndScenarioKey(id, scenarioKey);
  if (!scenarioResult.ok) {
    return notFound();
  }

  const scenario = scenarioResult.value;

  // Load existing calibration (if any).
  const calibrationResult = await calibrationRepo.findBySimulatorAndScenarioKey(id, scenarioKey);
  const calibration = calibrationResult.ok ? calibrationResult.value : null;

  // Build the initial form values from the calibration or defaults.
  const initialBands: Record<string, DimensionBand> = calibration?.dimensionBands ?? {};

  // Helper to extract a band for a dimension, or return a default.
  function getBand(dim: GradingDimension): DimensionBand {
    return initialBands[dim] ?? { minScore: 0, maxScore: 100 };
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const adminId = (await requireAdmin()).id;

    // Parse dimension bands from form data.
    const bands: Record<string, DimensionBand> = {};
    for (const dim of KNOWN_DIMENSIONS) {
      const minStr = formData.get(`min_${dim}`) as string;
      const maxStr = formData.get(`max_${dim}`) as string;
      const minScore = Number.parseInt(minStr ?? "0", 10);
      const maxScore = Number.parseInt(maxStr ?? "100", 10);

      // Skip dimensions that weren't submitted.
      if (!minStr && !maxStr) continue;

      // Clamp to valid range.
      bands[dim] = {
        minScore: Number.isNaN(minScore) ? 0 : Math.max(0, Math.min(100, minScore)),
        maxScore: Number.isNaN(maxScore) ? 100 : Math.max(0, Math.min(100, maxScore)),
      };
    }

    // Call the use case through the server action.
    await setScenarioCalibrationAction({
      simulatorId: id,
      scenarioKey,
      dimensionBands: bands,
      instructorId: adminId,
    });

    // Redirect back with a success indicator.
    redirect(`/admin/simulators/${id}/${encodeURIComponent(scenarioKey)}/calibration?saved=1`);
  }

  const sp = await searchParams;
  const saved = sp.saved;

  return (
    <>
      <TopBar title="Simulator Calibration" />
      <div className={styles.page}>
        <div className={styles.header}>
          <Link href={`/admin/simulators/${id}/versions`} className={styles.backLink}>
            <ArrowLeft weight="bold" />
            Back to versions
          </Link>
          <h1 className={styles.title}>Calibration: {scenario.name}</h1>
          <p className={styles.subtitle}>
            {id} · scenarioKey: {scenarioKey}
          </p>
        </div>

        {saved && (
          <div className={styles.savedBanner}>
            Calibration saved successfully.
          </div>
        )}

        <Card>
          <form action={handleSubmit} className={formStyles.form}>
            <p className={formStyles.hint}>
              Set score bands per dimension to clamp raw scores before grading. This overrides the
              umbrella ScorePolicy for this scenario family.
            </p>

            <div className={styles.dimensions}>
              {KNOWN_DIMENSIONS.map((dim) => {
                const band = getBand(dim);
                return (
                  <div key={dim} className={styles.dimensionRow}>
                    <label className={styles.dimensionLabel}>{dim}</label>
                    <div className={styles.bandInputs}>
                      <div className={styles.inputGroup}>
                        <label htmlFor={`min_${dim}`} className={styles.inputLabel}>
                          Min
                        </label>
                        <input
                          type="number"
                          id={`min_${dim}`}
                          name={`min_${dim}`}
                          min={0}
                          max={100}
                          defaultValue={band.minScore}
                          className={formStyles.input}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label htmlFor={`max_${dim}`} className={styles.inputLabel}>
                          Max
                        </label>
                        <input
                          type="number"
                          id={`max_${dim}`}
                          name={`max_${dim}`}
                          min={0}
                          max={100}
                          defaultValue={band.maxScore}
                          className={formStyles.input}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={formStyles.actions}>
              <button type="submit" className={formStyles.submitButton}>
                Save Calibration
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
