# Implementation Plan — P2 Medium (28 fixes)

Continues from IMPLEMENTATION-PLAN.md (P0 Critical + P1 High).

---

### P2-21. Add active state indicator to student course card progress bars

**Problem:** `/dashboard/page.module.css` has `.progressFill` but no animated width transition. The bar just snaps into position.

**File:** `src/app/dashboard/page.module.css`

**Fix:**
```css
.progressFill {
  /* existing styles */
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Effort:** XS

---

### P2-22. Add sidebar collapse for mobile to student sidebar

**Problem:** (After P0-02 builds the student sidebar) — there's no mobile responsive behavior. On screens < 768px, a 220px sidebar eats too much space.

**Files:** `src/components/student/StudentSidebar.tsx` + `StudentSidebar.module.css`

**Fix:** Add a hamburger toggle and overlay:
```css
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    left: -220px;
    top: 0;
    z-index: 100;
    transition: left 0.25s ease;
  }
  .sidebar.open {
    left: 0;
  }
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 99;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }
  .overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }
}
```

**Effort:** M

---

### P2-23. Add sidebar collapse for mobile to admin sidebar

**Problem:** Same as P2-22 but for the admin NavSidebar (240px).

**Files:** `src/components/admin/NavSidebar.tsx` + `NavSidebar.module.css`

**Fix:** Same pattern as P2-22. Add a `<Menu>` icon button in the TopBar that toggles the sidebar on mobile.

**Effort:** M

---

### P2-24. Add zebra striping option to admin tables

**Problem:** Even with hover (P0-06), long tables (50+ users, 200+ audit entries) are hard to scan row-by-row.

**Files:** All admin table `.module.css` files (same 11 files as P0-06)

**Fix:** Add an `.evenRow` variant:
```css
.row:nth-child(even) {
  background: var(--surface-1);
}
```

This is subtle enough for the Field Manual aesthetic — just a hint of alternation.

**Effort:** XS

---

### P2-25. Add keyboard shortcut (Cmd/Ctrl+K) for admin search

**Problem:** No quick way to navigate the admin panel without clicking through the sidebar.

**Files:**
- `src/components/admin/AdminShell.tsx` + `AdminShell.module.css` (new component)
- `src/app/admin/layout.tsx`

**Fix:** Create a command palette component:

```tsx
// src/components/admin/CommandPalette.tsx
"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlass } from '@/lib/icons';

const commands = [
  { label: 'Dashboard', path: '/admin', icon: <SquaresFour /> },
  { label: 'Users', path: '/admin/users', icon: <Users /> },
  { label: 'Courses', path: '/admin/courses', icon: <BookOpen /> },
  { label: 'Payments', path: '/admin/payments', icon: <CreditCard /> },
  // ... all admin routes
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.palette} onClick={e => e.stopPropagation()}>
        <div className={styles.searchRow}>
          <MagnifyingGlass size={18} />
          <input
            className={styles.input}
            placeholder="Search admin pages..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <ul className={styles.results}>
          {filtered.map(cmd => (
            <li key={cmd.path}>
              <button
                className={styles.resultItem}
                onClick={() => { router.push(cmd.path); setOpen(false); }}
              >
                {cmd.icon}
                {cmd.label}
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.footer}>
          <kbd>↑↓</kbd> navigate <kbd>↵</kbd> select <kbd>esc</kbd> close
        </div>
      </div>
    </div>
  );
}
```

**Effort:** M

---

### P2-26. Fix certificate page static shadow at rest

**Problem:** `/certificates/[hash]/page.module.css` has `box-shadow: var(--shadow-1)` on `.card` at rest. Field Manual says "shadows exist, but only on hover."

**File:** `src/app/certificates/[hash]/page.module.css`

**Fix:**
```css
.card {
  /* existing styles */
  box-shadow: none;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.card:hover {
  box-shadow: var(--shadow-1);
  transform: translateY(-1px);
}
```

**Effort:** XS

---

### P2-27. Add structured data (JSON-LD) to certificate page

**Problem:** The certificate page is public-facing and shareable but has no structured data for search engines.

**File:** `src/app/certificates/[hash]/page.tsx`

**Fix:**
```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOccupationalCredential',
  name: `Certificate: ${cert.course.title}`,
  description: `Certificate of completion for ${cert.course.title} issued by AMPH Academy`,
  issuedBy: { '@type': 'Organization', name: 'AMPH Academy' },
  datePublished: cert.issuedAt.toISOString(),
  credentialCategory: 'certificate',
};

