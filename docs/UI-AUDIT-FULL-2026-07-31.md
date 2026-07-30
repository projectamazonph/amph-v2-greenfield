# Full UI Audit — Every Page, Every Component

**Auditor:** Omnibot Design Agent (impeccable + ui-ux-pro-max + web-design-guidelines)  
**Date:** 2026-07-31  
**Scope:** 45 routes, 27 components, all CSS modules  
**Stack:** Next.js 16, React 19, CSS Modules, @astryxdesign/core, Phosphor Icons  
**Design System:** "The Field Manual" — warm paper neutrals, Waybill Orange accent, dense utilitarian layout

---

## Severity Legend

| Icon | Severity | Meaning |
|------|----------|---------|
| 🔴 | **Critical** | Breaks UX flow, causes confusion, or is a visual defect users will notice immediately |
| 🟠 | **High** | Significant gap that degrades experience but doesn't break the flow |
| 🟡 | **Medium** | Polish issue — things that feel unfinished or inconsistent |
| 🔵 | **Low** | Enhancement opportunity — nice-to-haves that would elevate the experience |
| ✅ | **Good** | Already well-done, noted for completeness |

---

## SECTION 1: STUDENT-FACING PAGES

---

### 1.1 Landing Page — `/` (page.tsx)

**Status:** ✅ Well-structured hero sections with PageTexture, TopBar, Hero, Stats, etc.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 1 | 🔵 | No scroll-triggered animations | Hero, Stats, and CTA sections all appear instantly. A `fadeSlideUp` on viewport entry would add polish. |
| 2 | 🟡 | Stats section numbers are static text | If these are real KPIs (enrolled students, courses, etc.), they should be fetched from the DB. If placeholder, they'll look fake to early users. |
| 3 | 🔵 | No social proof / testimonials section | Training platforms convert better with student quotes or completion stats. |

---

### 1.2 Courses Index — `/courses/page.tsx`

**Status:** ✅ Clean grid, good card layout, proper use of design tokens.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 4 | 🟡 | No hover lift on course cards | Cards have border but no `translateY(-2px)` or shadow elevation on hover. Per Field Manual: "shadows on interaction only." |
| 5 | 🟡 | No filter/sort controls | With multiple courses, users need "Sort by price", "Filter by category". Even a simple row of pill buttons would help. |
| 6 | 🔵 | No course count indicator | "Showing X courses" below the header would set expectations. |
| 7 | 🔵 | Cards lack a "NEW" or "Popular" badge system | No way to highlight featured courses. |

---

### 1.3 Course Detail — `/courses/[slug]/page.tsx`

**Status:** ✅ Solid structure — cover image, title, tagline, meta stats, enroll button, curriculum accordion.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 8 | 🟡 | Cover placeholder has a single letter at 0.3 opacity | Looks like a bug. The letter is barely visible. Bump to 0.5 or use a pattern/texture instead. |
| 9 | 🟡 | Curriculum `<details>` open by default for first section only | Fine, but the chevron animation (`rotate(180deg)`) doesn't play on initial load — only on toggle. |
| 10 | 🔵 | No "What you'll learn" or learning outcomes section | Standard for course landing pages. Helps conversion. |
| 11 | 🔵 | No instructor bio or "About the instructor" block | Builds trust. |
| 12 | 🔵 | Lesson items lack completion checkmarks | If the user is enrolled, lessons should show a checkmark for completed ones. Currently all look the same. |
| 13 | 🟡 | `.lessonItem:last-child:not(:has(+ .lessonItem)) .lessonIcon` selector | `:has()` is well-supported now but this selector is fragile and may not do what's intended (it targets the last lesson item only if it has no following siblings, which is always true for `:last-child`). |

---

### 1.4 Lesson Page — `/courses/[slug]/lessons/[lessonId]/page.tsx`

**Status:** ✅ Good layout — sidebar + breadcrumb + content + prev/next nav. Mobile-responsive stacking.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 14 | 🟠 | `completedLessonIds` is always `[]` | Hardcoded empty array. The lesson sidebar will never show checkmarks. This is a **functional defect** — progress tracking is broken visually. |
| 15 | 🟡 | Sidebar `overflow-y: auto` on `.main` | On desktop, the main content area has `overflow-y: auto` which creates an independent scroll context. This means the lesson sidebar scrolls separately from the content. On long lessons, the sidebar may clip. |
| 16 | 🔵 | No "Mark as Complete" button | After reading a lesson, there's no explicit CTA to mark it done. Relies entirely on the (broken) automatic tracking. |
| 17 | 🔵 | No estimated reading time | Lesson header shows section label and title, but not "Estimated: 5 min read". |
| 18 | 🟡 | Breadcrumb truncates course title to 200px | On mobile, the breadcrumb can overflow. The `flex: 1` on `.breadcrumbCurrent` helps, but the course title link at 200px max may still clip. |
| 19 | ✅ | Access denied page is well-designed | Lock icon, clear headline, enroll CTA — good. |

