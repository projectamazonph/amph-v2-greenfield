# Remaining P3 Features — Implementation Specs

**Date:** 2026-07-31  
**Source:** IMPLEMENTATION-PLAN-P3.md (P3-82 through P3-87)

These six items require feature-level work (new libraries, schema changes, or infrastructure) and were deferred from the main implementation sprint. Each spec below is ready to execute.

---

## P3-82. Confetti on Lesson Completion

**Status:** ✅ Implemented — PR #514

**Files created:**

- `src/components/ui/Confetti.tsx` — Client component using `canvas-confetti`
- Added `canvas-confetti` and `@types/canvas-confetti` dependencies

**Implementation:** Bilateral animation from left/right edges using brand colors (`#FF6B35`, `#FFA07A`, `#FFD700`, `#FF8C00`), 2 second duration. Triggered by `?completed=1` query param on lesson page.

**No action needed.**
---

## P3-83. Drag-and-Drop Module Reorder

**Status:** ✅ Implemented — PR #519

**Files created:**

- `src/components/admin/DraggableModuleList.tsx` — Client component using `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- Added `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` dependencies

**Implementation:** Hamburger-icon drag handle on each module row, drop-and-reorder inside `<DndContext>` with `<SortableContext>`, edit/delete actions live in a separate actions list. The reorder persists through the existing `reorderModulesAction` server action and the `reorderModules` use case.

**No action needed.**

---

## P3-84. Dark Mode Toggle

**Status:** ✅ Implemented — PR #516

**Files created:**

- `src/hooks/useTheme.ts` — Theme state management with localStorage + system preference
- `src/components/ui/ThemeToggle.tsx` — Client component with animated sun/moon icons
- `src/components/ui/ThemeToggle.module.css` — Styles with smooth transitions

**Implementation:** Complete dark mode token overrides in `globals.css` (navy backgrounds `#0F1419`, inverted inks, semantic colors, shadows). Wired into StudentSidebar and NavSidebar footers. Persists preference in localStorage, detects system preference on first load.

**No action needed.**
---

## P3-85. Real CSV Export

**Status:** Implemented — `src/app/admin/payments/export/route.ts` (admin-gated, streaming, RFC 4180 via `src/lib/export-csv.ts`), `ExportPayments` use case, and the Export button on `admin/payments/page.tsx`. Audit-log export shipped earlier (STORY-061). PR #497.

**No action needed.**

**Goal:** Admin can export table data to CSV files.

**Files to create:**

- `src/lib/export-csv.ts` — Utility to convert arrays to CSV
- `src/app/api/admin/payments/export/route.ts` — Payments export endpoint
- `src/app/api/admin/audit-log/export/route.ts` — Audit log export endpoint

**Implementation:**

```typescript
// src/lib/export-csv.ts
export function toCSV<T>(rows: T[], headers: (keyof T)[]): string {
  const headerRow = headers.join(",");
  const dataRows = rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  return [headerRow, ...dataRows].join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Wire-up:** Replace the placeholder "Export CSV" buttons in `admin/payments/page.tsx` and `admin/audit-log/page.tsx` with client components that call the API and trigger download.

---

## P3-86. PDF Certificate Download

**Status:** Implemented — `src/app/certificates/[hash]/pdf/route.ts` exists and uses `@react-pdf/renderer`. `RenderCertificatePdf.ts` use case renders the certificate PDF. The PDF download is wired to the certificate detail page.

**No action needed.**

---

## P3-87. In-App Notifications

**Goal:** Students see a notification bell with unread count; admins get alerts for pending refunds, new users, etc.

**Files to create:**

- `src/components/ui/NotificationBell.tsx` — Bell icon + dropdown
- `src/app/api/notifications/route.ts` — Fetch + mark-as-read endpoints
- `prisma/schema.prisma` — Add `Notification` model

**Schema:**

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // refund_pending, new_user, course_complete, etc.
  title     String
  body      String
  href      String?
  readAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```

**Implementation:**

1. Server-side: emit notifications from key events (refund requested, new enrollment, etc.)
2. Client-side: NotificationBell polls every 30s or uses Server-Sent Events
3. Mark-as-read on click

**Scope:** Schema migration + emit hooks + bell component + dropdown UI.

---

## Implementation Priority

If tackling the remaining four, recommend this order:

1. **P3-82 Confetti** — One component, one dependency, high delight
2. **P3-84 Dark Mode** — Token-level work, touches every page
3. **P3-83 Drag-and-Drop** — Needs new dependencies + schema
4. **P3-87 Notifications** — Schema migration + polling infrastructure

---

## Total Deferred Work

| #     | Feature       | Est. Effort | Dependencies                     |
| ----- | ------------- | ----------- | -------------------------------- |
| P3-82 | Confetti      | ✅ Done     | canvas-confetti                  |
| P3-83 | DnD reorder   | ✅ Done     | @dnd-kit/core, @dnd-kit/sortable |
| P3-84 | Dark mode     | ✅ Done     | None                             |
| P3-87 | Notifications | XL          | Schema migration                 |
