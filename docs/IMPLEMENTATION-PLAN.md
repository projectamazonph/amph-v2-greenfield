# Prioritized Implementation Plan — Every Fix

**Source:** UI-AUDIT-FULL-2026-07-31.md
**Total findings:** 117
**Priority bands:** P0 Critical (6) → P1 High (13) → P2 Medium (28) → P3 Enhancement (27)
**This document:** Every single fix, nothing skipped, nothing summarized away.

---

## Priority Legend

| Band | Meaning |
|------|---------|
| **P0** | Breaks user flow or causes data loss. Must fix before any feature work. |
| **P1** | Degrades usability or creates visual defects most users will notice. |
| **P2** | Inconsistency, missing polish, or suboptimal pattern. Affects quality perception. |
| **P3** | Enhancement or delight. Nice-to-have, but separates good from great. |

**Effort:** XS (<30 min), S (30-60 min), M (1-3 hours), L (3-6 hours), XL (1+ day)

---

# P0 — CRITICAL (6 fixes)

These break the user experience. Fix them first.

---

### P0-01. Add `loading.tsx` to every route group

**Problem:** No route in the entire app has a `loading.tsx`. When any server component fetches data (dashboard stats, lesson content, user list), the user sees a white flash — sometimes for seconds. This makes the app feel broken.

**Fix:** Create `loading.tsx` in each of these directories:

| File | What it shows |
|------|---------------|
| `src/app/loading.tsx` | Root skeleton — topbar placeholder + content area shimmer |
| `src/app/dashboard/loading.tsx` | Hero skeleton + 3 course card skeletons |
| `src/app/courses/loading.tsx` | 6 course card skeletons |
| `src/app/courses/[slug]/loading.tsx` | Header skeleton + curriculum list skeletons |
| `src/app/courses/[slug]/lessons/[lessonId]/loading.tsx` | Sidebar skeleton + content area shimmer |
| `src/app/courses/[slug]/lessons/[lessonId]/quiz/loading.tsx` | Quiz card skeleton |
| `src/app/tools/loading.tsx` | 5 tool card skeletons |
| `src/app/tools/bid-elevator/loading.tsx` | Tool form skeleton |
| `src/app/tools/campaign-builder/loading.tsx` | Tool form skeleton |
| `src/app/tools/keyword-research/loading.tsx` | Tool form skeleton |
| `src/app/tools/listing-audit/loading.tsx` | Tool form skeleton |
| `src/app/tools/str-triage/loading.tsx` | Tool form skeleton |
| `src/app/profile/loading.tsx` | Profile card skeleton |
| `src/app/checkout/loading.tsx` | Checkout form skeleton |
| `src/app/checkout/success/loading.tsx` | Success card skeleton |
| `src/app/checkout/failed/loading.tsx` | Failed card skeleton |
| `src/app/certificates/[hash]/loading.tsx` | Certificate card skeleton |
| `src/app/admin/loading.tsx` | 6 stat tile skeletons + 2 list skeletons |
| `src/app/admin/users/loading.tsx` | Table skeleton (8 rows) |
| `src/app/admin/users/[id]/loading.tsx` | Detail card skeleton |
| `src/app/admin/users/new/loading.tsx` | Form skeleton |
| `src/app/admin/courses/loading.tsx` | Table skeleton |
| `src/app/admin/courses/[id]/loading.tsx` | Detail skeleton |
| `src/app/admin/courses/[id]/edit/loading.tsx` | Form skeleton |
| `src/app/admin/courses/new/loading.tsx` | Form skeleton |
| `src/app/admin/payments/loading.tsx` | Table skeleton |
| `src/app/admin/payments/[id]/loading.tsx` | Detail skeleton |
| `src/app/admin/certificates/loading.tsx` | Table skeleton |
| `src/app/admin/certificates/[id]/loading.tsx` | Detail skeleton |
| `src/app/admin/refunds/loading.tsx` | Table skeleton |
| `src/app/admin/refunds/[orderId]/loading.tsx` | Detail skeleton |
| `src/app/admin/quizzes/loading.tsx` | Table skeleton |
| `src/app/admin/quizzes/new/loading.tsx` | Form skeleton |
| `src/app/admin/quizzes/[quizId]/edit/loading.tsx` | Form skeleton |
| `src/app/admin/simulators/loading.tsx` | Table skeleton |
| `src/app/admin/simulators/new/loading.tsx` | Form skeleton |
| `src/app/admin/simulators/[id]/edit/loading.tsx` | Form skeleton |
| `src/app/admin/live-classes/loading.tsx` | Table skeleton |
| `src/app/admin/live-classes/new/loading.tsx` | Form skeleton |
| `src/app/admin/live-classes/[id]/edit/loading.tsx` | Form skeleton |
| `src/app/admin/discount-codes/loading.tsx` | Table skeleton |
| `src/app/admin/discount-codes/new/loading.tsx` | Form skeleton |
| `src/app/admin/discount-codes/[id]/edit/loading.tsx` | Form skeleton |
| `src/app/admin/badges/loading.tsx` | Table skeleton |
| `src/app/admin/badges/new/loading.tsx` | Form skeleton |
| `src/app/admin/badges/[slug]/edit/loading.tsx` | Form skeleton |
| `src/app/admin/settings/loading.tsx` | Settings form skeleton |
| `src/app/admin/settings/2fa-setup/loading.tsx` | 2FA setup skeleton |
| `src/app/admin/audit-log/loading.tsx` | Table skeleton |
| `src/app/admin/content/loading.tsx` | Content skeleton |