// In the JSX:
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

**Effort:** XS

---

### P2-28. Add "No results" / "No courses" empty state to courses index

**Problem:** `/courses/page.tsx` has no empty state when the catalog is empty or when search/filter returns no results.

**File:** `src/app/courses/page.tsx`

**Fix:**
```tsx
{courses.length === 0 && (
  <div className={styles.emptyState}>
    <BookOpen size={48} className={styles.emptyIcon} />
    <p className={styles.emptyTitle}>No courses yet</p>
    <p className={styles.emptyText}>Check back soon — we're building new content.</p>
  </div>
)}
```

**Effort:** XS

---

### P2-29. Add "No results" empty state to admin user list

**Problem:** `/admin/users/page.tsx` has no empty state when the user list is empty or when search returns nothing.

**File:** `src/app/admin/users/page.tsx`

**Fix:** Same pattern as P2-28 but with Users icon and "No users found" text, plus a "Create User" CTA.

**Effort:** XS

---

### P2-30. Add "No results" empty state to ALL admin list pages

**Problem:** Same as P2-29 but for:
- `/admin/courses/page.tsx`
- `/admin/payments/page.tsx`
- `/admin/certificates/page.tsx`
- `/admin/refunds/page.tsx`
- `/admin/quizzes/page.tsx`
- `/admin/simulators/page.tsx`
- `/admin/live-classes/page.tsx`
- `/admin/discount-codes/page.tsx`
- `/admin/badges/page.tsx`
- `/admin/audit-log/page.tsx`

**Fix:** Add empty state to each. Create a shared `<EmptyState>` component:

```tsx
// src/components/ui/EmptyState.tsx
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.iconCircle}>{icon}</div>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      {action}
    </div>
  );
}
```

Then use it in every list page.

**Effort:** S (shared component) + XS per page

---

### P2-31. Add unsaved changes warning to admin forms

**Problem:** All admin edit forms (course edit, user edit, quiz edit, simulator edit, live class edit, discount code edit, badge edit) have no dirty-state tracking. If an admin accidentally navigates away, all changes are lost silently.

**Files:**
- `src/app/admin/courses/[id]/edit/page.tsx`
- `src/app/admin/users/[id]/page.tsx` (edit mode)
- `src/app/admin/quizzes/[quizId]/edit/page.tsx`
- `src/app/admin/simulators/[id]/edit/page.tsx`
- `src/app/admin/live-classes/[id]/edit/page.tsx`
- `src/app/admin/discount-codes/[id]/edit/page.tsx`
- `src/app/admin/badges/[slug]/edit/page.tsx`
- `src/app/admin/courses/[id]/modules/[moduleId]/edit/page.tsx`
- `src/app/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/edit/page.tsx`

**Fix:** Create a `useUnsavedChanges` hook:

```tsx
// src/hooks/useUnsavedChanges.ts
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Note: Next.js App Router doesn't have a built-in route-change event.
  // Use the beforeunload for tab close, and a confirmation dialog
  // wrapped around form submission for route changes.
}
```

**Effort:** M

---

### P2-32. Add focus ring consistency to form inputs

**Problem:** Some form inputs use the default browser focus ring, some use the `--accent` ring from the design system. Inconsistent across auth pages and admin forms.

**Files:** All form `.module.css` files

**Fix:** Add a global focus style in `globals.css`:

```css
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: var(--accent);
}
```

This ensures every input in the app has a consistent focus ring without modifying individual modules.

**Effort:** XS

---

### P2-33. Add consistent button hover transitions

**Problem:** The `.btn` classes in `globals.css` have hover color changes but no `transition` property. The color change is instant — feels mechanical.

**File:** `src/app/globals.css`

**Fix:**
```css
.btn {
  /* existing styles */
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.btn:active {
  transform: scale(0.98);
}
```

**Effort:** XS

---

### P2-34. Add consistent card border-radius across all pages

**Problem:** Some cards use `var(--radius-md)`, some use `var(--radius-sm)`, some use `8px` hardcoded. Inconsistent rounding.

**Files:** Audit all `.module.css` files for hardcoded border-radius values.

