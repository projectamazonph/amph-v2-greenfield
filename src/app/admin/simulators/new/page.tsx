/**
 * /admin/simulators/new — admin create simulator scenario form.
 *
 * STORY-050b. Server component.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { createSimulatorScenarioAction } from "@/app/actions/createSimulatorScenario.action";
import type { SimulatorId, Difficulty } from "@/domain/entities/SimulatorScenario";
import styles from "../page.module.css";
import formStyles from "./page.module.css";

const SIMULATOR_IDS: SimulatorId[] = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
];

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NewScenarioPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  await requireAdmin();

  const errorMsg = sp.error
    ? {
        id_conflict: "A scenario with this ID already exists.",
        invalid_simulator_id: "Invalid simulator.",
        invalid_difficulty: "Invalid difficulty.",
      }[sp.error]
    : null;

  return (
    <div>
      <Link href="/admin/simulators" className={formStyles.backLink}>
        ← Back to scenarios
      </Link>

      <TopBar title="Add scenario" subtitle="Create a new simulator scenario" />

      {errorMsg && (
        <Card padding={6}>
          <p style={{ color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        </Card>
      )}

      <Card padding={6}>
        <form action={handleSubmit} className={formStyles.form}>
          <label className={formStyles.field}>
            <span className={formStyles.label}>Scenario ID *</span>
            <input
              type="text"
              name="id"
              required
              pattern="[a-z0-9-]+"
              maxLength={60}
              className={formStyles.input}
              placeholder="e.g. bid-elevator-scenario-1"
            />
            <span className={formStyles.hint}>
              Lowercase letters, numbers, and hyphens only. Cannot be changed later.
            </span>
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Simulator *</span>
            <select name="simulatorId" required className={formStyles.select}>
              <option value="">— Select simulator —</option>
              {SIMULATOR_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
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
              className={formStyles.input}
              placeholder="e.g. Pricing Strategy Round 1"
            />
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Description</span>
            <textarea
              name="description"
              rows={3}
              maxLength={500}
              className={formStyles.textarea}
              placeholder="What does this scenario test?"
            />
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Difficulty *</span>
            <select name="difficulty" required className={formStyles.select}>
              <option value="">— Select difficulty —</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
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
              defaultValue="15"
              className={formStyles.input}
              style={{ width: "8rem" }}
            />
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Input JSON schema</span>
            <textarea
              name="inputSchema"
              rows={4}
              className={formStyles.textarea}
              placeholder={'{\n  "type": "object"\n}'}
            />
            <span className={formStyles.hint}>Valid JSON. Must describe the input parameters.</span>
          </label>

          <label className={formStyles.field}>
            <span className={formStyles.label}>Output JSON schema</span>
            <textarea
              name="outputSchema"
              rows={4}
              className={formStyles.textarea}
              placeholder={'{\n  "type": "object"\n}'}
            />
            <span className={formStyles.hint}>Valid JSON. Must describe the expected output.</span>
          </label>

          <div className={formStyles.actions}>
            <Link href="/admin/simulators" className={formStyles.cancelButton}>
              Cancel
            </Link>
            <button type="submit" className={formStyles.submitButton}>
              Create scenario
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

async function handleSubmit(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const simulatorId = String(formData.get("simulatorId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "").trim();
  const estimatedMinutes = parseInt(String(formData.get("estimatedMinutes") ?? "15"), 10);
  const inputSchemaRaw = String(formData.get("inputSchema") ?? "{}").trim();
  const outputSchemaRaw = String(formData.get("outputSchema") ?? "{}").trim();

  if (!id || !simulatorId || !name || !difficulty) {
    redirect("/admin/simulators/new?error=missing");
  }

  let inputSchema: Record<string, unknown> = {};
  let outputSchema: Record<string, unknown> = {};

  try {
    if (inputSchemaRaw) inputSchema = JSON.parse(inputSchemaRaw);
  } catch {
    redirect("/admin/simulators/new?error=invalid_input_schema");
  }

  try {
    if (outputSchemaRaw) outputSchema = JSON.parse(outputSchemaRaw);
  } catch {
    redirect("/admin/simulators/new?error=invalid_output_schema");
  }

  const r = await createSimulatorScenarioAction({
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
    redirect(`/admin/simulators/new?error=${r.error.kind}`);
    return;
  }

  redirect(`/admin/simulators`);
}