**Implementation:** Create a shared `Skeleton` component at `src/components/ui/Skeleton.tsx` + `Skeleton.module.css` with:
- `skeletonPulse` keyframe (opacity 0.4 → 1 → 0.4, 1.5s ease)
- `SkeletonBlock` sub-component accepting `width`, `height`, `borderRadius`, `variant` (text/rect/circle)
- `SkeletonRow` sub-component for table rows
- `SkeletonCard` sub-component for card placeholders

Then each `loading.tsx` composes these into a layout that mirrors the real page.

**Effort:** M (shared skeleton component) + S per route (but many routes share the same skeleton shape — table vs. form vs. card — so 4-5 skeleton templates cover all 50 routes)

---

### P0-02. Build student navigation shell

**Problem:** Every student-facing page (`/dashboard`, `/courses`, `/courses/[slug]`, `/tools`, `/profile`, `/checkout`) renders with ZERO navigation. No sidebar, no header nav, no way to move between pages except the browser back button or manually editing the URL.

**Fix:** Create a student layout at `src/app/(student)/layout.tsx` + `src/app/(student)/layout.module.css` that wraps all authenticated student routes:

```
src/app/(student)/layout.tsx
src/app/(student)/layout.module.css
src/components/student/StudentSidebar.tsx
src/components/student/StudentSidebar.module.css
```

**Student Sidebar Structure:**

```
┌──────────────────────────┐
│  [orange square] AMPH    │  ← brand wordmark (reuse landing TopBar logo)
│                          │
│  ── LEARNING ──────────  │  ← monospace section label
│  ◉ Dashboard             │  ← active = accent pill
│  ○ My Courses            │
│  ○ Tools & Simulators    │
│  ○ Certificates          │
│                          │
│  ── CONTINUE ──────────  │  ← collapsible section
│  ▓▓▓▓▓▓▓▓░░ 72%         │  ← last course with inline progress bar
│  Amazon PPC Basics       │
│                          │
│  ── ACCOUNT ───────────  │
│  ○ Profile               │
│  ○ Sign Out              │
│                          │
│  ┌──────────────────┐    │
│  │ 👤 Juan D.       │    │  ← user card (reuse AdminShell UserCard)
│  │    juan@mail.com │    │
│  └──────────────────┘    │
└──────────────────────────┘
```

