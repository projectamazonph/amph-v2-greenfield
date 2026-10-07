/**
 * adminForceSignOutAction — admin revokes all sessions for a user.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export interface AdminForceSignOutInput {
  userId: string;
}

export async function adminForceSignOutAction(
  input: AdminForceSignOutInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminForceSignOut.execute({
    userId: input.userId,
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true };
}
