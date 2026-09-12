/**
 * GET /admin/payments/export
 *
 * Streams a CSV of all orders matching the given status filter.
 *
 * P3-85. Reads status from search params, calls ExportPayments, and
 * streams CSV rows directly using a Readable stream to avoid OOM on
 * large exports.
 */

import { type NextRequest, NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { toCSV } from "@/lib/export-csv";
import { formatCurrency } from "@/lib/format-date";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";

export const runtime = "nodejs";

const VALID_STATUSES: PaymentStatus[] = [
  "DRAFT",
  "PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
];

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
  const statusParam = searchParams.get("status");
  const status =
    statusParam && VALID_STATUSES.includes(statusParam as PaymentStatus)
      ? (statusParam as PaymentStatus)
      : undefined;

  const result = await container.exportPayments.execute({ status });
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to export payments" }, { status: 500 });
  }

  const dateStr = new Date().toISOString().split("T")[0];
  const headers = new Headers();
  headers.set("Content-Type", "text/csv; charset=utf-8");
  headers.set("Content-Disposition", `attachment; filename="payments-${dateStr}.csv"`);

  const csvHeaders = [
    { key: "id" as const, label: "Order ID" },
    { key: "userEmail" as const, label: "Buyer Email" },
    { key: "courseId" as const, label: "Course ID" },
    { key: "totalMinor" as const, label: "Total (PHP)" },
    { key: "status" as const, label: "Status" },
    { key: "createdAt" as const, label: "Created At" },
  ];

  const rows = result.rows.map((r) => ({
    ...r,
    totalMinor: formatCurrency(r.totalMinor),
  }));

  const csv = toCSV(rows, csvHeaders);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(csv + "\r\n"));
      controller.close();
    },
  });

  return new NextResponse(stream, { headers });
}
