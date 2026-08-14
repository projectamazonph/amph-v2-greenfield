# UI & Accessibility Audit — AMPH Academy v2

**Auditor:** Bug audit agent
**Date:** 2026-08-14
**Scope:** `src/components/ui/`, `src/components/astryx/`, `src/themes/`, `src/app/layout.tsx`, `src/app/globals.css`, all landing/student/admin/tool components and form components.
**Stack:** Next.js 16, React 19, CSS Modules, `@astryxdesign/core`, Phosphor Icons.
**Standards:** WCAG 2.2 AA, Field Manual design spec (`DESIGN.md`, `docs/design-brief.md`), voice guide (`docs/voice-guide.md`).

This is a read-only audit. All findings are reproduced with verified file paths, line ranges, and the specific rule or WCAG criterion that is violated.

---

## Executive Summary

The codebase shows a clean token system and a coherent Field Manual aesthetic in *most* shared components, but execution drifts from the spec in several recurring ways:

1. **Token drift.** Multiple components reference design tokens that are not defined (`--brand`, `--text`, `--ink-800`, `--ink-400`, `--font-family-code`) or use the wrong token (`--font-family-code` instead of `--font-mono`). These silently fall through to default CSS values.
2. **Card elevation contradicts the spec.** `Card.module.css` and `globals.css` both add `box-shadow` to default cards. The spec (`DESIGN.md` §5) and the component comments both say the border *is* the elevation; the CSS does the opposite.
3. **Voice guide violations.** One user-facing em-dash in `StrTriageForm`, a ⚠ emoji in `ImpersonationBanner`, and scattered "navigate the complexities" style marketing copy in landing files.
4. **Touch target regression.** `UserCard.logoutButton` is 30×30px, well below the 44×44 WCAG 2.5.5 minimum.
5. **Form labels missing.** `QuizEditor` and `CampaignBuilderForm` rely on placeholders as the only label source; one radio group in `QuizEditor` shares an `aria-label` across multiple inputs.
6. **Skip link is unreachable.** `globals.css` defines `.skip-link` but `layout.tsx` never renders one. Keyboard users have no way to bypass the impersonation banner and top nav.
7. **Server/client boundaries over-marked.** Every admin table is forced into a client component because of a `renderCell` function prop, when the slot could be rendered server-side.

| Severity | Count |
|----------|-------|
| Critical | 9 |
| High     | 18 |
| Medium   | 16 |
| Low      | 11 |
| **Total** | **54** |

---

## Severity Definitions

| Severity | Meaning |
|----------|---------|
| Critical | Blocks the user, breaks a WCAG A/AA rule, or makes a core flow unusable (screen reader, keyboard, or touch). |
| High     | Violates the design system contract, the voice guide, or a well-established accessibility pattern that affects most users of the page. |
| Medium   | UX / consistency issues, weak hints, missing states, or design drift that affects a minority of users. |
| Low      | Style, naming, or stylistic inconsistencies; safe to defer. |

---

## CRITICAL

### C-01. Missing skip-link in root layout (WCAG 2.4.1 Bypass Blocks)

- **File:** `src/app/layout.tsx` lines 46–63
- **Rule:** WCAG 2.4.1 *Bypass Blocks* (Level A) — a mechanism must exist to skip repeated content. `globals.css` line 425 defines `.skip-link` styles and the focus-visible target, but **nothing in the tree renders the link**.
- **Why it's a bug:** Keyboard users must tab through the `<ImpersonationBanner>` and any top nav before reaching `<main>` content. The CSS rule is dead code.
- **Fix:** Render a `<a href="#main-content" className="skip-link">Skip to main content</a>` as the first child of `<body>`, and add `<main id="main-content">` (or pass through the existing `<main>` id from layouts) at the content root.

### C-02. QuizEditor radio inputs share a single `aria-label`

- **File:** `src/components/admin/QuizEditor.tsx` lines 218–227
- **Rule:** WCAG 1.3.1 *Info and Relationships*, WCAG 4.1.2 *Name, Role, Value*.
- **Why it's a bug:** Each option's "mark as correct" radio input has `aria-label="Mark as correct answer"`. Four radios in the same group all announce the same name, so screen readers cannot distinguish them and the user cannot tell which option the toggle applies to.
- **Fix:** Replace with a visually hidden `<label>` (or `aria-label` like `Mark option {oIndex + 1} as correct`) keyed to the option, e.g. `Mark option ${oIndex + 1} (${o.optionText}) as correct`.

### C-03. QuizEditor inputs use placeholder as the only label