**CSS:** 220px width (slightly narrower than admin's 240px — students have fewer items), same token system (`--surface-1`, `--border`, `--accent` pill for active), Phosphor icons.

**Route group:** Move these routes into `(student)`:
- `/dashboard` → `(student)/dashboard`
- `/courses` → `(student)/courses`
- `/courses/[slug]` → `(student)/courses/[slug]`
- `/courses/[slug]/lessons/[lessonId]` → `(student)/courses/[slug]/lessons/[lessonId]`
- `/courses/[slug]/lessons/[lessonId]/quiz` → `(student)/courses/[slug]/lessons/[lessonId]/quiz`
- `/tools` → `(student)/tools`
- `/tools/*` → `(student)/tools/*`
- `/profile` → `(student)/profile`
- `/checkout` → `(student)/checkout`
- `/checkout/*` → `(student)/checkout/*`
- `/certificates` → `(student)/certificates`
- `/certificates/[hash]` → `(student)/certificates/[hash]`

**Note:** `(student)` is a route group — it does NOT change the URL paths. `/dashboard` stays `/dashboard`.

**Effort:** L

---

### P0-03. Convert checkout success/failed pages to CSS Modules

**Problem:** `/checkout/success/page.tsx` and `/checkout/failed/page.tsx` use inline `React.CSSProperties` objects instead of CSS Modules. This breaks the design system, removes responsive support, and uses hardcoded values like `background: "white"` instead of tokens.

**Files:**
- `src/app/checkout/success/page.tsx` — 5 inline style objects
- `src/app/checkout/failed/page.tsx` — 4 inline style objects

**Fix:**

Create `src/app/checkout/success/page.module.css`:
```css
.wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: var(--space-10) var(--side-pad);
}

.card {
  max-width: 480px;
  width: 100%;
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-10);
  text-align: center;
}

.card:hover {
  box-shadow: var(--shadow-1);
}

.icon {
  margin-bottom: var(--space-4);
  color: var(--success);
}

.title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--ink-900);
  margin: 0 0 var(--space-3) 0;
}

.description {
  font-size: var(--text-sm);
  color: var(--ink-500);
  line-height: var(--leading-relaxed);
  margin: 0 0 var(--space-6) 0;
}

.actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
}
```

Same pattern for `failed/page.module.css` but with `var(--danger)` for the icon color and different copy.

Replace all inline `style={{...}}` with `className={styles.xxx}`.

**Effort:** S

---

### P0-04. Fix hardcoded `completedLessonIds` on lesson page

**Problem:** In `src/app/courses/[slug]/lessons/[lessonId]/page.tsx`, the `completedLessonIds` prop is hardcoded to `[]`:

```tsx
completedLessonIds={[]}  // BUG: never shows checkmarks
```

The `LessonSidebar` component renders a green checkmark for completed lessons. Because this is always empty, the user never sees which lessons they've finished — defeating the entire purpose of the sidebar progress indicator.

**Fix:** Query the database for the current user's completed lessons for this course:

```tsx
import { db } from '@/lib/db';

// Inside the page component, after getting the user session:
const enrollments = await db.enrollment.findMany({
  where: { userId: user.id, courseId: course.id },
  include: { completedLessons: { select: { lessonId: true } } },
});
const completedLessonIds = enrollments.flatMap(e =>
  e.completedLessons.map(cl => cl.lessonId)
);
```

Pass this to `LessonSidebar`:
```tsx
completedLessonIds={completedLessonIds}
```

**Effort:** S

---

### P0-05. Section the admin sidebar

**Problem:** The admin sidebar (`NavSidebar.tsx`) renders 12+ nav items in a flat, unsectioned list. No visual grouping, no category labels, no badge counts. Admins scanning for "Payments" have to read through every single item.

**File:** `src/components/admin/NavSidebar.tsx` + `NavSidebar.module.css`

**Fix:** Group items into labeled sections:

```
┌──────────────────────────────┐
│  [orange ▊] Admin Panel      │  ← brand + "Admin Panel" subtitle
│                              │
│  ── OVERVIEW ──────────────  │  ← section label (text-xs, uppercase, ink-300, tracking-wider)
│  ◉ Dashboard                 │  ← active = accent pill bg
│  ○ Audit Log                 │
│                              │
│  ── CONTENT ───────────────  │
│  ○ Courses                   │
│  ○ Modules & Lessons         │
│  ○ Quizzes                   │
│  ○ Simulators                │
│  ○ Live Classes              │
│                              │
│  ── OPERATIONS ────────────  │
│  ○ Users                     │
│  ○ Enrollments               │
│  ○ Payments                  │
│  ○ Certificates              │
│  ○ Refunds [3]               │  ← badge count when > 0
│                              │
│  ── SYSTEM ────────────────  │
│  ○ Discount Codes            │
│  ○ Badges                    │
│  ○ Content Manager           │
│  ○ Settings                  │
│                              │
│  ┌────────────────────────┐  │
│  │ 👤 Admin User          │  │  ← UserCard (existing)
│  │    admin@amph.com      │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**CSS additions to `NavSidebar.module.css`:**
```css
.sectionLabel {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-300);
  padding: var(--space-4) var(--space-4) var(--space-2);
  margin-top: var(--space-2);
  border-top: 1px solid var(--border);
}

