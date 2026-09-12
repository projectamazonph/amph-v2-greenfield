/**
 * CSV export utilities for admin data tables.
 *
 * P3-85. Escapes fields per RFC 4180: wraps in double quotes and doubles
 * any embedded quotes. Joins with commas, separates rows with CRLF.
 */

function escapeField(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCSV<T extends Record<string, unknown>>(
  rows: readonly T[],
  headers: readonly { key: keyof T; label: string }[],
): string {
  const headerRow = headers.map((h) => escapeField(h.label)).join(",");
  const dataRows = rows.map((row) => headers.map((h) => escapeField(row[h.key])).join(","));
  return [headerRow, ...dataRows].join("\r\n");
}