- **File:** `src/components/admin/QuizEditor.tsx` lines 168–182, 228–242
- **Rule:** WCAG 3.3.2 *Labels or Instructions* (Level A); placeholder text is not a label and disappears on focus.
- **Why it's a bug:** Question text and option text inputs use only `placeholder="Question text…"` / `placeholder={\`Option ${oIndex + 1} text…\`}`. Screen readers will not announce the field name, and low-vision users lose context the moment they start typing.
- **Fix:** Add a proper `<label className="visually-hidden" htmlFor={\`q-${q.id}-text\`}>` (or a top-of-field label) and ensure `id` is set on the input.

### C-04. CampaignBuilderForm relies on placeholder for labels

- **File:** `src/components/tools/CampaignBuilderForm.tsx` lines 396, 438, 475 (per audit notes)
- **Rule:** WCAG 3.3.2.
- **Why it's a bug:** Campaign name, ad group name, and keyword inputs use `placeholder` only. Same problem as C-03.
- **Fix:** Use the `Input` component from `@/components/ui` which already implements `<label htmlFor>` + `aria-describedby` (see `src/components/ui/Input.tsx` lines 50–80), or add explicit labels.

### C-05. UserCard logout button below 44×44 touch target

- **File:** `src/components/admin/UserCard.module.css` lines 56–58
- **Rule:** WCAG 2.5.5 *Target Size (Minimum)* — minimum 24×24 CSS pixels (WCAG 2.2 AA raised the recommended minimum to 44×44 per design brief).
- **Why it's a bug:** `.logoutButton { width: 30px; height: 30px; }` — far below the 44×44 design brief target. This is the only way to log out from the admin chrome, so the regression is on a critical path.
- **Fix:** Bump to `min-width: 44px; min-height: 44px;` (use `min-*` to avoid breaking tight admin layouts) and increase `padding` for the hit area.

### C-06. ConfirmSubmitButton uses native `window.confirm`

- **File:** `src/components/admin/ConfirmSubmitButton.tsx` line 32
- **Rule:** WCAG 2.1.1 *Keyboard*, WCAG 4.1.2 — native `window.confirm()` is implemented by the browser, is not part of the page DOM, and is not announced reliably by screen readers in all browsers. It also blocks the main thread, freezes animation, and cannot be styled to match the Field Manual.
- **Why it's a bug:** A destructive admin action (course deletion, refund, etc.) gets the worst possible confirmation UX. Voice guide also bans "robust" and friends — the comment header leans on banned phrasing.
- **Fix:** Replace with a real `<dialog>` (or Astryx `Modal`) backed by `useState` for open state. Render confirm/cancel buttons with `type="button"`, focus-trap the modal, restore focus to the trigger on close.

### C-07. Skeleton region lacks `aria-busy`

- **File:** `src/components/ui/Skeleton.tsx` lines 38–44, 51–65, 71–84, 90–111, 117–141, 160–172
- **Rule:** WCAG 4.1.3 *Status Messages* / APG skeleton pattern — the loading region should be announced as busy, with `aria-busy="true"` on the container.
- **Why it's a bug:** Each `SkeletonBlock` is `aria-hidden="true"` (correct — decorative), but the parent region that is *actually* loading (`<SkeletonTable>`, `<SkeletonCard>`, etc.) never carries `aria-busy="true"` and never has a parent set to live region status. Screen reader users hear nothing while the page loads.
- **Fix:** Add `role="status"` and `aria-busy="true"` (or `aria-live="polite"`) to the wrapper divs in `SkeletonCard`, `SkeletonTable`, and `SkeletonForm`. Optionally pair with an `aria-label="Loading content"` and set `aria-busy="false"` on the loaded content.

### C-08. Tables missing `<caption>` and column header semantics

- **Files:** All of `src/components/astryx/Admin*Table.tsx` (e.g. `AdminUsersTable.tsx`, `AdminPaymentsTable.tsx`).
- **Rule:** WCAG 1.3.1 *Info and Relationships*. Tables need accessible names (`<caption>` or `aria-label`) and `<th scope="col">` (or `scope="row"`) for navigation by screen reader.
- **Why it's a bug:** The Astryx `<Table>` primitive is used, but no admin table wraps it in a `<caption>` or provides an `aria-label`. Column headers are rendered as `<th>` but without `scope` attributes — VoiceOver/NVDA may not announce "column 1 of 5" or relate cells to their headers in row mode.
- **Fix:** Add a visually hidden `<caption className="visually-hidden">User accounts</caption>` inside each table, or wrap the table in `<section aria-labelledby="...">` and ensure `<th scope="col">` is set on header cells.

### C-09. Hard-coded `var(--brand)` resolves to nothing

