/**
 * exportUserData.action.ts — server action.
 *
 * STORY-096. Returns the export payload directly (not a redirect) so
 * the page can trigger a client-side JSON download. Called directly
 * (not via a <form action>) from the client component
 * ExportDataButton.tsx, so this file needs "use server": without it,
 * Next inlines the function body (and its server-only transitive
 * imports — buildContainer -> Prisma -> pg, getSessionUserId ->
 * NextMdxRenderer) straight into the client bundle instead of
 * generating a callable server-action stub, which breaks the
 * production build.
 */
"use server";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { UserDataExport } from "@/usecases/ExportUserData";

export async function exportUserDataAction(): Promise<
  { ok: true; data: UserDataExport } | { ok: false; error: string }
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: "not_authenticated" };
  }

  const container = buildContainer();
  const r = await container.exportUserData.execute({ userId });
  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  await container.recordAuditLog.execute({
    actorId: userId,
    action: "user.data_exported",
    targetType: "user",
    targetId: userId,
    metadata: {},
  });

  return { ok: true, data: r.value };
}
