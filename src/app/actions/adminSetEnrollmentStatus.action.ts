"use server";

import { revalidatePath } from "next/cache";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export interface AdminSetEnrollmentStatusPageInput {
  userId: string;
  courseId: string;
  status: "active" | "cancelled";
}

export async function adminSetEnrollmentStatusAction(
  input: AdminSetEnrollmentStatusPageInput,
): Promise<
  | { ok: true; changed: boolean; change: "granted" | "revoked" | "restored" | "none" }
  | { ok: false; error: string }
> {
  const admin = await requireAdmin();
  const result = await buildContainer().adminSetEnrollmentStatus.execute({
    ...input,
    actorId: admin.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error.kind };
  }

  revalidatePath(`/admin/users/${input.userId}`);
  return { ok: true, changed: result.value.changed, change: result.value.change };
}