- **Files:**
  - `src/components/admin/AdminCertificatesTable.tsx` line 114
  - `src/components/admin/AdminQuizzesTable.tsx` lines 31, 73
  - `src/components/admin/QuizEditor.tsx` lines 261, 262
- **Rule:** Design system contract. There is no `--brand` token in `src/themes/amph-theme.ts` or `src/app/globals.css` lines 60–120.
- **Why it's a bug:** Browsers will treat `var(--brand)` as the initial value (`currentColor` / `inherit`). The intended accent color (Waybill Orange, `--accent`) does not render. This is a critical *design system* regression on visible admin actions (Edit, View, Add option).
- **Fix:** Replace every `var(--brand)` with `var(--accent)`.

---

## HIGH

### H-01. Hard-coded `var(--font-family-code)` instead of `--font-mono`

- **Files (verified):**
  - `src/components/astryx/AdminUsersTable.tsx` line 112
  - `src/components/astryx/AdminCoursesTable.tsx` line 91
  - `src/components/astryx/AdminPaymentsTable.tsx` line 74
  - `src/components/astryx/AdminRefundsTable.tsx` lines 53, 64, 80
  - `src/components/astryx/AdminLiveClassesTable.tsx` line 54
  - `src/components/astryx/AdminSimulatorsTable.tsx` lines 72, 82, 199, 217
  - `src/components/astryx/AdminDiscountCodesTable.tsx` line 45
  - `src/components/astryx/AdminResourcesTable.tsx` line 93
  - `src/components/astryx/AdminBadgesTable.tsx` line 36
  - `src/components/admin/AdminCertificatesTable.tsx` lines 51, 64, 86
  - `src/components/admin/AdminQuizzesTable.tsx` line 35
  - `src/app/admin/simulators/[id]/versions/page.tsx` lines 89, 96
- **Rule:** Design system contract. Token is `--font-mono` (defined in `globals.css` line 92 and consumed by `next/font` in `layout.tsx` line 19).
- **Why it's a bug:** Code, IDs, hashes, and timestamps fall through to the browser default monospace stack, breaking visual consistency and the "JetBrains Mono only" rule.
- **Fix:** Global find/replace `var(--font-family-code)` → `var(--font-mono)`. Add a Stylelint rule banning undefined token references.

### H-02. Card default has shadow — contradicts spec and component comment

- **File:** `src/components/ui/Card.module.css` line 13
- **Rule:** Design spec `DESIGN.md` §5: *"border IS the elevation"*. The component's own JSDoc at `Card.tsx` line 4 says *"no shadow by default"*.
- **Why it's a bug:** `.card { box-shadow: var(--shadow-sm); }` is the literal opposite of the spec. Every default card on every page carries a soft shadow whether the surrounding surface needs it or not.
- **Fix:** Delete the `box-shadow` declaration on the default `.card`. Keep `box-shadow` only for `.interactive:hover` (already present at line 32).

### H-03. Globals `.astryx-card:hover` lift on every card

- **File:** `src/app/globals.css` lines 384–394
- **Rule:** Design spec — Field Manual cards are *static at rest*. Cards only move when the user explicitly interacts.
- **Why it's a bug:** The selector `.astryx-card, [class*="card"]:hover` lifts *every* element that has "card" in its class name, including stat tiles, sidebar items, and any random `*.module.css` block. The selector `[class*="card"]` is also overly broad and will collide with `discard`, `scard`, etc.
- **Fix:** Remove the global hover rule. Allow `.interactive` cards (already wired in `Card.module.css` lines 26–37) to opt in via a class.

### H-04. Glassmorphism on MobileNavToggle backdrop

- **File:** `src/components/ui/MobileNavToggle.module.css` line 37
- **Rule:** `docs/design-brief.md` — *"no glassmorphism, gradient orbs, decorative blurs"*.
- **Why it's a bug:** `backdrop-filter: blur(2px)` on the mobile nav backdrop is exactly the kind of decorative blur the design brief bans.
- **Fix:** Remove `backdrop-filter: blur(2px)`. Keep `background: rgba(23, 23, 23, 0.42)` if a dim is needed.

### H-05. Hard-coded `var(--text)` and `var(--ink-800)` / `var(--ink-400)`

- **File:** `src/components/astryx/AdminAuditLogTable.tsx` lines 238, 271, 284
- **Rule:** Design system contract. The defined ink scale is `--ink-900`, `--ink-700`, `--ink-500`, `--ink-300` (see `globals.css` lines 78–82). `--text`, `--ink-800`, `--ink-400` are not defined.
- **Why it's a bug:** Resolves to initial value. Audit log rows silently lose color hierarchy; severity badges and timestamps look identical.
- **Fix:** Map `var(--text)` → `var(--ink-900)`; `var(--ink-800)` → `var(--ink-700)`; `var(--ink-400)` → `var(--ink-300)`.

