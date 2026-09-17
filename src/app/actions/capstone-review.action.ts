/**
 * capstone-review actions — LEARN-044 (STORY-144).
 *
 * Admin-only reviewer transitions. Authorisation via requireAdmin;
 * audit happens inside the use cases (capstone.returned /
 * capstone.passed and their _failed variants).
 */

"use server";

import { revalidatePath } from "next/cache";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export type CapstoneReviewActionResult<T> =
  { ok: true; value: T } | { ok: false; error: { kind: string } };

export async function returnCapstoneAction(input: {
  submissionId: string;
  note: string;
}): Promise<CapstoneReviewActionResult<{ id: string; status: string }>> {
  const admin = await requireAdmin();
  const container = buildContainer();
  const result = await container.returnCapstoneForReview.execute({
    actorId: admin.id,
    submissionId: input.submissionId,
    note: input.note,
  });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  revalidatePath("/admin/capstone");
  revalidatePath(`/admin/capstone/${input.submissionId}`);
  return { ok: true, value: { id: result.value.id, status: result.value.status } };
}

export async function passCapstoneAction(input: {
  submissionId: string;
}): Promise<CapstoneReviewActionResult<{ id: string; status: string }>> {
  const admin = await requireAdmin();
  const container = buildContainer();
  const result = await container.passCapstoneReview.execute({
    actorId: admin.id,
    submissionId: input.submissionId,
  });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  revalidatePath("/admin/capstone");
  revalidatePath(`/admin/capstone/${input.submissionId}`);
  return { ok: true, value: { id: result.value.id, status: result.value.status } };
}