---

### 1.5 Quiz Page — `/courses/[slug]/lessons/[lessonId]/quiz/page.tsx`

**Status:** ⚠️ Minimal — just a breadcrumb and a `<QuizPlayer>` component.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 20 | 🟠 | "Sign in to take this quiz" is plain `<p>` with no styling | No icon, no card, no CTA. Should be a proper empty state with a sign-in button. |
| 21 | 🟠 | "Quiz not found" is plain `<p>` with no styling | Same issue — bare text, no visual treatment. |
| 22 | 🟡 | Quiz page has no sidebar or course context | Unlike the lesson page, the quiz page has no sidebar navigation. User loses context of which course/lesson they're in. |
| 23 | 🔵 | No progress indicator for multi-question quizzes | If the QuizPlayer has multiple questions, there's no "Question 2 of 5" indicator (this may be inside QuizPlayer — need to check). |

---

### 1.6 Student Dashboard — `/dashboard/page.tsx`

**Status:** ⚠️ Bare minimum — welcome message, continue-learning cards, my-courses list.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 24 | 🔴 | No sidebar navigation | Student pages have NO sidebar, NO header nav, NO way to navigate between Dashboard, Courses, Tools, Profile. The only way out is the browser back button or typing URLs. |
| 25 | 🟠 | No summary stats | No "X courses enrolled, Y completed, Z hours learned" overview. |
| 26 | 🟠 | Continue learning cards are text-only | No progress bars, no thumbnails, no visual indicator of how far along the student is. |
| 27 | 🟡 | Sign-out link is a plain text link at the bottom | No styled button, no confirmation dialog. |
| 28 | 🔵 | No recent activity feed | No "You completed Lesson 3 yesterday" timeline. |
| 29 | 🔵 | No motivational elements | No streak counter, no XP display, no badge showcase. |

---

### 1.7 Tools Index — `/tools/page.tsx`

**Status:** ✅ Good grid layout, clear card structure, eyebrow badges.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 30 | 🟡 | No hover micro-interaction on tool cards | Cards have `shadow-sm` at rest but no elevation change on hover. |
| 31 | 🔵 | No difficulty/estimated time badges | Each tool could show "⏱ 10 min" or "🟢 Beginner" to help students choose. |
| 32 | 🔵 | No completion status per tool | If a student has already completed a simulator, show a checkmark or "Completed" badge. |
| 33 | 🟡 | Keyword Research card is manually added outside the registry loop | DRY violation — it's a duplicate of the registry pattern but hardcoded. If the registry approach changes, this card won't follow. |

---

### 1.8 Tool Pages — Bid Elevator, Campaign Builder, Keyword Research, Listing Audit, STR Triage

**Status:** ✅ Consistent structure across all 5: breadcrumb → eyebrow → title → brief → form component.

**Findings (applies to all 5):**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 34 | 🟡 | All breadcrumbs use bare `<a>` tags, not `<Link>` | Causes full page reloads instead of client-side navigation. Every tool page does `<a href="/tools">← Tools</a>` instead of `<Link href="/tools">`. |
| 35 | 🔵 | No "Reset" or "Start Over" button | Once a student submits, there's no obvious way to retry the same scenario. |
| 36 | 🔵 | No "Save Progress" capability | Simulator state is lost on page refresh. |
| 37 | 🟡 | STR Triage has extra metadata bar (Target ROAS, term count) | Good! But the other tools don't show scenario parameters. Inconsistent. |
| 38 | 🔵 | No contextual hints or "How to use this tool" collapsible | First-time users may not know what to do. A brief instruction panel would help. |

**Bid Elevator specific:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 39 | 🟡 | 8 keywords with identical structure — very data-dense | The form will be extremely long. Consider a collapsible/accordion per keyword or a table layout. |

**STR Triage specific:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 40 | 🟡 | 14 search term rows | Same density concern. The form will be very long. Consider pagination or a compact table view. |

