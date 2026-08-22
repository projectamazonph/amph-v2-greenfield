# Student Dashboard Accessibility Audit

**Scope.** This initial audit covers `/dashboard`, the authenticated `StudentShell` and `StudentSidebar`, the dashboard course and progress surfaces, and the mobile navigation path. It combines a render-based axe audit with source and token inspection. It is an audit only; no production UI fixes are included in this report.

## Executive finding

The current dashboard has a solid semantic baseline. The rendered empty state, enrolled resume state, and enrolled state with the real student sidebar produced **no axe violations** in the local audit harness. The page exposes a keyboard-focusable `main#main-content`, uses a single page heading, keeps course navigation as links, and exposes text equivalents for progress percentages.

The highest-value improvements are therefore not missing-label emergencies. They are **semantic strengthening, contrast discipline, motion preferences, and mobile navigation behavior**. These changes would make the experience more resilient for screen-reader users and keyboard-only learners, especially when the dashboard is used as the primary post-login launchpad.

## Automated audit result

| State | Result | Coverage |
|---|---:|---|
| Empty dashboard | Pass | Main heading, empty course state, quick actions, shell wrapper |
| Enrolled dashboard with resume CTA | Pass | Resume card, course card, decorative cover, progress text, course list |
| Dashboard with real authenticated sidebar | Pass | Student navigation landmark, active route, logout control, dashboard content |

The audit harness is at `src/app/dashboard/__tests__/a11y.audit.test.tsx` and currently contains three axe checks.

## Findings and priorities

| Priority | Finding | Evidence | Recommended remediation |
|---|---|---|---|
| P1 | Course progress is visually represented by a bar but the bar itself is hidden from assistive technology. | `page.tsx` marks `.progressBar` as `aria-hidden="true"`; the nearby text exposes the percentage but not a progressbar role. | Replace the hidden bar with a `role="progressbar"` element carrying `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`, and an accessible label tied to the course title. Keep the visible percentage as supporting text. |
| P1 | The resume CTA uses an accent-colored text token on an accent-colored background. | `page.module.css` sets `.continueBtn` to `background: var(--accent)` and `color: var(--accent-text)`, while the token contract defines `--accent-ink` as the button text token for `--accent`. | Change the foreground to `var(--accent-ink)` and add a focused contrast assertion or token-level regression test. |
| P1 | Dashboard motion does not have a reduced-motion override. | `.progressFill` transitions its width; the shared mobile sidebar and toggle also animate transforms/backgrounds without a local `prefers-reduced-motion` override. | Add reduced-motion rules that disable or shorten dashboard progress animation and drawer transitions. Verify no essential state depends on motion. |
| P1 | Mobile drawer behavior lacks runtime accessibility coverage. | Existing mobile-navigation coverage is primarily static/source-level; it does not verify focus placement, Escape handling, backdrop close, focus return, or inertness in a rendered interaction. | Add a jsdom interaction suite for open, close, Escape, backdrop, focus return, and `aria-expanded`/`aria-controls` synchronization. Add one mobile Playwright path when the browser test fixture is available. |
| P2 | Content sections are visually headed but not explicitly labelled as landmarks. | The `Continue learning`, `My courses`, and `Quick Actions` sections do not consistently use `aria-labelledby`. | Add stable heading IDs and `aria-labelledby` to the dashboard sections so landmark navigation has useful names without changing the visual hierarchy. |
| P2 | Focus treatment is present but should be verified against the actual shell background and narrow-screen drawer edges. | Sidebar links and logout controls use `:focus-visible`, but the outline is inset with `outline-offset: -2px`; the mobile toggle has a separate focus rule. | Add rendered focus assertions or a manual keyboard pass at desktop and mobile widths. Prefer a consistent visible focus ring that cannot be clipped by rounded or overflowed containers. |
| P2 | The dashboard’s text links and compact actions are not all covered by touch-target regression checks. | The primary buttons have adequate padding, but the catalog link and compact quick actions rely on their content and spacing rather than a shared target contract. | Add a small UI contract for minimum interactive dimensions where practical, and validate at the mobile breakpoint. |
| P3 | Decorative course artwork is correctly skipped by assistive technology, but this relies on the adjacent heading remaining present. | `CourseCover` uses `alt=""` and `role="presentation"`; the course title is supplied by the adjacent heading. | Keep the current contract, and add a regression test that a dashboard course card always retains its accessible title when artwork changes. |

## What already works

The route exposes `main#main-content` with `tabIndex={-1}`, which supports the shared skip link. Course cards are links rather than click-only containers. The progress percentage is available as text even though the decorative bar is hidden. The real sidebar exposes a labelled navigation landmark and `aria-current="page"` for the active route. The logout button has a 44px minimum target and a visible focus rule. The automated axe audit found no violations in the tested states.

## Recommended implementation order

The first implementation slice should fix the progress semantics and accent-button contrast because both are local, low-risk changes with direct user benefit. The second slice should add reduced-motion rules and the named-section landmarks. The third slice should test and, if necessary, refine mobile drawer focus behavior. This order improves the core dashboard experience before expanding into broader profile, simulator, or resource accessibility work.

## Audit limitations

The axe run uses jsdom and therefore does not measure real rendered color contrast, browser zoom behavior, text reflow at 400% zoom, pointer geometry, or actual mobile focus movement. The findings marked as P1 or P2 should be followed by a browser-level keyboard and responsive pass after implementation.
