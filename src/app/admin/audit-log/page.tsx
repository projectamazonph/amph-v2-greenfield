/**
 * /admin/audit-log — admin audit log viewer.
 *
 * STORY-061. Server component. Filters via URL search params, cursor-based
 * pagination, actor email lookup via batch fetch, export link to the streaming
 * CSV route.
 */

import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/admin/TopBar";
import { Card } from "@astryxdesign/core";
import { AdminAuditLogTable, type AuditLogRow } from "@/components/astryx/AdminAuditLogTable";
import type { AuditAction } from "@/domain/values/AuditAction";
import styles from "./page.module.css";

interface PageProps {
  searchParams: Promise<{
    cursor?: string;
    actorId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    from?: string;
    to?: string;
  }>;
}

const ALL_ACTIONS: AuditAction[] = [
  "course.created",
  "course.updated",
  "course.archived",
  "module.created",
  "module.updated",
  "module.deleted",
  "module.reordered",
  "module.create_failed",
  "module.update_failed",
  "module.delete_failed",
  "module.reorder_failed",
  "lesson.created",
  "lesson.updated",
  "lesson.deleted",
  "lesson.reordered",
  "lesson.create_failed",
  "lesson.update_failed",
  "lesson.delete_failed",
  "lesson.reorder_failed",
  "refund.processed",
  "refund.overridden",
  "user.impersonated",
  "user.stopped_impersonating",
  "discount_code.created",
  "discount_code.updated",
  "discount_code.archived",
  "discount_code.create_failed",
  "discount_code.update_failed",
  "discount_code.archive_failed",
  "badge.created",
  "badge.updated",
  "badge.archived",
  "badge.create_failed",
  "badge.update_failed",
  "badge.archive_failed",
  "simulator.created",
  "simulator.updated",
  "simulator.archived",
  "live_class.created",
  "live_class.updated",
  "live_class.deleted",
  "live_class.create_failed",
  "live_class.update_failed",
  "live_class.delete_failed",
];

const TARGET_TYPES = [
  "course",
  "module",
  "lesson",
  "order",
  "badge",
  "discount_code",
  "simulator",
  "live_class",
  "user",
];

export default async function AdminAuditLogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  await requireAdmin();

  const container = buildContainer();

  const filters = {
    actorId: params.actorId || undefined,
    action: (params.action || undefined) as AuditAction | undefined,
    targetType: params.targetType || undefined,
    targetId: params.targetId || undefined,
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to) : undefined,
    cursor: params.cursor || undefined,
    limit: 50,
  };

  const result = await container.listAuditLogs.execute({ filters });

  if (!result.ok) {
    return (
      <div>
        <TopBar title="Audit Log" />
        <Card padding={6}>
          <p className={styles.error}>Failed to load: {result.error.message}</p>
        </Card>
      </div>
    );
  }

  // Batch-fetch actor emails for all distinct actorIds in this page
  const actorIds = [...new Set(result.value.entries.map((e) => e.actorId))];
  const actorEmails = new Map<string, string>();
  await Promise.all(
    actorIds.map(async (id) => {
      if (id) {
        const userResult = await container.userRepo.findById(id);
        if (userResult.ok) {
          actorEmails.set(id, userResult.value.email);
        }
      }
    }),
  );

  const rows: AuditLogRow[] = result.value.entries.map((e) => ({
    id: e.id,
    actorId: e.actorId,
    actorEmail: actorEmails.get(e.actorId) ?? "",
    action: e.action,
    targetType: e.targetType,
    targetId: e.targetId,
    metadata: e.metadata,
    occurredAt: e.occurredAt.toISOString(),
  }));

  // Build export URL with current filters
  const exportParams = new URLSearchParams();
  if (params.actorId) exportParams.set("actorId", params.actorId);
  if (params.action) exportParams.set("action", params.action);
  if (params.targetType) exportParams.set("targetType", params.targetType);
  if (params.targetId) exportParams.set("targetId", params.targetId);
  if (params.from) exportParams.set("from", params.from);
  if (params.to) exportParams.set("to", params.to);
  const exportUrl = `/admin/audit-log/export${exportParams.size > 0 ? `?${exportParams.toString()}` : ""}`;

  return (
    <div>
      <TopBar title="Audit Log" subtitle={`${result.value.total.toLocaleString()} total entries`} />

      <form method="get" className={styles.filters}>
        <div className={styles.filterRow}>
          <label>
            <span>Actor ID</span>
            <input
              type="search"
              name="actorId"
              placeholder="e.g. admin_1"
              defaultValue={params.actorId ?? ""}
              className={styles.input}
            />
          </label>

          <label>
            <span>Action</span>
            <select name="action" defaultValue={params.action ?? ""} className={styles.select}>
              <option value="">All actions</option>
              {ALL_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Target Type</span>
            <select
              name="targetType"
              defaultValue={params.targetType ?? ""}
              className={styles.select}
            >
              <option value="">All types</option>
              {TARGET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Target ID</span>
            <input
              type="search"
              name="targetId"
              placeholder="e.g. course_abc123"
              defaultValue={params.targetId ?? ""}
              className={styles.input}
            />
          </label>
        </div>

        <div className={styles.filterRow}>
          <label>
            <span>From</span>
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ""}
              className={styles.input}
            />
          </label>

          <label>
            <span>To</span>
            <input type="date" name="to" defaultValue={params.to ?? ""} className={styles.input} />
          </label>

          <button type="submit" className={styles.applyButton}>
            Apply Filters
          </button>

          <a href="/admin/audit-log" className={styles.clearButton}>
            Clear
          </a>

          <a href={exportUrl} className={styles.exportButton} download>
            Export CSV
          </a>
        </div>
      </form>

      <Card padding={0}>
        <AdminAuditLogTable
          rows={rows}
          nextCursor={result.value.nextCursor}
          prevCursor={params.cursor ? "" : null}
          total={result.value.total}
          currentFilters={{
            actorId: params.actorId ?? "",
            action: params.action ?? "",
            targetType: params.targetType ?? "",
            targetId: params.targetId ?? "",
            from: params.from ?? "",
            to: params.to ?? "",
          }}
        />
      </Card>
    </div>
  );
}
