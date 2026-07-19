/**
 * /admin/simulators/[id]/edit — admin edit simulator scenario form.
 *
 * STORY-050b. Server component.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@/components/ui";
import { updateSimulatorScenarioAction } from "@/app/actions/updateSimulatorScenario.action";
import { archiveSimulatorScenarioAction } from "@/app/actions/archiveSimulatorScenario.action";
import type { SimulatorId, Difficulty } from "@/domain/entities/SimulatorScenario";
import formStyles from "../../new/page.module.css";

const SIMULATOR_IDS: SimulatorId[] = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
];

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditScenarioPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin();

  const container = buildContainer();
  const result = await container.getSimulatorScenario.execute(id);

  if (!result.ok) {
    notFound();
  }
  const scenario = result.value.scenario;

  const errorMsg = sp.error
    ? {
        invalid_simulator_id: "Invalid simulator.",
        invalid_difficulty: "Invalid difficulty.",
        scenario_not_found: "Scenario not found.",
      }[sp.error]
    : null;

  return (
    <div>
      <Link href="/admin/simulators" className={formStyles.backLink}>
        ← Back to scenarios
      </Link>

      <TopBar title={`Edit: ${scenario.name}`} subtitle={scenario.id} />

      {errorMsg && (
        <Card padding="comfortable">
          <p style={{ color: "var(--color-danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding="comfortable">
        <form action={handleUpdate(id)} className={formStyles.form}>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Scenario ID</span>
            <input
              type="text"
              value={scenario.id}
              disabled
              className={formStyles.input}
              style={{ opacity: 0.5 }}
            />
            <span className={formStyles.hint}>ID cannot be changed after creation.</span>
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Simulator *</span>
            <select name="simulatorId" required defaultValue={scenario.simulatorId} className={formStyles.select}>
              {SIMULATOR_IDS.map((sid) => (
                <option key={sid} value={sid}>{sid}</option>
              ))}
            </select>
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Name *</span>
            <input
              type="text"
              name="name"
              required
              maxLength={120}
              defaultValue={scenario.name}
              className={formStyles.input}
            />
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Description</span>
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              defaultValue={scenario.description}
              className={formStyles.textarea}
            />
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Difficulty *</span>
            <select name="difficulty" required defaultValue={scenario.difficulty} className={formStyles.select}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Estimated time (minutes) *</span>
            <input
              type="number"
              name="estimatedMinutes"
              required
              min="1"
              max="240"
              defaultValue={scenario.estimatedMinutes}
              className={formStyles.input}
              style={{ width: "8rem" }}
            />
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Input JSON schema</span>
            <textarea
              name="inputSchema"
              rows={4}
              defaultValue={JSON.stringify(scenario.inputSchema, null, 2)}
              className={formStyles.textarea}
              placeholder={'{\n  "type": "object"\n}'}
            />
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Output JSON schema</span>
            <textarea
              name="outputSchema"
              rows={4}
              defaultValue={JSON.stringify(scenario.outputSchema, null, 2)}
              className={formStyles.textarea}
              placeholder={'{\n  "type": "object"\n}'}
            />
          </label>

          <div className={formStyles.actions}>
            <Link href="/admin/simulators" className={formStyles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={formStyles.submitButton}>
              Save changes
            </button>
          </div>
        </form>
      </Card>

      {/* Archive section */}
      <Card padding="comfortable" style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.75rem 0", color: "var(--color-danger)" }}>
          Danger zone
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: "0 0 1rem 0" }}>
          Archiving a scenario removes it from the admin list. Existing simulator sessions using this scenario are unaffected.
        </p>
        <form action={handleArchive(id)}>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--color-danger)",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Archive scenario
          </button>
        </form>
      </Card>
    </div>
  );
}

function handleUpdate(id: string) {
  return async function (formData: FormData) {
    "use server";

    const simulatorId = String(formData.get("simulatorId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const difficulty = String(formData.get("difficulty") ?? "").trim();
    const estimatedMinutes = parseInt(String(formData.get("estimatedMinutes") ?? "15"), 10);
    const inputSchemaRaw = String(formData.get("inputSchema") ?? "{}").trim();
    const outputSchemaRaw = String(formData.get("outputSchema") ?? "{}").trim();

    let inputSchema: Record<string, unknown> = {};
    let outputSchema: Record<string, unknown> = {};

    try {
      if (inputSchemaRaw) inputSchema = JSON.parse(inputSchemaRaw);
    } catch {
      redirect(`/admin/simulators/${id}/edit?error=invalid_input_schema`);
    }
    try {
      if (outputSchemaRaw) outputSchema = JSON.parse(outputSchemaRaw);
    } catch {
      redirect(`/admin/simulators/${id}/edit?error=invalid_output_schema`);
    }

    const r = await updateSimulatorScenarioAction({
      id,
      simulatorId: simulatorId as SimulatorId,
      name,
      description,
      difficulty: difficulty as Difficulty,
      estimatedMinutes,
      inputSchema,
      outputSchema,
    });

    if (!r.ok) {
      redirect(`/admin/simulators/${id}/edit?error=${r.error.kind}`);
      return;
    }

    redirect("/admin/simulators");
  };
}

function handleArchive(id: string) {
  return async function () {
    "use server";
    const r = await archiveSimulatorScenarioAction({ id });
    if (!r.ok) {
      redirect(`/admin/simulators/${id}/edit?error=${r.error.kind}`);
      return;
    }
    redirect("/admin/simulators");
  };
}