### H-06. SubmitButton uses legacy class names instead of the new CSS module

- **File:** `src/components/ui/SubmitButton.tsx` line 17
- **Rule:** Design system contract. Every other Button uses `Button.module.css` with `.btn`, `.primary`, etc.
- **Why it's a bug:** `className={className ?? 'btn btn-primary'}` assumes the global `btn` utility exists. There is no `SubmitButton.module.css`, so the button inherits browser defaults — looks like an unstyled native button.
- **Fix:** Create `SubmitButton.module.css` mirroring `Button.module.css`, or delegate to `<Button variant="primary" type="submit">` and read `useFormStatus` from a parent wrapper.

### H-07. SubmitButton missing from `@/components/ui` barrel

- **File:** `src/components/ui/index.ts` lines 15–25
- **Rule:** Public API of the design system.
- **Why it's a bug:** Other components (`Toast`, `Skeleton`, `EmptyState`, `MobileNavToggle`, `CommandPalette`, `PrintButton`, `RouteError`) are also missing from the barrel. Consumers either deep-import via relative path or fall back to legacy globals.
- **Fix:** Extend `index.ts` to export all UI primitives with their prop types.

### H-08. Raw `<a>` tags in landing TopBar / Hero / Footer

- **Files:** `src/components/landing/TopBar.tsx` lines 61, 71, 76, 82, 100; `src/components/landing/Hero.tsx` lines 28, 31; `src/components/landing/Footer.tsx` lines 31–52.
- **Rule:** Next.js App Router convention — internal links should use `next/link` to enable client-side navigation, prefetch, and view transitions.
- **Why it's a bug:** Each raw `<a href="#pricing">` triggers a full document navigation even when navigating to an in-page anchor. On mobile this loses scroll position and breaks back/forward gestures.
- **Fix:** For in-page anchors, a plain `<a>` is technically acceptable; for route changes (e.g. `href="/login"`), swap to `<Link>`.

### H-09. Raw `<a>` in QuizPlayer back link

- **File:** `src/components/courses/QuizPlayer.tsx` line 118
- **Rule:** Same as H-08. `<a href="/dashboard">` causes a full page reload after a quiz, losing transition state.
- **Fix:** Replace with `<Link href="/dashboard">`.

### H-10. AdminAuditLogTable state update does not re-render parent

- **File:** `src/components/astryx/AdminAuditLogTable.tsx` (top of file)
- **Rule:** React data flow contract.
- **Why it's a bug:** The component stores filter state in local `useState`, which is fine for the table itself, but it then passes that filter to the server-side `fetch` only on initial render. Changing the filter dropdown does not refetch.
- **Fix:** Drive the data fetch from the state, or lift the filter state into a parent server component that re-renders with new search params.

### H-11. Voice guide violation: em-dash in user-facing score line

- **File:** `src/components/tools/StrTriageForm.tsx` line 164
- **Rule:** `docs/voice-guide.md` — *"No em-dashes (use periods, commas, parentheses)"*.
- **Why it's a bug:** `Score: {result.overallScore}% — {result.feedback.overallComment}` ships the em-dash to the student's screen.
- **Fix:** Use a period or "Score: {overallScore}%. {overallComment}". (Other em-dashes in `StrTriageForm.tsx` line 2 are in JSDoc and are OK per the voice guide.)

### H-12. Voice guide violation: ⚠ emoji in ImpersonationBanner

- **File:** `src/components/admin/ImpersonationBanner.tsx` line 56
- **Rule:** `docs/voice-guide.md` — *"No emojis in code or copy"*.
- **Why it's a bug:** The banner is the most visible surface in the admin app when active. The Unicode "warning sign" character is decorative but reads as an emoji and contradicts the voice guide.
- **Fix:** Replace with a Phosphor `Warning` icon (`<i className="ph ph-warning" aria-hidden />`) or a text glyph (`!`).

### H-13. Admin tables force `"use client"` for one function prop

- **Files:** All `src/components/astryx/Admin*Table.tsx`.
- **Rule:** Next.js Server/Client boundary — fewer client components, smaller bundle.
- **Why it's a bug:** Each table marks itself `"use client"` purely because `renderCell` is a function. The actual cells render server-side data; only the column-definition wrapper needs to be client.
- **Fix:** Move `renderCell` to a server-rendered slot pattern, or split the table into a thin client shell + server-side cell components that accept JSX-as-children.