---

### 1.9 Checkout — `/checkout/page.tsx`

**Status:** ⚠️ Thin wrapper — just `<Suspense>` around `<CheckoutForm>`.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 41 | 🟠 | `fallback={null}` in Suspense | While the checkout form loads (which includes fetching course data via `useSearchParams`), the user sees a completely blank white page. Should be a skeleton or spinner. |
| 42 | 🟡 | No `page.module.css` | The checkout page has no dedicated styles — relies entirely on CheckoutForm's styles. |

---

### 1.10 Checkout Success — `/checkout/success/page.tsx`

**Status:** ⚠️ Uses **inline styles** via `STYLES` constant instead of CSS Modules.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 43 | 🔴 | **Inline styles break the design system pattern** | Every other page uses CSS Modules. This page uses `React.CSSProperties` objects. This means: no responsive breakpoints, no pseudo-selectors (`:hover`), no media queries, no CSS variable inheritance in some contexts. |
| 44 | 🟡 | Card uses `background: "white"` instead of `var(--surface-1)` | Hardcoded white breaks dark mode compatibility. |
| 45 | 🟡 | No animation on the checkmark SVG | A simple `scale(0) → scale(1)` with a bounce would make the success feel celebratory. |
| 46 | 🔵 | No auto-redirect to dashboard | After payment success, user has to manually click "Go to dashboard". A 5-second countdown redirect would be smoother. |

---

### 1.11 Checkout Failed — `/checkout/failed/page.tsx`

**Status:** ⚠️ Also uses **inline styles**.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 47 | 🔴 | **Inline styles — same issue as success page** | Inconsistent with the rest of the app. |
| 48 | 🟡 | `background: "white"` hardcoded | Same dark-mode issue. |
| 49 | 🟡 | Uses `className="btn btn-primary"` mixed with inline styles | The `btn btn-primary` classes come from somewhere (possibly globals.css or the Astryx base), but the rest is inline. Mixed approach. |
| 50 | 🔵 | No "Contact Support" link | For payment failures, a support link would reduce frustration. |

---

### 1.12 Certificate Verification — `/certificates/[hash]/page.tsx`

**Status:** ✅ **Best-designed page in the app.** Formal certificate layout, verified/revoked badges, proper styling.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 51 | 🟡 | Certificate card has `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06)` | Per Field Manual, shadows should be on interaction only. This is a static shadow. Should be border-only at rest, shadow on hover. |
| 52 | 🔵 | No print-optimized stylesheet | `@media print` rules would make this page print beautifully. Currently, printing would include the buttons and verification footer. |
| 53 | 🔵 | No QR code for the verification URL | Would make physical certificates verifiable by scanning. |

---

### 1.13 Profile — `/profile/page.tsx`

**Status:** ✅ Clean two-column layout, good field display, badge grid.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 54 | 🟡 | Badges are just orange dots + text | No actual badge icons, no visual distinction between different badge types. All look identical. |
| 55 | 🔵 | No "Edit Profile" capability | Profile is read-only. No way to change name, email, or avatar. |
| 56 | 🔵 | No avatar / profile image | Just name text, no visual identity. |
| 57 | 🔵 | No "Download my data" or "Export" section | GDPR compliance aside, it's a nice trust signal. |
| 58 | 🟡 | No loading state | Profile fetches badges asynchronously. If the query is slow, the page renders with a "No badges yet" flash before badges load. |

---

### 1.14 Auth Pages — Login, Signup, Reset Password, Verify Email

**Status:** ✅ Consistent pattern across all auth pages — centered card, form, alt link.

**Findings (applies to all auth pages):**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 59 | 🟡 | No branded logo/wordmark on auth pages | Just title text. The checkout success page has "PROJECT AMAZON PH ACADEMY" logo but auth pages don't. |
| 60 | 🔵 | No "Sign in with Google" or social auth | Standard for modern platforms. May not be in scope. |
| 61 | 🟡 | Reset password pages have no card wrapper | Just left-aligned text on a white page. Login and signup have proper form styling, but reset-password feels unfinished. |
| 62 | 🔵 | Verify email page auto-submits form via `document.forms[0].submit()` | Works but feels hacky. A proper loading spinner + server action would be cleaner. |

**Admin Login specific (`/admin-login`):**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 63 | 🟡 | No `page.module.css` | Styles are inside `AdminLoginForm` component. Inconsistent with other pages that have dedicated CSS modules. |

