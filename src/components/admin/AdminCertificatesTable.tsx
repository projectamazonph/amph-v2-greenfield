/**
 * AdminCertificatesTable — Astryx Table for /admin/certificates.
 *
 * STORY-092 (US-009). "use client" only because Table's renderCell
 * prop is a function. No pagination — certificate list is small enough
 * to fit in one view (active + revoked).
 */

"use client";

import Link from "next/link";
import { Table, type TableColumn, Badge } from "@astryxdesign/core";

export interface CertificateRow extends Record<string, unknown> {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  status: "active" | "revoked";
  issuedAt: string;
  verificationHash: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncateHash(hash: string): string {
  // 64-char hex → show first 8 + ellipsis + last 4, e.g. "abcdef12…wxyz"
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

// ── Column definitions ──────────────────────────────────────────────────────

const COLUMNS: TableColumn<CertificateRow>[] = [
  {
    key: "user",
    header: "Student",
    width: { type: "proportional", value: 2 },
    renderCell: (row) => (
      <div>
        <div style={{ fontWeight: 500 }}>
          {row.userName}{" "}
          <span style={{ color: "var(--ink-500)", fontWeight: 400 }}>· {row.userEmail}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-500)", fontFamily: "monospace" }}>
          {row.userId}
        </div>
      </div>
    ),
  },
  {
    key: "course",
    header: "Course",
    width: { type: "proportional", value: 2 },
    renderCell: (row) => (
      <div>
        <div style={{ fontWeight: 500 }}>{row.courseTitle}</div>
        <div style={{ fontSize: 11, color: "var(--ink-500)", fontFamily: "monospace" }}>
          {row.courseId}
        </div>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: { type: "pixel", value: 100 },
    renderCell: (row) => (
      <Badge
        variant={row.status === "active" ? "neutral" : "orange"}
        label={row.status === "active" ? "Active" : "Revoked"}
      />
    ),
  },
  {
    key: "issued",
    header: "Issued",
    width: { type: "pixel", value: 110 },
    renderCell: (row) => (
      <span style={{ fontFamily: "monospace", fontSize: 12 }}>{formatDate(row.issuedAt)}</span>
    ),
  },
  {
    key: "hash",
    header: "Verification hash",
    width: { type: "pixel", value: 130 },
    renderCell: (row) => (
      <span
        title={row.verificationHash}
        style={{
          fontFamily: "monospace",
          fontSize: 12,
          color: "var(--ink-700)",
        }}
      >
        {truncateHash(row.verificationHash)}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    width: { type: "pixel", value: 60 },
    align: "end",
    renderCell: (row) => (
      <Link
        href={`/admin/certificates/${row.id}`}
        style={{ color: "var(--brand)", textDecoration: "none", fontWeight: 500, fontSize: 13 }}
      >
        View
      </Link>
    ),
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export function AdminCertificatesTable({
  certificates,
}: {
  certificates: readonly CertificateRow[];
}) {
  return (
    <Table
      data={certificates as CertificateRow[]}
      columns={COLUMNS}
      idKey="id"
      density="compact"
      dividers="rows"
      hasHover
    />
  );
}
