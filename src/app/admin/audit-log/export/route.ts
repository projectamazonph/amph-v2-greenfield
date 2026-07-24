/**
 * GET /admin/audit-log/export
 *
 * Streams a CSV of all audit log entries matching the given filters.
 *
 * STORY-061. Reads filters from search params, calls ExportAuditLogs,
 * and streams CSV rows directly using a Readable stream to avoid OOM
 * on large exports.
 */

import { type NextRequest, NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { AuditAction } from "@/domain/values/AuditAction";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const container = buildContainer();

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok || userResult.value.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  const filters: {
    actorId?: string;
    action?: AuditAction;
    targetType?: string;
    targetId?: string;
    from?: Date;
    to?: Date;
  } = {};

  const actorId = searchParams.get("actorId");
  if (actorId) filters.actorId = actorId;

  const action = searchParams.get("action");
  if (action) filters.action = action as AuditAction;

  const targetType = searchParams.get("targetType");
  if (targetType) filters.targetType = targetType;

  const targetId = searchParams.get("targetId");
  if (targetId) filters.targetId = targetId;

  const from = searchParams.get("from");
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) filters.from = d;
  }

  const to = searchParams.get("to");
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) filters.to = d;
  }

  const result = await container.exportAuditLogs.execute({ filters });
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to export audit logs" }, { status: 500 });
  }

  const dateStr = new Date().toISOString().split("T")[0];
  const headers = new Headers();
  headers.set("Content-Type", "text/csv; charset=utf-8");
  headers.set("Content-Disposition", `attachment; filename="audit-log-${dateStr}.csv"`);

  const encoder = new TextEncoder();
  const entries = result.entries;

  const csvHeader = "occurredAt,actorId,action,targetType,targetId,metadata\n";

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(csvHeader));
      for (const entry of entries) {
        const row = [
          entry.occurredAt.toISOString(),
          entry.actorId,
          entry.action,
          entry.targetType,
          entry.targetId,
          JSON.stringify(entry.metadata).replace(/"/g, '""'),
        ]
          .map((field) => `"${field}"`)
          .join(",");
        controller.enqueue(encoder.encode(row + "\n"));
      }
      controller.close();
    },
  });

  return new NextResponse(stream, { headers });
}