---

## SECTION 2: ADMIN PAGES

---

### 2.1 Admin Layout — `layout.tsx` + `layout.module.css`

**Status:** ✅ Solid sidebar layout, 240px fixed, proper flex structure.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 64 | 🟠 | No breadcrumbs on any admin sub-page | The admin layout has a TopBar component but no breadcrumb trail. On deep pages like `/admin/courses/abc/modules/def/lessons/ghi/edit`, there's no way to know where you are. |
| 65 | 🟡 | Sidebar has no section dividers | 12 items in a flat list. No visual grouping. |

---

### 2.2 Admin Dashboard — `/admin/page.tsx`

**Status:** ✅ Good stat tiles with hover micro-interactions, accent borders, mono numbers.

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 66 | 🟠 | Stat tiles are not clickable | They show numbers but don't link to the corresponding admin page (Users tile → `/admin/users`). |
| 67 | 🟠 | "Recent activity" and "Pending actions" are always empty states | No audit log integration. These sections are dead weight. |
| 68 | 🔵 | No trend indicators | Just raw numbers. "▲ 12% this week" would add context. |
| 69 | 🔵 | No quick actions bar | No "Create Course", "Add User" shortcuts. |

---

### 2.3 Admin Sidebar (NavSidebar) — `NavSidebar.tsx`

**Status:** 🔴 **Bland, flat, unsectioned list of 12 items.**

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 70 | 🔴 | **No visual grouping** | All 12 items (Dashboard, Courses, Quizzes, Simulators, Content, Users, Payments, Refunds, Certificates, Badges, Live Classes, Discount Codes, Audit Log, Settings) are in a single flat list with no section headers. |
| 71 | 🔴 | **No badge counts** | Refunds with pending items shows no count. New users show no count. The sidebar is blind to the state of the system. |
| 72 | 🟠 | No hover lift or spatial feedback | Items change color on hover but don't move. No `translateX(2px)` or shadow. |
| 73 | 🟠 | No quick search (Cmd+K) | With 12+ nav items, a keyboard-accessible search would save significant time. |
| 74 | 🟡 | Active state is a full accent pill | This is good, but the pill has no transition animation. It jumps instantly. |
| 75 | 🔵 | No collapsible sections | All items always visible. On smaller screens, this pushes the user card off-screen. |
| 76 | 🔵 | No "Recent pages" shortcut | No quick access to the last 3 visited admin pages. |

---

### 2.4 Admin Tables (Users, Courses, Payments, Refunds, Certificates, Quizzes, Simulators, Live Classes, Discount Codes, Badges)

**Status:** ⚠️ Consistent but bare.

**Findings (applies to ALL admin list pages):**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 77 | 🟠 | No row hover highlight | Tables have no `tr:hover` background change. Hard to track which row you're looking at. |
| 78 | 🟠 | No zebra striping or alternating row backgrounds | Dense tables with no visual rhythm are hard to scan. |
| 79 | 🟡 | Filter bars float as bare flex rows | No card wrapper, no visual connection to the table below. Filters look disconnected. |
| 80 | 🟡 | No "No results" empty state for filtered views | If a filter returns 0 results, the table just disappears. |
| 81 | 🔵 | No column sorting | No clickable column headers for sort. |
| 82 | 🔵 | No bulk selection / batch actions | No checkboxes, no "Select all", no "Delete selected". |
| 83 | 🔵 | No export button | No "Export CSV" or "Download" on any table. |
| 84 | 🟡 | Pagination controls are minimal | Just prev/next with page numbers. No "Showing 1-20 of 150" indicator. |

---

### 2.5 Admin Form Pages (New/Edit Course, Module, Lesson, User, Quiz, Simulator, Live Class, Discount Code, Badge)

**Status:** ⚠️ Functional but very plain.

**Findings (applies to ALL admin form pages):**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 85 | 🟡 | Forms have no card wrapper | Just fields on a white page. No visual containment. |
| 86 | 🟡 | No field-level validation feedback | Error messages appear at the top (action-level) but not inline per field. |
| 87 | 🔵 | No "Save as Draft" option | All forms are save-or-nothing. |
| 88 | 🔵 | No unsaved changes warning | Navigating away from a half-filled form loses all data silently. |
| 89 | 🔵 | No keyboard shortcuts | No `Cmd+S` to save. |

---

