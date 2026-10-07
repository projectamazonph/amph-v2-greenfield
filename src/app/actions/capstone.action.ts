/**
 * capstone actions — LEARN-043 (STORY-143).
 *
 * Server action shims over SubmitCapstone / GetCapstoneStatus.
 * Reviewer transitions (return, pass) land in LEARN-044 with
 * their own audited actions.
 */

"use server";

import { revalidatePath } from "next/cache";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { loadCapstoneManifest } from "@/lib/capstone";

export type CapstoneActionResult<T> =
  { ok: true; value: T } | { ok: false; error: { kind: string; missingKinds?: readonly string[] } };

export async function submitCapstoneAction(input: {
  courseId: string | null;
}): Promise<CapstoneActionResult<{ id: string; status: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  const container = buildContainer();
  const manifest = loadCapstoneManifest();
  const result = await container.submitCapstone.execute({
    actorId: userId,
    courseId: input.courseId,
    requiredKinds: manifest.deliverables.map((d) => d.artefactKind),
  });
  if (!result.ok) {
    if (result.error.kind === "not_ready") {
      return {
        ok: false,
        error: { kind: "not_ready", missingKinds: result.error.missingKinds },
      };
    }
    return { ok: false, error: { kind: result.error.kind } };
  }
  revalidatePath("/capstone");
  revalidatePath("/portfolio");
  return { ok: true, value: { id: result.value.id, status: result.value.status } };
}

export async function getCapstoneStatusAction(): Promise<
  CapstoneActionResult<{
    submission: {
      id: string;
      status: string;
      reviewerNote: string | null;
      submittedAt: string | null;
    } | null;
    ready: boolean;
    requiredKinds: readonly string[];
    submittedKinds: readonly string[];
    missingKinds: readonly string[];
  }>
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  const container = buildContainer();
  const manifest = loadCapstoneManifest();
  const result = await container.getCapstoneStatus.execute({
    actorId: userId,
    requiredKinds: manifest.deliverables.map((d) => d.artefactKind),
  });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  const submission = result.value.submission;
  return {
    ok: true,
    value: {
      submission: submission
        ? {
            id: submission.id,
            status: submission.status,
            reviewerNote: submission.reviewerNote,
            submittedAt: submission.submittedAt?.toISOString() ?? null,
          }
        : null,
      ready: result.value.ready,
      requiredKinds: result.value.requiredKinds,
      submittedKinds: result.value.submittedKinds,
      missingKinds: result.value.missingKinds,
    },
  };
}
