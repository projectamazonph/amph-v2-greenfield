/**
 * updateEmailTemplate.action.ts — server action.
 *
 * STORY-095. Injects actorId from the admin session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export interface UpdateEmailTemplatePageInput {
  type: string;
  subject: string;
  headline: string;
  introBody: string;
  ctaLabel: string;
}

export async function updateEmailTemplateAction(
  input: UpdateEmailTemplatePageInput,
): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.updateEmailTemplate.execute({
    ...input,
    actorId: session.id,
  });

  if (!r.ok) {
    return {
      ok: false,
      error: r.error.kind,
      message: r.error.kind === "invalid_input" ? r.error.message : undefined,
    };
  }

  return { ok: true };
}
