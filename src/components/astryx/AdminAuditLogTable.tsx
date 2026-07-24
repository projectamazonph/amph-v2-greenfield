/**
 * AdminAuditLogTable — Astryx Table for /admin/audit-log.
 *
 * "use client" because:
 * - renderCell is a function (cannot cross server-client boundary)
 * - expandable metadata rows use local state
 *
 * All data fetching and filter routing stay server-side in the parent page.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Table, type TableColumn, Badge } from "@astryxdesign/core";
import type { AuditAction } from "@/domain/values/AuditAction";

export interface AuditLogRow extends Record<string, unknown> {
  id: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

interface AdminAuditLogTableProps {
  rows: AuditLogRow[];
  nextCursor: string | null;
  prevCursor: string | null;
  total: number;
  currentFilters: Record<string, string>;
}

function actionBadgeVariant(action: AuditAction): "neutral" | "orange" | "green" | "blue" | "red" {
  if (action.endsWith("_failed")) return "red";
  if (action.endsWith("_created") || action.endsWith("_archived")) return "green";
  if (action.endsWith("_updated") || action.endsWith("_reordered")) return "blue";
  if (action.endsWith("_deleted")) return "red";
  if (action.includes("refund")) return "orange";
  if (action.includes("impersonat")) return "red";
  return "neutral";
}

function buildColumns(
  expandedId: string | null,
  setExpandedId: (id: string | null) => void,
): TableColumn<AuditLogRow>[] {
  return [
    {
      key: "occurredAt",
      header: "When",
      width: { type: "pixel", value: 150 },
      renderCell: (row) => {
        const d = new Date(row.occurredAt);
        return (
          <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>
            {d.toLocaleDateString("en-US", { dateStyle: "short" })}&nbsp;
            {d.toLocaleTimeString("en-US", { timeStyle: "short", hour12: false })}
          </span>
        );
      },
    },
    {
      key: "actor",
      header: "Actor",
      width: { type: "proportional", value: 1.5 },
      renderCell: (row) =>
        row.actorEmail ? (
          <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>
            {row.actorEmail}
          </span>
        ) : (
          <span style={{ color: "var(--ink-500)", fontStyle: "italic", fontSize: 12 }}>
            {row.actorId}
          </span>
        ),
    },
    {
      key: "action",
      header: "Action",
      width: { type: "pixel", value: 160 },
      renderCell: (row) => <Badge variant={actionBadgeVariant(row.action)} label={row.action} />,
    },
    {
      key: "targetType",
      header: "Target Type",
      width: { type: "pixel", value: 110 },
      renderCell: (row) => (
        <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>
          {row.targetType}
        </span>
      ),
    },
    {
      key: "targetId",
      header: "Target ID",
      width: { type: "pixel", value: 140 },
      renderCell: (row) => (
        <span style={{ fontFamily: "var(--font-family-code)", fontSize: 12 }}>{row.targetId}</span>
      ),
    },
    {
      key: "expand",
      header: "",
      width: { type: "pixel", value: 44 },
      renderCell: (row) => {
        const keys = Object.keys(row.metadata ?? {});
        if (keys.length === 0) {
          return <span style={{ color: "var(--ink-500)", fontSize: 12 }}>—</span>;
        }
        const isExpanded = expandedId === row.id;
        return (
          <button
            type="button"
            title={isExpanded ? "Collapse metadata" : "Expand metadata"}
            onClick={(e) => {
              e.stopPropagation();
              setExpandedId(isExpanded ? null : row.id);
            }}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
            }}
          >
            {isExpanded ? "−" : "+"}
          </button>
        );
      },
    },
  ];
}

function buildFilterParams(
  current: Record<string, string>,
  updates: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("cursor");
  }
  return params.toString();
}

export function AdminAuditLogTable({
  rows,
  nextCursor,
  prevCursor,
  total,
  currentFilters,
}: AdminAuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filterParams = Object.fromEntries(
    Object.entries(currentFilters).filter(([, v]) => v !== ""),
  );

  const prevParams = prevCursor
    ? `?${buildFilterParams(filterParams, { cursor: prevCursor })}`
    : null;
  const nextParams = nextCursor
    ? `?${buildFilterParams(filterParams, { cursor: nextCursor })}`
    : null;

  return (
    <div>
      <Table
        data={rows}
        columns={buildColumns(expandedId, setExpandedId)}
        idKey="id"
        density="compact"
        dividers="rows"
        hasHover
      />

      {rows.length === 0 && (
        <p
          style={{
            padding: "var(--space-8)",
            textAlign: "center",
            color: "var(--ink-700)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          No audit log entries match the current filters.
        </p>
      )}

      {expandedId &&
        (() => {
          const row = rows.find((r) => r.id === expandedId);
          if (!row) return null;
          return (
            <div
              style={{
                padding: "var(--space-4)",
                background: "var(--surface-2)",
                borderBottom: "1px solid var(--border)",
                fontFamily: "var(--font-family-code)",
                fontSize: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: "var(--space-2)",
                  color: "var(--ink-700)",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Metadata — {row.id}
              </div>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "var(--ink-800)",
                }}
              >
                {JSON.stringify(row.metadata, null, 2)}
              </pre>
            </div>
          );
        })()}

      {(prevParams !== null || nextParams !== null) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--space-3) 0",
            borderTop: "1px solid var(--border)",
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--ink-700)" }}>
            {total.toLocaleString()} total entr{total === 1 ? "y" : "ies"}
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {prevParams !== null ? (
              <Link
                href={prevParams}
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--surface-0)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  color: "var(--text)",
                  fontSize: 13,
                }}
              >
                ← Previous
              </Link>
            ) : (
              <span
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--ink-400)",
                  fontSize: 13,
                }}
              >
                ← Previous
              </span>
            )}
            {nextParams !== null ? (
              <Link
                href={nextParams}
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--accent)",
                  border: "1px solid var(--accent)",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  color: "var(--surface-0)",
                  fontSize: 13,
                }}
              >
                Next →
              </Link>
            ) : (
              <span
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--ink-400)",
                  fontSize: 13,
                }}
              >
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
