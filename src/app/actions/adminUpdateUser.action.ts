/**
 * adminUpdateUserAction — admin updates a user's profile (name, role).
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { Role } from "@/domain/entities/User";

export interface AdminUpdateUserInput {
  userId: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
}

export async function adminUpdateUserAction(
  input: AdminUpdateUserInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminUpdateUser.execute({
    ...input,
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true };
}