**Fix:** Search and replace:
- Any `border-radius: 8px` → `border-radius: var(--radius-md)`
- Any `border-radius: 4px` → `border-radius: var(--radius-sm)`
- Any `border-radius: 12px` → `border-radius: var(--radius-lg)`

**Effort:** S (search + replace across files)

---

### P2-35. Add consistent spacing scale usage

**Problem:** Some CSS uses hardcoded pixel values (`padding: 16px`, `margin: 24px`) instead of the design token spacing scale (`var(--space-4)`, `var(--space-6)`).

**Files:** All `.module.css` files

**Fix:** Search for hardcoded `px` values and map them to tokens:
- `4px` → `var(--space-1)`
- `8px` → `var(--space-2)`
- `12px` → `var(--space-3)`
- `16px` → `var(--space-4)`
- `20px` → `var(--space-5)`
- `24px` → `var(--space-6)`
- `32px` → `var(--space-8)`
- `40px` → `var(--space-10)`
- `48px` → `var(--space-12)`
- `64px` → `var(--space-16)`

**Effort:** M (mechanical but many files)

---

### P2-36. Add consistent font-family usage for data values

**Problem:** Some stat values and numeric displays use `var(--font-mono)` correctly, but others use the default body font. Data should always be monospaced for alignment.

**Files:** Admin stat tiles, table cells with numbers, progress percentages

**Fix:** Add a `.mono` utility class in `globals.css`:
```css
.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

Apply to all numeric displays.

**Effort:** S

---

### P2-37. Add page titles to all auth pages

**Problem:** Auth pages (login, signup, reset-password, verify-email, admin-login) don't set `<title>` tags. Since they're not inside the admin layout, they miss the metadata.

**Files:**
- `src/app/login/page.tsx` (or layout)
- `src/app/signup/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/reset-password/[token]/page.tsx`
- `src/app/verify-email/page.tsx`
- `src/app/verify-email/sent/page.tsx`
- `src/app/admin-login/page.tsx`

**Fix:** Add `export const metadata: Metadata = { title: 'Login — AMPH Academy' }` to each page/layout.

**Effort:** XS per page

---

### P2-38. Add "Back to Course" link on lesson page

**Problem:** The lesson page has breadcrumbs but no explicit "Back to Course" button in the completion bar or header area. Users finishing a lesson want to return to the course overview.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/page.tsx`

**Fix:** Add a link in the breadcrumb area or completion bar:
```tsx
<Link href={`/courses/${courseSlug}`} className="btn btn--ghost btn--sm">
  ← Back to Course
</Link>
```

**Effort:** XS

---

### P2-39. Add consistent error message styling to auth forms

**Problem:** Auth form error messages (login failed, signup validation errors) use inline styles or bare `<p>` tags. No consistent error styling.

**Files:**
- `src/app/login/LoginForm.tsx`
- `src/app/signup/SignupForm.tsx`
- `src/app/admin-login/page.tsx`

**Fix:** Add an `.errorMessage` class:
```css
.errorMessage {
  font-size: var(--text-sm);
  color: var(--danger);
  padding: var(--space-3) var(--space-4);
  background: var(--danger-soft, #FFF5F5);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-4);
}
```

**Effort:** XS

---

### P2-40. Add loading indicator to form submit buttons

**Problem:** All forms (auth, admin, tools) show no loading state while submitting. The user clicks "Save" and nothing happens for 1-3 seconds. They click again, causing double submissions.

**Files:** All form components

**Fix:** Add a `pending` state from `useFormStatus` (React 19):
```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Saving...' : children}
    </button>
  );
}
```

**Effort:** S (shared component) + XS per form

---

### P2-41. Add toast notification for successful actions

**Problem:** After creating a course, user, quiz, etc., the admin is redirected back to the list with no success feedback. Did it work? The user has to scan the list to find out.

**Files:** All admin create/edit server actions

**Fix:** Implement a toast system:
- Create `src/components/ui/Toast.tsx` + `Toast.module.css`
- Use `react-hot-toast` or a lightweight custom implementation
- Trigger toasts via URL search params: `?success=Course+created`
- A client component reads the param and shows the toast, then clears it

**Effort:** M

---

### P2-42. Add "View as Student" preview button to admin course detail

**Problem:** Admin viewing `/admin/courses/[id]` has no way to see how the course looks to students.

**File:** `src/app/admin/courses/[id]/page.tsx`