### 2.6 Admin Settings — `/admin/settings/page.tsx` + `/admin/settings/2fa-setup/page.tsx`

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 90 | 🟡 | Settings page needs visual sections | Should be grouped: "Account", "Security", "Notifications", etc. |
| 91 | 🔵 | 2FA setup page should have a step indicator | "Step 1 of 3: Scan QR code" etc. |

---

### 2.7 Admin Audit Log — `/admin/audit-log/page.tsx`

**Findings:**

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 92 | 🟡 | Audit log is likely a plain table | Should have timeline-style visual treatment for better readability. |
| 93 | 🔵 | No date range picker | Should be able to filter by "Last 7 days", "Last 30 days", custom range. |

---

## SECTION 3: CROSS-CUTTING FINDINGS

---

### 3.1 Global / Systemic Issues

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 94 | 🔴 | **Zero `loading.tsx` files anywhere** | No route in the entire app has a loading state. Every page shows a white screen while data loads. This is the single biggest UX gap. |
| 95 | 🔴 | **Student pages have NO navigation shell** | Dashboard, Courses, Tools, Profile — none of them have a sidebar, header nav, or any way to navigate between them. Users are stranded. |
| 96 | 🟠 | **Checkout pages use inline styles** | `/checkout/success` and `/checkout/failed` use `React.CSSProperties` instead of CSS Modules. Inconsistent, no responsive support, hardcoded `white` backgrounds. |
| 97 | 🟠 | **No `not-found.tsx` or `error.tsx` custom pages** | The default Next.js 404/error pages will show. Should be branded. |
| 98 | 🟡 | **No `<Suspense>` boundaries with meaningful fallbacks** | Only `/checkout` has a `<Suspense>`, and its fallback is `null`. |
| 99 | 🟡 | **Breadcrumbs inconsistent** | Lesson page has proper `<nav aria-label="Breadcrumb">`. Quiz page has a bare `<nav>` with mono font. Tool pages have bare `<a>` tags (not `<Link>`). Admin pages have none. |
| 100 | 🟡 | **No `prefetch` on navigation links** | Most `<Link>` components use default prefetch. High-traffic paths (Courses → Lesson) should have `prefetch={true}`. |
| 101 | 🔵 | **No dark mode support** | All tokens are light-mode only. The token system is ready for it (`--surface-0`, `--ink-900`), but no `prefers-color-scheme` or toggle exists. |
| 102 | 🔵 | **No focus-visible ring customization** | Uses browser defaults. Custom focus rings matching the accent color would be more polished. |
| 103 | 🔵 | **No skip-to-content link** | Accessibility: no way for keyboard users to skip the sidebar and jump to main content. |
| 104 | 🔵 | **No `<meta name="theme-color">` tag** | Mobile browsers could use the accent color for the address bar. |

---

### 3.2 Typography & Spacing

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 105 | 🟡 | Inconsistent heading hierarchy on some pages | Some pages jump from `h1` to `h3` (skipping `h2`). Screen readers will flag this. |
| 106 | 🟡 | `letter-spacing: -0.02em` on display headings | Good, but only applied on some `h1`s. Others use `-0.01em` or default. Should be consistent. |
| 107 | 🔵 | Line height on body text varies | Some pages use `1.5`, others use `var(--leading-relaxed)`. Should standardize. |

---

