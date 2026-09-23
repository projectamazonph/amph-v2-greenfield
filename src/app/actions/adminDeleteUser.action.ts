/**
 * adminDeleteUserAction — admin permanently anonymizes and deletes a user account.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export interface AdminDeleteUserInput {
  userId: string;
}

export async function adminDeleteUserAction(
  input: AdminDeleteUserInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminDeleteUser.execute({
    userId: input.userId,
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true };
}