.sectionLabel:first-of-type {
  border-top: none;
  margin-top: 0;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--space-2);
  border-radius: 9999px;
  background: var(--danger);
  color: var(--surface-0);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  font-weight: 600;
  margin-left: var(--space-2);
}
```

**JSX structure change:** Define sections as data, map over them:

```tsx
const sections = [
  { label: 'Overview', items: [
    { href: '/admin', icon: <SquaresFour />, label: 'Dashboard' },
    { href: '/admin/audit-log', icon: <Scroll />, label: 'Audit Log' },
  ]},
  { label: 'Content', items: [
    { href: '/admin/courses', icon: <BookOpen />, label: 'Courses' },
    { href: '/admin/quizzes', icon: <Checks />, label: 'Quizzes' },
    { href: '/admin/simulators', icon: <Cpu />, label: 'Simulators' },
    { href: '/admin/live-classes', icon: <VideoCamera />, label: 'Live Classes' },
  ]},
  { label: 'Operations', items: [
    { href: '/admin/users', icon: <Users />, label: 'Users' },
    { href: '/admin/payments', icon: <CreditCard />, label: 'Payments' },
    { href: '/admin/certificates', icon: <Certificate />, label: 'Certificates' },
    { href: '/admin/refunds', icon: <ArrowCounterClockwise />, label: 'Refunds', badge: pendingRefundCount },
  ]},
  { label: 'System', items: [
    { href: '/admin/discount-codes', icon: <Tag />, label: 'Discount Codes' },
    { href: '/admin/badges', icon: <Medal />, label: 'Badges' },
    { href: '/admin/content', icon: <Files />, label: 'Content Manager' },
    { href: '/admin/settings', icon: <Gear />, label: 'Settings' },
  ]},
];
```

To get `pendingRefundCount`, add a server call in the layout:
```tsx
const pendingRefunds = await db.refund.count({ where: { status: 'PENDING' } });
```

**Effort:** M

---

### P0-06. Add hover/focus states to admin table rows

**Problem:** Every admin table (`/admin/users`, `/admin/courses`, `/admin/payments`, `/admin/certificates`, `/admin/refunds`, `/admin/audit-log`, `/admin/quizzes`, `/admin/simulators`, `/admin/live-classes`, `/admin/discount-codes`, `/admin/badges`) renders bare `<tr>` elements with no hover state. Dense data with zero visual rhythm.

**Files to update (add to each table's `.module.css`):**
- `src/app/admin/users/page.module.css`
- `src/app/admin/courses/page.module.css`
- `src/app/admin/payments/page.module.css`
- `src/app/admin/certificates/page.module.css`
- `src/app/admin/refunds/page.module.css`
- `src/app/admin/audit-log/page.module.css`
- `src/app/admin/quizzes/page.module.css`
- `src/app/admin/simulators/page.module.css`
- `src/app/admin/live-classes/page.module.css`
- `src/app/admin/discount-codes/page.module.css`
- `src/app/admin/badges/page.module.css`

**Fix:** Add a shared table hover pattern. Either:
- (A) Add `.row:hover` to each module.css individually, or
- (B) Create a shared `src/components/ui/Table.module.css` with reusable `.table`, `.row`, `.cell` classes

**Recommended: Option B** — shared component:

```css
/* src/components/ui/Table.module.css */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.row {
  border-bottom: 1px solid var(--border);
  transition: background-color 0.15s ease;
}

