# Remaining P3 Features — Implementation Specs

**Date:** 2026-07-31  
**Source:** IMPLEMENTATION-PLAN-P3.md (P3-82 through P3-87)

These six items require feature-level work (new libraries, schema changes, or infrastructure) and were deferred from the main implementation sprint. Each spec below is ready to execute.

---

## P3-82. Confetti on Lesson Completion

**Goal:** Trigger a celebratory animation when a student marks a lesson complete.

**Files to create:**
- `src/components/ui/Confetti.tsx` — Client component using `canvas-confetti`

**Implementation:**
```tsx
'use client';
import confetti from 'canvas-confetti';

export function fireConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FF6B35', '#FFA07A', '#FFD700'],
  });
}
```

**Wire-up:** In `courses/[slug]/lessons/[lessonId]/page.tsx`, after the Mark-as-Complete form action succeeds, call `fireConfetti()` from a client-side handler.

**Dependencies:** `canvas-confetti` (already installed in this session)

---

## P3-83. Drag-and-Drop Module Reorder

**Goal:** Admin can drag modules within a course to reorder them.

**Files to create:**
- `src/components/admin/DraggableModuleList.tsx` — Client component

**Implementation:** Use `@dnd-kit/core` + `@dnd-kit/sortable`:
- Wrap modules in `<DndContext>` with `<SortableContext>`
- Each module row uses `useSortable` for drag handle
- On drag end, POST new order to `/api/admin/courses/[id]/modules/reorder`

**Dependencies needed:** `@dnd-kit/core`, `@dnd-kit/sortable`

**Backend:** Add a server action `reorderModules(courseId, moduleIds[])` that updates `order` field in Prisma schema.

---

## P3-84. Dark Mode Toggle

**Goal:** Full dark mode with system preference detection + manual override.

**Files to create:**
- `src/components/ui/ThemeToggle.tsx` — Client component
- `src/hooks/useTheme.ts` — Theme state management

**Implementation:**
1. Add dark variants for all CSS custom properties in `globals.css`:
   ```css
   [data-theme="dark"] {
     --surface-0: #1A1A1A;
     --surface-1: #242424;
     --surface-2: #2E2E2E;
     --ink-900: #FAFAF7;
     /* etc. */
   }
   ```
2. ThemeToggle uses `localStorage` + `prefers-color-scheme` media query
3. Apply `data-theme` attribute to `<html>` element
4. Add toggle button to both admin and student sidebars

**Scope:** ~30-40 token overrides, 1 toggle component, 2 placement edits.

---

## P3-85. Real CSV Export

**Goal:** Admin can export table data to CSV files.

**Files to create:**
- `src/lib/export-csv.ts` — Utility to convert arrays to CSV
- `src/app/api/admin/payments/export/route.ts` — Payments export endpoint
- `src/app/api/admin/audit-log/export/route.ts` — Audit log export endpoint

**Implementation:**
```typescript
// src/lib/export-csv.ts
export function toCSV<T>(rows: T[], headers: (keyof T)[]): string {
  const headerRow = headers.join(',');
  const dataRows = rows.map(row =>
    headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Wire-up:** Replace the placeholder "Export CSV" buttons in `admin/payments/page.tsx` and `admin/audit-log/page.tsx` with client components that call the API and trigger download.

---

## P3-86. PDF Certificate Download

**Goal:** Students/admins can download certificates as PDF files.

**Files to create:**
- `src/components/certificates/CertificatePDF.tsx` — PDF template using `@react-pdf/renderer`
- `src/app/api/certificates/[hash]/pdf/route.ts` — PDF generation endpoint

**Implementation:** `@react-pdf/renderer` is already in dependencies. Create a PDF component that mirrors the existing certificate layout (logo, title, name, course, date, verification hash). Expose via a download button on `/certificates/[hash]`.

**Wire-up:** Add `<a href="/api/certificates/[hash]/pdf" download className="btn btn-primary">Download PDF</a>` next to the existing print button.

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

If tackling all six, recommend this order:

1. **P3-85 CSV Export** — Fastest win, pure utility work
2. **P3-82 Confetti** — One component, one dependency, high delight
3. **P3-86 PDF Certificates** — Dependency already installed, clean win
4. **P3-84 Dark Mode** — Token-level work, touches every page
5. **P3-83 Drag-and-Drop** — Needs new dependencies + schema
6. **P3-87 Notifications** — Schema migration + polling infrastructure

---

## Total Deferred Work

| # | Feature | Est. Effort | Dependencies |
|---|---------|------------|--------------|
| P3-82 | Confetti | S | canvas-confetti (installed) |
| P3-83 | DnD reorder | M | @dnd-kit/core, @dnd-kit/sortable |
| P3-84 | Dark mode | L | None |
| P3-85 | CSV export | S | None |
| P3-86 | PDF cert | M | @react-pdf/renderer (installed) |
| P3-87 | Notifications | XL | Schema migration |