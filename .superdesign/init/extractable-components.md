# Extractable Components

These are components that appear on multiple pages or define shared UI patterns. The design
workflow reads this file before generating drafts to decide which to extract as reusable
`<sd-component>` tags.

---

## Layout (appear on most pages)

### TopBar (Landing)
- Source: `src/components/landing/TopBar.tsx`
- Category: layout
- Description: Sticky white top bar with scroll-progress, Manila clock, in-page nav, and primary CTA.
- Extractable props:
  - `scrolled` (boolean, drives elevation border)
  - `progress` (number 0–100, drives top progress bar)
  - `menuOpen` (boolean, mobile drawer state)
- Hardcoded: Logo, NAV_LINKS array, COURSES_URL, clock formatting (`Asia/Manila`).

### AdminSidebar
- Source: `src/components/admin/AdminSidebar.tsx`
- Category: layout
- Description: 240px sticky navy sidebar for the admin panel with section labels, active-item
  indicator, and primary CTA at the bottom.
- Extractable props:
  - `currentPath` (string, active item)
  - `user` (`{name, email, avatarUrl}` — for the footer block)
- Hardcoded: NAV_LINKS, section labels, role badge.

### StudentSidebar
- Source: `src/components/student/StudentSidebar.tsx`
- Category: layout
- Description: Vertical nav for the student dashboard — courses, simulators, badges, profile.
- Extractable props:
  - `currentPath` (string)
  - `tierLabel` (string — "Foundations / Mastery / Ultimate")
  - `welcomedBadge` (boolean — show "?" badge if welcomed within last 7 days)
- Hardcoded: nav structure, tier formatting.

### MobileNavToggle
- Source: `src/components/ui/MobileNavToggle.tsx`
- Category: layout
- Description: Burger / close toggle that opens the sidebar drawer on small screens.
- Extractable props:
  - `open` (boolean)
  - `onToggle` (handler)
- Hardcoded: SVG icon swap.

### Auth layout shell
- Source: `src/app/(auth)/layout.tsx`
- Category: layout
- Description: Centered card frame used by login/signup/reset/verify/admin-login.
- Extractable props:
  - `heading` (string)
  - `subheading` (string, optional)
- Hardcoded: card max-width, background gradient.

---

## Basic (used across pages)

### Button
- Source: `src/components/ui/Button.tsx`
- Category: basic
- Description: 6-variant, 3-size control.
- Extractable props: `variant`, `children`, `disabled`, `onClick`. Sizes via `.sm` / `.md` / `.lg`.
- Hardcoded: ALL CSS (consumes tokens only).

### Card
- Source: `src/components/ui/Card.tsx`
- Category: basic
- Description: Container with optional interactive lift.
- Extractable props: `variant`, `padding`, `role`, `aria-*`.
- Hardcoded: ALL CSS.

### Input
- Source: `src/components/ui/Input.tsx`
- Category: basic
- Description: Form field with label/hint/error + optional adornment.
- Extractable props: `label`, `hint`, `error`, `size`, `rightAdornment`, `type`, `name`, `value`,
  `onChange`.
- Hardcoded: ALL CSS.

### Badge
- Source: `src/components/ui/Badge.tsx`
- Category: basic
- Description: Status pill (square or count-shape).
- Extractable props: `variant`, `shape`, `children`.
- Hardcoded: ALL CSS.

### Toast
- Source: `src/components/ui/Toast.tsx`
- Category: basic
- Description: Radix-based accessible live-region notification.
- Extractable props: `variant`, `title`, `description`, `duration`.
- Hardcoded: positioning (bottom-right), aria-live behaviour.

### EmptyState
- Source: `src/components/ui/EmptyState.tsx`
- Category: basic
- Description: Empty-list illustration + headline + CTA slot.
- Extractable props: `title`, `description`, `action` (ReactNode — Button or Link).
- Hardcoded: illustration swap.

### Skeleton
- Source: `src/components/ui/Skeleton.tsx`
- Category: basic
- Description: Loading shimmer block (rect / circle / text variants).
- Extractable props: `variant`, `width`, `height`, `lines`.
- Hardcoded: shimmer gradient keyframes.

---

## Domain patterns (use as DraftComponents when extending the system)

### PricingTierCard
- Source: `src/components/landing/Pricing.tsx` (lines ~108–149)
- Description: 3-up tier card with flag, name, sub, price, includes, CTA. `featured` variant gets
  ribbon + filled CTA.
- Extractable props: `flag`, `name`, `sub`, `price`, `currency`, `featured`, `includes[]`, `cta`.

### SectionHeader
- Source: `src/components/landing/shared.module.css` `.secHead` + each section's usage.
- Description: Sticky left-column section number + section title, right-column lede.
- Extractable props: `number`, `title`, `lede`.

### PlateFigure (the desk-image card with corner brackets)
- Source: `src/components/landing/Hero.tsx` `<figure>` + `.plate` in `shared.module.css`.
- Description: Image plate with corner crop marks, optional floating stat chip.
- Extractable props: `imageSrc`, `imageAlt`, `caption`, `stat` (`{label, value, delta?}`).

### Reveal
- Source: `src/components/landing/Reveal.tsx`
- Description: IntersectionObserver fade/slide-in wrapper. Used by every landing section.
- Extractable props: `as` (tag), `delay`, `threshold`.

### FormativeScoreNotice
- Source: `src/components/tools/FormativeScoreNotice.tsx`
- Description: Yellow-tone notice pinned to every simulator result view that reads:
  "Practice score only. Not a certification, job-readiness signal, or hiring credential."
- Extractable props: `dismissible` (boolean).