.row:hover {
  background: var(--surface-1);
}

.row:last-child {
  border-bottom: none;
}

.cell {
  padding: var(--space-3) var(--space-4);
  color: var(--ink-700);
  vertical-align: middle;
}

.cellHeader {
  composes: cell;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-400);
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface-0);
}
```

Then replace each admin table's local `<table>` with the shared component, or import the shared module with `composes`.

**Effort:** M (shared component) + XS per page (swap class names)

---

# P1 — HIGH (13 fixes)

These degrade usability. Fix after P0.

---

### P1-07. Replace `<a>` with `<Link>` on tools index page

**Problem:** `/tools/page.tsx` renders each tool card as `<a href="/tools/xxx">`. This causes a full page reload instead of client-side navigation. Every click flashes the entire page.

**File:** `src/app/tools/page.tsx`

**Fix:** Replace:
```tsx
<a href="/tools/bid-elevator" className={styles.card}>
```
With:
```tsx
import Link from 'next/link';
<Link href="/tools/bid-elevator" className={styles.card}>
```

Apply to all 5 tool cards: bid-elevator, campaign-builder, keyword-research, listing-audit, str-triage.

**Effort:** XS

---

### P1-08. Replace `<a>` with `<Link>` on lesson prev/next navigation

**Problem:** The lesson page (`/courses/[slug]/lessons/[lessonId]/page.tsx`) renders prev/next lesson links as `<a href={...}>`. Same full-page-reload issue as P1-07.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/page.tsx`

**Fix:** Import `Link` and replace both `<a>` tags with `<Link>`.

**Effort:** XS

---

### P1-09. Add breadcrumb to admin sub-pages that are missing it

**Problem:** These admin pages render a `TopBar` with title but NO breadcrumb:
- `/admin/users/page.tsx`
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
- `/admin/content/page.tsx`

The detail/edit/new sub-pages DO have breadcrumbs (e.g., `Users ▸ Juan Dela Cruz`), but the list pages don't. This makes it unclear where you are in the hierarchy.

**Fix:** Add the `breadcrumb` prop to each `<TopBar>`:

```tsx
<TopBar
  title="Users"
  subtitle="Manage platform accounts"
  breadcrumb="Admin ▸ Users"
/>
```

Pattern: `"Admin ▸ {Section Name}"` for list pages.

**Effort:** XS per page (just add the prop)

---

### P1-10. Add card hover lift to student course cards

**Problem:** `/dashboard/page.module.css` defines `.courseCard:hover` with only `border-color` change. No spatial feedback — the card doesn't move.

**File:** `src/app/dashboard/page.module.css`

**Fix:** Add a subtle translate + shadow on hover:

```css
.courseCard {
  /* existing styles */
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.courseCard:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-1);
  transform: translateY(-1px);
}
```

**Effort:** XS

---

### P1-11. Add card hover lift to tools index cards

**Problem:** `/tools/page.module.css` defines `.card:hover` with only `border-color` change. Same issue as P1-10.

**File:** `src/app/tools/page.module.css`