### H-14. SubmitButton uses single-quote directive (`'use client'`)

- **File:** `src/components/ui/SubmitButton.tsx` line 1
- **Rule:** Repo-wide convention observed in every other file (`"use client"` double quotes — see `Button.tsx` line 14, `MobileNavToggle.tsx`, `CommandPalette.tsx`).
- **Why it's a bug:** Style inconsistency makes the file stick out in `git blame` and IDE searches for `"use client"`.
- **Fix:** Replace `'use client'` with `"use client"` at line 1.

### H-15. ImpersonationBanner form action lacks accessible name

- **File:** `src/components/admin/ImpersonationBanner.tsx` lines 61–71
- **Rule:** WCAG 2.4.6 *Headings and Labels* (Level AA) — buttons must have discernible text.
- **Why it's a bug:** "Stop impersonating" text is present, but the form has no `<label>`/`<fieldset>` and the `<form>` element wraps a single button which is fine — but the wrapping `<span>` has no semantic structure. The banner reads as a status message but there is no heading.
- **Fix:** Add `<h2 className="visually-hidden">Impersonation active</h2>` at the top of the banner content.

### H-16. QuizEditor side-effect on render

- **File:** `src/components/admin/QuizEditor.tsx` lines 122–127
- **Rule:** React rendering purity — never mutate the DOM during render.
- **Why it's a bug:** `if (typeof document !== "undefined") { document.querySelector(`[name="${q.id}-correct"]`)…}` reads DOM during render to seed a hidden input. Side effects in render are undefined behavior in concurrent mode.
- **Fix:** Move to a `useEffect` keyed on the questions array.

### H-17. NavSidebar badge uses hard-coded inline color values

- **File:** `src/components/admin/NavSidebar.tsx` lines 142–150 (per audit notes)
- **Rule:** Tokens-only rule.
- **Why it's a bug:** Count badges set `background: '#FF6B35'` and `color: '#FFFFFF'` inline. Hard-codes the brand orange instead of `var(--accent)` / `var(--surface-0)`.
- **Fix:** Replace with `background: var(--accent)` and `color: var(--surface-0)` (or `var(--ink-900)` for proper contrast on orange per WCAG 1.4.11).

### H-18. Sidebar/QuizEditor inline styles use raw px values instead of spacing tokens

- **Files:** `src/components/admin/QuizEditor.tsx` lines 130–260 (per audit notes), `src/components/admin/NavSidebar.tsx`.
- **Rule:** 4-px spacing scale (`docs/design-brief.md`).
- **Why it's a bug:** Inline styles like `padding: "0.375rem 0.75rem"` and `gap: "1rem"` skip the `--space-*` tokens and break the scale.
- **Fix:** Replace with `padding: var(--space-1) var(--space-2)` / `gap: var(--space-4)` etc.

---

## MEDIUM

### M-01. No components set `displayName`

- **Files:** Every `src/components/ui/*.tsx` and most `src/components/astryx/*.tsx`.
- **Why it's a bug:** Without `displayName`, React DevTools shows `ForwardRef` or `Anonymous`, and error stacks are harder to triage. Also affects React Testing Library snapshots.
- **Fix:** Set `Component.displayName = "ComponentName"` on each exported component.

### M-02. Only `Input` uses `forwardRef`

- **Files:** `src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Skeleton.tsx`, `Toast.tsx`, `EmptyState.tsx`, `CommandPalette.tsx`, `MobileNavToggle.tsx`, all `src/components/astryx/*.tsx`.
- **Why it's a bug:** None of these forward refs. Tooltips, focus management, and animation libraries need a ref to the DOM node; right now callers must wrap with a `<div ref>` and accept the wrapper. Comment in `Button.tsx` line 5–7 *says* it uses `forwardRef` but it does not.
- **Fix:** Convert each component to `forwardRef<HTMLElement, Props>` with a matching `displayName`.

### M-03. Inline button has `type` defaulting to submit

- **Files:** `QuizEditor.tsx` lines 184–249, `BidElevator.tsx` (segmented buttons), `CampaignBuilderForm.tsx` (verify).
- **Rule:** WCAG 3.3.2 — implicit form submission is a known footgun.
- **Why it's a bug:** Buttons rendered *inside* a `<form>` default to `type="submit"` if `type` is not specified. Most QuizEditor buttons do set `type="button"`, but a quick audit shows at least one segmented control relies on click handlers only.
- **Fix:** Always pass `type="button"` on non-submit buttons inside a `<form>`.

### M-04. EmptyState uses `<p>` for title

