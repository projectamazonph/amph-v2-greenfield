/**
 * adminSetUserPasswordAction — admin directly sets a user's password.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export interface AdminSetUserPasswordInput {
  userId: string;
  newPassword: string;
  sendNotificationEmail: boolean;
}

export async function adminSetUserPasswordAction(
  input: AdminSetUserPasswordInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminSetUserPassword.execute({
    ...input,
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true };
}
