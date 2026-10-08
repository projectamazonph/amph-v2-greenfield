"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { loadDiagnosticManifest, scoreDiagnostic } from "@/lib/diagnostic";
import type { DiagnosticOutcomeView } from "@/lib/diagnostic";
import { buildContainer } from "@/composition/container";

export type SubmitDiagnosticResult =
  { kind: "success"; outcome: DiagnosticOutcomeView } | { kind: "error"; error: string };

/**
 * Server action for the optional pre-course diagnostic (LEARN-010 / LEARN-052).
 *
 * Reads the answered FormData, scores against the rubric, persists the
 * result on the user row via RecordDiagnosticResult use case, emits the
 * structured analytics log event, and redirects to render the outcome card.
 */
export async function submitDiagnosticAction(
  _prevState: SubmitDiagnosticResult | null,
  formData: FormData,
): Promise<SubmitDiagnosticResult> {
  const user = await requireAuth();

  const manifest = loadDiagnosticManifest();
  const answers: Record<string, string> = {};
  for (const question of manifest.questions) {
    const raw = formData.get(question.id);
    if (typeof raw !== "string" || raw.length === 0) {
      return { kind: "error", error: `Please answer: ${question.prompt}` };
    }
    const allowed = question.options.some((option) => option.value === raw);
    if (!allowed) {
      return {
        kind: "error",
        error: `Please pick one of the options for: ${question.prompt}`,
      };
    }
    answers[question.id] = raw;
  }

  const outcome = scoreDiagnostic(manifest, answers);

  const container = buildContainer();
  await container.recordDiagnosticResult.execute({
    userId: user.id,
    outcome: outcome.id,
  });

  redirect(`/dashboard/diagnostic?outcome=${outcome.id}`);
}