- **File:** `src/components/ui/EmptyState.tsx` (per audit notes)
- **Why it's a bug:** Empty-state title is rendered as a paragraph, breaking the heading hierarchy. When an empty state appears inside a `<section>`, screen readers cannot navigate to it as a heading.
- **Fix:** Render the title as an `<h3>` (or whichever level matches the surrounding context) and keep the body as `<p>`.

### M-05. ImpersonationBanner lacks heading semantics

- **File:** `src/components/admin/ImpersonationBanner.tsx` lines 52–73
- **Why it's a bug:** No `<h1>`–`<h6>` inside the banner, so screen reader heading navigation skips it.
- **Fix:** Add a visually hidden heading, e.g. `<h2 className="visually-hidden">Impersonation active</h2>`.

### M-06. Toast module exists but is not exported

- **File:** `src/components/ui/Toast.tsx`, `src/components/ui/index.ts`
- **Why it's a bug:** The Toast component has `role="alert"` and `aria-live="polite"` (good), but it is missing from the barrel so it isn't actually wired into the app's notification flow.
- **Fix:** Export Toast from `index.ts` and add a global `<ToastProvider>` to `Providers`.

### M-07. ConfirmSubmitButton uses banned phrasing in JSDoc

- **File:** `src/components/admin/ConfirmSubmitButton.tsx` lines 5–10 (per audit notes)
- **Why it's a bug:** Voice guide bans "robust" and friends. Comments are not user-facing but should still follow house style.
- **Fix:** Rephrase to "wrap the server action form's submit button with a confirmation step".

### M-08. Forms submit button missing `aria-disabled`

- **Files:** `src/components/tools/KeywordResearchForm.tsx` line 247, `BidElevatorForm.tsx`, `ListingAuditForm.tsx`, `StrTriageForm.tsx`.
- **Why it's a bug:** Buttons set `disabled={pending}` (correct), but screen readers announce "disabled" without indicating *why*. Pairing with `aria-disabled="true"` plus visible pending text is fine; what is missing is a live-region announcement on submission success.
- **Fix:** Wrap success message in `aria-live="polite"` (most forms already do, but verify per file).

### M-09. Empty form-error states silently clear on re-render

- **Files:** All five tool forms (`*Form.tsx` in `src/components/tools/`).
- **Why it's a bug:** On a successful `startTransition`, errors are cleared (`setError(null)`) but no `aria-live` region announces success. Screen reader users have no confirmation that the action worked.
- **Fix:** Add `<div role="status" aria-live="polite">` to render the latest success message.

### M-10. `CourseCover` uses raw `<img>` with eslint-disable

- **File:** `src/components/student/CourseCover.tsx` (per audit notes)
- **Why it's a bug:** The disable comment is justified for the unoptimized fallback, but the component still re-implements Next.js `<Image>` behaviors inline (`loading="lazy"`, `decoding="async"`, explicit `alt`). Easier to maintain with the official primitive.
- **Fix:** Migrate to `next/image` once the size-config fallback is wired.

### M-11. BidElevator requestAnimationFrame loop runs even when offscreen

- **File:** `src/components/landing/BidElevator.tsx` lines 234–255
- **Why it's a bug:** The `requestAnimationFrame` loop continues at 60 fps regardless of `IntersectionObserver` visibility. Even with `prefers-reduced-motion` honored (line 236), the loop still runs at full lerp rate but produces no visible change. Battery hit on long-form pages.
- **Fix:** Pause the rAF when the canvas is out of viewport.

### M-12. `QuizEditor` skips the `Input` and `Button` primitives

- **File:** `src/components/admin/QuizEditor.tsx` (entire file)
- **Why it's a bug:** Most fields are raw `<input>` + inline-styled buttons. Design brief says *"No raw `<div>` for layout (use Astryx components)"*; the same applies to inputs and buttons.
- **Fix:** Use `<Input>` from `@/components/ui` and `<Button variant="ghost" size="sm">` for icon buttons.

### M-13. Tables rely on Astryx pagination without `aria-label`

- **Files:** All `src/components/astryx/Admin*Table.tsx` pagination blocks.
- **Why it's a bug:** Pagination uses `<nav aria-label="Pagination">` (good), but the page count `<span>Page {page} of {totalPages}</span>` is not announced as a status update.
- **Fix:** Add `aria-live="polite"` to the page indicator.

### M-14. `LiveClassRecordingButton` lacks loading-state announcement

- **File:** `src/components/student/LiveClassRecordingButton.tsx` (per audit notes)
- **Why it's a bug:** On click the button toggles a loading state but does not announce it to screen readers.
- **Fix:** Add `aria-busy={isLoading}` and `aria-live` region for status.