**Fix:** Add a ghost button:
```tsx
<Link href={`/courses/${course.slug}`} className="btn btn--ghost" target="_blank">
  <Eye size={16} />
  View as Student
</Link>
```

**Effort:** XS

---

### P2-43. Add course duration estimate display

**Problem:** Course cards and course detail pages show lesson count but no time estimate. "12 lessons" means nothing without "≈ 4 hours".

**Files:**
- `src/app/courses/[slug]/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/admin/courses/[id]/page.tsx`

**Fix:** Add a `estimatedDuration` field to the course model (or compute from lesson count × average). Display as:
```
12 lessons · ≈ 4 hours
```

**Effort:** S (if field exists) or M (if needs schema migration)

---

### P2-44. Add search/filter to admin user list

**Problem:** `/admin/users/page.tsx` shows a flat table with no search or filter. With 100+ users, finding a specific user requires scrolling.

**File:** `src/app/admin/users/page.tsx` + `page.module.css`

**Fix:** Add a search input above the table:
```tsx
<div className={styles.filterBar}>
  <input
    type="text"
    placeholder="Search by name or email..."
    className={styles.searchInput}
    defaultValue={searchParams.q}
  />
</div>
```

**Effort:** S

---

### P2-45. Add search/filter to admin course list

**Problem:** Same as P2-44 but for `/admin/courses/page.tsx`.

**Fix:** Same pattern — search input + optional status filter (Draft/Published/Archived).

**Effort:** S

---

### P2-46. Add search/filter to admin payments list

**Problem:** Same as P2-44 but for `/admin/payments/page.tsx`. Payments need filtering by status and date range.

**Fix:** Search input + status dropdown (Completed/Pending/Failed/Refunded) + date range picker.

**Effort:** M

---

### P2-47. Add pagination to admin tables

**Problem:** All admin list pages load ALL records at once. With 500+ users or 1000+ audit log entries, this will cause performance issues and long scroll.

**Files:** All admin list pages

**Fix:** Add server-side pagination:
```tsx
const PAGE_SIZE = 20;
const page = parseInt(searchParams.page || '1');
const users = await db.user.findMany({
  skip: (page - 1) * PAGE_SIZE,
  take: PAGE_SIZE,
  orderBy: { createdAt: 'desc' },
});
const total = await db.user.count();
const totalPages = Math.ceil(total / PAGE_SIZE);
```

Add pagination component at the bottom of each table.

**Effort:** M (shared pagination component) + S per page

---

### P2-48. Add responsive grid to admin stat tiles

**Problem:** Admin stat tiles use `grid-template-columns: repeat(6, 1fr)` which breaks on screens < 1200px — tiles get squished.

**File:** `src/app/admin/page.module.css`

**Fix:**
```css
.statGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
}
```

**Effort:** XS

---

### P2-49. Fix student course detail page responsive layout

**Problem:** `/courses/[slug]/page.tsx` has a two-column layout (header + curriculum) that doesn't stack on mobile.

**File:** `src/app/courses/[slug]/page.module.css`

**Fix:**
```css
@media (max-width: 767px) {
  .headerContent {
    flex-direction: column;
  }
  .courseMeta {
    flex-direction: column;
    gap: var(--space-2);
  }
}
```

**Effort:** S

---

### P2-50. Fix lesson page sidebar collapse on mobile

**Problem:** The lesson page has a 280px sidebar that doesn't collapse on mobile. Content area gets squeezed to < 300px.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/page.module.css`

**Fix:**
```css
@media (max-width: 767px) {
  .layout {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 10;
    max-height: 40vh;
    overflow-y: auto;
  }
}
```

**Effort:** S

---

### P2-51. Fix quiz page responsive layout