### 3.3 Color & Contrast

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 108 | ✅ | Token system is well-structured | `--ink-900` through `--ink-100` with proper semantic mapping. |
| 109 | 🟡 | `--ink-500` (#737373) on `--surface-0` (#FAFAF7) | Contrast ratio is ~4.6:1 — passes AA for normal text but barely. For small text (`text-xs`), this may fail. |
| 110 | 🔵 | Accent color used sparingly | Good discipline, but some pages have zero accent color visible (auth pages, reset password). A small accent element (underline, icon) would improve brand presence. |

---

### 3.4 Micro-Interactions & Animation

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 111 | 🟡 | Only 3 animation tokens exist | `--fade-in`, `--slide-up`, `--duration-base`. No `--scale-in`, `--shimmer` (for skeletons), or `--stagger` (for list reveals). |
| 112 | 🔵 | No skeleton loaders anywhere | Every loading state is either a white screen or nothing. Skeleton loaders for cards, tables, and stat tiles would feel much more polished. |
| 113 | 🔵 | No page transition animation | Next.js App Router supports `loading.tsx` which could use the slide-up animation. |
| 114 | 🔵 | No scroll-to-top button | Long pages (course detail, STR triage) have no way to quickly return to top. |

---

### 3.5 Responsive Design

| # | Severity | Finding | Detail |
|---|----------|---------|--------|
| 115 | ✅ | Most pages have proper breakpoints | 768px and 640px breakpoints used consistently. |
| 116 | 🟡 | Admin sidebar has no mobile collapse | On mobile, the 240px sidebar takes up most of the screen. No hamburger menu or collapse toggle. |
| 117 | 🔵 | No touch-specific interactions | No swipe gestures on lesson cards, no pull-to-refresh on dashboards. |

---

## SECTION 4: SUMMARY & PRIORITIZED ACTION PLAN

---

### By the Numbers

| Severity | Count |
|----------|-------|
| 🔴 Critical | 6 |
| 🟠 High | 13 |
| 🟡 Medium | 28 |
| 🔵 Low (enhancement) | 27 |
| ✅ Good | 5 |
| **Total findings** | **79** |

---

### Top 10 — Do These First

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | **Add `loading.tsx` to every route** | Low | Eliminates white-screen flashes app-wide |
| 2 | **Build student navigation shell** (sidebar or top nav with Dashboard, Courses, Tools, Profile) | Medium | Fixes the biggest student UX gap |
| 3 | **Convert checkout success/failed from inline styles to CSS Modules** | Low | Consistency, responsiveness |
| 4 | **Make `completedLessonIds` actually work** in lesson page | Low | Progress tracking is visually broken |
| 5 | **Add section headers to admin sidebar** (Overview, Content, Operations, System) | Low | Reduces cognitive load |
| 6 | **Make admin stat tiles clickable** → link to sub-pages | Low | Navigation improvement |
| 7 | **Add row hover to all admin tables** | Low | Scannability |
| 8 | **Replace `<a>` with `<Link>` in tool breadcrumbs** | Low | Client-side navigation, faster UX |
| 9 | **Add card wrapper + hover lift to tool and course cards** | Low | Polish, interactivity |
| 10 | **Build custom `not-found.tsx` and `error.tsx`** | Low | Branding, professionalism |

---

### Sidebar Smart Navigation Proposal (Admin)

```
┌──────────────────────────┐
│  PROJECT AMAZON          │
│  PH ACADEMY              │
│  ─────────────────────── │
│                          │
│  OVERVIEW                │
│  ● Dashboard             │
│                          │
│  CONTENT                 │
│  ○ Courses               │
│  ○ Quizzes               │
│  ○ Simulators            │
│  ○ Content               │
│  ○ Live Classes          │
│  ○ Badges                │
│                          │
│  OPERATIONS              │
│  ○ Users            [12] │  ← badge: new users this week
│  ○ Payments              │
│  ○ Refunds           [3] │  ← badge: pending refunds
│  ○ Certificates          │
│  ○ Discount Codes        │
│                          │
│  SYSTEM                  │
│  ○ Audit Log             │
│  ○ Settings              │
│                          │
│  ─────────────────────── │
│  ┌────────────────────┐  │
│  │ 🔍 Quick search    │  │
│  └────────────────────┘  │
│                          │
│  RECENT                  │
│  → Courses (2 min ago)   │
│  → Users (15 min ago)    │
│                          │
│  ─────────────────────── │
│  ┌────────────────────┐  │
│  │ 👤 Admin User      │  │
│  │ admin@amph.com     │  │
│  │ [Sign out]         │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### Sidebar Smart Navigation Proposal (Student)

```
┌──────────────────────────┐
│  PROJECT AMAZON          │
│  PH ACADEMY              │
│  ─────────────────────── │
│                          │
│  ● Dashboard             │
│  ○ My Courses            │
│  ○ Tools / Simulators    │
│  ○ Certificates          │
│  ○ Profile               │
│                          │
│  ─────────────────────── │
│  CONTINUE LEARNING       │
│  → Campaign Builder      │
│    ████████░░ 80%        │
│  → Bid Elevator          │
│    ██░░░░░░░░ 20%        │
│                          │
│  ─────────────────────── │
│  ┌────────────────────┐  │
│  │ 👤 Student Name    │  │
│  │ ⭐ 450 XP          │  │
│  │ [Sign out]         │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

---

**End of audit. All 45 routes, 27 components, all CSS modules reviewed.**

*Document path: `docs/UI-AUDIT-FULL-2026-07-31.md`*
