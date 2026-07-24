/**
 * listAuditLogsAction — server action to list audit log entries with filters.
 *
 * STORY-061.
 *
 * Auth: requireAdmin. Used for client-side refresh after filter changes.
 * The page itself fetches server-side via buildContainer directly.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { AuditLogFilters } from "@/ports/repositories/IAuditLog";

export type ListAuditLogsActionResult = Result<
  { entries: unknown[]; nextCursor: string | null; total: number },
  { kind: "unauthorized" } | { kind: "db_error"; message: string }
>;

export async function listAuditLogsAction(
  filters: AuditLogFilters,
): Promise<ListAuditLogsActionResult> {
  const container = buildContainer();

  const userId = await getSessionUserId();
  if (!userId) {
    return Result.err({ kind: "unauthorized" });
  }

  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok || userResult.value.role !== "ADMIN") {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.listAuditLogs.execute({ filters });
  if (!result.ok) {
    return Result.err(result.error);
  }

  return Result.ok({
    entries: result.value.entries.map((e) => ({
      id: e.id,
      actorId: e.actorId,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      metadata: e.metadata,
      occurredAt: e.occurredAt.toISOString(),
    })),
    nextCursor: result.value.nextCursor,
    total: result.value.total,
  });
}