**Fix:**
```css
.card {
  /* existing styles */
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-1);
  transform: translateY(-1px);
}
```

**Effort:** XS

---

### P1-12. Add card hover lift to admin stat tiles

**Problem:** Admin dashboard stat tiles have `transform: translateY(-1px)` on hover but NO `box-shadow`. Field Manual says "shadows exist, but only on hover" — the stat tiles are missing the shadow half.

**File:** `src/app/admin/page.module.css`

**Fix:**
```css
.statTile {
  /* existing styles */
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.statTile:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow-1);
}
```

**Effort:** XS

---

### P1-13. Make admin stat tiles clickable links

**Problem:** The 6 stat tiles on `/admin` are plain `<div>` elements. They should link to their respective admin sub-pages for navigation.

**File:** `src/app/admin/page.tsx`

**Fix:** Wrap each tile in a `<Link>`:

```tsx
<Link href="/admin/users" className={styles.statTile}>
  <div className={styles.statAccent} />
  <div className={styles.statContent}>
    <div className={styles.statValue}>{stats.totalUsers}</div>
    <div className={styles.statLabel}>Total Users</div>
  </div>
</Link>
```

Map:
| Stat | Links to |
|------|----------|
| Total Users | `/admin/users` |
| Total Courses | `/admin/courses` |
| Total Enrollments | `/admin/users` (no dedicated page) |
| Total Revenue | `/admin/payments` |
| Certificates Issued | `/admin/certificates` |
| Pending Refunds | `/admin/refunds` |

**Effort:** S

---

### P1-14. Add empty state CTA buttons to admin dashboard

**Problem:** The "Recent activity" and "Pending actions" cards on `/admin` show empty states with Phosphor icons and text but NO call-to-action button. The user sees emptiness and has no way to fill it.

**File:** `src/app/admin/page.tsx`

**Fix:** Add a ghost button to each empty state:

```tsx
<div className={styles.emptyState}>
  <Icon className={styles.emptyIcon} />
  <p className={styles.emptyText}>No recent activity yet</p>
  <Link href="/admin/audit-log" className="btn btn--ghost">
    View Audit Log
  </Link>
</div>
```

For "Pending actions":
```tsx
<Link href="/admin/refunds" className="btn btn--ghost">
  Check Refunds
</Link>
```

**Effort:** XS

---

### P1-15. Add a "Mark as Complete" button to the lesson page

**Problem:** The lesson page has prev/next navigation but no explicit "Mark as Complete" or "Continue" CTA. The user finishes reading and has to manually click "Next Lesson" — there's no satisfying completion moment.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/page.tsx` + `page.module.css`

**Fix:** Add a completion bar at the bottom of the lesson content:

```tsx
<div className={styles.completionBar}>
  <span className={styles.completionText}>
    {isCompleted ? '✓ Lesson completed' : 'Finished reading?'}
  </span>
  {!isCompleted && (
    <form action={markCompleteAction}>
      <button type="submit" className="btn btn--primary">
        Mark as Complete
      </button>
    </form>
  )}
  {nextLesson && (
    <Link href={`/courses/${slug}/lessons/${nextLesson.id}`} className="btn btn--ghost">
      Next Lesson →
    </Link>
  )}
</div>
```

**CSS:**
```css
.completionBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  margin-top: var(--space-8);
  border-top: 1px solid var(--border);
  background: var(--surface-1);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}
```

**Effort:** M

---

### P1-16. Add "Start Over" / "Reset" button to all 5 simulator tools

**Problem:** Every simulator (Bid Elevator, Campaign Builder, Keyword Research, Listing Audit, STR Triage) has a form that produces results, but NO way to reset and start over. The user has to refresh the page.

**Files:**
- `src/app/tools/bid-elevator/page.tsx`
- `src/app/tools/campaign-builder/page.tsx`
- `src/app/tools/keyword-research/page.tsx`
- `src/app/tools/listing-audit/page.tsx`
- `src/app/tools/str-triage/page.tsx`