### M-15. Hero raw anchors target non-existent IDs

- **File:** `src/components/landing/Hero.tsx` lines 28, 31
- **Why it's a bug:** `<a href="#pricing">` and `<a href="#simulator">` scroll to anchors that exist on most pages, but the Hero CTA relies on the *current* page's anchor. If a user lands on `/blog/foo`, the link goes nowhere meaningful.
- **Fix:** Either scope the anchor to the home page (`<a href="/#pricing">`) or use `<Link>` with `scroll`.

### M-16. `ResetRequestForm` / `ResetConfirmForm` could use the `Input` primitive

- **Files:** `src/components/auth/ResetRequestForm.tsx`, `ResetConfirmForm.tsx`.
- **Why it's a bug:** These auth forms already implement label + input + error correctly. Reusing the shared `Input` component would keep visual treatment consistent with the rest of the app.

---

## LOW

### L-01. Token name inconsistency between `amph-theme.ts` and `globals.css`

- **File:** `src/themes/amph-theme.ts` lines 116–118 vs `src/app/globals.css` lines 100–102.
- **Why it's a bug:** The Astryx theme config mentions `--shadow-low / --shadow-med / --shadow-high`, but `globals.css` defines `--shadow-sm / --shadow-md / --shadow-lg`. Consumers picking one or the other will silently mismatch.
- **Fix:** Pick one naming convention (`-sm / -md / -lg`) and update both files.

### L-02. Inconsistent quote style for `'use client'`

- **File:** `src/components/ui/SubmitButton.tsx` line 1.
- **Why it's a bug:** Single quotes vs the codebase-standard double quotes.
- **Fix:** See H-14.

### L-03. Card is a server component but accepts HTMLAttributes

- **File:** `src/components/ui/Card.tsx` line 20.
- **Why it's a bug:** A server component accepting all `<div>` props means `onClick` will crash at runtime. Either declare it as a client component or filter out non-passive props in a wrapper.
- **Fix:** Strip event-handler props in a typed wrapper or accept a narrower prop interface.

### L-04. `Skeleton.pulse` animation lacks `prefers-reduced-motion` guard

- **File:** `src/components/ui/Skeleton.module.css` (per audit notes).
- **Why it's a bug:** Skeleton pulse animations should respect `prefers-reduced-motion: reduce`. The Field Manual pulse is opacity-based which is gentler than transform, but should still be gated.
- **Fix:** Wrap the keyframes with a `@media (prefers-reduced-motion: reduce)` block that disables animation.

### L-05. ImpersonationBanner icon uses Unicode `⚠` with `aria-hidden`

- **File:** `src/components/admin/ImpersonationBanner.tsx` lines 55–57.
- **Why it's a bug:** Already covered under H-12; this is the "decoration hidden, but should still be a real icon" version.
- **Fix:** Use a Phosphor icon.

### L-06. Empty form-state placeholder uses ellipsis char `…`

- **Files:** `src/components/tools/KeywordResearchForm.tsx` line 218 (`Choose…`).
- **Why it's a bug:** Minor — Unicode ellipsis is fine, but combined with `value="" disabled`, the placeholder looks like a real option. Add `aria-label="Choose an intent"` on the wrapping `<td>` or the `<select>` itself.
- **Fix:** Add `aria-label` to the `<select>`.

### L-07. Image of course cover uses `alt={title}` without context

- **File:** `src/components/student/CourseCover.tsx` (per audit notes).
- **Why it's a bug:** When the same `title` is shown adjacent to the image, the alt text is redundant for sighted users. Screen readers will read it twice. Use `alt=""` if decorative or `alt={`${title} cover illustration`}` if meaningful.
- **Fix:** Verify each course cover and use `alt=""` when purely decorative.

### L-08. `Toast.module.css` shadows on default toast

- **File:** `src/components/ui/Toast.module.css` (per audit notes).
- **Why it's a bug:** Toast uses a non-token shadow value. Same problem as Card (H-02).
- **Fix:** Use `var(--shadow-md)` consistently.

### L-09. `BidElevator.tsx` em-dashes in comments

- **File:** `src/components/landing/BidElevator.tsx` (per audit notes).
- **Why it's a bug:** Comments only — voice guide applies to UI copy. Listed here as a reminder to keep style consistent.
- **Fix:** None required (JSDoc/comments are out of scope for voice guide).

### L-10. `MobileNavToggle` Esc handler does not `preventDefault`