**Problem:** Quiz page has no responsive considerations.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/quiz/page.module.css`

**Fix:** Ensure the quiz card doesn't overflow on small screens:
```css
@media (max-width: 767px) {
  .quizContainer {
    padding: var(--space-4);
  }
  .optionButton {
    padding: var(--space-3);
  }
}
```

**Effort:** XS

---

### P2-52. Fix tools simulator responsive layout

**Problem:** All 5 simulator pages have side-by-side form+results layouts that don't stack on mobile.

**Files:**
- `src/app/tools/bid-elevator/page.module.css`
- `src/app/tools/campaign-builder/page.module.css`
- `src/app/tools/keyword-research/page.module.css`
- `src/app/tools/listing-audit/page.module.css`
- `src/app/tools/str-triage/page.module.css`

**Fix:**
```css
@media (max-width: 767px) {
  .layout {
    flex-direction: column;
  }
  .form,
  .results {
    width: 100%;
  }
}
```

**Effort:** S (same pattern across all 5)

---

### P2-53. Add skip-to-content link for accessibility

**Problem:** No skip-to-content link. Keyboard users have to tab through the entire sidebar on every page load.

**Files:**
- `src/app/admin/layout.tsx`
- `src/app/(student)/layout.tsx` (after P0-02)

**Fix:**
```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
// ...
<main id="main-content" className={styles.main}>
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.skip-link:focus {
  position: fixed;
  top: var(--space-2);
  left: var(--space-2);
  width: auto;
  height: auto;
  z-index: 9999;
  background: var(--accent);
  color: var(--surface-0);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
}
```

**Effort:** XS

---

### P2-54. Add ARIA labels to icon-only buttons

**Problem:** Some buttons render Phosphor icons without text or `aria-label`. Screen readers announce them as "button" with no context.

**Files:** All icon buttons across the app

**Fix:** Add `aria-label` to every icon-only button:
```tsx
<button aria-label="Delete user" className="btn btn--ghost">
  <Trash size={16} />
</button>
```

**Effort:** S (search for icon-only buttons and add labels)

---

### P2-55. Add consistent `--font-display` usage for page titles

**Problem:** Some page titles use `var(--font-display)` (Space Grotesk), others use the default body font. All H1s should be display font.

**Files:** Check all page titles across auth pages, tool pages, and admin pages.

**Fix:** Add to `globals.css`:
```css
h1 {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
}
```

**Effort:** XS

---

### P2-56. Fix admin course detail edit buttons missing confirmation

**Problem:** Admin course detail page has "Delete" and "Archive" buttons with no confirmation dialog. One accidental click and the course is gone.

**File:** `src/app/admin/courses/[id]/page.tsx`

**Fix:**
```tsx
<button
  className="btn btn--danger"
  onClick={() => {
    if (window.confirm('Are you sure you want to delete this course? This cannot be undone.')) {
      // proceed with deletion
    }
  }}
>
  Delete Course
</button>
```

Better: create a `<ConfirmDialog>` component for reuse.

**Effort:** S

---

### P2-57. Add "Back to List" link on all admin detail pages

**Problem:** Admin detail pages (user detail, course detail, payment detail, certificate detail, refund detail) have no "Back to List" link. The user has to use the sidebar to navigate back.

**Files:**
- `src/app/admin/users/[id]/page.tsx`
- `src/app/admin/courses/[id]/page.tsx`
- `src/app/admin/payments/[id]/page.tsx`
- `src/app/admin/certificates/[id]/page.tsx`
- `src/app/admin/refunds/[orderId]/page.tsx`

**Fix:** Add a breadcrumb or back link:
```tsx
<Link href="/admin/users" className={styles.backLink}>
  ← Back to Users
</Link>
```

**Effort:** XS per page

---

### P2-58. Add consistent date formatting across the app

**Problem:** Some dates are formatted as `toLocaleDateString()`, others as `toLocaleString()`, others as raw ISO strings. Inconsistent display.

**File:** Create `src/lib/format-date.ts`

**Fix:**
```tsx
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}
```

**Effort:** S

---

### P2-59. Add admin quick actions bar below stat tiles

**Problem:** Admin dashboard stat tiles take up the top section, but there are no quick action shortcuts. Common tasks require navigating through the sidebar.

**File:** `src/app/admin/page.tsx` + `page.module.css`

**Fix:**
```tsx
<div className={styles.quickActions}>
  <Link href="/admin/courses/new" className="btn btn--ghost">
    <Plus size={16} /> Create Course
  </Link>
  <Link href="/admin/users/new" className="btn btn--ghost">
    <UserPlus size={16} /> Add User
  </Link>
  <Link href="/admin/payments" className="btn btn--ghost">
    <CreditCard size={16} /> View Payments
  </Link>
  <Link href="/admin/audit-log" className="btn btn--ghost">
    <Scroll size={16} /> Audit Log
  </Link>
</div>
```

```css
.quickActions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--border);
}
```

**Effort:** XS

---