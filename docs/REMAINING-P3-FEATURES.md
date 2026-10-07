# Remaining P3 Features — Implementation Specs

**Date:** 2026-07-31 (closed 2026-09-16 — all six items ship)
**Source:** IMPLEMENTATION-PLAN-P3.md (P3-82 through P3-87)

These six items required feature-level work (new libraries, schema changes, or infrastructure) and were deferred from the main implementation sprint. All six now ship; the specs below are retained as the implementation record.

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

**Status:** ✅ Implemented — PR #532

**Files created:**

- `src/components/ui/NotificationBell.tsx` — Client component with Phosphor bell, unread badge, dropdown, 30s polling
- `src/app/actions/notification.action.ts` — List / mark-read / mark-all-read / notify server actions (mutations go through server actions per AGENTS.md Rule 4, not API routes)
- `src/domain/entities/Notification.ts` — Five types (course_complete, artefact_submitted, enrollment_welcome, refund_requested, announcement)
- `src/usecases/NotifyUser.ts`, `ListNotifications.ts`, `MarkNotificationRead.ts`, `MarkAllNotificationsRead.ts`
- `src/ports/repositories/INotificationRepository.ts` + Prisma/InMemory adapters
- Migration `20260916020000_p3_87_notifications` adds the `notifications` table

**Implementation:** Server actions resolve the session user; the use cases own ownership checks. The bell polls `listNotificationsAction` every 30s; server-action bindings flow server → client (StudentShell → StudentSidebar → bell) so unit tests never import a use-server module. First emit hook: `markLessonCompleteAction` notifies `course_complete` at 100% progress, best-effort. Refund/enrollment emits reuse `NotifyUser` in follow-ups.

**No action needed.**

---

## Implementation Priority (historical — all four shipped)

Ship order actually taken:

1. **P3-82 Confetti** — PR #514
2. **P3-84 Dark Mode** — PR #516
3. **P3-83 Drag-and-Drop** — PR #519
4. **P3-87 Notifications** — PR #532

---

## Total Deferred Work

| #     | Feature       | Est. Effort | Dependencies                      |
| ----- | ------------- | ----------- | --------------------------------- |
| P3-82 | Confetti      | ✅ Done     | canvas-confetti                   |
| P3-83 | DnD reorder   | ✅ Done     | @dnd-kit/core, @dnd-kit/sortable  |
| P3-84 | Dark mode     | ✅ Done     | None                              |
| P3-87 | Notifications | ✅ Done     | Server actions + bell + migration |