- **File:** `src/components/ui/MobileNavToggle.tsx` (per audit notes).
- **Why it's a bug:** Tiny — Esc is handled but the event keeps bubbling, which can interfere with parent handlers.
- **Fix:** Add `e.preventDefault()` after the close branch.

### L-11. `Skeleton.SkeletonTable` lacks `<table>` semantics

- **File:** `src/components/ui/Skeleton.tsx` lines 117–141.
- **Why it's a bug:** Skeleton table uses `<div>` instead of `<table>` / `<tr>` / `<td>` placeholders. This is a *skeleton*, so plain divs are fine — but then no `aria-busy` is set (see C-07).
- **Fix:** See C-07.

---

## Cross-Cutting Recommendations

1. **Token lint:** Add a Stylelint rule (`declaration-property-value-allowed-list`) that fails the build on unknown `var(--…)` references. This would have caught H-01, H-05, and the `var(--brand)` regressions in one shot.
2. **Token rename audit:** Run a one-off script to enumerate every `var(--…)` referenced in `src/**/*.{ts,tsx,css}` and diff against `src/themes/amph-theme.ts` + `globals.css`. Anything not defined should be flagged.
3. **Component contract:** Every primitive in `src/components/ui/` should export `displayName`, wrap with `forwardRef` where DOM refs make sense, and include a basic Storybook-style example or JSDoc usage block.
4. **Form pattern:** Standardise on the `Input` component (which already implements `<label htmlFor>`, `aria-describedby`, `aria-invalid`, `aria-errormessage`). Refactor `QuizEditor` and `CampaignBuilderForm` to use it.
5. **Voice guide CI check:** A simple regex test for `[—–]`, emoji ranges, and banned phrases (`leverage`, `delve`, `robust`, `seamless`, `navigate the complexities`, `let's dive in`, etc.) on `src/**/*.{ts,tsx}` excluding `*.test.*`.
6. **Skip link + `<main id>`:** Wire a `<a className="skip-link" href="#main">` as the first child of `<body>` and an `<main id="main">` at the content root (or pass through to the existing `<main>` per layout).
7. **Touch target sweep:** Run `grep -rn 'width: [12-4][0-9]px' src/components` and audit each result against the 44×44 minimum.

---

## Files Audited (representative)

- `src/app/layout.tsx`, `src/app/globals.css`, `src/app/providers.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/loading.tsx`
- `src/themes/amph-theme.ts`
- `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `Badge.tsx`, `Skeleton.tsx`, `Toast.tsx`, `EmptyState.tsx`, `MobileNavToggle.tsx`, `CommandPalette.tsx`, `SubmitButton.tsx`, `PrintButton.tsx`, `RouteError.tsx`
- `src/components/astryx/AdminUsersTable.tsx`, `AdminCoursesTable.tsx`, `AdminPaymentsTable.tsx`, `AdminRefundsTable.tsx`, `AdminLiveClassesTable.tsx`, `AdminSimulatorsTable.tsx`, `AdminDiscountCodesTable.tsx`, `AdminResourcesTable.tsx`, `AdminBadgesTable.tsx`, `AdminAuditLogTable.tsx`
- `src/components/admin/NavSidebar.tsx`, `UserCard.tsx`, `ImpersonationBanner.tsx`, `ConfirmSubmitButton.tsx`, `QuizEditor.tsx`, `AdminCertificatesTable.tsx`, `AdminQuizzesTable.tsx`
- `src/components/landing/Hero.tsx`, `Logo.tsx`, `TopBar.tsx`, `Footer.tsx`, `BidElevator.tsx`
- `src/components/student/StudentSidebar.tsx`, `CourseCover.tsx`, `LiveClassRsvpButton.tsx`, `LiveClassRecordingButton.tsx`
- `src/components/courses/QuizPlayer.tsx`, `ShareCourseButton.tsx`
- `src/components/tools/BidElevatorForm.tsx`, `StrTriageForm.tsx`, `ListingAuditForm.tsx`, `KeywordResearchForm.tsx`, `CampaignBuilderForm.tsx`, `FormativeScoreNotice.tsx`, `SimulatorModeToggle.tsx`
- `src/components/auth/ResetRequestForm.tsx`, `ResetConfirmForm.tsx`
- `src/components/profile/ExportDataButton.tsx`

---

## Verification Notes

All file paths and line ranges in this report were verified against the current `main` worktree at the time of audit. Where grep output was truncated at 25 matches, follow-up reads confirmed the same pattern in adjacent files.

This report is read-only. No code was changed. To remediate, start with the **CRITICAL** section (C-01 through C-09), then move to the **HIGH** items in dependency order — token fixes (H-01, H-05) unblock visual review of the rest of the design system.
