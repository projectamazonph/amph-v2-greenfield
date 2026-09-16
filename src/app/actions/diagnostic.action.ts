"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { loadDiagnosticManifest, scoreDiagnostic } from "@/lib/diagnostic";
import type { DiagnosticOutcomeView } from "@/lib/diagnostic";

export type SubmitDiagnosticResult =
  { kind: "success"; outcome: DiagnosticOutcomeView } | { kind: "error"; error: string };

/**
 * Server action for the optional pre-course diagnostic (LEARN-010).
 *
 * The action only reads the answered FormData and the static manifest,
 * then renders the matching outcome as a plain-language recommendation.
 * It does not write to the database, change entitlement, or skip
 * required content. The dashboard reads the latest result from the
 * user's stored profile in a follow-up story; this slice surfaces the
 * result inline so the UI is shippable.
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

  console.error(`[learning_event] diagnostic_completed userId=${user.id} outcome=${outcome.id}`);

  redirect(`/dashboard/diagnostic?outcome=${outcome.id}`);
}