**Fix:** Add a "Start Over" ghost button that appears next to the results:

```tsx
{result && (
  <div className={styles.resultActions}>
    <button
      type="button"
      className="btn btn--ghost"
      onClick={() => {
        setResult(null);
        formRef.current?.reset();
      }}
    >
      <ArrowCounterClockwise size={16} />
      Start Over
    </button>
  </div>
)}
```

**Effort:** S (same pattern across all 5)

---

### P1-17. Add a branded logo/header to auth pages

**Problem:** `/login`, `/signup`, `/admin-login`, `/reset-password`, `/reset-password/[token]`, `/verify-email`, `/verify-email/sent` all have bare page headers with no brand identity. The checkout success page has a brand logo but auth pages don't.

**Files:**
- `src/app/login/LoginForm.tsx`
- `src/app/signup/SignupForm.tsx`
- `src/app/admin-login/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/reset-password/[token]/page.tsx`
- `src/app/verify-email/page.tsx`
- `src/app/verify-email/sent/page.tsx`

**Fix:** Create a shared `AuthShell` component:

```tsx
// src/components/auth/AuthShell.tsx
export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandSquare} />
          <span className={styles.brandText}>AMPH Academy</span>
        </div>
        {title && <h1 className={styles.title}>{title}</h1>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
```

Each auth page wraps its content in `<AuthShell>`.

**Effort:** M

---

### P1-18. Add trend indicators to admin stat tiles

**Problem:** Stat tiles show absolute numbers (156 users, ₱45,230 revenue) but no context — is that good? Up or down from last period? The user has no frame of reference.

**File:** `src/app/admin/page.tsx` + `src/app/admin/page.module.css`

**Fix:** Add trend arrows with color:

```tsx
<div className={styles.statValue}>
  {stats.totalUsers}
  {stats.usersTrend > 0 && (
    <span className={styles.trendUp}>▲ {stats.usersTrend}%</span>
  )}
  {stats.usersTrend < 0 && (
    <span className={styles.trendDown}>▼ {Math.abs(stats.usersTrend)}%</span>
  )}
</div>
```

```css
.trendUp {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--success);
  margin-left: var(--space-2);
  vertical-align: middle;
}

.trendDown {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--danger);
  margin-left: var(--space-2);
  vertical-align: middle;
}
```

Compute trends by comparing current month vs. previous month counts from the database.

**Effort:** M (needs a date-range query helper)

---

### P1-19. Create custom 404 and error pages

**Problem:** The app uses Next.js default 404/error pages (white page with generic text). This looks unfinished.

**Files to create:**
- `src/app/not-found.tsx` + `src/app/not-found.module.css`
- `src/app/error.tsx` (client component with `"use client"`)
- `src/app/global-error.tsx`

**Fix:**

`not-found.tsx`:
```tsx
import Link from 'next/link';
import { Compass } from '@/lib/icons';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.wrapper}>
      <Compass size={48} className={styles.icon} />
      <h1 className={styles.code}>404</h1>
      <p className={styles.message}>This page went off exploring. Let's get you back on track.</p>
      <div className={styles.actions}>
        <Link href="/" className="btn btn--primary">Back to Home</Link>
        <Link href="/dashboard" className="btn btn--ghost">Dashboard</Link>
      </div>
    </div>
  );
}
```

**Effort:** S

---

### P1-20. Fix quiz page missing breadcrumbs

**Problem:** The quiz page (`/courses/[slug]/lessons/[lessonId]/quiz/page.tsx`) renders breadcrumbs but the pattern is inconsistent — it uses inline `<nav>` instead of the `TopBar` component used everywhere else.

**File:** `src/app/courses/[slug]/lessons/[lessonId]/quiz/page.tsx`

**Fix:** Use the `TopBar` component with `breadcrumb` prop for consistency, or at minimum ensure the breadcrumb text matches the pattern used in lesson pages.

**Effort:** XS

---